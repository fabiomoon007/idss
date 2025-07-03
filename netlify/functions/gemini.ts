import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";
import type { GeminiAnalysisRequest, Indicator, Dimension, IDSS, IndicatorResult } from "../../src/types";

const getAPIKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API_KEY environment variable not set.");
  }
  return key;
};

const formatNumber = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return 'N/A';
    return n.toFixed(4);
};

const buildIndicatorPrompt = (data: GeminiAnalysisRequest['indicatorData'], type: string): string => {
    if (!data) return "Dados do indicador ausentes.";
    
    const { indicatorName, description, targetDescription, currentValue, currentPeriodLabel, previousYearValue, notaFinal, activeReferenceYear } = data;
    
    let prompt = `Você é um analista especialista em gestão de saúde suplementar (IDSS). Analise o seguinte indicador para uma operadora de saúde em um tom profissional e direto. Forneça a resposta em português do Brasil.

Indicador: ${indicatorName} (${activeReferenceYear})
Descrição: ${description}
Meta oficial: ${targetDescription}
`;

    switch (type) {
        case 'indicator_last_period':
            prompt += `
Análise do Período: O resultado para o período de "${currentPeriodLabel}" foi ${formatNumber(currentValue)}.
Com base na meta, este resultado é bom ou ruim? Por quê? Forneça uma análise concisa (2-3 frases) e uma recomendação ou ponto de atenção.`;
            break;
        case 'indicator_yearly_consolidated':
            prompt += `
Análise Anual: O resultado consolidado para o ano de ${activeReferenceYear} foi ${formatNumber(currentValue)}, o que gerou uma nota final de ${formatNumber(notaFinal)} (de 0 a 1).
Este desempenho anual atinge a meta? É um resultado forte ou fraco? Forneça uma análise concisa (2-3 frases) sobre o impacto deste resultado.`;
            break;
        case 'indicator_yearly_comparison':
            prompt += `
Análise Comparativa Anual: O resultado consolidado para ${activeReferenceYear} foi ${formatNumber(currentValue)}. No ano anterior (${activeReferenceYear - 1}), o resultado foi ${formatNumber(previousYearValue)}.
Houve melhora, piora ou estagnação? O que essa tendência indica para a operadora? Forneça uma análise concisa (2-3 frases) sobre a evolução do indicador.`;
            break;
    }
    return prompt;
};

const buildDimensionPrompt = (data: Dimension | undefined): string => {
    if (!data) return "Dados da dimensão ausentes.";
    
    const indicatorLines = data.indicators
        .map(ind => `- ${ind.simpleName}: Nota ${formatNumber(ind.results.find(r => r.year === new Date().getFullYear())?.notaFinal)}`)
        .join('\n');

    return `Você é um consultor estratégico de gestão em saúde. Analise o desempenho da dimensão '${data.name}' para uma operadora de saúde.

Dimensão: ${data.name} (Peso no IDSS: ${data.weightInIDSS * 100}%)
Nota Final Calculada da Dimensão: ${formatNumber(data.notaFinalCalculada)}

Desempenho dos Indicadores:
${indicatorLines}

Com base nesses dados, forneça uma visão estratégica em português do Brasil (3-4 frases):
1. Qual a saúde geral desta dimensão?
2. Quais são os indicadores mais fortes e mais fracos?
3. Aponte 1 ou 2 prioridades estratégicas para melhorar a nota desta dimensão.`;
};

const buildIdssPrompt = (data: IDSS | undefined): string => {
    if (!data) return "Dados do IDSS ausentes.";
    
    const dimensionScores = data.dimensions
      .map(d => `${d.id}: ${formatNumber(d.notaFinalCalculada)}`)
      .join(', ');

    return `Você é um conselheiro executivo (C-level) para uma operadora de saúde. Analise o seguinte resultado simulado do IDSS.

Nota Final IDSS Calculada: ${formatNumber(data.notaFinalCalculada)}

Notas por Dimensão: ${dimensionScores}

Forneça um resumo executivo de alto nível em português do Brasil (3-4 frases):
1. Qual a posição geral da operadora com base nesta simulação?
2. Quais dimensões estão impulsionando a nota e quais a estão prejudicando?
3. Quais são as 2 áreas mais críticas para foco imediato visando melhorar o próximo resultado do IDSS?`;
};

const buildOverallIndicatorsPrompt = (data: Indicator[] | undefined): string => {
    if (!data || data.length === 0) return "Dados de indicadores ausentes.";

    const allScores: { name: string; score: number | null }[] = data.map(ind => {
        const result = ind.results.find(r => r.year === new Date().getFullYear());
        return { name: ind.simpleName, score: result ? result.notaFinal : null };
    }).filter(item => item.score !== null);

    const sortedScores = allScores.sort((a, b) => b.score! - a.score!);
    const best = sortedScores.slice(0, 3);
    const worst = sortedScores.slice(-3).reverse();

    const bestText = best.map(s => `- ${s.name}: Nota ${formatNumber(s.score)}`).join('\n');
    const worstText = worst.map(s => `- ${s.name}: Nota ${formatNumber(s.score)}`).join('\n');

    return `Você é um analista de dados especialista em performance de saúde. Analise a lista de indicadores e identifique os 3 melhores e os 3 piores desempenhos.

Apresente a resposta em português do Brasil de forma clara e objetiva.

Top 3 Melhores Indicadores:
${bestText}

Top 3 Piores Indicadores:
${worstText}

Forneça um breve comentário (1 frase) sobre o que essa distribuição geral (melhores vs. piores) sugere sobre os pontos fortes e fracos atuais da operadora.`;
};


export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const apiKey = getAPIKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const body: GeminiAnalysisRequest = JSON.parse(event.body || "{}");
    const { type, indicatorData, dimensionData, idssData, overallIndicatorsData } = body;
    
    let prompt = "";
    switch (type) {
        case 'indicator_last_period':
        case 'indicator_yearly_consolidated':
        case 'indicator_yearly_comparison':
            prompt = buildIndicatorPrompt(indicatorData, type);
            break;
        case 'dimension':
            prompt = buildDimensionPrompt(dimensionData);
            break;
        case 'idss':
            prompt = buildIdssPrompt(idssData);
            break;
        case 'overall_indicators':
            prompt = buildOverallIndicatorsPrompt(overallIndicatorsData);
            break;
        default:
             return { statusCode: 400, body: JSON.stringify({ error: "Invalid analysis type" }) };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-preview-0514',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const analysisText = response.text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: analysisText }),
    };

  } catch (error: any) {
    console.error("Error in Gemini function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "An internal server error occurred." }),
    };
  }
};
