import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { OperatorSize, IDSSDimensionName } from './types';
import { INITIAL_INDICATORS, DIMENSION_WEIGHTS, CURRENT_YEAR, PREVIOUS_YEARS_COUNT, getPeriodLabels } from './constants';
import IndicatorCard from './components/IndicatorCard';
import HistoricalDataManagementPage from './components/HistoricalDataManagementPage';
import { getGeminiAnalysis } from './services/geminiService';
import { ChevronLeft, Brain, BarChart3, ListChecks, Menu, X, AlertTriangle } from 'lucide-react';
const App = () => {
    console.log("[App.tsx DEBUG] App component mounting/rendering.");
    const [idssData, setIdssData] = useState(null);
    const [historicalData, setHistoricalData] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedDimensionId, setSelectedDimensionId] = useState(null);
    const [selectedIndicatorId, setSelectedIndicatorId] = useState(null); // For potential future use: direct indicator view
    const [operatorSize, setOperatorSize] = useState(OperatorSize.PEQUENO);
    const [activeReferenceYear, setActiveReferenceYear] = useState(CURRENT_YEAR);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const availableYears = useMemo(() => {
        const years = new Set();
        idssData?.dimensions.forEach(dim => dim.indicators.forEach(ind => ind.results.forEach(res => years.add(res.year))));
        // Add current year and some future/past years for selection
        for (let i = -PREVIOUS_YEARS_COUNT; i <= 2; i++) {
            years.add(CURRENT_YEAR + i);
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [idssData]);
    const initializeIndicatorResultForYear = (indicator, year) => {
        console.log(`[App.tsx DEBUG] initializeIndicatorResultForYear called for Indicator ID: ${indicator.id}, Year: ${year}, CurrentPeriodicity: ${indicator.currentPeriodicity}`);
        const periodLabels = getPeriodLabels(indicator.currentPeriodicity);
        return {
            year: year,
            periodicData: periodLabels.map(label => ({ periodLabel: label, value: null, auxValue: null })),
            consolidatedValue: null,
            consolidatedAuxValue: null,
            notaFinal: null,
        };
    };
    const calculateNotaFinalIndicador = useCallback((indicator, result) => {
        return indicator.calcularNotaFinalFn(result.consolidatedValue, result.consolidatedAuxValue, operatorSize, indicator.parametersByPorte);
    }, [operatorSize]);
    const calculateNotaFinalDimensao = useCallback((dimension, year) => {
        console.log(`[App.tsx DEBUG] Calculating score for Dimension ID: ${dimension.id}, Year: ${year}`);
        let weightedSum = 0;
        let totalWeight = 0;
        dimension.indicators.forEach(indicator => {
            const resultForYear = indicator.results.find(r => r.year === year);
            if (resultForYear && resultForYear.notaFinal !== null) {
                weightedSum += resultForYear.notaFinal * indicator.weightInDimension;
                totalWeight += indicator.weightInDimension;
            }
        });
        const score = totalWeight > 0 ? parseFloat((weightedSum / totalWeight).toFixed(4)) : null;
        console.log(`[App.tsx DEBUG] Dimension ${dimension.id} Year ${year} WeightedSum: ${weightedSum}, TotalWeight: ${totalWeight}, Score: ${score}`);
        return score;
    }, []);
    const calculateNotaFinalIDSS = useCallback((currentDimensions, year) => {
        console.log(`[App.tsx DEBUG] Calculating overall IDSS score for Year: ${year}`);
        let overallWeightedSum = 0;
        let overallTotalWeight = 0;
        currentDimensions.forEach(dimension => {
            const dimensionScoreForYear = dimension.notaFinalCalculada; // This should be pre-calculated for the year
            if (dimensionScoreForYear !== null) {
                overallWeightedSum += dimensionScoreForYear * dimension.weightInIDSS;
                overallTotalWeight += dimension.weightInIDSS;
            }
        });
        const score = overallTotalWeight > 0 ? parseFloat((overallWeightedSum / overallTotalWeight).toFixed(4)) : null;
        console.log(`[App.tsx DEBUG] IDSS Year ${year} OverallWeightedSum: ${overallWeightedSum}, OverallTotalWeight: ${overallTotalWeight}, Score: ${score}`);
        return score;
    }, []);
    // Effect for initial data loading
    useEffect(() => {
        console.log("[App.tsx DEBUG] Initial data loading useEffect triggered.");
        setIsInitialLoad(true);
        setGlobalError(null);
        const fetchData = async () => {
            try {
                // Fetch operational IDSS data
                const idssResponse = await fetch('./idss_data.json');
                console.log("[App.tsx DEBUG] Fetched idss_data.json, status:", idssResponse.status);
                if (!idssResponse.ok)
                    throw new Error(`Failed to fetch idss_data.json: ${idssResponse.statusText}`);
                const idssJsonData = await idssResponse.json();
                console.log("[App.tsx DEBUG] Parsed idss_data.json.");
                // Fetch historical data
                const historicalResponse = await fetch('./historical_data.json');
                console.log("[App.tsx DEBUG] Fetched historical_data.json, status:", historicalResponse.status);
                if (!historicalResponse.ok)
                    throw new Error(`Failed to fetch historical_data.json: ${historicalResponse.statusText}`);
                const historicalJsonData = await historicalResponse.json();
                console.log("[App.tsx DEBUG] Parsed historical_data.json.");
                setHistoricalData(historicalJsonData);
                // Process and set IDSS data
                const processedDimensions = INITIAL_INDICATORS.reduce((acc, templateIndicator) => {
                    const dim = acc.find(d => d.id === templateIndicator.dimensionId);
                    if (dim) {
                        let existingIndicatorInJson = idssJsonData.dimensions
                            .flatMap(d => d.indicators)
                            .find(i => i.id === templateIndicator.id);
                        const mergedIndicator = {
                            ...templateIndicator,
                            ...(existingIndicatorInJson || {}), // Prioritize data from JSON if it exists
                            results: templateIndicator.results, // Start with template results definition
                            currentPeriodicity: existingIndicatorInJson?.currentPeriodicity || templateIndicator.currentPeriodicity,
                        };
                        // Merge results from JSON with template structure, ensuring all defined years exist
                        const allYears = new Set();
                        availableYears.forEach(y => allYears.add(y)); // Use availableYears from context
                        (existingIndicatorInJson?.results || []).forEach(r => allYears.add(r.year));
                        mergedIndicator.results = Array.from(allYears).map(year => {
                            const jsonResultForYear = existingIndicatorInJson?.results.find(r => r.year === year);
                            if (jsonResultForYear) {
                                // Ensure periodicData matches currentPeriodicity for that year if it exists
                                const periodicityForThisYear = existingIndicatorInJson?.currentPeriodicity || templateIndicator.currentPeriodicity; // Simplified for this step
                                const periodLabels = getPeriodLabels(periodicityForThisYear);
                                const validatedPeriodicData = periodLabels.map(label => {
                                    const existingPdEntry = jsonResultForYear.periodicData?.find(pd => pd.periodLabel === label);
                                    return { periodLabel: label, value: existingPdEntry?.value ?? null, auxValue: existingPdEntry?.auxValue ?? null };
                                });
                                return {
                                    ...initializeIndicatorResultForYear(mergedIndicator, year), // provides base structure
                                    ...jsonResultForYear, // overrides with JSON data
                                    periodicData: validatedPeriodicData, // use validated periodic data
                                };
                            }
                            return initializeIndicatorResultForYear(mergedIndicator, year);
                        }).sort((a, b) => b.year - a.year);
                        dim.indicators.push(mergedIndicator);
                    }
                    return acc;
                }, DIMENSION_WEIGHTS ? Object.keys(DIMENSION_WEIGHTS).map(dimId => ({
                    id: dimId,
                    name: dimId === IDSSDimensionName.IDQS ? "Qualidade em Atenção à Saúde" :
                        dimId === IDSSDimensionName.IDGA ? "Garantia de Acesso" :
                            dimId === IDSSDimensionName.IDSM ? "Sustentabilidade no Mercado" :
                                "Gestão de Processos e Regulação",
                    weightInIDSS: DIMENSION_WEIGHTS[dimId],
                    indicators: [], // Corrected here
                    notaFinalCalculada: null
                })) : []);
                const finalIdssData = {
                    dimensions: processedDimensions,
                    notaFinalCalculada: null, // Will be calculated
                    historicalIdssScores: historicalJsonData?.idssHistoricalScores || [],
                };
                console.log("[App.tsx DEBUG] Processed IDSS data before setting state.");
                setIdssData(finalIdssData);
            }
            catch (error) {
                console.error("[App.tsx DEBUG] Error during initial data load:", error);
                setGlobalError(`Erro ao carregar dados iniciais: ${error instanceof Error ? error.message : String(error)}. Verifique os arquivos JSON.`);
                // Fallback to basic structure if JSON loading fails completely
                const fallbackDimensions = INITIAL_INDICATORS.reduce((acc, templateIndicator) => {
                    const dim = acc.find(d => d.id === templateIndicator.dimensionId);
                    if (dim) {
                        const initializedIndicator = { ...templateIndicator };
                        initializedIndicator.results = availableYears.map(year => initializeIndicatorResultForYear(initializedIndicator, year))
                            .sort((a, b) => b.year - a.year);
                        dim.indicators.push(initializedIndicator);
                    }
                    return acc;
                }, Object.keys(DIMENSION_WEIGHTS).map(dimId => ({
                    id: dimId,
                    name: dimId === IDSSDimensionName.IDQS ? "Qualidade em Atenção à Saúde" :
                        dimId === IDSSDimensionName.IDGA ? "Garantia de Acesso" :
                            dimId === IDSSDimensionName.IDSM ? "Sustentabilidade no Mercado" :
                                "Gestão de Processos e Regulação",
                    weightInIDSS: DIMENSION_WEIGHTS[dimId],
                    indicators: [], // Corrected here
                    notaFinalCalculada: null
                })));
                setIdssData({ dimensions: fallbackDimensions, notaFinalCalculada: null });
                setHistoricalData(initializeEmptyHistoricalData());
            }
            finally {
                setIsInitialLoad(false);
                console.log("[App.tsx DEBUG] Initial data loading useEffect finished. isInitialLoad set to false.");
            }
        };
        fetchData();
    }, []); // Empty dependency array ensures this runs only once on mount
    // Effect to recalculate all scores when idssData changes or activeReferenceYear changes
    useEffect(() => {
        console.log(`[App.tsx DEBUG] Recalculation useEffect triggered. activeReferenceYear: ${activeReferenceYear}, idssData changed.`);
        if (!idssData || isInitialLoad) {
            console.log("[App.tsx DEBUG] Skipping recalculation: no idssData or initial load is true.");
            return;
        }
        const updatedDimensions = idssData.dimensions.map(dim => {
            const updatedIndicators = dim.indicators.map(ind => {
                let resultForActiveYear = ind.results.find(r => r.year === activeReferenceYear);
                if (!resultForActiveYear) {
                    // If no result object exists for the active year, create one
                    resultForActiveYear = initializeIndicatorResultForYear(ind, activeReferenceYear);
                    // Add it to the indicator's results array, maintaining sort order might be needed if not already sorted
                    const otherResults = ind.results.filter(r => r.year !== activeReferenceYear);
                    ind.results = [...otherResults, resultForActiveYear].sort((a, b) => b.year - a.year);
                }
                const notaFinalIndicador = calculateNotaFinalIndicador(ind, resultForActiveYear);
                return {
                    ...ind,
                    results: ind.results.map(r => r.year === activeReferenceYear ? { ...r, notaFinal: notaFinalIndicador } : r)
                };
            });
            const notaFinalDim = calculateNotaFinalDimensao({ ...dim, indicators: updatedIndicators }, activeReferenceYear);
            return { ...dim, indicators: updatedIndicators, notaFinalCalculada: notaFinalDim };
        });
        const notaFinalIdssGlobal = calculateNotaFinalIDSS(updatedDimensions, activeReferenceYear);
        console.log("[App.tsx DEBUG] Recalculation finished. Updating idssData state.");
        setIdssData(prev => ({ ...prev, dimensions: updatedDimensions, notaFinalCalculada: notaFinalIdssGlobal }));
    }, [idssData?.dimensions, activeReferenceYear, operatorSize, calculateNotaFinalIndicador, calculateNotaFinalDimensao, calculateNotaFinalIDSS, isInitialLoad]);
    const handleUpdateIndicator = useCallback((updatedIndicator) => {
        console.log(`[App.tsx DEBUG] handleUpdateIndicator called for Indicator ID: ${updatedIndicator.id}`);
        setIdssData(prevIdssData => {
            if (!prevIdssData)
                return null;
            const newDimensions = prevIdssData.dimensions.map(dim => {
                if (dim.id === updatedIndicator.dimensionId) {
                    return {
                        ...dim,
                        indicators: dim.indicators.map(ind => ind.id === updatedIndicator.id ? updatedIndicator : ind),
                    };
                }
                return dim;
            });
            // Trigger full recalculation by returning a new object structure
            return { ...prevIdssData, dimensions: newDimensions };
        });
    }, []);
    const handleSelectDimension = (dimensionId, indicatorId) => {
        console.log(`[App.tsx DEBUG] handleSelectDimension called. Dimension ID: ${dimensionId}, Indicator ID: ${indicatorId}`);
        setSelectedDimensionId(dimensionId);
        setSelectedIndicatorId(indicatorId || null); // Store indicator ID if provided
        setCurrentView(dimensionId ? 'dimensionDetail' : 'dashboard');
        setIsMobileMenuOpen(false);
    };
    const handleBackToDashboard = () => {
        console.log("[App.tsx DEBUG] handleBackToDashboard called.");
        setSelectedDimensionId(null);
        setSelectedIndicatorId(null);
        setCurrentView('dashboard');
        setIsMobileMenuOpen(false);
    };
    const handleOperatorSizeChange = (event) => {
        console.log(`[App.tsx DEBUG] handleOperatorSizeChange called. New size: ${event.target.value}`);
        setOperatorSize(event.target.value);
        setIsMobileMenuOpen(false);
    };
    const handleActiveReferenceYearChange = (event) => {
        const newYear = parseInt(event.target.value);
        console.log(`[App.tsx DEBUG] handleActiveReferenceYearChange called. New year: ${newYear}`);
        setActiveReferenceYear(newYear);
        setIsMobileMenuOpen(false);
    };
    const handleRequestAnalysis = async (type, data // data will be structured based on 'type'
    ) => {
        console.log(`[App.tsx DEBUG] handleRequestAnalysis called. Type: ${type}`);
        if (!idssData) {
            console.warn("[App.tsx DEBUG] Analysis requested but idssData is null.");
            setGlobalError("Dados da aplicação (IDSS) não estão carregados. Não é possível realizar a análise.");
            return;
        }
        const requestPayload = { type, operatorSize, activeReferenceYear };
        let analysisTarget = null;
        let updatePath = null;
        if (type === 'indicator_last_period' || type === 'indicator_yearly_consolidated' || type === 'indicator_yearly_comparison') {
            // This type of analysis is now handled directly within IndicatorCard.
            console.warn(`[App.tsx DEBUG] Indicator-specific analysis type "${type}" requested at App level. This should ideally be handled by IndicatorCard.`);
            setGlobalError(`Tipo de análise de indicador "${type}" não implementado neste nível. Utilize os botões no card do indicador.`);
            return;
        }
        else if (type === 'dimension') {
            requestPayload.dimensionData = data;
            analysisTarget = idssData.dimensions.find(d => d.id === data.id);
            updatePath = (prev, analysis, error) => ({
                ...prev,
                dimensions: prev.dimensions.map(d => d.id === data.id ? { ...d, analysis, error } : d)
            });
        }
        else if (type === 'idss') {
            requestPayload.idssData = data;
            analysisTarget = idssData;
            updatePath = (prev, analysis, error) => ({ ...prev, analysis, error });
        }
        else if (type === 'overall_indicators') {
            requestPayload.overallIndicatorsData = data;
            analysisTarget = idssData;
            updatePath = (prev, analysis, error) => ({ ...prev, overallIndicatorAnalysis: analysis, overallIndicatorError: error });
        }
        if (!analysisTarget || !updatePath) {
            console.error("[App.tsx DEBUG] Invalid analysis request or target not found for type:", type, "Data:", data);
            const typeDisplay = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            setGlobalError(`Não foi possível encontrar o alvo para a ${typeDisplay}. Verifique os dados ou a lógica de direcionamento da análise.`);
            return;
        }
        // Clear previous error/analysis for the target before new request
        setIdssData(prev => updatePath(prev, '', undefined));
        try {
            const analysisResult = await getGeminiAnalysis(requestPayload);
            setIdssData(prev => updatePath(prev, analysisResult, undefined));
        }
        catch (error) {
            console.error(`[App.tsx DEBUG] Error during Gemini analysis (${type}):`, error);
            setIdssData(prev => updatePath(prev, '', error.message || `Erro ao gerar análise para ${type}`));
        }
    };
    const handleOpenHistoricalDataManagement = () => {
        console.log("[App.tsx DEBUG] handleOpenHistoricalDataManagement called.");
        setCurrentView('historicalDataManagement');
        setIsMobileMenuOpen(false);
    };
    const handleHistoricalDataUpdated = async () => {
        console.log("[App.tsx DEBUG] handleHistoricalDataUpdated called. Refetching historical data.");
        try {
            const response = await fetch('./historical_data.json?cachebust=' + new Date().getTime()); // cache bust
            if (!response.ok)
                throw new Error('Falha ao recarregar dados históricos.');
            const updatedHistoricalData = await response.json();
            setHistoricalData(updatedHistoricalData);
            console.log("[App.tsx DEBUG] Historical data reloaded successfully.");
            // Also update historical scores within idssData if it's loaded
            setIdssData(prev => {
                if (!prev)
                    return null;
                return {
                    ...prev,
                    historicalIdssScores: updatedHistoricalData?.idssHistoricalScores || prev.historicalIdssScores || []
                };
            });
        }
        catch (error) {
            console.error("[App.tsx DEBUG] Error reloading historical data:", error);
            setGlobalError("Falha ao recarregar os dados históricos após a atualização.");
        }
    };
    const initializeEmptyHistoricalData = () => {
        return {
            idssHistoricalScores: [],
            dimensionHistoricalData: [],
            indicatorHistoricalData: []
        };
    };
    const selectedDimension = idssData?.dimensions.find(d => d.id === selectedDimensionId);
    const renderHeader = () => (_jsxs("header", { className: "bg-[#004e4c] text-white p-4 shadow-md sticky top-0 z-20", children: [_jsxs("div", { className: "container mx-auto flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(BarChart3, { size: 32, className: "mr-3 text-[#f47920]" }), _jsx("h1", { className: "text-xl sm:text-2xl font-bold font-serif", children: "Radar IDSS" })] }), _jsx("div", { className: "hidden md:flex items-center space-x-4", children: renderNavLinks() }), _jsx("div", { className: "md:hidden", children: _jsx("button", { onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), className: "text-white focus:outline-none", children: isMobileMenuOpen ? _jsx(X, { size: 28 }) : _jsx(Menu, { size: 28 }) }) })] }), isMobileMenuOpen && (_jsx("nav", { className: "md:hidden absolute top-full left-0 right-0 bg-[#003a38] p-4 shadow-lg z-10", children: renderNavLinks(true) }))] }));
    const renderNavLinks = (isMobile = false) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: `flex items-center ${isMobile ? 'flex-col space-y-2 w-full' : 'space-x-2'}`, children: [_jsx("label", { htmlFor: "operator-size-select", className: "text-xs whitespace-nowrap", children: "Porte:" }), _jsx("select", { id: "operator-size-select", value: operatorSize, onChange: handleOperatorSizeChange, className: "bg-[#003a38] text-white border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#f47920]", children: Object.values(OperatorSize).map(size => _jsx("option", { value: size, children: size }, size)) })] }), _jsxs("div", { className: `flex items-center ${isMobile ? 'flex-col space-y-2 w-full mt-2' : 'space-x-2'}`, children: [_jsx("label", { htmlFor: "active-year-select", className: "text-xs whitespace-nowrap", children: "Ano Ref.:" }), _jsx("select", { id: "active-year-select", value: activeReferenceYear, onChange: handleActiveReferenceYearChange, className: "bg-[#003a38] text-white border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#f47920]", children: availableYears.map(year => _jsx("option", { value: year, children: year }, year)) })] })] }));
    const renderDashboard = () => {
        console.log("[App.tsx DEBUG] renderDashboard called.");
        if (!idssData)
            return _jsx("p", { children: "Carregando dados do painel..." });
        return (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300", children: [_jsxs("h2", { className: "text-2xl font-semibold text-[#004e4c] mb-4", children: ["Painel Geral IDSS (", activeReferenceYear, ")"] }), _jsxs("div", { className: "text-center mb-6", children: [_jsxs("p", { className: "text-lg text-gray-700", children: ["Nota Simulada IDSS ", activeReferenceYear + 1, " (Base ", activeReferenceYear, "):"] }), _jsx("p", { className: `text-5xl font-bold my-2 ${idssData.notaFinalCalculada !== null && idssData.notaFinalCalculada >= 0.7 ? 'text-green-600' : idssData.notaFinalCalculada !== null && idssData.notaFinalCalculada >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`, children: idssData.notaFinalCalculada !== null ? idssData.notaFinalCalculada.toFixed(4) : 'N/P' }), idssData.historicalIdssScores && idssData.historicalIdssScores.length > 0 && (_jsx("div", { className: "mt-4 text-gray-700", children: idssData.historicalIdssScores
                                        .sort((a, b) => b.programYear - a.programYear)
                                        .slice(0, 3)
                                        .map(score => (_jsxs("p", { className: "text-base font-semibold my-1", children: [" ", "IDSS ", score.programYear, " (Base ", score.baseYear, "): ", _jsx("strong", { className: "text-lg", children: score.score.toFixed(4) })] }, score.programYear))) }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6", children: [_jsxs("button", { onClick: () => handleRequestAnalysis('idss', idssData), disabled: !idssData.notaFinalCalculada, className: "w-full bg-[#f47920] hover:bg-[#d8681c] text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-50", children: [" ", _jsx(Brain, { size: 18, className: "mr-2" }), " An\u00E1lise Cr\u00EDtica do IDSS (", activeReferenceYear, ")"] }), _jsxs("button", { onClick: () => handleRequestAnalysis('overall_indicators', idssData.dimensions.flatMap(d => d.indicators.map(i => ({ ...i, results: i.results.filter(r => r.year === activeReferenceYear) })))), className: "w-full bg-[#004e4c] hover:bg-[#003a38] text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center", children: [" ", _jsx(ListChecks, { size: 18, className: "mr-2" }), " Vis\u00E3o Geral dos Indicadores (", activeReferenceYear, ")"] })] }), idssData.analysis && (_jsxs("div", { className: "mt-4 p-4 bg-[#cde3bb] border border-[#b1d34b] rounded-md shadow", children: [_jsxs("h4", { className: "font-semibold text-slate-800 mb-2", children: ["An\u00E1lise IDSS (", activeReferenceYear, "):"] }), _jsx("p", { className: "text-sm text-slate-700 whitespace-pre-wrap", children: idssData.analysis })] })), idssData.error && _jsxs("p", { className: "text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 16, className: "inline mr-1" }), " ", idssData.error] }), idssData.overallIndicatorAnalysis && (_jsxs("div", { className: "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md shadow", children: [_jsxs("h4", { className: "font-semibold text-blue-800 mb-2", children: ["Vis\u00E3o Geral dos Indicadores (", activeReferenceYear, "):"] }), _jsx("p", { className: "text-sm text-blue-700 whitespace-pre-wrap", children: idssData.overallIndicatorAnalysis })] })), idssData.overallIndicatorError && _jsxs("p", { className: "text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 16, className: "inline mr-1" }), " ", idssData.overallIndicatorError] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: idssData.dimensions.map(dim => (_jsxs("div", { className: "bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col", children: [_jsxs("h3", { className: "text-xl font-semibold text-[#004e4c] mb-2", children: [dim.name, " (", dim.id, ")"] }), _jsxs("p", { className: "text-sm text-gray-600 mb-1", children: ["Peso no IDSS: ", _jsxs("span", { className: "font-medium", children: [(dim.weightInIDSS * 100).toFixed(0), "%"] })] }), _jsxs("p", { className: "text-md text-gray-700 mb-3", children: ["Nota Simulada (", activeReferenceYear, "):", _jsx("span", { className: `font-bold text-xl ml-2 ${dim.notaFinalCalculada !== null && dim.notaFinalCalculada >= 0.7 ? 'text-green-600' : dim.notaFinalCalculada !== null && dim.notaFinalCalculada >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`, children: dim.notaFinalCalculada !== null ? dim.notaFinalCalculada.toFixed(4) : 'N/P' })] }), _jsxs("button", { onClick: () => handleRequestAnalysis('dimension', dim), disabled: dim.notaFinalCalculada === null, className: "w-full bg-[#f47920] hover:bg-[#d8681c] text-white font-semibold py-2 px-3 text-sm rounded-md shadow-sm transition duration-150 ease-in-out mb-3 flex items-center justify-center disabled:opacity-50", children: [" ", _jsx(Brain, { size: 16, className: "mr-2" }), " An\u00E1lise da Dimens\u00E3o"] }), dim.analysis && (_jsxs("div", { className: "my-2 p-3 bg-[#cde3bb] border border-[#b1d34b] rounded-md text-xs text-slate-700 whitespace-pre-wrap", children: [_jsx("h5", { className: "font-semibold text-slate-800 mb-1", children: "An\u00E1lise Dimens\u00E3o:" }), dim.analysis] })), dim.error && _jsxs("p", { className: "text-xs text-red-600 mt-1 p-1.5 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 14, className: "inline mr-1" }), " ", dim.error] }), _jsxs("div", { className: "border-t border-gray-200 mt-3 pt-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h4", { className: "text-sm font-medium text-gray-700", children: ["Indicadores (", activeReferenceYear, "):"] }), _jsx("span", { className: "text-xs text-gray-500", children: "Nota Simulada" })] }), _jsx("ul", { className: "space-y-1 mt-1 text-xs", children: dim.indicators.map(ind => {
                                            const resultForYear = ind.results.find(r => r.year === activeReferenceYear);
                                            return (_jsxs("li", { className: "flex justify-between items-center py-1", children: [_jsxs("span", { className: "text-gray-600 w-4/5 truncate", title: ind.name, children: [ind.id, " - ", ind.name] }), _jsx("span", { className: `font-semibold w-1/5 text-right ${resultForYear?.notaFinal !== null && resultForYear?.notaFinal !== undefined ? (resultForYear.notaFinal >= 0.7 ? 'text-green-600' : resultForYear.notaFinal >= 0.4 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'}`, children: resultForYear?.notaFinal !== null && resultForYear?.notaFinal !== undefined ? resultForYear.notaFinal.toFixed(3) : 'N/P' })] }, ind.id));
                                        }) })] }), _jsx("button", { onClick: () => handleSelectDimension(dim.id), className: "mt-auto bg-[#00995d] hover:bg-[#007a4a] text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out text-sm", children: " Ver Detalhes da Dimens\u00E3o " })] }, dim.id))) })] }));
    };
    const renderDimensionDetailView = () => {
        console.log("[App.tsx DEBUG] renderDimensionDetailView called.");
        if (!selectedDimension) {
            console.warn("[App.tsx DEBUG] Dimension detail view requested but no dimension selected.");
            return _jsx("p", { children: "Dimens\u00E3o n\u00E3o selecionada." });
        }
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("button", { onClick: handleBackToDashboard, className: "mb-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 flex items-center", children: [_jsx(ChevronLeft, { size: 18, className: "mr-2" }), " Voltar ao Painel"] }), _jsxs("h2", { className: "text-2xl font-semibold text-[#004e4c] mb-4", children: [selectedDimension.name, " (", activeReferenceYear, ")"] }), _jsxs("p", { className: "text-md text-gray-700 mb-1", children: ["Peso no IDSS: ", _jsxs("span", { className: "font-medium", children: [(selectedDimension.weightInIDSS * 100).toFixed(0), "%"] })] }), _jsxs("p", { className: "text-lg text-gray-700 mb-4", children: ["Nota Simulada da Dimens\u00E3o (", activeReferenceYear, "):", _jsx("span", { className: `font-bold text-2xl ml-2 ${selectedDimension.notaFinalCalculada !== null && selectedDimension.notaFinalCalculada >= 0.7 ? 'text-green-600' : selectedDimension.notaFinalCalculada !== null && selectedDimension.notaFinalCalculada >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`, children: selectedDimension.notaFinalCalculada !== null ? selectedDimension.notaFinalCalculada.toFixed(4) : 'N/P' })] }), _jsxs("button", { onClick: () => handleRequestAnalysis('dimension', selectedDimension), disabled: selectedDimension.notaFinalCalculada === null, className: "w-full md:w-1/2 bg-[#f47920] hover:bg-[#d8681c] text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out mb-4 flex items-center justify-center disabled:opacity-50", children: [" ", _jsx(Brain, { size: 18, className: "mr-2" }), " An\u00E1lise Cr\u00EDtica da Dimens\u00E3o (", activeReferenceYear, ")"] }), selectedDimension.analysis && (_jsxs("div", { className: "my-3 p-4 bg-[#cde3bb] border border-[#b1d34b] rounded-md text-sm text-slate-700 whitespace-pre-wrap shadow", children: [_jsxs("h5", { className: "font-semibold text-slate-800 mb-1", children: ["An\u00E1lise da Dimens\u00E3o (", activeReferenceYear, "):"] }), selectedDimension.analysis] })), selectedDimension.error && _jsxs("p", { className: "text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(AlertTriangle, { size: 16, className: "inline mr-1" }), " ", selectedDimension.error] }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6", children: selectedDimension.indicators.map(indicator => (_jsx(IndicatorCard, { indicator: indicator, onUpdateIndicator: handleUpdateIndicator, operatorSize: operatorSize, activeReferenceYear: activeReferenceYear }, indicator.id))) })] }));
    };
    const renderHistoricalDataManagementPage = () => {
        console.log("[App.tsx DEBUG] renderHistoricalDataManagementPage called.");
        if (!idssData)
            return _jsx("p", { children: "Carregando configura\u00E7\u00E3o de indicadores..." }); // Or some loading state
        return (_jsx(HistoricalDataManagementPage, { onClose: handleBackToDashboard, initialIndicators: INITIAL_INDICATORS, allDimensions: idssData.dimensions, currentHistoricalData: historicalData, onHistoricalDataUpdated: handleHistoricalDataUpdated }));
    };
    console.log(`[App.tsx DEBUG] Before return. currentView: ${currentView}, isInitialLoad: ${isInitialLoad}, globalError: ${globalError}`);
    if (globalError) {
        console.log("[App.tsx DEBUG] Rendering GLOBAL ERROR state:", globalError);
        return (_jsxs("div", { className: "min-h-screen bg-[#ece3d9] flex flex-col", children: [renderHeader(), _jsx("div", { className: "container mx-auto p-4 sm:p-6 flex-grow flex flex-col items-center justify-center", children: _jsxs("div", { className: "bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-lg max-w-2xl w-full", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx(AlertTriangle, { size: 24, className: "text-red-500 mr-3" }), _jsx("h2", { className: "text-xl font-semibold", children: "Erro na Aplica\u00E7\u00E3o" })] }), _jsx("p", { className: "text-sm mb-2", children: "Ocorreu um erro:" }), _jsx("p", { className: "text-sm font-mono bg-red-50 p-2 rounded border border-red-200", children: globalError }), _jsx("button", { onClick: () => setGlobalError(null), className: "mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-xs", children: "Fechar" }), _jsxs("p", { className: "text-xs mt-4 text-gray-600", children: ["Se o problema persistir, verifique a console do navegador para mais detalhes t\u00E9cnicos e certifique-se que os arquivos ", _jsx("code", { children: "idss_data.json" }), " e ", _jsx("code", { children: "historical_data.json" }), " est\u00E3o acess\u00EDveis e formatados corretamente na pasta ", _jsx("code", { children: "public" }), " (ou ", _jsx("code", { children: "dist" }), " se estiver usando um servidor que sirva desta pasta)."] })] }) }), _jsxs("footer", { className: "bg-[#004e4c] text-white text-center p-3 text-xs", children: ["Radar IDSS \u00A9 ", new Date().getFullYear(), " - Ferramenta de An\u00E1lise e Simula\u00E7\u00E3o."] })] }));
    }
    if (isInitialLoad || !idssData) {
        console.log("[App.tsx DEBUG] Rendering LOADING state. isInitialLoad:", isInitialLoad, "!idssData:", !idssData);
        return (_jsxs("div", { className: "flex flex-col justify-center items-center h-screen bg-[#ece3d9]", children: [_jsx("div", { className: "animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-[#00995d]" }), _jsx("p", { className: "mt-6 text-xl text-[#004e4c] font-semibold", children: "Carregando Dados e Configura\u00E7\u00F5es..." }), _jsx("p", { className: "text-sm text-gray-600", children: "Aguarde um momento." })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-[#ece3d9] flex flex-col", children: [renderHeader(), _jsxs("div", { className: "bg-white shadow-md p-4 sm:p-6 my-4 text-sm text-gray-800 container mx-auto rounded-lg", children: [_jsx("p", { className: "mb-2", children: "Radar IDSS \u00E9 um dashboard que permite visualizar a simula\u00E7\u00E3o do IDSS (indicadores, dimens\u00F5es e nota final da operadora), bem como solicitar an\u00E1lises dos resultados. As an\u00E1lises s\u00E3o feitas pelo Google Gemini com base em configura\u00E7\u00F5es pr\u00E9vias baseadas nas fichas t\u00E9cnicas do IDSS." }), _jsxs("p", { children: ["Desenvolvimento: ", _jsx("a", { href: "https://www.linkedin.com/in/f%C3%A1bio-guimar%C3%A3es-adv/", target: "_blank", rel: "noopener noreferrer", className: "text-[#004e4c] hover:text-[#f47920] underline font-medium", children: "F\u00E1bio Guimar\u00E3es" })] })] }), _jsxs("main", { className: "container mx-auto p-4 sm:p-6 flex-grow", children: [currentView === 'dashboard' && renderDashboard(), currentView === 'dimensionDetail' && selectedDimension && renderDimensionDetailView(), currentView === 'historicalDataManagement' && renderHistoricalDataManagementPage()] }), _jsxs("footer", { className: "bg-[#004e4c] text-white text-center p-3 text-xs", children: ["Radar IDSS \u00A9 ", new Date().getFullYear(), " - Ferramenta de An\u00E1lise e Simula\u00E7\u00E3o."] })] }));
};
export default App;
//# sourceMappingURL=App.js.map