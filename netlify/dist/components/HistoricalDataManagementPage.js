import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { // For listing dimensions
Periodicity } from '../types';
import { getPeriodLabels, CURRENT_YEAR as APP_CURRENT_YEAR } from '../constants'; // Using APP_CURRENT_YEAR to avoid conflict
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react';
const getDefaultHistoricalPeriodicData = (periodicity) => {
    if (!periodicity)
        return null;
    const labels = getPeriodLabels(periodicity);
    return labels.map(label => ({ periodLabel: label, value: null, auxValue: null }));
};
const parseNumericInput = (value) => {
    if (value.trim() === '')
        return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};
const HistoricalDataManagementPage = ({ onClose, initialIndicators, allDimensions, currentHistoricalData, onHistoricalDataUpdated }) => {
    const [selectedYear, setSelectedYear] = useState(APP_CURRENT_YEAR - 1);
    const [formData, setFormData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const yearsOptions = Array.from({ length: 20 }, (_, i) => APP_CURRENT_YEAR - i);
    useEffect(() => {
        console.log("[HistPage] useEffect triggered. SelectedYear:", selectedYear, "currentHistoricalData changed.");
        if (currentHistoricalData) {
            let newFormData = {
                idssHistoricalScores: JSON.parse(JSON.stringify(currentHistoricalData.idssHistoricalScores || [])),
                dimensionHistoricalData: JSON.parse(JSON.stringify(currentHistoricalData.dimensionHistoricalData || [])),
                indicatorHistoricalData: JSON.parse(JSON.stringify(currentHistoricalData.indicatorHistoricalData || []))
            };
            initialIndicators.forEach(initInd => {
                let histIndRecord = newFormData.indicatorHistoricalData.find(hi => hi.id === initInd.id);
                if (!histIndRecord) {
                    histIndRecord = { id: initInd.id, results: [] };
                    newFormData.indicatorHistoricalData.push(histIndRecord);
                }
                let histIndYearEntry = histIndRecord.results.find(res => res.year === selectedYear);
                if (!histIndYearEntry) {
                    histIndYearEntry = {
                        year: selectedYear,
                        notaFinal: null, consolidatedValue: null, consolidatedAuxValue: null,
                        periodicityUsed: null, periodicData: null
                    };
                    histIndRecord.results.push(histIndYearEntry);
                    histIndRecord.results.sort((a, b) => b.year - a.year);
                }
                // Enhanced logic to initialize/correct periodicData based on periodicityUsed
                if (histIndYearEntry.periodicityUsed) {
                    const expectedLabels = getPeriodLabels(histIndYearEntry.periodicityUsed);
                    let needsRecreation = false;
                    if (!histIndYearEntry.periodicData || histIndYearEntry.periodicData.length !== expectedLabels.length) {
                        needsRecreation = true;
                    }
                    else {
                        if (!histIndYearEntry.periodicData.every((pd, idx) => pd.periodLabel === expectedLabels[idx])) {
                            needsRecreation = true;
                        }
                    }
                    if (needsRecreation) {
                        console.log(`[HistPage] useEffect: Re-initializing periodicData for ${initInd.id}, year ${selectedYear} for periodicity ${histIndYearEntry.periodicityUsed}`);
                        histIndYearEntry.periodicData = getDefaultHistoricalPeriodicData(histIndYearEntry.periodicityUsed);
                    }
                }
                else { // periodicityUsed is null
                    if (histIndYearEntry.periodicData !== null) { // If there's orphaned periodic data
                        console.log(`[HistPage] useEffect: Clearing periodicData for ${initInd.id}, year ${selectedYear} as periodicityUsed is null.`);
                        histIndYearEntry.periodicData = null;
                    }
                }
            });
            setFormData(newFormData);
        }
        else { // Initialize from scratch if no currentHistoricalData
            const blankArchive = {
                idssHistoricalScores: [],
                dimensionHistoricalData: [],
                indicatorHistoricalData: initialIndicators.map(ind => ({
                    id: ind.id,
                    results: [{
                            year: selectedYear,
                            notaFinal: null, consolidatedValue: null, consolidatedAuxValue: null,
                            periodicityUsed: null, periodicData: null
                        }]
                }))
            };
            setFormData(blankArchive);
        }
    }, [selectedYear, currentHistoricalData, initialIndicators]);
    const handleIdssScoreChange = (e) => {
        const score = parseNumericInput(e.target.value);
        setFormData(prev => {
            if (!prev)
                return null;
            const updatedArchive = JSON.parse(JSON.stringify(prev));
            let scoreEntry = updatedArchive.idssHistoricalScores.find(s => s.baseYear === selectedYear);
            if (scoreEntry) {
                scoreEntry.score = score ?? 0;
            }
            else {
                updatedArchive.idssHistoricalScores.push({
                    programYear: selectedYear + 1,
                    baseYear: selectedYear,
                    score: score ?? 0,
                    source: "Unimed Resende (Input)"
                });
            }
            updatedArchive.idssHistoricalScores.sort((a, b) => b.baseYear - a.baseYear);
            return updatedArchive;
        });
    };
    const handleDimensionScoreChange = (dimId, e) => {
        const score = parseNumericInput(e.target.value);
        setFormData(prev => {
            if (!prev)
                return null;
            const updatedArchive = JSON.parse(JSON.stringify(prev));
            let yearEntry = updatedArchive.dimensionHistoricalData.find(d => d.year === selectedYear);
            if (yearEntry) {
                yearEntry.dimensionScores[dimId] = score;
            }
            else {
                const newDimScores = {};
                allDimensions.forEach(d_initial => newDimScores[d_initial.id] = (d_initial.id === dimId ? score : null));
                updatedArchive.dimensionHistoricalData.push({ year: selectedYear, dimensionScores: newDimScores });
                updatedArchive.dimensionHistoricalData.sort((a, b) => b.year - a.year);
            }
            return updatedArchive;
        });
    };
    const handleIndicatorFieldChange = (indicatorId, field, value) => {
        setFormData(prev => {
            if (!prev)
                return null;
            const updatedArchive = JSON.parse(JSON.stringify(prev));
            let indRecord = updatedArchive.indicatorHistoricalData.find(ir => ir.id === indicatorId);
            if (!indRecord) {
                indRecord = { id: indicatorId, results: [] };
                updatedArchive.indicatorHistoricalData.push(indRecord);
            }
            let yearEntry = indRecord.results.find(r => r.year === selectedYear);
            if (!yearEntry) {
                yearEntry = {
                    year: selectedYear,
                    notaFinal: null, consolidatedValue: null, consolidatedAuxValue: null,
                    periodicityUsed: null, periodicData: null
                };
                indRecord.results.push(yearEntry);
                indRecord.results.sort((a, b) => b.year - a.year);
            }
            yearEntry[field] = value;
            if (field === 'periodicityUsed') {
                console.log(`[HistPage] Periodicity changed for ${indicatorId} to ${value}. Current yearEntry:`, JSON.parse(JSON.stringify(yearEntry)));
                if (value !== null && value !== "") {
                    yearEntry.periodicData = getDefaultHistoricalPeriodicData(value);
                }
                else {
                    yearEntry.periodicData = null;
                }
                console.log(`[HistPage] New periodicData for ${indicatorId} after change:`, JSON.parse(JSON.stringify(yearEntry.periodicData)));
            }
            return updatedArchive;
        });
    };
    const handlePeriodicDataChange = (indicatorId, periodIndex, field, e) => {
        const numValue = parseNumericInput(e.target.value);
        setFormData(prev => {
            if (!prev)
                return null;
            const updatedArchive = JSON.parse(JSON.stringify(prev));
            const indRecord = updatedArchive.indicatorHistoricalData.find(ir => ir.id === indicatorId);
            if (indRecord) {
                const yearEntry = indRecord.results.find(r => r.year === selectedYear);
                if (yearEntry && yearEntry.periodicData && yearEntry.periodicData[periodIndex]) {
                    yearEntry.periodicData[periodIndex][field] = numValue;
                }
            }
            return updatedArchive;
        });
    };
    const handleSubmit = async () => {
        if (!formData) {
            setSaveStatus({ message: "Nenhum dado para salvar.", type: 'error' });
            return;
        }
        setIsLoading(true);
        setSaveStatus(null);
        try {
            const response = await fetch('/api/historical_archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setSaveStatus({ message: "Dados históricos salvos com sucesso!", type: 'success' });
                await onHistoricalDataUpdated();
            }
            else {
                const errorData = await response.json();
                setSaveStatus({ message: `Erro ao salvar: ${errorData.error || response.statusText}`, type: 'error' });
            }
        }
        catch (error) {
            setSaveStatus({ message: `Erro de rede ou inesperado: ${error.message || 'Erro desconhecido'}`, type: 'error' });
        }
        finally {
            setIsLoading(false);
        }
    };
    const currentIdssScoreEntry = formData?.idssHistoricalScores.find(s => s.baseYear === selectedYear);
    const currentDimensionScoresEntry = formData?.dimensionHistoricalData.find(d => d.year === selectedYear);
    if (!formData) {
        return (_jsxs("div", { className: "flex justify-center items-center h-64", children: [_jsx("div", { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00995d]" }), _jsx("p", { className: "ml-4 text-xl text-[#004e4c]", children: "Carregando dados hist\u00F3ricos..." })] }));
    }
    return (_jsxs("div", { className: "p-4 sm:p-6 bg-white shadow-xl rounded-xl", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-[#004e4c]", children: "Gerenciar Dados Hist\u00F3ricos Fixos" }), _jsxs("button", { onClick: onClose, className: "bg-[#00995d] hover:bg-[#007a4a] text-white font-semibold py-2 px-3 rounded-md shadow-sm transition duration-150 flex items-center text-sm", children: [_jsx(ArrowLeft, { size: 16, className: "mr-1.5" }), " Voltar ao Painel"] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { htmlFor: "historical-year-select", className: "block text-sm font-medium text-gray-700 mb-1", children: "Selecione o Ano Base para Gerenciamento:" }), _jsx("select", { id: "historical-year-select", value: selectedYear, onChange: (e) => {
                            setSaveStatus(null);
                            setSelectedYear(parseInt(e.target.value));
                        }, className: "mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#00995d] focus:border-[#00995d] sm:text-sm rounded-md shadow-sm", children: yearsOptions.map(year => (_jsx("option", { value: year, children: year }, year))) })] }), _jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "p-4 border border-gray-200 rounded-lg shadow-sm", children: [_jsxs("h3", { className: "text-lg font-semibold text-[#004e4c] mb-3", children: ["IDSS Global (", selectedYear, ")"] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: `idss-global-score-${selectedYear}`, className: "block text-sm font-medium text-gray-700", children: ["Nota Final IDSS (Programa ", selectedYear + 1, ", Base ", selectedYear, "):"] }), _jsx("input", { type: "number", step: "any", id: `idss-global-score-${selectedYear}`, value: currentIdssScoreEntry?.score === null || currentIdssScoreEntry?.score === undefined ? '' : String(currentIdssScoreEntry.score), onChange: handleIdssScoreChange, placeholder: "Ex: 0.7787", className: "mt-1 block w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00995d] focus:border-[#00995d] sm:text-sm" })] })] }), _jsxs("section", { className: "p-4 border border-gray-200 rounded-lg shadow-sm", children: [_jsxs("h3", { className: "text-lg font-semibold text-[#004e4c] mb-3", children: ["Notas Finais das Dimens\u00F5es (", selectedYear, ")"] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: allDimensions.map(dim => (_jsxs("div", { children: [_jsxs("label", { htmlFor: `dim-score-${dim.id}-${selectedYear}`, className: "block text-sm font-medium text-gray-700", children: [dim.name, " (", dim.id, "):"] }), _jsx("input", { type: "number", step: "any", id: `dim-score-${dim.id}-${selectedYear}`, value: currentDimensionScoresEntry?.dimensionScores[dim.id] === null || currentDimensionScoresEntry?.dimensionScores[dim.id] === undefined ? '' : String(currentDimensionScoresEntry?.dimensionScores[dim.id]), onChange: (e) => handleDimensionScoreChange(dim.id, e), placeholder: "Ex: 0.850", className: "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00995d] focus:border-[#00995d] sm:text-sm" })] }, dim.id))) })] }), _jsxs("section", { className: "p-4 border border-gray-200 rounded-lg shadow-sm", children: [_jsxs("h3", { className: "text-lg font-semibold text-[#004e4c] mb-3", children: ["Dados dos Indicadores (", selectedYear, ")"] }), _jsx("div", { className: "space-y-6", children: initialIndicators.map(indicator => {
                                    const indicatorHistData = formData.indicatorHistoricalData.find(ih => ih.id === indicator.id);
                                    const yearEntry = indicatorHistData?.results.find(r => r.year === selectedYear);
                                    return (_jsxs("div", { className: "p-3 border border-gray-100 rounded-md bg-gray-50", children: [_jsxs("h4", { className: "text-md font-medium text-gray-800 mb-2", children: [indicator.id, " - ", indicator.name] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600", children: "Nota Final" }), _jsx("input", { type: "number", step: "any", placeholder: "Ex: 0.950", value: yearEntry?.notaFinal === null || yearEntry?.notaFinal === undefined ? '' : String(yearEntry.notaFinal), onChange: e => handleIndicatorFieldChange(indicator.id, 'notaFinal', parseNumericInput(e.target.value)), className: "mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600", children: "Resultado Consolidado" }), _jsx("input", { type: "number", step: "any", placeholder: indicator.valueLabel || "Valor", value: yearEntry?.consolidatedValue === null || yearEntry?.consolidatedValue === undefined ? '' : String(yearEntry.consolidatedValue), onChange: e => handleIndicatorFieldChange(indicator.id, 'consolidatedValue', parseNumericInput(e.target.value)), className: "mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm" })] }), indicator.requiresAuxValue && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600", children: indicator.auxValueLabel || "Valor Aux. Consolidado" }), _jsx("input", { type: "number", step: "any", placeholder: indicator.auxValueLabel || "Valor Aux.", value: yearEntry?.consolidatedAuxValue === null || yearEntry?.consolidatedAuxValue === undefined ? '' : String(yearEntry.consolidatedAuxValue), onChange: e => handleIndicatorFieldChange(indicator.id, 'consolidatedAuxValue', parseNumericInput(e.target.value)), className: "mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm" })] })), _jsxs("div", { className: "md:col-span-2 lg:col-span-1", children: [_jsxs("label", { className: "block text-xs font-medium text-gray-600", children: ["Periodicidade Usada em ", selectedYear] }), _jsxs("select", { value: yearEntry?.periodicityUsed ?? '', onChange: e => handleIndicatorFieldChange(indicator.id, 'periodicityUsed', e.target.value === "" ? null : e.target.value), className: "mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm", children: [_jsx("option", { value: "", children: "N\u00E3o Registrar Periodicidade" }), Object.values(Periodicity).map(p => _jsx("option", { value: p, children: p }, p))] })] })] }), (yearEntry?.periodicityUsed && yearEntry.periodicData && yearEntry.periodicData.length > 0) && (_jsxs("div", { className: "mt-3 pt-3 border-t border-gray-200", children: [_jsxs("h5", { className: "text-sm font-medium text-gray-700 mb-1.5", children: ["Dados Peri\u00F3dicos (", yearEntry.periodicityUsed, ", ", selectedYear, ")"] }), _jsx("div", { className: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${indicator.requiresAuxValue ? 3 : 4} gap-x-3 gap-y-2`, children: yearEntry.periodicData.map((pd, pIdx) => (_jsxs("div", { className: `flex flex-col space-y-1 ${indicator.requiresAuxValue ? '' : 'sm:col-span-1'}`, children: [_jsxs("span", { className: "text-xs text-gray-500 self-center", children: [pd.periodLabel, ":"] }), _jsxs("div", { className: "flex space-x-1", children: [_jsx("input", { type: "number", step: "any", placeholder: "Valor", value: pd.value === null || pd.value === undefined ? '' : String(pd.value), onChange: (e) => handlePeriodicDataChange(indicator.id, pIdx, 'value', e), className: "w-full text-xs p-1 border-gray-300 rounded-md shadow-sm" }), indicator.requiresAuxValue && (_jsx("input", { type: "number", step: "any", placeholder: "Aux.", value: pd.auxValue === null || pd.auxValue === undefined ? '' : String(pd.auxValue), onChange: (e) => handlePeriodicDataChange(indicator.id, pIdx, 'auxValue', e), className: "w-full text-xs p-1 border-gray-300 rounded-md shadow-sm" }))] })] }, pd.periodLabel))) })] }))] }, indicator.id));
                                }) })] }), _jsxs("div", { className: "mt-8 flex flex-col items-center", children: [_jsxs("button", { onClick: handleSubmit, disabled: isLoading, className: "w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1c3276] text-white font-semibold py-2.5 px-6 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center", children: [_jsx(Save, { size: 18, className: "mr-2" }), isLoading ? 'Salvando...' : `Salvar Dados Históricos de ${selectedYear}`] }), saveStatus && (_jsxs("div", { className: `mt-3 p-2.5 rounded-md text-sm flex items-center ${saveStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`, children: [saveStatus.type === 'success' ? _jsx(CheckCircle, { size: 18, className: "mr-2" }) : _jsx(AlertTriangle, { size: 18, className: "mr-2" }), saveStatus.message] }))] })] })] }));
};
export default HistoricalDataManagementPage;
//# sourceMappingURL=HistoricalDataManagementPage.js.map