import json
import os
import google.generativeai as genai
from google.generativeai.types import GenerationConfig, generation_types
from google.api_core import exceptions as api_core_exceptions
from datetime import datetime
import traceback

# Helper function (pode ser movida para um utils.py se crescer)
def format_value(value, is_rate=False, precision=2):
    if value is None or value == 'N/A':
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

def handler(event, context):
    print(f"[Netlify Function analyze.py] Received event method: {event.get('httpMethod')}")
    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': { 'Content-Type': 'application/json' },
            'body': json.dumps({'error': 'Method Not Allowed. Use POST.'})
        }

    try:
        api_key = os.environ.get("API_KEY")
        if not api_key or not api_key.strip():
            print("[Netlify Function analyze.py] CRITICAL ERROR: Gemini API_KEY environment variable NOT FOUND or IS EMPTY.")
            return {
                'statusCode': 500,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': 'Chave da API Gemini não configurada no servidor.'})
            }

        try:
            req_data = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            print("[Netlify Function analyze.py] ERROR: Could not decode request body JSON.")
            return {
                'statusCode': 400,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': 'Corpo da requisição JSON inválido.'})
            }

        analysis_type = req_data.get('type')
        operator_size = req_data.get('operatorSize', 'Não especificado')
        active_reference_year = req_data.get('activeReferenceYear', datetime.now().year)

        print(f"[Netlify Function analyze.py] Analysis Type: {analysis_type}, Operator Size: {operator_size}, Active Reference Year: {active_reference_year}")

        user_orientation = "você trabalha em uma operadora de planos de saúde há 20 anos e precisa controlar e analisar os indicadores do IDSS. Diante dos resultados dos indicadores da sua operadora, faça uma análise crítica com base na ficha técnica do indicador, tendo em mente as boas práticas da gestão de processos. Tente ser sucinto e utilize linguagem simples."
        general_instructions = f"Para a análise, considere o porte da operadora: {operator_size} e o ANO DE REFERÊNCIA {active_reference_year}. Seu objetivo é fornecer uma análise concisa (idealmente 2-3 parágrafos curtos, mas pode ser mais se a complexidade exigir), útil e acionável, em português brasileiro."
        prompt_parts = [user_orientation, general_instructions]
        
        if analysis_type == 'indicator_last_period':
            indicator_data = req_data.get('indicatorData', {})
            prompt_parts.append(f"\nAnálise do último período para o indicador '{indicator_data.get('name', 'N/A')}' (Ano de Referência: {active_reference_year}):")
            prompt_parts.append(f"Descrição do Indicador: {indicator_data.get('description', 'N/A')}")
            prompt_parts.append(f"Setor Responsável: {indicator_data.get('responsibleSector', 'Não informado')}")
            prompt_parts.append(f"Meta (Ficha Técnica): {indicator_data.get('targetDescription', 'N/A')}")
            prompt_parts.append(f"Direção da Meta (up=melhor para cima, down=melhor para baixo): {indicator_data.get('targetDirection', 'Não informada')}")
            prompt_parts.append(f"Resultado do período '{indicator_data.get('currentPeriodLabel', 'N/A')}' do ano {active_reference_year}: {format_value(indicator_data.get('currentValue'), indicator_data.get('isRate', False))}.")
            prompt_parts.append(f"Avalie este resultado em relação à meta e boas práticas para o ano {active_reference_year}. Destaque pontos positivos, negativos e possíveis causas para o resultado, se aplicável. Sugira ações de melhoria específicas e realistas.")

        elif analysis_type == 'indicator_yearly_consolidated':
            indicator_data = req_data.get('indicatorData', {})
            prompt_parts.append(f"\nAnálise do resultado anual consolidado para o indicador '{indicator_data.get('name', 'N/A')}' (Ano de Referência: {active_reference_year}):")
            prompt_parts.append(f"Descrição do Indicador: {indicator_data.get('description', 'N/A')}")
            prompt_parts.append(f"Setor Responsável: {indicator_data.get('responsibleSector', 'Não informado')}")
            prompt_parts.append(f"Meta (Ficha Técnica): {indicator_data.get('targetDescription', 'N/A')}")
            prompt_parts.append(f"Direção da Meta (up=melhor para cima, down=melhor para baixo): {indicator_data.get('targetDirection', 'Não informada')}")
            prompt_parts.append(f"Resultado Anual Consolidado ({active_reference_year}): {format_value(indicator_data.get('currentValue'), indicator_data.get('isRate', False))}.")
            prompt_parts.append(f"Nota Final Obtida ({active_reference_year}): {format_value(indicator_data.get('notaFinal'))}.")
            prompt_parts.append(f"Avalie este resultado consolidado e a nota final em relação à meta e boas práticas para o ano {active_reference_year}. Destaque pontos positivos, negativos e possíveis causas. Sugira ações de melhoria específicas e realistas para otimizar a nota final deste indicador.")

        elif analysis_type == 'indicator_yearly_comparison':
            indicator_data = req_data.get('indicatorData', {})
            previous_year = active_reference_year - 1
            prompt_parts.append(f"\nAnálise comparativa anual para o indicador '{indicator_data.get('name', 'N/A')}':")
            prompt_parts.append(f"Descrição do Indicador: {indicator_data.get('description', 'N/A')}")
            prompt_parts.append(f"Setor Responsável: {indicator_data.get('responsibleSector', 'Não informado')}")
            prompt_parts.append(f"Meta (Ficha Técnica): {indicator_data.get('targetDescription', 'N/A')}")
            prompt_parts.append(f"Direção da Meta (up=melhor para cima, down=melhor para baixo): {indicator_data.get('targetDirection', 'Não informada')}")
            prompt_parts.append(f"Resultado Anual Consolidado Atual ({active_reference_year}): {format_value(indicator_data.get('currentValue'), indicator_data.get('isRate', False))}.")
            previous_year_val_str = format_value(indicator_data.get('previousYearValue'), indicator_data.get('isRate', False)) if indicator_data.get('previousYearValue') is not None else 'N/A para o ano anterior'
            prompt_parts.append(f"Resultado Anual Consolidado Anterior ({previous_year}): {previous_year_val_str}.")
            prompt_parts.append(f"Compare os resultados entre os anos {active_reference_year} e {previous_year}. Houve melhora, piora ou manutenção do desempenho? Quais os possíveis fatores para essa variação? Qual o impacto dessa evolução (ou involução) no desempenho geral da operadora?")

        elif analysis_type == 'dimension':
            dimension_data = req_data.get('dimensionData', {})
            indicator_summaries = []
            if dimension_data.get('indicators'):
                for ind in dimension_data['indicators']:
                    ref_year_result = ind.get('results', [{}])[0] if ind.get('results') else {}
                    res_value = format_value(ref_year_result.get('consolidatedValue'), ind.get('isRate', False))
                    nota_value = format_value(ref_year_result.get('notaFinal'))
                    indicator_summaries.append(f"- {ind.get('name', 'N/A')} (ID {ind.get('id')}): Resultado {res_value}, Nota Final {nota_value}")

            prompt_parts.append(f"\nAnálise da dimensão '{dimension_data.get('name', 'N/A')}' (ID: {dimension_data.get('id')}, Ano de Referência: {active_reference_year}):")
            prompt_parts.append(f"Nota Final Calculada da Dimensão: {format_value(dimension_data.get('notaFinalCalculada'))}.")
            dim_weight = dimension_data.get('weightInIDSS')
            dim_weight_str = f"{dim_weight * 100:.0f}%" if isinstance(dim_weight, (int, float)) else "N/A"
            prompt_parts.append(f"Peso da Dimensão no IDSS: {dim_weight_str}.")
            prompt_parts.append(f"Indicadores e suas notas finais (ano {active_reference_year}):")
            prompt_parts.extend(indicator_summaries if indicator_summaries else ["Nenhum indicador com dados para o ano de referência."])
            prompt_parts.append(f"\nAvalie o desempenho geral desta dimensão para o ano {active_reference_year} com base na sua nota final, peso e nos resultados dos seus indicadores. Identifique os indicadores que mais impactam positiva e negativamente a nota final da dimensão. Quais são os pontos fortes e fracos? Sugira focos de atuação e estratégias específicas para melhorar a nota final desta dimensão.")

        elif analysis_type == 'idss':
            idss_data_obj = req_data.get('idssData', {})
            dimension_summaries = []
            if idss_data_obj.get('dimensions'):
                for dim in idss_data_obj['dimensions']:
                    dim_nota = format_value(dim.get('notaFinalCalculada'))
                    dim_weight = dim.get('weightInIDSS')
                    dim_weight_str = f"{dim_weight * 100:.0f}%" if isinstance(dim_weight, (int, float)) else "N/A"
                    dimension_summaries.append(f"- {dim.get('name', 'N/A')} (ID: {dim.get('id')}): Nota Final {dim_nota}, Peso {dim_weight_str}")

            prompt_parts.append(f"\nAnálise estratégica do IDSS da operadora (Ano de Referência: {active_reference_year}):")
            prompt_parts.append(f"Nota Final IDSS Global Calculada ({active_reference_year}): {format_value(idss_data_obj.get('notaFinalCalculada'))}.")
            prompt_parts.append("Notas Finais e Pesos das Dimensões:")
            prompt_parts.extend(dimension_summaries)
            if idss_data_obj.get('historicalIdssScores'):
                prompt_parts.append("\nPara referência, as notas finais históricas do IDSS da Unimed Resende (fonte oficial) foram:")
                for hist_score in sorted(idss_data_obj['historicalIdssScores'], key=lambda x: x.get('programYear', 0), reverse=True):
                    prompt_parts.append(f"- Programa IDSS {hist_score.get('programYear')} (ano base {hist_score.get('baseYear')}): Nota {format_value(hist_score.get('score'), precision=4)}")
            prompt_parts.append(f"\nCom base na nota final geral e no desempenho das dimensões para {active_reference_year}, forneça uma visão estratégica. Quais dimensões estão impulsionando o resultado? Quais necessitam de maior atenção? Quais são as implicações gerais deste resultado para a operadora? Que recomendações de alto nível, priorizadas e acionáveis, podem ser feitas para melhorar o IDSS geral?")

        elif analysis_type == 'overall_indicators':
            overall_indicators_data = req_data.get('overallIndicatorsData', [])
            def get_performance_status(nota_final_value):
                if nota_final_value is None or isinstance(nota_final_value, str) and nota_final_value == 'N/A': return "N/D"
                try:
                    val = float(nota_final_value)
                    if val >= 0.7: return "bom/ótimo"
                    if val >= 0.4: return "regular"
                    return "ruim/crítico"
                except (ValueError, TypeError): return "N/D"
            indicator_details_for_prompt = []
            for ind in overall_indicators_data:
                ref_year_result = ind.get('results', [{}])[0] if ind.get('results') else {}
                nota_final = format_value(ref_year_result.get('notaFinal'))
                value = format_value(ref_year_result.get('consolidatedValue'), ind.get('isRate', False))
                indicator_details_for_prompt.append(
                    f"Indicador: {ind.get('name', 'N/A')} (ID: {ind.get('id')}, Dim: {ind.get('dimensionId', 'N/A')}, "
                    f"Peso na Dim: {ind.get('weightInDimension', 'N/A')}, Relevância IDSS: {get_idss_weight_level_text(ind.get('idssWeightLevel'))}, "
                    f"Resultado ({active_reference_year}): {value}, "
                    f"Nota Final ({active_reference_year}): {nota_final} - Performance: {get_performance_status(ref_year_result.get('notaFinal'))})"
                )
            prompt_parts.append(f"\nAnálise geral de todos os indicadores da operadora (Ano de Referência: {active_reference_year}):")
            prompt_parts.append("Abaixo uma lista dos indicadores com resultados e notas finais para este ano:")
            prompt_parts.extend(indicator_details_for_prompt)
            prompt_parts.append("\nCom base nesta visão geral, identifique os padrões mais significativos:")
            prompt_parts.append("1. Destaque 3-5 indicadores com PIOR desempenho (baixa nota final) que tenham ALTA ou MÉDIA relevância e que exigem atenção prioritária.")
            prompt_parts.append("2. Destaque 2-3 indicadores com MELHOR desempenho (alta nota final) que sejam de ALTA ou MÉDIA relevância.")
            prompt_parts.append("3. Existem dimensões específicas onde os indicadores problemáticos estão concentrados?")
            prompt_parts.append("4. Quais são as 2-3 recomendações ESTRATÉGICAS e PRIORIZADAS para a gestão focar nos próximos 3-6 meses para melhorar o IDSS, considerando o ano de referência?")
            prompt_parts.append("Seja específico e justifique com base nos dados fornecidos.")
        
        # Lógica para 'executive_report' foi removida
        
        else:
            print(f"[Netlify Function analyze.py] ERROR: Invalid analysis_type: {analysis_type}")
            return {
                'statusCode': 400,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': f"Tipo de análise inválido: {analysis_type}"})
            }

        final_prompt = "\n".join(prompt_parts)
        print(f"[Netlify Function analyze.py] Assembled prompt for year {active_reference_year} (first 500 chars): {final_prompt[:500]}...")
        
        genai.configure(api_key=api_key)
        
        generation_config_obj = GenerationConfig(
            temperature=0.7,
            top_p=0.95,
            top_k=64
        )
        
        model = genai.GenerativeModel(model_name='gemini-2.5-flash-preview-04-17')
        
        safety_settings_python = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]

        response = model.generate_content(
            contents=final_prompt,
            generation_config=generation_config_obj,
            safety_settings=safety_settings_python
        )
        
        analysis_text_to_return = None
        try:
            analysis_text_to_return = response.text
        except ValueError as e: 
            print(f"[Netlify Function analyze.py] Gemini response blocked or text not accessible. Error: {e}")
            block_reason_message = "Bloqueado pelo Gemini"
            safety_ratings_details = "N/A"
            if response.prompt_feedback:
                if response.prompt_feedback.block_reason:
                    block_reason_message = f"Bloqueado: {response.prompt_feedback.block_reason.name}"
                if response.prompt_feedback.safety_ratings:
                    safety_ratings_details = ", ".join([f"{rating.category.name}: {rating.probability.name}" for rating in response.prompt_feedback.safety_ratings])
            elif response.candidates and response.candidates[0].finish_reason != generation_types.FinishReason.STOP:
                 block_reason_message = f"Finalizado por: {response.candidates[0].finish_reason.name}"
                 if response.candidates[0].safety_ratings:
                    safety_ratings_details = ", ".join([f"{rating.category.name}: {rating.probability.name}" for rating in response.candidates[0].safety_ratings])
            
            error_detail = f"{block_reason_message}. Detalhes de Segurança: {safety_ratings_details}"
            return {
                'statusCode': 400, # Ou 500 dependendo da política
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': f"Sua solicitação para análise foi bloqueada ou retornou vazia. {error_detail}"})
            }
        
        if analysis_text_to_return is not None:
             return {
                'statusCode': 200,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'analysis': analysis_text_to_return})
            }
        else: 
            print(f"[Netlify Function analyze.py] Gemini response text is None, but no ValueError was raised. Prompt Feedback: {response.prompt_feedback}, Candidates: {response.candidates}")
            return {
                'statusCode': 500,
                'headers': { 'Content-Type': 'application/json' },
                'body': json.dumps({'error': "A API Gemini retornou uma resposta vazia sem detalhes de bloqueio claros."})
            }

    except api_core_exceptions.GoogleAPIError as gae:
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': { 'Content-Type': 'application/json' },
            'body': json.dumps({'error': f"Erro na API do Gemini: {str(gae)}"})
        }
    except Exception as e:
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': { 'Content-Type': 'application/json' },
            'body': json.dumps({'error': f"Ocorreu um erro inesperado no servidor ao tentar gerar a análise. Por favor, tente novamente mais tarde. Detalhe: {str(e)}"})
        }
