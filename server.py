import http.server
import socketserver
import os
import json
import google.generativeai as genai

# --- Configuration ---
PORT = 8000
API_KEY = os.environ.get("API_KEY")
DIST_DIR = "dist"

# --- Helper Functions from analyze.ts logic ---
def format_value(value, is_rate=False, precision=2):
    if value is None:
        return "N/A"
    try:
        num_value = float(value)
        if is_rate:
            return f"{num_value:.{precision}f}%"
        return f"{num_value:.{precision}f}"
    except (ValueError, TypeError):
        return str(value)

def get_idss_weight_level_text(level_code):
    if level_code == 1: return "Alta (Peso 3 no Doc. ANS)"
    if level_code == 2: return "Média (Peso 2 no Doc. ANS)"
    if level_code == 3: return "Baixa (Peso 1 no Doc. ANS)"
    return "Não definida"

def build_prompt(req_data):
    analysis_type = req_data.get('type')
    operator_size = req_data.get('operatorSize', 'Pequeno Porte')
    active_reference_year = req_data.get('activeReferenceYear', 2024)

    general_instructions = f"Para a análise, considere o porte da operadora: {operator_size} e o ANO DE REFERÊNCIA DOS DADOS: {active_reference_year}. Seu objetivo é fornecer uma análise concisa (idealmente 2-3 parágrafos curtos), útil e acionável, em português brasileiro."
    user_prompt = ""

    if analysis_type in ['indicator_last_period', 'indicator_yearly_consolidated', 'indicator_yearly_comparison']:
        indicator_data = req_data.get('indicatorData', {})
        if not indicator_data:
            raise ValueError(f"Dados do indicador ausentes para o tipo de análise {analysis_type}.")
        
        if analysis_type == 'indicator_last_period':
            user_prompt = f"""
Análise do último período para o indicador '{indicator_data.get('indicatorName', 'N/A')}' (Ano de Referência: {active_reference_year}):
- Descrição do Indicador: {indicator_data.get('description', 'N/A')}
- Setor Responsável: {indicator_data.get('responsibleSector', 'Não informado')}
- Meta (Ficha Técnica): {indicator_data.get('targetDescription', 'N/A')}
- Direção da Meta (up=melhor para cima, down=melhor para baixo): {indicator_data.get('targetDirection', 'Não informada')}
- Resultado do período '{indicator_data.get('currentPeriodLabel', 'N/A')}' do ano {active_reference_year}: {format_value(indicator_data.get('currentValue'), indicator_data.get('isRate'))}.

Avalie este resultado em relação à meta e boas práticas para o ano {active_reference_year}. Destaque pontos positivos, negativos e possíveis causas para o resultado. Sugira ações de melhoria específicas e realistas."""
        elif analysis_type == 'indicator_yearly_consolidated':
            user_prompt = f"""
Análise do resultado anual consolidado para o indicador '{indicator_data.get('indicatorName', 'N/A')}' (Ano de Referência: {active_reference_year}):
- Descrição do Indicador: {indicator_data.get('description', 'N/A')}
- Setor Responsável: {indicator_data.get('responsibleSector', 'Não informado')}
- Meta (Ficha Técnica): {indicator_data.get('targetDescription', 'N/A')}
- Direção da Meta (up=melhor para cima, down=melhor para baixo): {indicator_data.get('targetDirection', 'Não informada')}
- Resultado Anual Consolidado ({active_reference_year}): {format_value(indicator_data.get('currentValue'), indicator_data.get('isRate'))}.
- Nota Final Obtida ({active_reference_year}): {format_value(indicator_data.get('notaFinal'))}.

Avalie este resultado consolidado e a nota final em relação à meta e boas práticas para o ano {active_reference_year}. Destaque pontos positivos, negativos e possíveis causas. Sugira ações de melhoria específicas para otimizar a nota final."""
        elif analysis_type == 'indicator_yearly_comparison':
            previous_year = active_reference_year - 1
            previous_year_val_str = format_value(indicator_data.get('previousYearValue'), indicator_data.get('isRate')) if indicator_data.get('previousYearValue') is not None else 'N/A para o ano anterior'
            user_prompt = f"""
Análise comparativa anual para o indicador '{indicator_data.get('indicatorName', 'N/A')}':
- Descrição do Indicador: {indicator_data.get('description', 'N/A')}
- Setor Responsável: {indicator_data.get('responsibleSector', 'Não informado')}
- Meta (Ficha Técnica): {indicator_data.get('targetDescription', 'N/A')}
- Direção da Meta (up=melhor para cima, down=melhor para baixo): {indicator_data.get('targetDirection', 'Não informada')}
- Resultado Anual Consolidado Atual ({active_reference_year}): {format_value(indicator_data.get('currentValue'), indicator_data.get('isRate'))}.
- Resultado Anual Consolidado Anterior ({previous_year}): {previous_year_val_str}.

Compare os resultados entre os anos {active_reference_year} e {previous_year}. Houve melhora, piora ou manutenção do desempenho? Quais os possíveis fatores para essa variação e qual o impacto no desempenho geral?"""
    
    elif analysis_type == 'dimension':
        dimension_data = req_data.get('dimensionData', {})
        indicator_summaries_list = []
        for ind in dimension_data.get('indicators', []):
            ref_year_result = next((r for r in ind.get('results', []) if r.get('year') == active_reference_year), {'consolidatedValue': None, 'notaFinal': None})
            summary = f"- {ind.get('name', 'N/A')} (ID {ind.get('id')}): Resultado {format_value(ref_year_result.get('consolidatedValue'), ind.get('isRate'))}, Nota Final {format_value(ref_year_result.get('notaFinal'))}"
            indicator_summaries_list.append(summary)
        indicator_summaries = "\n".join(indicator_summaries_list) or "Nenhum indicador com dados para o ano de referência."
        dim_weight_str = f"{dimension_data.get('weightInIDSS', 0) * 100:.0f}%"
        user_prompt = f"""
Análise da dimensão '{dimension_data.get('name', 'N/A')}' (ID: {dimension_data.get('id')}, Ano de Referência: {active_reference_year}):
- Nota Final Calculada da Dimensão: {format_value(dimension_data.get('notaFinalCalculada'))}.
- Peso da Dimensão no IDSS: {dim_weight_str}.
- Indicadores e suas notas finais (ano {active_reference_year}):
{indicator_summaries}

Avalie o desempenho geral desta dimensão com base na sua nota, peso e indicadores. Identifique os indicadores que mais impactam (positiva e negativamente) a nota. Quais são os pontos fortes e fracos? Sugira focos de atuação e estratégias para melhorar a nota desta dimensão."""

    elif analysis_type == 'idss':
        idss_data_obj = req_data.get('idssData', {})
        dimension_summaries = "\n".join([
            f"- {dim.get('name', 'N/A')} (ID: {dim.get('id')}): Nota Final {format_value(dim.get('notaFinalCalculada'))}, Peso {dim.get('weightInIDSS', 0) * 100:.0f}%"
            for dim in idss_data_obj.get('dimensions', [])
        ]) or "Nenhuma dimensão com dados."
        historical_scores_list = []
        for hist_score in sorted(idss_data_obj.get('historicalIdssScores', []), key=lambda x: x.get('programYear', 0), reverse=True):
             historical_scores_list.append(f"- Programa IDSS {hist_score.get('programYear')} (base {hist_score.get('baseYear')}): Nota {format_value(hist_score.get('score'), False, 4)}")
        historical_scores_str = "\n".join(historical_scores_list)
        
        user_prompt = f"""
Análise estratégica do IDSS da operadora (Ano de Referência: {active_reference_year}):
- Nota Final IDSS Global Calculada ({active_reference_year}): {format_value(idss_data_obj.get('notaFinalCalculada'))}.
- Notas Finais e Pesos das Dimensões:
{dimension_summaries}
{f'''
Para referência, as notas finais históricas do IDSS (fonte oficial) foram:
{historical_scores_str}''' if historical_scores_str else ""}

Com base na nota final geral e no desempenho das dimensões para {active_reference_year}, forneça uma visão estratégica. Quais dimensões impulsionam o resultado? Quais necessitam de atenção? Quais as implicações deste resultado para a operadora? Que recomendações de alto nível, priorizadas e acionáveis, podem ser feitas?"""

    elif analysis_type == 'overall_indicators':
        overall_indicators_data = req_data.get('overallIndicatorsData', [])
        def get_performance_status(nota):
            if nota is None: return "N/D"
            if nota >= 0.7: return "bom/ótimo"
            if nota >= 0.4: return "regular"
            return "ruim/crítico"
        
        indicator_details_list = []
        for ind in overall_indicators_data:
            ref_year_result = next((r for r in ind.get('results', []) if r.get('year') == active_reference_year), {'notaFinal': None})
            nota_final = ref_year_result.get('notaFinal')
            detail = f"Indicador: {ind.get('name', 'N/A')} (ID: {ind.get('id', 'N/A')}, Dim: {ind.get('dimensionId', 'N/A')}, Relevância IDSS: {get_idss_weight_level_text(ind.get('idssWeightLevel'))}, Nota Final: {format_value(nota_final)} - Performance: {get_performance_status(nota_final)})"
            indicator_details_list.append(detail)
        indicator_details_for_prompt = "\n".join(indicator_details_list)
        
        user_prompt = f"""
Análise geral de todos os indicadores da operadora (Ano de Referência: {active_reference_year}):
Abaixo a lista de indicadores com performance:
{indicator_details_for_prompt}

Com base nesta visão geral, identifique os padrões mais significativos:
1. Destaque 3-5 indicadores com PIOR desempenho (baixa nota final) que tenham ALTA ou MÉDIA relevância e exigem atenção prioritária.
2. Destaque 2-3 indicadores com MELHOR desempenho (alta nota final) que sejam de ALTA ou MÉDIA relevância.
3. Existem dimensões específicas onde os indicadores problemáticos estão concentrados?
4. Quais são as 2-3 recomendações ESTRATÉGICAS e PRIORIZADAS para a gestão focar nos próximos 3-6 meses para melhorar o IDSS?
Seja específico e justifique com base nos dados."""

    else:
        raise ValueError(f"Tipo de análise inválido: {analysis_type}")
    
    return f"{general_instructions}\n\n{user_prompt}"


