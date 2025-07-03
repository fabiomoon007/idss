
import React, { useState, useEffect, useReducer, useCallback, ChangeEvent } from 'react';
import { 
    Indicator, 
    Dimension, 
    IDSS, 
    IDSSDimensionName, 
    OperatorSize, 
    AnalysisType, 
    GeminiAnalysisRequest,
    HistoricalDataArchive
} from './types';
import { idssReducer } from './state/idssReducer';
import { INITIAL_INDICATORS } from './data/initialIndicators';
import { CURRENT_YEAR } from './constants';
import { getGeminiAnalysis } from './services';
import { DashboardHeader, DimensionsGrid, HistoricalDataManagementPage, IndicatorCard } from './components';
import { FileText, Database, Users, ArrowLeft, Loader2, Save, AlertTriangle } from 'lucide-react';

const initializeState = (initialIndicators: Indicator[]): IDSS => {
  const dimensions: Record<IDSSDimensionName, Dimension> = {
    [IDSSDimensionName.IDQS]: { id: IDSSDimensionName.IDQS, name: 'Qualidade em Atenção à Saúde', weightInIDSS: 0.3, indicators: [], notaFinalCalculada: null },
    [IDSSDimensionName.IDGA]: { id: IDSSDimensionName.IDGA, name: 'Garantia de Acesso', weightInIDSS: 0.3, indicators: [], notaFinalCalculada: null },
    [IDSSDimensionName.IDSM]: { id: IDSSDimensionName.IDSM, name: 'Sustentabilidade no Mercado', weightInIDSS: 0.3, indicators: [], notaFinalCalculada: null },
    [IDSSDimensionName.IDGR]: { id: IDSSDimensionName.IDGR, name: 'Gestão de Processos e Regulação', weightInIDSS: 0.1, indicators: [], notaFinalCalculada: null },
  };

  initialIndicators.forEach((indicator: Indicator) => {
    if(dimensions[indicator.dimensionId]) {
      const indicatorWithYears = {
        ...indicator,
        results: indicator.results.length > 0 ? indicator.results : [{ year: CURRENT_YEAR, periodicData: [], consolidatedValue: null, notaFinal: null }]
      };
      dimensions[indicator.dimensionId].indicators.push(indicatorWithYears);
    }
  });

  return {
    dimensions: Object.values(dimensions),
    notaFinalCalculada: null,
  };
};

