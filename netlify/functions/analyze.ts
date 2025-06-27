



import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { OperatorSize } from '../../src/types';
import type { GeminiAnalysisRequest, AnalysisType, Indicator, Dimension, IDSS, HistoricalIdssScore } from '../../src/types';

// These types are for Netlify's specific handler signature
interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  path?: string;
  isBase64Encoded?: boolean;
}

interface NetlifyContext {
  // Add properties if needed from context
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

// Helper function
function formatValue(value: any, isRate = false, precision = 2): string {
  if (value === null || value === undefined || value === 'N/A') {
    return "N/A";
  }
  try {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return String(value); // Return original if not a number
    if (isRate) {
      return `${numValue.toFixed(precision)}%`;
    }
    return numValue.toFixed(precision);
  } catch (e) {
    return String(value); // Fallback for any other error
  }
}

function getIdssWeightLevelText(levelCode?: number): string {
    if (levelCode === 1) return "Alta (Peso 3 no Doc. ANS)";
    if (levelCode === 2) return "Média (Peso 2 no Doc. ANS)";
    if (levelCode === 3) return "Baixa (Peso 1 no Doc. ANS)";
    return "Não definida";
}

export async function handler(event: NetlifyEvent, context: NetlifyContext): Promise<NetlifyResponse> {
  console.log(`[Netlify Function analyze.ts] Received event method: ${event.httpMethod}`);
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey || !apiKey.trim()) {
      console.error("[Netlify Function analyze.ts] CRITICAL ERROR: Gemini API_KEY environment variable NOT FOUND or IS EMPTY.");
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Chave da API Gemini não configurada no servidor.' }),
      };
    }

    let req_data: GeminiAnalysisRequest;
    try {
      req_data = JSON.parse(event.body || '{}') as GeminiAnalysisRequest;
    } catch (e) {
      console.error("[Netlify Function analyze.ts] ERROR: Could not decode request body JSON.", e);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Corpo da requisição JSON inválido.' }),
      };
    }

    const analysisType: AnalysisType | undefined = req_data.type;
    const operatorSize: OperatorSize = req_data.operatorSize || OperatorSize.PEQUENO;
    const activeReferenceYear: number = req_data.activeReferenceYear || new Date().getFullYear();

    console.log(`[Netlify Function analyze.ts] Analysis Type: ${analysisType}, Operator Size: ${operatorSize}, Active Reference Year: ${activeReferenceYear}`);

    const systemInstruction = "Você é um especialista em gestão de saúde com 20 anos de experiência em operadoras de planos de saúde, focado em analisar e melhorar os indicadores do IDSS (Índice de Desempenho da Saúde Suplementar) da ANS. Seja sucinto, objetivo e use linguagem simples e direta. Forneça análises críticas baseadas nas fichas técnicas dos indicadores e nas boas práticas de gestão de processos.";
    const generalInstructions = `Para a análise, considere o porte da operadora: ${operatorSize} e o ANO DE REFERÊNCIA DOS DADOS: ${activeReferenceYear}. Seu objetivo é fornecer uma análise concisa (idealmente 2-3 parágrafos curtos), útil e acionável, em português brasileiro.`;
    
    let userPrompt = "";

    if (analysisType === 'indicator_last_period' || 
        analysisType === 'indicator_yearly_consolidated' || 
        analysisType === 'indicator_yearly_comparison') {
        
        const indicator_data = req_data.indicatorData;
        if (!indicator_data) {
            return { statusCode: 400, body: JSON.stringify({ error: `Dados do indicador ausentes para o tipo de análise ${analysisType}.` })};
        }

        if (analysisType === 'indicator_last_period') {
            userPrompt = `
Análise do último período para o indicador '${indicator_data.indicatorName || 'N/A'}' (Ano de Referência: ${activeReferenceYear}):
- Descrição do Indicador: ${indicator_data.description || 'N/A'}
- Setor Responsável: ${indicator_data.responsibleSector || 'Não informado'}
- Meta (Ficha Técnica): ${indicator_data.targetDescription || 'N/A'}
- Direção da Meta (up=melhor para cima, down=melhor para baixo): ${indicator_data.targetDirection || 'Não informada'}
- Resultado do período '${indicator_data.currentPeriodLabel || 'N/A'}' do ano ${activeReferenceYear}: ${formatValue(indicator_data.currentValue, indicator_data.isRate)}.

Avalie este resultado em relação à meta e boas práticas para o ano ${activeReferenceYear}. Destaque pontos positivos, negativos e possíveis causas para o resultado. Sugira ações de melhoria específicas e realistas.`;

        } else if (analysisType === 'indicator_yearly_consolidated') {
            userPrompt = `
Análise do resultado anual consolidado para o indicador '${indicator_data.indicatorName || 'N/A'}' (Ano de Referência: ${activeReferenceYear}):
- Descrição do Indicador: ${indicator_data.description || 'N/A'}
- Setor Responsável: ${indicator_data.responsibleSector || 'Não informado'}
- Meta (Ficha Técnica): ${indicator_data.targetDescription || 'N/A'}
- Direção da Meta (up=melhor para cima, down=melhor para baixo): ${indicator_data.targetDirection || 'Não informada'}
- Resultado Anual Consolidado (${activeReferenceYear}): ${formatValue(indicator_data.currentValue, indicator_data.isRate)}.
- Nota Final Obtida (${activeReferenceYear}): ${formatValue(indicator_data.notaFinal)}.

Avalie este resultado consolidado e a nota final em relação à meta e boas práticas para o ano ${activeReferenceYear}. Destaque pontos positivos, negativos e possíveis causas. Sugira ações de melhoria específicas para otimizar a nota final.`;
        
        } else if (analysisType === 'indicator_yearly_comparison') {
            const previous_year = activeReferenceYear - 1;
            const previous_year_val_str = indicator_data.previousYearValue !== null && indicator_data.previousYearValue !== undefined ? formatValue(indicator_data.previousYearValue, indicator_data.isRate) : 'N/A para o ano anterior';
            userPrompt = `
Análise comparativa anual para o indicador '${indicator_data.indicatorName || 'N/A'}':
- Descrição do Indicador: ${indicator_data.description || 'N/A'}
- Setor Responsável: ${indicator_data.responsibleSector || 'Não informado'}
- Meta (Ficha Técnica): ${indicator_data.targetDescription || 'N/A'}
- Direção da Meta (up=melhor para cima, down=melhor para baixo): ${indicator_data.targetDirection || 'Não informada'}
- Resultado Anual Consolidado Atual (${activeReferenceYear}): ${formatValue(indicator_data.currentValue, indicator_data.isRate)}.
- Resultado Anual Consolidado Anterior (${previous_year}): ${previous_year_val_str}.

Compare os resultados entre os anos ${activeReferenceYear} e ${previous_year}. Houve melhora, piora ou manutenção do desempenho? Quais os possíveis fatores para essa variação e qual o impacto no desempenho geral?`;
        }
    } else if (analysisType === 'dimension') {
        const dimension_data: Partial<Dimension> | undefined = req_data.dimensionData;
        const indicator_summaries = dimension_data?.indicators?.map(ind => {
            const ref_year_result = ind.results?.find(r => r.year === activeReferenceYear) || { consolidatedValue: null, notaFinal: null };
            return `- ${ind.name || 'N/A'} (ID ${ind.id}): Resultado ${formatValue(ref_year_result.consolidatedValue, ind.isRate)}, Nota Final ${formatValue(ref_year_result.notaFinal)}`;
        }).join('\n') || "Nenhum indicador com dados para o ano de referência.";
        
        const dim_weight_str = dimension_data?.weightInIDSS ? `${(dimension_data.weightInIDSS * 100).toFixed(0)}%` : "N/A";

        userPrompt = `
Análise da dimensão '${dimension_data?.name || 'N/A'}' (ID: ${dimension_data?.id}, Ano de Referência: ${activeReferenceYear}):
- Nota Final Calculada da Dimensão: ${formatValue(dimension_data?.notaFinalCalculada)}.
- Peso da Dimensão no IDSS: ${dim_weight_str}.
- Indicadores e suas notas finais (ano ${activeReferenceYear}):
${indicator_summaries}

Avalie o desempenho geral desta dimensão com base na sua nota, peso e nos indicadores. Identifique os indicadores que mais impactam (positiva e negativamente) a nota. Quais são os pontos fortes e fracos? Sugira focos de atuação e estratégias para melhorar a nota desta dimensão.`;

    } else if (analysisType === 'idss') {
        const idss_data_obj: Partial<IDSS> | undefined = req_data.idssData;
        const dimension_summaries = idss_data_obj?.dimensions?.map(dim => {
            const dim_weight_str = dim.weightInIDSS ? `${(dim.weightInIDSS * 100).toFixed(0)}%` : "N/A";
            return `- ${dim.name || 'N/A'} (ID: ${dim.id}): Nota Final ${formatValue(dim.notaFinalCalculada)}, Peso ${dim_weight_str}`;
        }).join('\n') || "Nenhuma dimensão com dados.";
        
        const historical_scores_str = idss_data_obj?.historicalIdssScores
            ?.sort((a, b) => (b.programYear || 0) - (a.programYear || 0))
            .map(hist_score => `- Programa IDSS ${hist_score.programYear} (base ${hist_score.baseYear}): Nota ${formatValue(hist_score.score, false, 4)}`)
            .join('\n') || "";

        userPrompt = `
Análise estratégica do IDSS da operadora (Ano de Referência: ${activeReferenceYear}):
- Nota Final IDSS Global Calculada (${activeReferenceYear}): ${formatValue(idss_data_obj?.notaFinalCalculada)}.
- Notas Finais e Pesos das Dimensões:
${dimension_summaries}
${historical_scores_str ? "\nPara referência, as notas finais históricas do IDSS (fonte oficial) foram:\n" + historical_scores_str : ""}

Com base na nota final geral e no desempenho das dimensões para ${activeReferenceYear}, forneça uma visão estratégica. Quais dimensões impulsionam o resultado? Quais necessitam de atenção? Quais as implicações deste resultado para a operadora? Que recomendações de alto nível, priorizadas e acionáveis, podem ser feitas?`;
    
    } else if (analysisType === 'overall_indicators') {
        const overall_indicators_data: Partial<Indicator>[] = req_data.overallIndicatorsData || [];
        const get_performance_status = (nota: number | null | undefined): string => {
            if (nota === null || nota === undefined) return "N/D";
            if (nota >= 0.7) return "bom/ótimo";
            if (nota >= 0.4) return "regular";
            return "ruim/crítico";
        };
        const indicator_details_for_prompt = overall_indicators_data.map(ind => {
            const ref_year_result = ind.results?.find(r => r.year === activeReferenceYear) || { notaFinal: null };
            return `Indicador: ${ind.name || 'N/A'} (ID: ${ind.id || 'N/A'}, Dim: ${ind.dimensionId || 'N/A'}, Relevância IDSS: ${getIdssWeightLevelText(ind.idssWeightLevel)}, Nota Final: ${formatValue(ref_year_result.notaFinal)} - Performance: ${get_performance_status(ref_year_result.notaFinal)})`;
        }).join('\n');

        userPrompt = `
Análise geral de todos os indicadores da operadora (Ano de Referência: ${activeReferenceYear}):
Abaixo a lista de indicadores com performance:
${indicator_details_for_prompt}

Com base nesta visão geral, identifique os padrões mais significativos:
1. Destaque 3-5 indicadores com PIOR desempenho (baixa nota final) que tenham ALTA ou MÉDIA relevância e exigem atenção prioritária.
2. Destaque 2-3 indicadores com MELHOR desempenho (alta nota final) que sejam de ALTA ou MÉDIA relevância.
3. Existem dimensões específicas onde os indicadores problemáticos estão concentrados?
4. Quais são as 2-3 recomendações ESTRATÉGICAS e PRIORIZADAS para a gestão focar nos próximos 3-6 meses para melhorar o IDSS?
Seja específico e justifique com base nos dados.`;

    } else {
      return { statusCode: 400, body: JSON.stringify({ error: `Tipo de análise inválido: ${analysisType}` })};
    }

    const fullPrompt = `${generalInstructions}\n\n${userPrompt}`;
    console.log(`[Netlify Function analyze.ts] Assembled prompt for year ${activeReferenceYear} (first 500 chars): ${fullPrompt.substring(0, 500)}...`);

    const ai = new GoogleGenAI({ apiKey });

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: fullPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
        }
      });
      
      const analysisTextToReturn = response.text;

      if (analysisTextToReturn) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ analysis: analysisTextToReturn }),
        };
      } else {
        const candidate = response.candidates?.[0];
        const blockReason = candidate?.finishReason || "UNKNOWN";
        const safetyRatings = candidate?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ') || "N/A";
        const errorDetail = `Sua solicitação para análise foi bloqueada ou retornou vazia. Razão: ${blockReason}. Detalhes de Segurança: ${safetyRatings}`;
        console.error(`[Netlify Function analyze.ts] Gemini response error: ${errorDetail}`);
        return {
            statusCode: 400, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: errorDetail })
        };
      }

    } catch (e: any) {
      console.error("[Netlify Function analyze.ts] Error calling Gemini API:", e);
      const errorMessage = e.message || "Erro desconhecido na API do Gemini.";
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Erro na API do Gemini: ${errorMessage}` }),
      };
    }

  } catch (e: any) {
    console.error("[Netlify Function analyze.ts] Unexpected server error:", e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Ocorreu um erro inesperado no servidor: ${e.message}` }),
    };
  }
}