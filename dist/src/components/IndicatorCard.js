import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useEffect } from 'react';
import ChartComponent from './ChartComponent.js';
import IndicatorWeightBar from './IndicatorWeightBar.js';
import { getPeriodLabels } from '../constants.js';
import { getGeminiAnalysis } from '../services/geminiService.js';
import { Brain, AlertCircle, BarChart2, X, ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react';
const IndicatorCard = ({ indicator, onUpdateIndicator, operatorSize, activeReferenceYear }) => {
    console.log(`[IndicatorCard ${indicator.id}] Rendering for year ${activeReferenceYear}. Indicator data:`, JSON.parse(JSON.stringify(indicator)));
    const periodicityForActiveYearDisplay = indicator.currentPeriodicity;
    const getInitialPeriodicDataForYear = useCallback((year, periodicityToUse) => {
        const existingResult = indicator.results.find((r) => r.year === year);
        const periodLabels = getPeriodLabels(periodicityToUse);
        if (existingResult && Array.isArray(existingResult.periodicData)) {
            const labelsMatch = existingResult.periodicData.length === periodLabels.length &&
                existingResult.periodicData.every((pd, idx) => pd.periodLabel === periodLabels[idx]);
            if (labelsMatch)
                return [...existingResult.periodicData];
        }
        return periodLabels.map((label) => ({
            periodLabel: label,
            value: null,
            auxValue: null,
        }));
    }, [indicator.results]);
    const [activeYearPeriodicInput, setActiveYearPeriodicInput] = useState(getInitialPeriodicDataForYear(activeReferenceYear, periodicityForActiveYearDisplay));
    const [analysisLoadingStates, setAnalysisLoadingStates] = useState({
        lastPeriod: false,
        yearlyConsolidated: false,
        yearlyComparison: false,
    });
    const [periodicChartData, setPeriodicChartData] = useState([]);
    useEffect(() => {
        const newPeriodLabels = getPeriodLabels(periodicityForActiveYearDisplay);
        const resultForActiveYear = indicator.results.find((r) => r.year === activeReferenceYear);
        setActiveYearPeriodicInput(newPeriodLabels.map((label) => {
            const existingEntryForLabel = resultForActiveYear?.periodicData?.find((pd) => pd.periodLabel === label);
            return {
                periodLabel: label,
                value: existingEntryForLabel?.value ?? null,
                auxValue: existingEntryForLabel?.auxValue ?? null,
            };
        }));
    }, [activeReferenceYear, periodicityForActiveYearDisplay, indicator.results, indicator.id]);
    const consolidateValues = (data, field = 'value') => {
        const values = data.map((entry) => field === 'value' ? entry.value : entry.auxValue).filter(v => v !== null);
        if (values.length === 0)
            return null;
        const consolidationFn = indicator.valueConsolidationFn || ((arr) => {
            const validArr = arr.filter(v => v !== null);
            return validArr.length > 0 ? validArr.reduce((s, v) => s + v, 0) / validArr.length : null;
        });
        const result = consolidationFn(values);
        return result === null ? null : parseFloat(result.toFixed(4)); // Ensure precision
    };
    const handlePeriodicInputChange = (index, field, inputValue) => {
        const numericValue = inputValue === '' ? null : parseFloat(inputValue);
        const newActiveYearPeriodicInput = activeYearPeriodicInput.map((entry, i) => i === index ? { ...entry, [field]: numericValue } : entry);
        setActiveYearPeriodicInput(newActiveYearPeriodicInput);
        // --- Automatic calculation and update logic ---
        const consolidatedValue = consolidateValues(newActiveYearPeriodicInput, 'value');
        const consolidatedAuxValue = indicator.requiresAuxValue ? consolidateValues(newActiveYearPeriodicInput, 'auxValue') : undefined;
        const notaFinal = indicator.calcularNotaFinalFn(consolidatedValue, consolidatedAuxValue, operatorSize, indicator.parametersByPorte);
        const updatedResults = indicator.results.map((r) => {
            if (r.year === activeReferenceYear) {
                return {
                    ...r,
                    periodicData: [...newActiveYearPeriodicInput],
                    consolidatedValue,
                    consolidatedAuxValue: consolidatedAuxValue !== undefined ? consolidatedAuxValue : r.consolidatedAuxValue,
                    notaFinal,
                    // Clear previous analyses as data has changed
                    analysisLastPeriod: undefined,
                    analysisYearlyConsolidated: undefined,
                    analysisYearlyComparison: undefined,
                    errorLastPeriod: undefined,
                    errorYearlyConsolidated: undefined,
                    errorYearlyComparison: undefined,
                };
            }
            return r;
        });
        // Ensure an entry for the active year exists
        let activeYearEntryExists = updatedResults.some((r) => r.year === activeReferenceYear);
        if (!activeYearEntryExists) {
            updatedResults.push({
                year: activeReferenceYear,
                periodicData: [...newActiveYearPeriodicInput],
                consolidatedValue,
                consolidatedAuxValue: consolidatedAuxValue,
                notaFinal,
                analysisLastPeriod: undefined,
                analysisYearlyConsolidated: undefined,
                analysisYearlyComparison: undefined,
                errorLastPeriod: undefined,
                errorYearlyConsolidated: undefined,
                errorYearlyComparison: undefined,
            });
        }
        onUpdateIndicator({
            ...indicator,
            currentPeriodicity: indicator.currentPeriodicity, // Assuming this is correctly managed elsewhere if it can change per year
            results: updatedResults.sort((a, b) => b.year - a.year)
        });
    };
    const handleTriggerAnalysis = async (analysisType) => {
        // Clear previous analysis/error for this specific type first
        const analysisFieldToClear = `analysis${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
        const errorFieldToClear = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
        const resultsWithClearedAnalysis = indicator.results.map(r => {
            if (r.year === activeReferenceYear) {
                const resultCopy = { ...r };
                resultCopy[analysisFieldToClear] = undefined;
                resultCopy[errorFieldToClear] = undefined;
                return resultCopy;
            }
            return r;
        });
        // Update state to clear UI *before* making the API call and setting loading
        onUpdateIndicator({ ...indicator, results: resultsWithClearedAnalysis });
        setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: true }));
        const activeYearFullResult = resultsWithClearedAnalysis.find((r) => r.year === activeReferenceYear); // Use the version with cleared fields
        if (!activeYearFullResult) {
            setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
            const errorField = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
            const updatedResultsWithNoActiveYearError = indicator.results.map(r => r);
            if (!updatedResultsWithNoActiveYearError.find(r => r.year === activeReferenceYear)) {
                updatedResultsWithNoActiveYearError.push({
                    year: activeReferenceYear,
                    periodicData: getPeriodLabels(periodicityForActiveYearDisplay).map(l => ({ periodLabel: l, value: null, auxValue: null })),
                    consolidatedValue: null, notaFinal: null,
                    [errorField]: `Resultados do ano ${activeReferenceYear} não encontrados para iniciar a análise.`
                });
            }
            else {
                updatedResultsWithNoActiveYearError.forEach(r => {
                    if (r.year === activeReferenceYear) {
                        r[errorField] = `Resultados do ano ${activeReferenceYear} não encontrados para iniciar a análise.`;
                    }
                });
            }
            onUpdateIndicator({ ...indicator, results: updatedResultsWithNoActiveYearError });
            return;
        }
        let requestData = {
            indicatorName: indicator.name,
            simpleName: indicator.simpleName,
            description: indicator.description,
            targetDescription: indicator.targetDescription,
            isRate: indicator.isRate,
            parametersForPorte: operatorSize && indicator.parametersByPorte ? indicator.parametersByPorte[operatorSize] : undefined,
            responsibleSector: indicator.responsibleSector,
            targetDirection: indicator.targetDirection,
            activeReferenceYear: activeReferenceYear
        };
        let geminiRequestType;
        if (analysisType === 'lastPeriod') {
            const lastFilledEntry = [...activeYearPeriodicInput].reverse().find((p) => p.value !== null);
            if (!lastFilledEntry || lastFilledEntry.value === null) {
                setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
                const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
                onUpdateIndicator({ ...indicator, results: indicator.results.map((r) => r.year === activeReferenceYear ? { ...r, [errorFieldUpdate]: "Nenhum valor preenchido no período atual para análise." } : r) });
                return;
            }
            requestData.currentValue = lastFilledEntry?.value ?? null;
            requestData.currentPeriodLabel = lastFilledEntry?.periodLabel ?? 'N/A';
            geminiRequestType = 'indicator_last_period';
        }
        else if (analysisType === 'yearlyConsolidated') {
            if (activeYearFullResult.consolidatedValue === null) {
                setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
                const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
                onUpdateIndicator({ ...indicator, results: indicator.results.map((r) => r.year === activeReferenceYear ? { ...r, [errorFieldUpdate]: "Valor consolidado anual é nulo. Análise não pode ser gerada." } : r) });
                return;
            }
            requestData.currentValue = activeYearFullResult.consolidatedValue;
            requestData.notaFinal = activeYearFullResult.notaFinal;
            geminiRequestType = 'indicator_yearly_consolidated';
        }
        else { // yearlyComparison
            if (activeYearFullResult.consolidatedValue === null) {
                setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
                const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
                onUpdateIndicator({ ...indicator, results: indicator.results.map((r) => r.year === activeReferenceYear ? { ...r, [errorFieldUpdate]: "Valor consolidado anual é nulo. Análise não pode ser gerada." } : r) });
                return;
            }
            const previousYearResult = indicator.results.find((r) => r.year === activeReferenceYear - 1);
            requestData.currentValue = activeYearFullResult.consolidatedValue;
            requestData.previousYearValue = previousYearResult?.consolidatedValue ?? null;
            geminiRequestType = 'indicator_yearly_comparison';
        }
        let analysisText = '';
        let errorMsg = undefined;
        const finalRequest = { type: geminiRequestType, indicatorData: requestData, operatorSize, activeReferenceYear };
        try {
            analysisText = await getGeminiAnalysis(finalRequest);
        }
        catch (e) {
            errorMsg = e.message || `Erro na análise (${analysisType})`;
        }
        const analysisFieldUpdate = `analysis${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
        const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`;
        onUpdateIndicator({
            ...indicator,
            results: indicator.results.map((r) => r.year === activeReferenceYear
                ? { ...r, [analysisFieldUpdate]: analysisText, [errorFieldUpdate]: errorMsg }
                : r),
        });
        setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
    };
    const handleCloseAnalysis = (analysisTypeToClose) => {
        onUpdateIndicator({
            ...indicator,
            results: indicator.results.map((r) => {
                if (r.year === activeReferenceYear) {
                    const analysisField = `analysis${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}`;
                    const errorField = `error${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}`;
                    return { ...r, [analysisField]: undefined, [errorField]: undefined };
                }
                return r;
            }),
        });
    };
    const activeYearDisplayResult = indicator.results.find((r) => r.year === activeReferenceYear);
    const isAnyAnalysisButtonDisabled = !activeYearDisplayResult || activeYearDisplayResult.consolidatedValue === null;
    const hasAnyPeriodicValueForActiveYear = activeYearPeriodicInput.some(p => p.value !== null);
    const renderTargetDirectionIcon = () => {
        if (indicator.targetDirection === 'up')
            return _jsx(ArrowUpCircle, { size: 18, className: "text-black inline-block ml-1" });
        if (indicator.targetDirection === 'down')
            return _jsx(ArrowDownCircle, { size: 18, className: "text-black inline-block ml-1" });
        return null;
    };
    const getBarColorForPeriodicNotaFinal = (nota) => {
        if (nota === null)
            return '#6b7280';
        if (nota <= 0.19)
            return '#ef4444';
        if (nota <= 0.39)
            return '#f97316';
        if (nota <= 0.59)
            return '#eab308';
        if (nota <= 0.79)
            return '#84cc16';
        return '#16a34a';
    };
    useEffect(() => {
        const newChartData = activeYearPeriodicInput
            .filter(entry => entry.value !== null)
            .map(entry => {
            const notaFinalForPeriod = indicator.calcularNotaFinalFn(entry.value, entry.auxValue, operatorSize, indicator.parametersByPorte);
            const fillColor = getBarColorForPeriodicNotaFinal(notaFinalForPeriod);
            return {
                periodLabel: entry.periodLabel,
                value: entry.value,
                fillColor: fillColor,
            };
        });
        setPeriodicChartData(newChartData);
    }, [activeYearPeriodicInput, indicator.calcularNotaFinalFn, operatorSize, indicator.parametersByPorte, indicator.id]);
    const historicalResultBase2023 = indicator.results.find(r => r.year === 2023);
    const historicalResultBase2022 = indicator.results.find(r => r.year === 2022);
    return (_jsxs("div", { className: "bg-white shadow-lg rounded-xl p-6 mb-6 transition-all duration-300 hover:shadow-xl flex flex-col h-full", children: [_jsxs("h3", { className: "text-xl font-semibold text-[#004e4c] mb-1", children: [indicator.id, " - ", indicator.name] }), _jsxs("p", { className: "text-sm text-gray-700 mb-1", children: [_jsx("span", { className: "font-medium", children: "Nome Simplificado:" }), " ", indicator.simpleName] }), indicator.responsibleSector && indicator.responsibleSector !== "Não Definido" && (_jsxs("p", { className: "text-sm text-gray-700 mb-1", children: [_jsx("span", { className: "font-medium", children: "Setor Respons\u00E1vel:" }), " ", indicator.responsibleSector] })), _jsxs("p", { className: "text-xs text-gray-500 my-2", children: [_jsx("span", { className: "font-medium text-gray-700", children: "Meta:" }), " ", indicator.targetDescription] }), indicator.targetDirection && indicator.targetDirection !== 'none' && (_jsxs("p", { className: "text-sm text-gray-700 mb-2 flex items-center", children: [_jsx("span", { className: "font-medium", children: "Dire\u00E7\u00E3o da Meta:" }), renderTargetDirectionIcon()] })), indicator.idssWeightLevel && _jsx(IndicatorWeightBar, { level: indicator.idssWeightLevel }), _jsx("div", { className: "my-2", children: _jsxs("p", { className: "text-xs text-gray-500", children: ["Periodicidade de Medi\u00E7\u00E3o (configurada para ", activeReferenceYear, "): ", _jsx("span", { className: "font-medium text-gray-600", children: periodicityForActiveYearDisplay })] }) }), _jsxs("div", { className: "space-y-2 mb-4 flex-grow overflow-y-auto pr-2 max-h-60", children: [_jsxs("p", { className: "text-sm font-medium text-gray-700 sticky top-0 bg-white py-1", children: ["Resultados (", activeReferenceYear, "):"] }), activeYearPeriodicInput.map((entry, index) => (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2 items-center", children: [_jsxs("span", { className: "text-xs text-gray-600 font-medium whitespace-nowrap", children: [entry.periodLabel, ":"] }), _jsx("input", { type: "number", step: "any", placeholder: indicator.valueLabel || (indicator.isRate ? "Taxa (%)" : "Valor"), value: entry.value === null ? '' : String(entry.value), onChange: (e) => handlePeriodicInputChange(index, 'value', e.target.value), className: "col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00995d] focus:border-[#00995d] sm:text-xs", "aria-label": `${indicator.valueLabel || "Valor"} para ${entry.periodLabel} em ${activeReferenceYear}` }), indicator.requiresAuxValue && (_jsx("input", { type: "number", step: "any", placeholder: indicator.auxValueLabel || "Valor Aux.", value: entry.auxValue === null ? '' : String(entry.auxValue), onChange: (e) => handlePeriodicInputChange(index, 'auxValue', e.target.value), className: "col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00995d] focus:border-[#00995d] sm:text-xs", "aria-label": `${indicator.auxValueLabel || "Valor Auxiliar"} para ${entry.periodLabel} em ${activeReferenceYear}` }))] }, entry.periodLabel)))] }), activeYearDisplayResult && activeYearDisplayResult.notaFinal !== null && (_jsxs("p", { className: "text-sm font-medium text-gray-700 my-2 text-center", children: ["Nota Simulada (", activeReferenceYear, "):", _jsx("span", { className: `font-bold text-lg ml-2 ${activeYearDisplayResult.notaFinal >= 0.7 ? 'text-green-600' : activeYearDisplayResult.notaFinal >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`, children: activeYearDisplayResult.notaFinal.toFixed(3) })] })), (historicalResultBase2023 || historicalResultBase2022) && (_jsxs("div", { className: "my-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700", children: [_jsxs("h5", { className: "font-semibold text-blue-800 mb-1 flex items-center", children: [_jsx(TrendingUp, { size: 14, className: "mr-1.5" }), " Hist\u00F3rico Unimed Resende (Oficial - Pontos Fixos):"] }), _jsxs("ul", { className: "list-disc list-inside ml-2", children: [historicalResultBase2023 && (historicalResultBase2023.consolidatedValue !== null || historicalResultBase2023.notaFinal !== null) && (_jsxs("li", { children: ["IDSS 2024 (Base 2023):", historicalResultBase2023.consolidatedValue !== null && ` Resultado: ${Number(historicalResultBase2023.consolidatedValue).toFixed(indicator.isRate ? 2 : 4)}${indicator.isRate ? '%' : ''}`, historicalResultBase2023.notaFinal !== null && `, Nota: ${historicalResultBase2023.notaFinal.toFixed(4)}`] })), historicalResultBase2022 && (historicalResultBase2022.consolidatedValue !== null || historicalResultBase2022.notaFinal !== null) && (_jsxs("li", { children: ["IDSS 2023 (Base 2022):", historicalResultBase2022.consolidatedValue !== null && ` Resultado: ${Number(historicalResultBase2022.consolidatedValue).toFixed(indicator.isRate ? 2 : 4)}${indicator.isRate ? '%' : ''}`, historicalResultBase2022.notaFinal !== null && `, Nota: ${historicalResultBase2022.notaFinal.toFixed(4)}`] })), (!historicalResultBase2023 || (historicalResultBase2023.consolidatedValue === null && historicalResultBase2023.notaFinal === null)) &&
                                (!historicalResultBase2022 || (historicalResultBase2022.consolidatedValue === null && historicalResultBase2022.notaFinal === null)) &&
                                (_jsx("li", { children: "Nenhum dado hist\u00F3rico fixo registrado para este indicador em 2022 ou 2023." }))] })] })), _jsxs("div", { className: "mt-auto space-y-2", children: [_jsxs("p", { className: "text-sm font-semibold text-gray-700 mt-3", children: ["An\u00E1lises Cr\u00EDticas (", activeReferenceYear, "):"] }), [
                        { type: 'lastPeriod', label: 'Último Período vs Ficha Técnica', analysis: activeYearDisplayResult?.analysisLastPeriod, error: activeYearDisplayResult?.errorLastPeriod, loading: analysisLoadingStates.lastPeriod,
                            disabledOverride: analysisLoadingStates.lastPeriod || !activeYearDisplayResult || !hasAnyPeriodicValueForActiveYear },
                        { type: 'yearlyConsolidated', label: 'Resultado Anual vs Ficha Técnica', analysis: activeYearDisplayResult?.analysisYearlyConsolidated, error: activeYearDisplayResult?.errorYearlyConsolidated, loading: analysisLoadingStates.yearlyConsolidated,
                            disabledOverride: isAnyAnalysisButtonDisabled || analysisLoadingStates.yearlyConsolidated },
                        { type: 'yearlyComparison', label: 'Resultado Anual vs Ano Anterior', analysis: activeYearDisplayResult?.analysisYearlyComparison, error: activeYearDisplayResult?.errorYearlyComparison, loading: analysisLoadingStates.yearlyComparison,
                            disabledOverride: isAnyAnalysisButtonDisabled || analysisLoadingStates.yearlyComparison },
                    ].map(item => (_jsxs("div", { children: [_jsxs("button", { onClick: () => { if (!item.disabledOverride)
                                    handleTriggerAnalysis(item.type); }, disabled: item.disabledOverride, className: "w-full bg-[#f47920] hover:bg-[#d8681c] text-white font-semibold py-2 px-3 text-xs rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center", children: [" ", _jsx(Brain, { size: 16, className: "mr-2" }), item.loading ? 'Analisando...' : `Analisar: ${item.label}`] }), item.analysis && (_jsxs("div", { className: "relative mt-2 p-3 pt-5 bg-[#cde3bb] border border-[#b1d34b] rounded-md", children: [_jsx("button", { onClick: () => handleCloseAnalysis(item.type), className: "absolute top-1 right-1 p-0.5 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-500 hover:text-gray-700 transition-colors", "aria-label": "Fechar an\u00E1lise", children: _jsx(X, { size: 14 }) }), _jsx("p", { className: "text-xs text-slate-700 whitespace-pre-wrap", children: item.analysis })] })), item.error && (_jsxs("div", { className: "mt-1 p-1.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center", children: [_jsx(AlertCircle, { size: 14, className: "mr-1.5 flex-shrink-0" }), " ", item.error] }))] }, item.type)))] }), _jsxs("div", { className: "mt-4 border-t pt-4", children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-700 mb-2 flex items-center", children: [_jsx(BarChart2, { size: 16, className: "mr-2 text-[#00995d]" }), " Resultados Peri\u00F3dicos (", activeReferenceYear, ")"] }), _jsx(ChartComponent, { data: periodicChartData, valueLabel: indicator.valueLabel || (indicator.isRate ? "Taxa (%)" : "Valor"), isRate: indicator.isRate })] })] }));
};
export default React.memo(IndicatorCard);
//# sourceMappingURL=IndicatorCard.js.map