export const App: React.FC = () => {
  const [initialState] = useState(() => initializeState(INITIAL_INDICATORS));
  const [idssData, dispatch] = useReducer(idssReducer, initialState);
  const [historicalData, setHistoricalData] = useState<HistoricalDataArchive | null>(null);
  const [operatorSize, setOperatorSize] = useState<OperatorSize>(OperatorSize.PEQUENO);
  const [activeReferenceYear, setActiveReferenceYear] = useState<number>(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'dashboard' | 'dimensionDetail' | 'historicalDataManagement'>('dashboard');
  const [selectedDimensionId, setSelectedDimensionId] = useState<IDSSDimensionName | null>(null);

  const [analysisLoadingStates, setAnalysisLoadingStates] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idssPromise = fetch(`/idss_data.json?v=${Date.now()}`, { cache: 'no-store' });
      const historicalPromise = fetch(`/historical_data.json?v=${Date.now()}`, { cache: 'no-store' });

      const [idssResponse, historicalResponse] = await Promise.all([idssPromise, historicalPromise]);

      let savedIdssData: Partial<IDSS> = { dimensions: [] };
      if (idssResponse.ok) savedIdssData = await idssResponse.json();
      else console.warn(`Não foi possível carregar idss_data.json. Iniciando com estado limpo.`);
      
      let historicalArchive: HistoricalDataArchive = { idssHistoricalScores: [], dimensionHistoricalData: [], indicatorHistoricalData: [] };
      if (historicalResponse.ok) historicalArchive = await historicalResponse.json();
      else console.warn(`Não foi possível carregar historical_data.json. Dados históricos estarão vazios.`);

      setHistoricalData(historicalArchive);
      
      dispatch({ type: 'MERGE_OPERATIONAL_DATA', payload: savedIdssData });
      dispatch({ type: 'MERGE_HISTORICAL_DATA', payload: { historicalArchive } });
    
    } catch (e: any) {
       setError(`Erro ao carregar dados. Verifique sua conexão e a presença dos arquivos JSON na pasta 'public'. Detalhes: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      dispatch({ type: 'CALCULATE_ALL_SCORES', payload: { activeReferenceYear, operatorSize } });
    }
  }, [loading, activeReferenceYear, operatorSize, idssData.dimensions]);

  const handleUpdateIndicator = useCallback((updatedIndicator: Indicator) => {
    dispatch({ type: 'UPDATE_INDICATOR', payload: updatedIndicator });
  }, []);
  
  const handleTriggerAnalysis = async (analysisType: AnalysisType, relatedData?: Dimension) => {
    const loadingKey = analysisType === 'dimension' && relatedData ? `${analysisType}-${relatedData.id}` : analysisType;
    setAnalysisLoadingStates(prev => ({ ...prev, [loadingKey]: true }));

    const requestPayload: GeminiAnalysisRequest = {
        type: analysisType,
        operatorSize,
        activeReferenceYear,
    };

    if (analysisType === 'idss') requestPayload.idssData = idssData;
    else if (analysisType === 'overall_indicators') requestPayload.overallIndicatorsData = idssData.dimensions.flatMap(d => d.indicators);
    else if (analysisType === 'dimension' && relatedData) requestPayload.dimensionData = relatedData;
    
    try {
        const analysisText = await getGeminiAnalysis(requestPayload);
        dispatch({ type: 'SET_ANALYSIS_RESULT', payload: { analysisType, analysisText, dimensionId: relatedData?.id } });
    } catch(e: any) {
        dispatch({ type: 'SET_ANALYSIS_RESULT', payload: { analysisType, error: e.message, dimensionId: relatedData?.id } });
    } finally {
        setAnalysisLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleCloseAnalysisDisplay = (type: 'idss' | 'dimension' | 'overall_indicators' | 'executive_report', dimensionId?: IDSSDimensionName) => {
    dispatch({ type: 'CLOSE_ANALYSIS', payload: { type, dimensionId } });
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center h-64 text-center p-10">
            <Loader2 className="animate-spin h-16 w-16 text-secondary mx-auto" />
            <p className="mt-4 text-xl text-primary">Carregando Dados...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center p-10 text-error bg-red-50 rounded-lg shadow-md flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 mr-4" />
            <span>{error}</span>
        </div>
      );
    }

    if (currentView === 'historicalDataManagement' && historicalData) {
      return <HistoricalDataManagementPage
                onClose={() => setCurrentView('dashboard')}
                initialIndicators={INITIAL_INDICATORS}
                allDimensions={idssData.dimensions}
                currentHistoricalData={historicalData}
             />;
    }

    if (currentView === 'dimensionDetail' && selectedDimensionId) {
      const dimension = idssData.dimensions.find((d: Dimension) => d.id === selectedDimensionId);
      if (!dimension) {
        return <div className="text-error">Dimensão não encontrada.</div>;
      }
      return (
        <div>
          <button onClick={() => setCurrentView('dashboard')} className="mb-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center transition-colors">
            <ArrowLeft size={20} className="mr-2"/> Voltar para o Painel
          </button>
          <h2 className="text-3xl font-bold text-primary mb-6">Indicadores: {dimension.name}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {dimension.indicators
              .sort((a: Indicator, b: Indicator) => parseFloat(a.id) - parseFloat(b.id))
              .map((indicator: Indicator) => (
              <IndicatorCard
                key={`${indicator.id}-${activeReferenceYear}`}
                indicator={indicator}
                onUpdateIndicator={handleUpdateIndicator}
                operatorSize={operatorSize}
                activeReferenceYear={activeReferenceYear}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <DashboardHeader
            idssData={idssData}
            activeReferenceYear={activeReferenceYear}
            loadingStates={analysisLoadingStates}
            onTriggerAnalysis={handleTriggerAnalysis}
            onCloseAnalysis={handleCloseAnalysisDisplay}
        />
        <DimensionsGrid
            dimensions={idssData.dimensions}
            activeReferenceYear={activeReferenceYear}
            loadingStates={analysisLoadingStates}
            onTriggerAnalysis={handleTriggerAnalysis}
            onCloseAnalysis={handleCloseAnalysisDisplay}
            setCurrentView={setCurrentView}
            setSelectedDimensionId={setSelectedDimensionId}
        />
      </div>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="mb-8 p-6 bg-base-200 shadow-xl rounded-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
             <div className="ml-4">
                <h1 className="text-4xl font-bold text-primary font-serif">Radar IDSS</h1>
                <p className="text-xs text-gray-600 mt-1">desenvolvido por Fábio Guimarães no Google AI Studio</p>
             </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <label htmlFor="operator-size-select" className="text-sm font-medium text-gray-700 flex items-center mb-1">
                <Users size={16} className="mr-2 text-gray-500" />
                Porte da Operadora:
              </label>
              <select id="operator-size-select" value={operatorSize} onChange={(e) => setOperatorSize(e.target.value as OperatorSize)} className="block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary">
                {Object.values(OperatorSize).map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="year-select" className="text-sm font-medium text-gray-700 flex items-center mb-1">
                <Database size={16} className="mr-2 text-gray-500" />
                Ano Base de Referência:
              </label>
              <select id="year-select" value={activeReferenceYear} onChange={(e) => setActiveReferenceYear(parseInt(e.target.value))} className="block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary">
                {years.map((year: number) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
             <div className="w-full sm:w-auto self-end pt-5">
                <button 
                  onClick={() => setCurrentView('historicalDataManagement')}
                  className="w-full bg-blue-800 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 flex items-center justify-center text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Gerenciamento de dados desabilitado nesta versão de visualização."
                  disabled
                >
                  <Database size={16} className="mr-2" /> Gerenciar Dados
                </button>
            </div>
          </div>
        </div>
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
};