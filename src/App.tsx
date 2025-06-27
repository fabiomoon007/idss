
import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { IDSS, Dimension, Indicator, IndicatorResult, OperatorSize, Periodicity, IDSSDimensionName, AnalysisType as GeminiAnalysisTypeExternal, HistoricalDataArchive, HistoricalIdssScore, IndicatorResult as IndicatorResultType, PeriodicEntry } from './types.js';
import { INITIAL_INDICATORS, DIMENSION_WEIGHTS, CURRENT_YEAR, PREVIOUS_YEARS_COUNT, getPeriodLabels } from './constants.js';
import IndicatorCard from './components/IndicatorCard.js';
import HistoricalDataManagementPage from './components/HistoricalDataManagementPage.js';
import { getGeminiAnalysis } from './services/geminiService.js';
import { ChevronLeft, Settings, Brain, ListChecks, Menu, X, AlertTriangle, BarChart3 } from 'lucide-react';

// #region --- Sub-components defined in the same file to avoid creating new files ---

interface AppHeaderProps {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  operatorSize: OperatorSize;
  handleOperatorSizeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  activeReferenceYear: number;
  availableYears: number[];
  handleActiveReferenceYearChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleOpenHistoricalDataManagement: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ isMobileMenuOpen, toggleMobileMenu, operatorSize, handleOperatorSizeChange, activeReferenceYear, availableYears, handleActiveReferenceYearChange, handleOpenHistoricalDataManagement }) => {
  const NavLinks: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
    <>
      <div className={`flex items-center ${isMobile ? 'flex-col space-y-2 w-full' : 'space-x-2'}`}>
        <label htmlFor="operator-size-select" className="text-xs whitespace-nowrap">Porte:</label>
        <select
          id="operator-size-select"
          value={operatorSize}
          onChange={handleOperatorSizeChange}
          className="bg-brand-text-dark text-brand-text-light border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-secondary"
        >
          {Object.values(OperatorSize).map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>
      <div className={`flex items-center ${isMobile ? 'flex-col space-y-2 w-full mt-2' : 'space-x-2'}`}>
        <label htmlFor="active-year-select" className="text-xs whitespace-nowrap">Ano Ref.:</label>
        <select
          id="active-year-select"
          value={activeReferenceYear}
          onChange={handleActiveReferenceYearChange}
          className="bg-brand-text-dark text-brand-text-light border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-secondary"
        >
          {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
       <button
        onClick={handleOpenHistoricalDataManagement}
        className={`bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-1 px-3 text-xs rounded-md shadow-sm transition duration-150 ease-in-out flex items-center justify-center ${isMobile ? 'w-full mt-3' : 'ml-2'}`}
        aria-label="Gerenciar Dados Históricos Fixos"
      >
        <Settings size={14} className="mr-1.5" /> Gerenciar Histórico
      </button>
    </>
  );

  return (
    <header className="bg-brand-primary text-brand-text-light p-4 shadow-md sticky top-0 z-20">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <BarChart3 size={32} className="mr-3 text-brand-secondary" />
          <h1 className="text-xl sm:text-2xl font-bold font-serif">Radar IDSS</h1>
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <NavLinks />
        </div>
        <div className="md:hidden">
          <button onClick={toggleMobileMenu} className="text-white focus:outline-none">
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-[#003a38] p-4 shadow-lg z-10">
          <NavLinks isMobile />
        </nav>
      )}
    </header>
  );
};

