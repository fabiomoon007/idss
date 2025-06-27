export const getGeminiAnalysis = async (request) => {
    console.log('[geminiService] getGeminiAnalysis called with request:', JSON.parse(JSON.stringify(request)));
    try {
        console.log('[geminiService] Attempting to fetch /api/analyze...');
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        console.log('[geminiService] Fetch response status:', response.status, response.statusText);
        if (!response.ok) {
            let errorMsg = `Erro ${response.status}: ${response.statusText}`;
            let rawErrorBody = '';
            try {
                rawErrorBody = await response.text();
                if (rawErrorBody.trim() !== '') { // Try to parse only if not empty
                    const errorData = JSON.parse(rawErrorBody);
                    errorMsg = `Erro ao solicitar análise do backend: ${errorData.error || response.statusText}`;
                    console.error('[geminiService] Backend error data (parsed JSON):', errorData);
                }
                else {
                    // Body is empty
                    errorMsg = `Erro ${response.status}: ${response.statusText}. O servidor retornou uma resposta de erro vazia. Verifique os logs da Função Netlify (Netlify Function) para detalhes.`;
                    console.warn("[geminiService] Backend error response was empty.");
                }
            }
            catch (e) {
                // This catch is for JSON.parse failure if rawErrorBody was not empty but still not valid JSON
                console.warn("[geminiService] Backend error response was not valid JSON. Raw text (first 200 chars):", rawErrorBody.substring(0, 200), "Error during parsing:", e);
                if (rawErrorBody.trim() !== '') {
                    errorMsg = `Erro ${response.status} do backend. Resposta não JSON (início): ${rawErrorBody.substring(0, 200)}... Verifique os logs da Função Netlify (Netlify Function).`;
                }
                else {
                    // This case should ideally be caught by the empty check above, but as a fallback:
                    errorMsg = `Erro ${response.status}: ${response.statusText}. O servidor retornou uma resposta de erro vazia ou malformada. Verifique os logs da Função Netlify (Netlify Function).`;
                }
            }
            console.error("[geminiService] Error from backend analysis API:", response.status, errorMsg);
            throw new Error(errorMsg);
        }
        // Process successful response
        const analysisResult = await response.json();
        console.log('[geminiService] Analysis result from backend (first 100 chars):', JSON.stringify(analysisResult).substring(0, 100) + "...");
        if (analysisResult.error) {
            console.error("[geminiService] Backend returned an error field in a success response:", analysisResult.error);
            throw new Error(`Erro retornado pelo backend: ${analysisResult.error}`);
        }
        return analysisResult.analysis || "Nenhuma análise retornada pelo backend.";
    }
    catch (error) {
        console.error("[geminiService] Error in getGeminiAnalysis (network or processing):", error);
        if (error instanceof Error) {
            // Ensure the message is passed along, especially if it's one we've refined above
            throw new Error(error.message || "Erro desconhecido ao comunicar com o serviço de análise.");
        }
        throw new Error("Erro desconhecido ao comunicar com o serviço de análise.");
    }
};
//# sourceMappingURL=geminiService.js.map