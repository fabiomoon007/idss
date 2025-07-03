
import { GeminiAnalysisRequest } from '@/types';

export const getGeminiAnalysis = async (request: GeminiAnalysisRequest): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `A solicitação ao servidor falhou com o status ${response.status}`);
    }

    const data = await response.json();
    return data.analysis;

  } catch (error: any) {
    console.error("Erro ao buscar análise do Gemini:", error);
    let errorMessage = "Ocorreu um erro ao gerar a análise. Verifique a conexão ou a configuração do servidor.";
    if (error.message) {
        errorMessage += ` Detalhes: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};