interface DashboardProps {
  idssData: IDSS;
  activeReferenceYear: number;
  handleRequestAnalysis: (type: GeminiAnalysisTypeExternal, data: any) => void;
  handleSelectDimension: (dimensionId: IDSSDimensionName) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ idssData, activeReferenceYear, handleRequestAnalysis, handleSelectDimension }) => {
    return (
      <div className="space-y-8">
        <section className="bg-brand-surface p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold text-brand-primary mb-4">Painel Geral IDSS ({activeReferenceYear})</h2>
          <div className="text-center mb-6">
            <p className="text-lg text-gray-700">Nota Simulada IDSS {activeReferenceYear + 1} (Base {activeReferenceYear}):</p>
            <p className={`text-5xl font-bold my-2 ${idssData.notaFinalCalculada !== null && idssData.notaFinalCalculada >= 0.7 ? 'text-status-success' : idssData.notaFinalCalculada !== null && idssData.notaFinalCalculada >= 0.4 ? 'text-status-warning' : 'text-status-danger'}`}>
              {idssData.notaFinalCalculada !== null ? idssData.notaFinalCalculada.toFixed(4) : 'N/P'}
            </p>
            {idssData.historicalIdssScores && idssData.historicalIdssScores.length > 0 && (
                <div className="mt-4 text-gray-700">
                    {idssData.historicalIdssScores
                        .sort((a, b) => b.programYear - a.programYear) 
                        .slice(0, 3) 
                        .map(score => (
                            <p key={score.programYear} className="text-base font-semibold my-1">
                                IDSS {score.programYear} (Base {score.baseYear}): <strong className="text-lg">{score.score.toFixed(4)}</strong>
                            </p>
                        ))}
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <button onClick={() => handleRequestAnalysis('idss', idssData)} disabled={!idssData.notaFinalCalculada} className="w-full bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-50">
               <Brain size={18} className="mr-2"/> Análise Crítica do IDSS ({activeReferenceYear})
             </button>
             <button onClick={() => handleRequestAnalysis('overall_indicators', idssData.dimensions.flatMap(d => d.indicators.map(i => ({...i, results: i.results.filter(r => r.year === activeReferenceYear) })) ) )} className="w-full bg-brand-primary hover:bg-opacity-90 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center">
               <ListChecks size={18} className="mr-2"/> Visão Geral dos Indicadores ({activeReferenceYear})
             </button>
          </div>
          {idssData.analysis && (
            <div className="mt-4 p-4 bg-custom-light-green-analysis border border-custom-light-green-border rounded-md shadow">
              <h4 className="font-semibold text-slate-800 mb-2">Análise IDSS ({activeReferenceYear}):</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{idssData.analysis}</p>
            </div>
          )}
          {idssData.error && <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded"><AlertTriangle size={16} className="inline mr-1"/> {idssData.error}</p>}
          
          {idssData.overallIndicatorAnalysis && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md shadow">
              <h4 className="font-semibold text-blue-800 mb-2">Visão Geral dos Indicadores ({activeReferenceYear}):</h4>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{idssData.overallIndicatorAnalysis}</p>
            </div>
          )}
          {idssData.overallIndicatorError && <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded"><AlertTriangle size={16} className="inline mr-1"/> {idssData.overallIndicatorError}</p>}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {idssData.dimensions.map(dim => (
            <div key={dim.id} className="bg-brand-surface p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
              <h3 className="text-xl font-semibold text-brand-primary mb-2">{dim.name} ({dim.id})</h3>
              <p className="text-sm text-gray-600 mb-1">Peso no IDSS: <span className="font-medium">{(dim.weightInIDSS * 100).toFixed(0)}%</span></p>
              <p className="text-md text-gray-700 mb-3">Nota Simulada ({activeReferenceYear}): 
                <span className={`font-bold text-xl ml-2 ${dim.notaFinalCalculada !== null && dim.notaFinalCalculada >= 0.7 ? 'text-status-success' : dim.notaFinalCalculada !== null && dim.notaFinalCalculada >= 0.4 ? 'text-status-warning' : 'text-status-danger'}`}>
                  {dim.notaFinalCalculada !== null ? dim.notaFinalCalculada.toFixed(4) : 'N/P'}
                </span>
              </p>
              <button onClick={() => handleRequestAnalysis('dimension', dim)} disabled={dim.notaFinalCalculada === null} className="w-full bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-2 px-3 text-sm rounded-md shadow-sm transition duration-150 ease-in-out mb-3 flex items-center justify-center disabled:opacity-50">
                <Brain size={16} className="mr-2"/> Análise da Dimensão
              </button>
              {dim.analysis && (
                <div className="my-2 p-3 bg-custom-light-green-analysis border border-custom-light-green-border rounded-md text-xs text-slate-700 whitespace-pre-wrap">
                  <h5 className="font-semibold text-slate-800 mb-1">Análise Dimensão:</h5>{dim.analysis}
                </div>
              )}
              {dim.error && <p className="text-xs text-red-600 mt-1 p-1.5 bg-red-50 border border-red-200 rounded"><AlertTriangle size={14} className="inline mr-1"/> {dim.error}</p>}

              <div className="border-t border-gray-200 mt-3 pt-3">
                <div className="flex justify-between items-center">
                   <h4 className="text-sm font-medium text-gray-700">Indicadores ({activeReferenceYear}):</h4>
                   <span className="text-xs text-gray-500">Nota Simulada</span>
                </div>
                <ul className="space-y-1 mt-1 text-xs">
                  {dim.indicators.map(ind => {
                    const resultForYear = ind.results.find(r => r.year === activeReferenceYear);
                    return (
                      <li key={ind.id} className="flex justify-between items-center py-1">
                        <span className="text-gray-600 w-4/5 truncate" title={ind.name}>{ind.id} - {ind.name}</span>
                        <span className={`font-semibold w-1/5 text-right ${resultForYear?.notaFinal !== null && resultForYear?.notaFinal !== undefined ? (resultForYear.notaFinal >= 0.7 ? 'text-status-success' : resultForYear.notaFinal >= 0.4 ? 'text-status-warning' : 'text-status-danger') : 'text-gray-400'}`}>
                          {resultForYear?.notaFinal !== null && resultForYear?.notaFinal !== undefined ? resultForYear.notaFinal.toFixed(3) : 'N/P'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button onClick={() => handleSelectDimension(dim.id)} className="mt-auto bg-brand-accent hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out text-sm">
                Ver Detalhes da Dimensão
              </button>
            </div>
          ))}
        </div>
      </div>
    );
};

interface DimensionDetailViewProps {
  dimension: Dimension;
  activeReferenceYear: number;
  handleBackToDashboard: () => void;
  handleRequestAnalysis: (type: GeminiAnalysisTypeExternal, data: any) => void;
  onUpdateIndicator: (indicator: Indicator) => void;
  operatorSize: OperatorSize;
}

const DimensionDetailView: React.FC<DimensionDetailViewProps> = ({ dimension, activeReferenceYear, handleBackToDashboard, handleRequestAnalysis, onUpdateIndicator, operatorSize }) => {
    return (
      <div className="space-y-6">
        <button onClick={handleBackToDashboard} className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 flex items-center">
          <ChevronLeft size={18} className="mr-2"/> Voltar ao Painel
        </button>
        <h2 className="text-2xl font-semibold text-brand-primary mb-4">{dimension.name} ({activeReferenceYear})</h2>
        <p className="text-md text-gray-700 mb-1">Peso no IDSS: <span className="font-medium">{(dimension.weightInIDSS * 100).toFixed(0)}%</span></p>
        <p className="text-lg text-gray-700 mb-4">Nota Simulada da Dimensão ({activeReferenceYear}):
          <span className={`font-bold text-2xl ml-2 ${dimension.notaFinalCalculada !== null && dimension.notaFinalCalculada >= 0.7 ? 'text-status-success' : dimension.notaFinalCalculada !== null && dimension.notaFinalCalculada >= 0.4 ? 'text-status-warning' : 'text-status-danger'}`}>
            {dimension.notaFinalCalculada !== null ? dimension.notaFinalCalculada.toFixed(4) : 'N/P'}
          </span>
        </p>
        <button onClick={() => handleRequestAnalysis('dimension', dimension)} disabled={dimension.notaFinalCalculada === null} className="w-full md:w-1/2 bg-brand-secondary hover:bg-opacity-80 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out mb-4 flex items-center justify-center disabled:opacity-50">
          <Brain size={18} className="mr-2"/> Análise Crítica da Dimensão ({activeReferenceYear})
        </button>
        {dimension.analysis && (
            <div className="my-3 p-4 bg-custom-light-green-analysis border border-custom-light-green-border rounded-md text-sm text-slate-700 whitespace-pre-wrap shadow">
              <h5 className="font-semibold text-slate-800 mb-1">Análise da Dimensão ({activeReferenceYear}):</h5>{dimension.analysis}
            </div>
        )}
        {dimension.error && <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded"><AlertTriangle size={16} className="inline mr-1"/> {dimension.error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {dimension.indicators.map(indicator => (
            <IndicatorCard key={indicator.id} indicator={indicator} onUpdateIndicator={onUpdateIndicator} operatorSize={operatorSize} activeReferenceYear={activeReferenceYear} />
          ))}
        </div>
      </div>
    );
};

// #endregion --- End Sub-components ---

const App: React.FC = () => {
  const [idssData, setIdssData] = useState<IDSS | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataArchive | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'dimensionDetail' | 'historicalDataManagement'>('dashboard');
  const [selectedDimensionId, setSelectedDimensionId] = useState<IDSSDimensionName | null>(null);
  const [operatorSize, setOperatorSize] = useState<OperatorSize>(OperatorSize.PEQUENO);
  const [activeReferenceYear, setActiveReferenceYear] = useState<number>(CURRENT_YEAR);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);


  const availableYears = useMemo(() => {
    const years = new Set<number>();
    idssData?.dimensions?.forEach(dim => dim.indicators?.forEach(ind => ind.results?.forEach(res => years.add(res.year))));
    for (let i = -PREVIOUS_YEARS_COUNT; i <= 2; i++) {
      years.add(CURRENT_YEAR + i);
    }
    if (years.size === 0) { // Fallback
      return Array.from({length: PREVIOUS_YEARS_COUNT + 3}, (_, i) => CURRENT_YEAR + 2 - i);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [idssData]);

  const initializeIndicatorResultForYear = useCallback((indicator: Indicator, year: number): IndicatorResultType => {
    const periodLabels = getPeriodLabels(indicator.currentPeriodicity);
    return {
      year: year,
      periodicData: periodLabels.map((label): PeriodicEntry => ({ periodLabel: label, value: null, auxValue: null })),
      consolidatedValue: null,
      consolidatedAuxValue: null,
      notaFinal: null,
    };
  }, []);
  
  const calculateNotaFinalIndicador = useCallback((indicator: Indicator, result: IndicatorResultType): number | null => {
    return indicator.calcularNotaFinalFn(result.consolidatedValue, result.consolidatedAuxValue, operatorSize, indicator.parametersByPorte);
  }, [operatorSize]);

  const calculateNotaFinalDimensao = useCallback((dimension: Dimension, year: number): number | null => {
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

  const calculateNotaFinalIDSS = useCallback((currentDimensions: Dimension[]): number | null => {
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

  const processAndMergeData = useCallback((idssJsonData: IDSS, historicalJsonData: HistoricalDataArchive | null) => {
    const allPossibleYears = new Set<number>();
    for (let i = -PREVIOUS_YEARS_COUNT; i <= 2; i++) allPossibleYears.add(CURRENT_YEAR + i);
    idssJsonData.dimensions?.flatMap(d => d.indicators?.flatMap(i => i.results?.map(r => r.year))).filter(y => y).forEach(y => allPossibleYears.add(y!));
    historicalJsonData?.indicatorHistoricalData?.flatMap(i => i.results?.map(r => r.year)).filter(y => y).forEach(y => allPossibleYears.add(y!));
    
    const yearsForInitialization = Array.from(allPossibleYears).sort((a, b) => b - a);
    
    const baseDimensions: Dimension[] = (Object.keys(DIMENSION_WEIGHTS) as IDSSDimensionName[]).map(dimId => ({
        id: dimId,
        name: dimId === IDSSDimensionName.IDQS ? "Qualidade em Atenção à Saúde" : dimId === IDSSDimensionName.IDGA ? "Garantia de Acesso" : dimId === IDSSDimensionName.IDSM ? "Sustentabilidade no Mercado" : "Gestão de Processos e Regulação",
        weightInIDSS: DIMENSION_WEIGHTS[dimId],
        indicators: [],
        notaFinalCalculada: null
    }));

    const processedDimensions = INITIAL_INDICATORS.reduce((acc: Dimension[], templateIndicator) => {
        const dim = acc.find(d => d.id === templateIndicator.dimensionId);
        if (dim) {
            const existingIndicatorInJson = idssJsonData.dimensions?.flatMap(d => d.indicators)?.find(i => i.id === templateIndicator.id);
            const mergedIndicator: Indicator = {
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

      if (!idssResponse.ok) throw new Error(`Falha ao carregar idss_data.json: ${idssResponse.statusText}`);
      if (!historicalResponse.ok) throw new Error(`Falha ao carregar historical_data.json: ${historicalResponse.statusText}`);
      
      const idssJsonData = await idssResponse.json();
      const historicalJsonData = await historicalResponse.json();

      setHistoricalData(historicalJsonData);
      const finalIdssData = processAndMergeData(idssJsonData, historicalJsonData);
      setIdssData(finalIdssData);

    } catch (error) {
      console.error("[App] Error during initial data load:", error);
      setGlobalError(`Erro ao carregar dados: ${error instanceof Error ? error.message : String(error)}. Verifique os arquivos JSON e a conexão.`);
      // Setup a fallback structure so the app doesn't crash
      const fallbackData = processAndMergeData({ dimensions: [], notaFinalCalculada: null }, null);
      setIdssData(fallbackData);
    } finally {
      setIsInitialLoad(false);
    }
  }, [processAndMergeData]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // #endregion

  // Recalculation Effect
  useEffect(() => {
    if (!idssData || isInitialLoad) return;

    const updatedDimensions = idssData.dimensions.map(dim => {
      const updatedIndicators = dim.indicators.map(ind => {
        let resultForActiveYear = ind.results.find(r => r.year === activeReferenceYear);
        if (!resultForActiveYear) {
          resultForActiveYear = initializeIndicatorResultForYear(ind, activeReferenceYear);
          ind.results = [...ind.results, resultForActiveYear].sort((a,b) => b.year - a.year);
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


  const handleUpdateIndicator = useCallback((updatedIndicator: Indicator) => {
    setIdssData(prevIdssData => {
      if (!prevIdssData) return null;
      const newDimensions = prevIdssData.dimensions.map(dim => 
        dim.id === updatedIndicator.dimensionId
          ? { ...dim, indicators: dim.indicators.map(ind => ind.id === updatedIndicator.id ? updatedIndicator : ind) }
          : dim
      );
      return { ...prevIdssData, dimensions: newDimensions }; 
    });
  }, []);
  
  // #region --- Handlers ---
  const handleSelectDimension = (dimensionId: IDSSDimensionName) => {
    setSelectedDimensionId(dimensionId);
    setCurrentView('dimensionDetail');
    setIsMobileMenuOpen(false);
  };
  
  const handleBackToDashboard = () => {
    setSelectedDimensionId(null);
    setCurrentView('dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleOperatorSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setOperatorSize(event.target.value as OperatorSize);
    setIsMobileMenuOpen(false);
  };

  const handleActiveReferenceYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveReferenceYear(parseInt(event.target.value));
    setIsMobileMenuOpen(false);
  };
  
  const handleRequestAnalysis = async (type: GeminiAnalysisTypeExternal, data: any) => {
    if (!idssData) {
      setGlobalError("Dados da aplicação não carregados. Não é possível realizar a análise.");
      return;
    }

    const requestPayload = { type, operatorSize, activeReferenceYear, [type === 'idss' ? 'idssData' : 'data']: data };
    
    let updatePath: ((prevIdssData: IDSS, analysisResult: string, errorMsg?: string) => IDSS) | null = null;
    if (type === 'dimension') {
        updatePath = (prev, analysis, error) => ({ ...prev, dimensions: prev.dimensions.map(d => d.id === data.id ? {...d, analysis, error} : d) });
    } else if (type === 'idss') {
        updatePath = (prev, analysis, error) => ({ ...prev, analysis, error });
    } else if (type === 'overall_indicators') {
        updatePath = (prev, analysis, error) => ({ ...prev, overallIndicatorAnalysis: analysis, overallIndicatorError: error });
    } else {
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
    } catch (error: any) {
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
        if (!response.ok) throw new Error('Falha ao recarregar dados históricos.');
        const updatedHistoricalData: HistoricalDataArchive = await response.json();
        setHistoricalData(updatedHistoricalData);
        setIdssData(prev => prev ? { ...prev, historicalIdssScores: updatedHistoricalData.idssHistoricalScores || prev.historicalIdssScores || [] } : null);
    } catch (error) {
        setGlobalError("Falha ao recarregar os dados históricos após a atualização.");
    }
  };
  // #endregion

  const selectedDimension = idssData?.dimensions.find(d => d.id === selectedDimensionId);

  // #region --- Render Logic ---
  if (globalError) {
    return (
      <div className="min-h-screen bg-brand-background flex flex-col">
        <AppHeader isMobileMenuOpen={false} toggleMobileMenu={() => {}} operatorSize={operatorSize} handleOperatorSizeChange={() => {}} activeReferenceYear={activeReferenceYear} availableYears={availableYears} handleActiveReferenceYearChange={()=>{}} handleOpenHistoricalDataManagement={()=>{}} />
        <div className="container mx-auto p-4 sm:p-6 flex-grow flex flex-col items-center justify-center">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-lg max-w-2xl w-full">
                <div className="flex items-center mb-3">
                    <AlertTriangle size={24} className="text-red-500 mr-3" />
                    <h2 className="text-xl font-semibold">Erro na Aplicação</h2>
                </div>
                <p className="text-sm font-mono bg-red-50 p-2 rounded border border-red-200">{globalError}</p>
                <button onClick={loadInitialData} className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-xs">Tentar Recarregar</button>
            </div>
        </div>
        <footer className="bg-brand-primary text-brand-text-light text-center p-3 text-xs">Radar IDSS © {new Date().getFullYear()}</footer>
      </div>
    );
  }

  if (isInitialLoad || !idssData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-brand-background">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-accent"></div>
        <p className="mt-6 text-xl text-brand-primary font-semibold">Carregando Dados e Configurações...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-brand-background flex flex-col">
      <AppHeader isMobileMenuOpen={isMobileMenuOpen} toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} operatorSize={operatorSize} handleOperatorSizeChange={handleOperatorSizeChange} activeReferenceYear={activeReferenceYear} availableYears={availableYears} handleActiveReferenceYearChange={handleActiveReferenceYearChange} handleOpenHistoricalDataManagement={handleOpenHistoricalDataManagement} />
      
      <div className="bg-brand-surface shadow-md p-4 sm:p-6 my-4 text-sm text-gray-800 container mx-auto rounded-lg">
        <p className="mb-2">Radar IDSS é um dashboard que permite visualizar a simulação do IDSS (indicadores, dimensões e nota final da operadora), bem como solicitar análises dos resultados. As análises são feitas pelo Google Gemini com base em configurações prévias baseadas nas fichas técnicas do IDSS.</p>
        <p>Desenvolvimento: <a href="https://www.linkedin.com/in/f%C3%A1bio-guimar%C3%A3es-adv/" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:text-brand-secondary underline font-medium">Fábio Guimarães</a></p>
      </div>
      
      <main className="container mx-auto p-4 sm:p-6 flex-grow">
        {currentView === 'dashboard' && <Dashboard idssData={idssData} activeReferenceYear={activeReferenceYear} handleRequestAnalysis={handleRequestAnalysis} handleSelectDimension={handleSelectDimension} />}
        {currentView === 'dimensionDetail' && selectedDimension && <DimensionDetailView dimension={selectedDimension} activeReferenceYear={activeReferenceYear} handleBackToDashboard={handleBackToDashboard} handleRequestAnalysis={handleRequestAnalysis} onUpdateIndicator={handleUpdateIndicator} operatorSize={operatorSize}/>}
        {currentView === 'historicalDataManagement' && <HistoricalDataManagementPage onClose={handleBackToDashboard} initialIndicators={INITIAL_INDICATORS} allDimensions={idssData.dimensions} currentHistoricalData={historicalData} onHistoricalDataUpdated={handleHistoricalDataUpdated}/>}
      </main>

      <footer className="bg-brand-primary text-brand-text-light text-center p-3 text-xs">Radar IDSS © {new Date().getFullYear()} - Ferramenta de Análise e Simulação.</footer>
    </div>
  );
  // #endregion
};

export default App;