class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/analyze':
            try:
                if not API_KEY:
                    raise ValueError("Chave da API Gemini não configurada no servidor.")

                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_body = json.loads(post_data.decode('utf-8'))

                system_instruction = "Você é um especialista em gestão de saúde com 20 anos de experiência em operadoras de planos de saúde, focado em analisar e melhorar os indicadores do IDSS (Índice de Desempenho da Saúde Suplementar) da ANS. Seja sucinto, objetivo e use linguagem simples e direta. Forneça análises críticas baseadas nas fichas técnicas dos indicadores e nas boas práticas de gestão de processos."
                
                full_prompt = build_prompt(request_body)

                genai.configure(api_key=API_KEY)
                model = genai.GenerativeModel(
                    'gemini-2.5-flash-preview-04-17',
                    system_instruction=system_instruction
                )
                
                response = model.generate_content(full_prompt)

                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"analysis": response.text}).encode('utf-8'))
            
            except Exception as e:
                print(f"Error processing /api/analyze: {e}")
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


# --- Server Setup ---
def run_server():
    if not os.path.isdir(DIST_DIR):
        print(f"'{DIST_DIR}' directory not found. Please run 'npm run build' first.")
        exit(1)

    Handler = MyHttpRequestHandler
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving files from '{DIST_DIR}' directory at http://localhost:{PORT}")
        print("API endpoint available at POST http://localhost:8000/api/analyze")
        print("Press Ctrl+C to stop the server.")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
