import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { OperatorSize, IDSSDimensionName } from './types.js';
import { INITIAL_INDICATORS, DIMENSION_WEIGHTS, CURRENT_YEAR, PREVIOUS_YEARS_COUNT, getPeriodLabels } from './constants.js';
import IndicatorCard from './components/IndicatorCard.js';
import HistoricalDataManagementPage from './components/HistoricalDataManagementPage.js';
import { getGeminiAnalysis } from './services/geminiService.js';
import { ChevronLeft, Settings, Brain, ListChecks, Menu, X, AlertTriangle, BarChart3 } from 'lucide-react';
const AppHeader = ({ isMobileMenuOpen, toggleMobileMenu, operatorSize, handleOperatorSizeChange, activeReferenceYear, availableYears, handleActiveReferenceYearChange, handleOpenHistoricalDataManagement }) => {
    const NavLinks = ({ isMobile = false }) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: `flex items-center ${isMobile ? 'flex-col space-y-2 w-full' : 'space-x-2'}`, children: [_jsx("label", { htmlFor: "operator-size-select", className: "text-xs whitespace-nowrap", children: "Porte:" }), _jsx("select", { id: "operator-size-select", value: operatorSize, onChange: handleOperatorSizeChange, className: "bg-brand-text-dark text-brand-text-light border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-secondary", children: Object.values(OperatorSize).map(size => _jsx("option", { value: size, children: size }, size)) })] }), _jsxs("div", { className: `flex items-center ${isMobile ? 'flex-col space-y-2 w-full mt-2' : 'space-x-2'}`, children: [_jsx("label", { htmlFor: "active-year-select", className: "text-xs whitespace-nowrap", children: "Ano Ref.:" }), _jsx("select", { id: "active-year-select", value: activeReferenceYear, onChange: handleActiveReferenceYearChange, className: "bg-brand-text-dark text-brand-text-light border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-secondary", children: availableYears.map(year => _jsx("option", { value: year, children: year }, year)) })] }), _jsxs("button", { onClick: handleOpenHistoricalDataManagement, className: `bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-1 px-3 text-xs rounded-md shadow-sm transition duration-150 ease-in-out flex items-center justify-center ${isMobile ? 'w-full mt-3' : 'ml-2'}`, "aria-label": "Gerenciar Dados Hist\u00F3ricos Fixos", children: [_jsx(Settings, { size: 14, className: "mr-1.5" }), " Gerenciar Hist\u00F3rico"] })] }));
    return (_jsxs("header", { className: "bg-brand-primary text-brand-text-light p-4 shadow-md sticky top-0 z-20", children: [_jsxs("div", { className: "container mx-auto flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(BarChart3, { size: 32, className: "mr-3 text-brand-secondary" }), _jsx("h1", { className: "text-xl sm:text-2xl font-bold font-serif", children: "Radar IDSS" })] }), _jsx("div", { className: "hidden md:flex items-center space-x-4", children: _jsx(NavLinks, {}) }), _jsx("div", { className: "md:hidden", children: _jsx("button", { onClick: toggleMobileMenu, className: "text-white focus:outline-none", children: isMobileMenuOpen ? _jsx(X, { size: 28 }) : _jsx(Menu, { size: 28 }) }) })] }), isMobileMenuOpen && (_jsx("nav", { className: "md:hidden absolute top-full left-0 right-0 bg-[#003a38] p-4 shadow-lg z-10", children: _jsx(NavLinks, { isMobile: true }) }))] }));
};
const Dashboard = ({ idssData, activeReferenceYear, handleRequestAnalysis, handleSelectDimension }) => {
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "bg-brand-surface p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300", children: [_jsxs("h2", { className: "text-2xl font-semibold text-brand-primary mb-4", children: ["Painel Geral IDSS (", activeReferenceYear, ")"] }), _jsxs("div", { className: "text-center mb-6", children: [_jsxs("p", { className: "text-lg text-gray-700", children: ["Nota Simulada IDSS ", activeReferenceYear + 1, " (Base ", activeReferenceYear, "):"] }), _jsx("p", { className: `text-5xl font-bold my-2 ${idssData.notaFinalCalculada !== null && idssData.notaFinalCalculada >= 0.7 ? 'text-status-success' : idssData.notaFinalCalculada !== null && idssData.notaFinalCalculada >= 0.4 ? 'text-status-warning' : 'text-status-danger'}`, children: idssData.notaFinalCalculada !== null ? idssData.notaFinalCalculada.toFixed(4) : 'N/P' }), idssData.historicalIdssScores && idssData.historicalIdssScores.length > 0 && (_jsx("div", { className: "mt-4 text-gray-700", children: idssData.historicalIdssScores
                                    .sort((a, b) => b.programYear - a.programYear)
                                    .slice(0, 3)
                                    .map(score => (_jsxs("p", { className: "text-base font-semibold my-1", children: ["IDSS ", score.programYear, " (Base ", score.baseYear, "): ", _jsx("strong", { className: "text-lg", children: score.score.toFixed(4) })] }, score.programYear))) }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6", children: [_jsxs("button", { onClick: () => handleRequestAnalysis('idss', idssData), disabled: !idssData.notaFinalCalculada, className: "w-full bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-50", children: [_jsx(Brain, { size: 18, className: "mr-2" }), " An\u00E1lise Cr\u00EDtica do IDSS (", activeReferenceYear, ")"] }), _jsxs("button", { onClick: () => handleRequestAnalysis('overall_indicators', idssData.dimensions.flatMap(d => d.indicators.map(i => ({ ...i, results: i.results.filter(r => r.year === activeReferenceYear) })))), className: "w-full bg-brand-primary hover:bg-opacity-90 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center", children: [_jsx(ListChecks, { size: 18, className: "mr-2" }), " Vis\u00E3o Geral dos Indicadores (", activeReferenceYear, ")"] })] }), idssData.analysis && (_jsxs("div", { className: "mt-4 p-4 bg-custom-light-green-analysis border border-custom-light-green-border rounded-md shadow", children: [_jsxs("h4", { className: "font-semibold text-slate-800 mb-2", children: ["An\u00E1lise IDSS (", activeReferenceYear, "):"] }), _jsx("p", { className: "text-sm text-slate-700 whitespace-pre-wrap", children: idssData.analysis })] })), idssData.error && _jsxs("p", { className: "text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 16, className: "inline mr-1" }), " ", idssData.error] }), idssData.overallIndicatorAnalysis && (_jsxs("div", { className: "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md shadow", children: [_jsxs("h4", { className: "font-semibold text-blue-800 mb-2", children: ["Vis\u00E3o Geral dos Indicadores (", activeReferenceYear, "):"] }), _jsx("p", { className: "text-sm text-blue-700 whitespace-pre-wrap", children: idssData.overallIndicatorAnalysis })] })), idssData.overallIndicatorError && _jsxs("p", { className: "text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 16, className: "inline mr-1" }), " ", idssData.overallIndicatorError] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: idssData.dimensions.map(dim => (_jsxs("div", { className: "bg-brand-surface p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col", children: [_jsxs("h3", { className: "text-xl font-semibold text-brand-primary mb-2", children: [dim.name, " (", dim.id, ")"] }), _jsxs("p", { className: "text-sm text-gray-600 mb-1", children: ["Peso no IDSS: ", _jsxs("span", { className: "font-medium", children: [(dim.weightInIDSS * 100).toFixed(0), "%"] })] }), _jsxs("p", { className: "text-md text-gray-700 mb-3", children: ["Nota Simulada (", activeReferenceYear, "):", _jsx("span", { className: `font-bold text-xl ml-2 ${dim.notaFinalCalculada !== null && dim.notaFinalCalculada >= 0.7 ? 'text-status-success' : dim.notaFinalCalculada !== null && dim.notaFinalCalculada >= 0.4 ? 'text-status-warning' : 'text-status-danger'}`, children: dim.notaFinalCalculada !== null ? dim.notaFinalCalculada.toFixed(4) : 'N/P' })] }), _jsxs("button", { onClick: () => handleRequestAnalysis('dimension', dim), disabled: dim.notaFinalCalculada === null, className: "w-full bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-2 px-3 text-sm rounded-md shadow-sm transition duration-150 ease-in-out mb-3 flex items-center justify-center disabled:opacity-50", children: [_jsx(Brain, { size: 16, className: "mr-2" }), " An\u00E1lise da Dimens\u00E3o"] }), dim.analysis && (_jsxs("div", { className: "my-2 p-3 bg-custom-light-green-analysis border border-custom-light-green-border rounded-md text-xs text-slate-700 whitespace-pre-wrap", children: [_jsx("h5", { className: "font-semibold text-slate-800 mb-1", children: "An\u00E1lise Dimens\u00E3o:" }), dim.analysis] })), dim.error && _jsxs("p", { className: "text-xs text-red-600 mt-1 p-1.5 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 14, className: "inline mr-1" }), " ", dim.error] }), _jsxs("div", { className: "border-t border-gray-200 mt-3 pt-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h4", { className: "text-sm font-medium text-gray-700", children: ["Indicadores (", activeReferenceYear, "):"] }), _jsx("span", { className: "text-xs text-gray-500", children: "Nota Simulada" })] }), _jsx("ul", { className: "space-y-1 mt-1 text-xs", children: dim.indicators.map(ind => {
                                        const resultForYear = ind.results.find(r => r.year === activeReferenceYear);
                                        return (_jsxs("li", { className: "flex justify-between items-center py-1", children: [_jsxs("span", { className: "text-gray-600 w-4/5 truncate", title: ind.name, children: [ind.id, " - ", ind.name] }), _jsx("span", { className: `font-semibold w-1/5 text-right ${resultForYear?.notaFinal !== null && resultForYear?.notaFinal !== undefined ? (resultForYear.notaFinal >= 0.7 ? 'text-status-success' : resultForYear.notaFinal >= 0.4 ? 'text-status-warning' : 'text-status-danger') : 'text-gray-400'}`, children: resultForYear?.notaFinal !== null && resultForYear?.notaFinal !== undefined ? resultForYear.notaFinal.toFixed(3) : 'N/P' })] }, ind.id));
                                    }) })] }), _jsx("button", { onClick: () => handleSelectDimension(dim.id), className: "mt-auto bg-brand-accent hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out text-sm", children: "Ver Detalhes da Dimens\u00E3o" })] }, dim.id))) })] }));
};
const DimensionDetailView = ({ dimension, activeReferenceYear, handleBackToDashboard, handleRequestAnalysis, onUpdateIndicator, operatorSize }) => {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("button", { onClick: handleBackToDashboard, className: "mb-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 flex items-center", children: [_jsx(ChevronLeft, { size: 18, className: "mr-2" }), " Voltar ao Painel"] }), _jsxs("h2", { className: "text-2xl font-semibold text-brand-primary mb-4", children: [dimension.name, " (", activeReferenceYear, ")"] }), _jsxs("p", { className: "text-md text-gray-700 mb-1", children: ["Peso no IDSS: ", _jsxs("span", { className: "font-medium", children: [(dimension.weightInIDSS * 100).toFixed(0), "%"] })] }), _jsxs("p", { className: "text-lg text-gray-700 mb-4", children: ["Nota Simulada da Dimens\u00E3o (", activeReferenceYear, "):", _jsx("span", { className: `font-bold text-2xl ml-2 ${dimension.notaFinalCalculada !== null && dimension.notaFinalCalculada >= 0.7 ? 'text-status-success' : dimension.notaFinalCalculada !== null && dimension.notaFinalCalculada >= 0.4 ? 'text-status-warning' : 'text-status-danger'}`, children: dimension.notaFinalCalculada !== null ? dimension.notaFinalCalculada.toFixed(4) : 'N/P' })] }), _jsxs("button", { onClick: () => handleRequestAnalysis('dimension', dimension), disabled: dimension.notaFinalCalculada === null, className: "w-full md:w-1/2 bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out mb-4 flex items-center justify-center disabled:opacity-50", children: [_jsx(Brain, { size: 18, className: "mr-2" }), " An\u00E1lise Cr\u00EDtica da Dimens\u00E3o (", activeReferenceYear, ")"] }), dimension.analysis && (_jsxs("div", { className: "my-3 p-4 bg-custom-light-green-analysis border border-custom-light-green-border rounded-md text-sm text-slate-700 whitespace-pre-wrap shadow", children: [_jsxs("h5", { className: "font-semibold text-slate-800 mb-1", children: ["An\u00E1lise da Dimens\u00E3o (", activeReferenceYear, "):"] }), dimension.analysis] })), dimension.error && _jsxs("p", { className: "text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 16, className: "inline mr-1" }), " ", dimension.error] }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6", children: dimension.indicators.map(indicator => (_jsx(IndicatorCard, { indicator: indicator, onUpdateIndicator: onUpdateIndicator, operatorSize: operatorSize, activeReferenceYear: activeReferenceYear }, indicator.id))) })] }));
};
// #endregion --- End Sub-components ---
const App = () => {
    const [idssData, setIdssData] = useState(null);
    const [historicalData, setHistoricalData] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedDimensionId, setSelectedDimensionId] = useState(null);
    const [operatorSize, setOperatorSize] = useState(OperatorSize.PEQUENO);
    const [activeReferenceYear, setActiveReferenceYear] = useState(CURRENT_YEAR);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const availableYears = useMemo(() => {
        const years = new Set();
        idssData?.dimensions?.forEach(dim => dim.indicators?.forEach(ind => ind.results?.forEach(res => years.add(res.year))));
        for (let i = -PREVIOUS_YEARS_COUNT; i <= 2; i++) {
            years.add(CURRENT_YEAR + i);
        }
        if (years.size === 0) { // Fallback
            return Array.from({ length: PREVIOUS_YEARS_COUNT + 3 }, (_, i) => CURRENT_YEAR + 2 - i);
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [idssData]);
    const initializeIndicatorResultForYear = useCallback((indicator, year) => {
        const periodLabels = getPeriodLabels(indicator.currentPeriodicity);
        return {
            year: year,
            periodicData: periodLabels.map((label) => ({ periodLabel: label, value: null, auxValue: null })),
            consolidatedValue: null,
            consolidatedAuxValue: null,
            notaFinal: null,
        };
    }, []);
    const calculateNotaFinalIndicador = useCallback((indicator, result) => {
        return indicator.calcularNotaFinalFn(result.consolidatedValue, result.consolidatedAuxValue, operatorSize, indicator.parametersByPorte);
    }, [operatorSize]);
    const calculateNotaFinalDimensao = useCallback((dimension, year) => {
        let weightedSum = 0;
        let totalWeight = 0;
        dimension.indicators.forEach(indicator => {
            const resultForYear = indicator.results.find(r => r.year === year);
            if (resultForYear && resultForYear.notaFinal !== null) {
                weightedSum += resultForYear.notaFinal * indicator.weightInDimension;
                totalWeight += indicator.weightInDimension;
            }
        });
        return totalWeight > 0 ? parseFloat((weightedSum / totalWeight).toFixed(4)) : null;
    }, []);
    const calculateNotaFinalIDSS = useCallback((currentDimensions) => {
        let overallWeightedSum = 0;
        let overallTotalWeight = 0;
        currentDimensions.forEach(dimension => {
            if (dimension.notaFinalCalculada !== null) {
                overallWeightedSum += dimension.notaFinalCalculada * dimension.weightInIDSS;
                overallTotalWeight += dimension.weightInIDSS;
            }
        });
        return overallTotalWeight > 0 ? parseFloat((overallWeightedSum / overallTotalWeight).toFixed(4)) : null;
    }, []);
    // #region --- Data Loading and Processing ---
    const processAndMergeData = useCallback((idssJsonData, historicalJsonData) => {
        const allPossibleYears = new Set();
        for (let i = -PREVIOUS_YEARS_COUNT; i <= 2; i++)
            allPossibleYears.add(CURRENT_YEAR + i);
        idssJsonData.dimensions?.flatMap(d => d.indicators?.flatMap(i => i.results?.map(r => r.year))).filter(y => y).forEach(y => allPossibleYears.add(y));
        historicalJsonData?.indicatorHistoricalData?.flatMap(i => i.results?.map(r => r.year)).filter(y => y).forEach(y => allPossibleYears.add(y));
        const yearsForInitialization = Array.from(allPossibleYears).sort((a, b) => b - a);
        const baseDimensions = Object.keys(DIMENSION_WEIGHTS).map(dimId => ({
            id: dimId,
            name: dimId === IDSSDimensionName.IDQS ? "Qualidade em Atenção à Saúde" : dimId === IDSSDimensionName.IDGA ? "Garantia de Acesso" : dimId === IDSSDimensionName.IDSM ? "Sustentabilidade no Mercado" : "Gestão de Processos e Regulação",
            weightInIDSS: DIMENSION_WEIGHTS[dimId],
            indicators: [],
            notaFinalCalculada: null
        }));
        const processedDimensions = INITIAL_INDICATORS.reduce((acc, templateIndicator) => {
            const dim = acc.find(d => d.id === templateIndicator.dimensionId);
            if (dim) {
                const existingIndicatorInJson = idssJsonData.dimensions?.flatMap(d => d.indicators)?.find(i => i.id === templateIndicator.id);
                const mergedIndicator = {
                    ...templateIndicator,
                    ...(existingIndicatorInJson || {}),
                    results: [],
                    currentPeriodicity: existingIndicatorInJson?.currentPeriodicity || templateIndicator.currentPeriodicity,
                };
                mergedIndicator.results = yearsForInitialization.map(year => {
                    const jsonResultForYear = existingIndicatorInJson?.results?.find(r => r.year === year);
                    if (jsonResultForYear) {
                        const periodicityForThisYear = mergedIndicator.currentPeriodicity;
                        const periodLabels = getPeriodLabels(periodicityForThisYear);
                        const validatedPeriodicData = periodLabels.map(label => {
                            const existingPdEntry = jsonResultForYear.periodicData?.find(pd => pd.periodLabel === label);
                            return { periodLabel: label, value: existingPdEntry?.value ?? null, auxValue: existingPdEntry?.auxValue ?? null };
                        });
                        return { ...initializeIndicatorResultForYear(templateIndicator, year), ...jsonResultForYear, periodicData: validatedPeriodicData };
                    }
                    return initializeIndicatorResultForYear(templateIndicator, year);
                }).sort((a, b) => b.year - a.year);
                dim.indicators.push(mergedIndicator);
            }
            return acc;
        }, baseDimensions);
        return {
            dimensions: processedDimensions,
            notaFinalCalculada: null,
            historicalIdssScores: historicalJsonData?.idssHistoricalScores || [],
        };
    }, [initializeIndicatorResultForYear]);
    const loadInitialData = useCallback(async () => {
        setIsInitialLoad(true);
        setGlobalError(null);
        try {
            const [idssResponse, historicalResponse] = await Promise.all([
                fetch('/idss_data.json'),
                fetch('/historical_data.json')
            ]);
            if (!idssResponse.ok)
                throw new Error(`Falha ao carregar idss_data.json: ${idssResponse.statusText}`);
            if (!historicalResponse.ok)
                throw new Error(`Falha ao carregar historical_data.json: ${historicalResponse.statusText}`);
            const idssJsonData = await idssResponse.json();
            const historicalJsonData = await historicalResponse.json();
            setHistoricalData(historicalJsonData);
            const finalIdssData = processAndMergeData(idssJsonData, historicalJsonData);
            setIdssData(finalIdssData);
        }
        catch (error) {
            console.error("[App] Error during initial data load:", error);
            setGlobalError(`Erro ao carregar dados: ${error instanceof Error ? error.message : String(error)}. Verifique os arquivos JSON e a conexão.`);
            // Setup a fallback structure so the app doesn't crash
            const fallbackData = processAndMergeData({ dimensions: [], notaFinalCalculada: null }, null);
            setIdssData(fallbackData);
        }
        finally {
            setIsInitialLoad(false);
        }
    }, [processAndMergeData]);
    useEffect(() => { loadInitialData(); }, [loadInitialData]);
    // #endregion
    // Recalculation Effect
    useEffect(() => {
        if (!idssData || isInitialLoad)
            return;
        const updatedDimensions = idssData.dimensions.map(dim => {
            const updatedIndicators = dim.indicators.map(ind => {
                let resultForActiveYear = ind.results.find(r => r.year === activeReferenceYear);
                if (!resultForActiveYear) {
                    resultForActiveYear = initializeIndicatorResultForYear(ind, activeReferenceYear);
                    ind.results = [...ind.results, resultForActiveYear].sort((a, b) => b.year - a.year);
                }
                const notaFinalIndicador = calculateNotaFinalIndicador(ind, resultForActiveYear);
                return { ...ind, results: ind.results.map(r => r.year === activeReferenceYear ? { ...r, notaFinal: notaFinalIndicador } : r) };
            });
            const notaFinalDim = calculateNotaFinalDimensao({ ...dim, indicators: updatedIndicators }, activeReferenceYear);
            return { ...dim, indicators: updatedIndicators, notaFinalCalculada: notaFinalDim };
        });
        const notaFinalIdssGlobal = calculateNotaFinalIDSS(updatedDimensions);
        setIdssData(prev => prev ? ({ ...prev, dimensions: updatedDimensions, notaFinalCalculada: notaFinalIdssGlobal }) : null);
    }, [idssData?.dimensions, activeReferenceYear, operatorSize, calculateNotaFinalIndicador, calculateNotaFinalDimensao, calculateNotaFinalIDSS, isInitialLoad, initializeIndicatorResultForYear]);
    const handleUpdateIndicator = useCallback((updatedIndicator) => {
        setIdssData(prevIdssData => {
            if (!prevIdssData)
                return null;
            const newDimensions = prevIdssData.dimensions.map(dim => dim.id === updatedIndicator.dimensionId
                ? { ...dim, indicators: dim.indicators.map(ind => ind.id === updatedIndicator.id ? updatedIndicator : ind) }
                : dim);
            return { ...prevIdssData, dimensions: newDimensions };
        });
    }, []);
    // #region --- Handlers ---
    const handleSelectDimension = (dimensionId) => {
        setSelectedDimensionId(dimensionId);
        setCurrentView('dimensionDetail');
        setIsMobileMenuOpen(false);
    };
    const handleBackToDashboard = () => {
        setSelectedDimensionId(null);
        setCurrentView('dashboard');
        setIsMobileMenuOpen(false);
    };
    const handleOperatorSizeChange = (event) => {
        setOperatorSize(event.target.value);
        setIsMobileMenuOpen(false);
    };
    const handleActiveReferenceYearChange = (event) => {
        setActiveReferenceYear(parseInt(event.target.value));
        setIsMobileMenuOpen(false);
    };
    const handleRequestAnalysis = async (type, data) => {
        if (!idssData) {
            setGlobalError("Dados da aplicação não carregados. Não é possível realizar a análise.");
            return;
        }
        const requestPayload = { type, operatorSize, activeReferenceYear, [type === 'idss' ? 'idssData' : 'data']: data };
        let updatePath = null;
        if (type === 'dimension') {
            updatePath = (prev, analysis, error) => ({ ...prev, dimensions: prev.dimensions.map(d => d.id === data.id ? { ...d, analysis, error } : d) });
        }
        else if (type === 'idss') {
            updatePath = (prev, analysis, error) => ({ ...prev, analysis, error });
        }
        else if (type === 'overall_indicators') {
            updatePath = (prev, analysis, error) => ({ ...prev, overallIndicatorAnalysis: analysis, overallIndicatorError: error });
        }
        else {
            console.warn(`Analysis type ${type} should be handled locally in its component.`);
            return;
        }
        if (!updatePath) {
            setGlobalError(`Tipo de análise inválido: ${type}.`);
            return;
        }
        // Clear previous state and set loading
        const finalUpdatePath = updatePath;
        setIdssData(prev => prev ? finalUpdatePath(prev, '', undefined) : null);
        try {
            const analysisResult = await getGeminiAnalysis(requestPayload);
            setIdssData(prev => prev ? finalUpdatePath(prev, analysisResult) : null);
        }
        catch (error) {
            setIdssData(prev => prev ? finalUpdatePath(prev, '', error.message || `Erro ao gerar análise para ${type}`) : null);
        }
    };
    const handleOpenHistoricalDataManagement = () => {
        setCurrentView('historicalDataManagement');
        setIsMobileMenuOpen(false);
    };
    const handleHistoricalDataUpdated = async () => {
        try {
            const response = await fetch('/historical_data.json?cachebust=' + new Date().getTime()); // cache bust
            if (!response.ok)
                throw new Error('Falha ao recarregar dados históricos.');
            const updatedHistoricalData = await response.json();
            setHistoricalData(updatedHistoricalData);
            setIdssData(prev => prev ? { ...prev, historicalIdssScores: updatedHistoricalData.idssHistoricalScores || prev.historicalIdssScores || [] } : null);
        }
        catch (error) {
            setGlobalError("Falha ao recarregar os dados históricos após a atualização.");
        }
    };
    // #endregion
    const selectedDimension = idssData?.dimensions.find(d => d.id === selectedDimensionId);
    // #region --- Render Logic ---
    if (globalError) {
        return (_jsxs("div", { className: "min-h-screen bg-brand-background flex flex-col", children: [_jsx(AppHeader, { isMobileMenuOpen: false, toggleMobileMenu: () => { }, operatorSize: operatorSize, handleOperatorSizeChange: () => { }, activeReferenceYear: activeReferenceYear, availableYears: availableYears, handleActiveReferenceYearChange: () => { }, handleOpenHistoricalDataManagement: () => { } }), _jsx("div", { className: "container mx-auto p-4 sm:p-6 flex-grow flex flex-col items-center justify-center", children: _jsxs("div", { className: "bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-lg max-w-2xl w-full", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx(AlertTriangle, { size: 24, className: "text-red-500 mr-3" }), _jsx("h2", { className: "text-xl font-semibold", children: "Erro na Aplica\u00E7\u00E3o" })] }), _jsx("p", { className: "text-sm font-mono bg-red-50 p-2 rounded border border-red-200", children: globalError }), _jsx("button", { onClick: loadInitialData, className: "mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-xs", children: "Tentar Recarregar" })] }) }), _jsxs("footer", { className: "bg-brand-primary text-brand-text-light text-center p-3 text-xs", children: ["Radar IDSS \u00A9 ", new Date().getFullYear()] })] }));
    }
    if (isInitialLoad || !idssData) {
        return (_jsxs("div", { className: "flex flex-col justify-center items-center h-screen bg-brand-background", children: [_jsx("div", { className: "animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-accent" }), _jsx("p", { className: "mt-6 text-xl text-brand-primary font-semibold", children: "Carregando Dados e Configura\u00E7\u00F5es..." })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-brand-background flex flex-col", children: [_jsx(AppHeader, { isMobileMenuOpen: isMobileMenuOpen, toggleMobileMenu: () => setIsMobileMenuOpen(!isMobileMenuOpen), operatorSize: operatorSize, handleOperatorSizeChange: handleOperatorSizeChange, activeReferenceYear: activeReferenceYear, availableYears: availableYears, handleActiveReferenceYearChange: handleActiveReferenceYearChange, handleOpenHistoricalDataManagement: handleOpenHistoricalDataManagement }), _jsxs("div", { className: "bg-brand-surface shadow-md p-4 sm:p-6 my-4 text-sm text-gray-800 container mx-auto rounded-lg", children: [_jsx("p", { className: "mb-2", children: "Radar IDSS \u00E9 um dashboard que permite visualizar a simula\u00E7\u00E3o do IDSS (indicadores, dimens\u00F5es e nota final da operadora), bem como solicitar an\u00E1lises dos resultados. As an\u00E1lises s\u00E3o feitas pelo Google Gemini com base em configura\u00E7\u00F5es pr\u00E9vias baseadas nas fichas t\u00E9cnicas do IDSS." }), _jsxs("p", { children: ["Desenvolvimento: ", _jsx("a", { href: "https://www.linkedin.com/in/f%C3%A1bio-guimar%C3%A3es-adv/", target: "_blank", rel: "noopener noreferrer", className: "text-brand-primary hover:text-brand-secondary underline font-medium", children: "F\u00E1bio Guimar\u00E3es" })] })] }), _jsxs("main", { className: "container mx-auto p-4 sm:p-6 flex-grow", children: [currentView === 'dashboard' && _jsx(Dashboard, { idssData: idssData, activeReferenceYear: activeReferenceYear, handleRequestAnalysis: handleRequestAnalysis, handleSelectDimension: handleSelectDimension }), currentView === 'dimensionDetail' && selectedDimension && _jsx(DimensionDetailView, { dimension: selectedDimension, activeReferenceYear: activeReferenceYear, handleBackToDashboard: handleBackToDashboard, handleRequestAnalysis: handleRequestAnalysis, onUpdateIndicator: handleUpdateIndicator, operatorSize: operatorSize }), currentView === 'historicalDataManagement' && _jsx(HistoricalDataManagementPage, { onClose: handleBackToDashboard, initialIndicators: INITIAL_INDICATORS, allDimensions: idssData.dimensions, currentHistoricalData: historicalData, onHistoricalDataUpdated: handleHistoricalDataUpdated })] }), _jsxs("footer", { className: "bg-brand-primary text-brand-text-light text-center p-3 text-xs", children: ["Radar IDSS \u00A9 ", new Date().getFullYear(), " - Ferramenta de An\u00E1lise e Simula\u00E7\u00E3o."] })] }));
    // #endregion
};
export default App;
//# sourceMappingURL=App.js.map