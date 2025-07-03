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
import { getGeminiAnalysis } from './services/geminiService';
import { DashboardHeader, DimensionsGrid, HistoricalDataManagementPage, IndicatorCard } from './components';
import { FileText, Database, Users, ArrowLeft, Loader2 } from 'lucide-react';

const initializeState = (initialIndicators: Indicator[]): IDSS => {
  const dimensions: Record<IDSSDimensionName, Dimension> = {
    [IDSSDimensionName.IDQS]: { id: IDSSDimensionName.IDQS, name: 'Qualidade em Atenção à Saúde', weightInIDSS: 0.3, indicators: [], notaFinalCalculada: null },
    [IDSSDimensionName.IDGA]: { id: IDSSDimensionName.IDGA, name: 'Garantia de Acesso', weightInIDSS: 0.3, indicators: [], notaFinalCalculada: null },
    [IDSSDimensionName.IDSM]: { id: IDSSDimensionName.IDSM, name: 'Sustentabilidade no Mercado', weightInIDSS: 0.3, indicators: [], notaFinalCalculada: null },
    [IDSSDimensionName.IDGR]: { id: IDSSDimensionName.IDGR, name: 'Gestão de Processos e Regulação', weightInIDSS: 0.1, indicators: [], notaFinalCalculada: null },
  };

  initialIndicators.forEach(indicator => {
    if(dimensions[indicator.dimensionId]) {
      dimensions[indicator.dimensionId].indicators.push(indicator);
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
      const controller = new AbortController();
      const signal = controller.signal;

      const idssPromise = fetch(`/idss_data.json?v=${new Date().getTime()}`, { signal });
      const historicalPromise = fetch(`/historical_data.json?v=${new Date().getTime()}`, { signal });

      const [idssResponse, historicalResponse] = await Promise.all([idssPromise, historicalPromise]);

      if (!idssResponse.ok) throw new Error(`Falha ao carregar idss_data.json: ${idssResponse.statusText}`);
      const savedIdssData: Partial<IDSS> = await idssResponse.json();
      
      if (!historicalResponse.ok) throw new Error(`Falha ao carregar historical_data.json: ${historicalResponse.statusText}`);
      const historicalArchive: HistoricalDataArchive = await historicalResponse.json();

      setHistoricalData(historicalArchive);
      
      dispatch({ type: 'MERGE_OPERATIONAL_DATA', payload: savedIdssData });
      dispatch({ type: 'MERGE_HISTORICAL_DATA', payload: { historicalArchive } });
    
    } catch (e: any) {
       if (e.name !== 'AbortError') {
         setError(`Erro ao carregar dados iniciais: ${e.message}. Verifique se os arquivos JSON estão na pasta 'public'.`);
       }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading && idssData) {
      dispatch({ type: 'CALCULATE_ALL_SCORES', payload: { activeReferenceYear, operatorSize } });
    }
  }, [activeReferenceYear, operatorSize, loading, idssData]);

  const handleUpdateIndicator = (updatedIndicator: Indicator) => {
    dispatch({ type: 'UPDATE_INDICATOR', payload: updatedIndicator });
    // Recalculation is now triggered by the state change in the main useEffect
  };
  
  const handleTriggerAnalysis = async (analysisType: AnalysisType, relatedData?: Dimension) => {
    const loadingKey = analysisType === 'dimension' && relatedData ? `${analysisType}-${relatedData.id}` : analysisType;
    setAnalysisLoadingStates(prev => ({ ...prev, [loadingKey]: true }));

    const requestPayload: GeminiAnalysisRequest = {
        type: analysisType,
        operatorSize,
        activeReferenceYear,
    };

    if (analysisType === 'idss') {
        requestPayload.idssData = idssData;
    } else if (analysisType === 'overall_indicators') {
        requestPayload.overallIndicatorsData = idssData.dimensions.flatMap(d => d.indicators);
    } else if (analysisType === 'dimension' && relatedData) {
        requestPayload.dimensionData = relatedData;
    } else if (analysisType !== 'executive_report') { // Executive report might not need data
        console.error("Disparo de análise inválido: Dados ausentes para o tipo de análise.");
        setAnalysisLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
        return;
    }

    try {
        const analysisText = await getGeminiAnalysis(requestPayload);
        dispatch({
            type: 'SET_ANALYSIS_RESULT',
            payload: {
                analysisType: analysisType as any,
                analysisText,
                dimensionId: relatedData?.id,
            }
        });
    } catch(e: any) {
        dispatch({
            type: 'SET_ANALYSIS_RESULT',
            payload: {
                analysisType: analysisType as any,
                error: e.message,
                dimensionId: relatedData?.id,
            }
        });
    } finally {
        setAnalysisLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleCloseAnalysisDisplay = (type: 'idss' | 'dimension' | 'overall_indicators' | 'executive_report', dimensionId?: IDSSDimensionName) => {
    dispatch({ type: 'CLOSE_ANALYSIS', payload: { type, dimensionId } });
  };
  
  const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveReferenceYear(parseInt(event.target.value));
  };
  
  const handleOperatorSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setOperatorSize(event.target.value as OperatorSize);
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center p-10">
            <Loader2 className="animate-spin h-16 w-16 text-secondary mx-auto" />
            <p className="mt-4 text-xl text-primary">Carregando Dados...</p>
        </div>
      );
    }
    if (error) {
      return <div className="text-center p-10 text-error bg-red-50 rounded-lg shadow-md">{error}</div>;
    }

    if (currentView === 'historicalDataManagement' && historicalData) {
      return <HistoricalDataManagementPage
                onClose={() => setCurrentView('dashboard')}
                initialIndicators={INITIAL_INDICATORS}
                allDimensions={idssData.dimensions}
                currentHistoricalData={historicalData}
                onHistoricalDataUpdated={loadData}
             />;
    }

    if (currentView === 'dimensionDetail' && selectedDimensionId) {
      const dimension = idssData.dimensions.find(d => d.id === selectedDimensionId);
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
              .sort((a,b) => parseFloat(a.id) - parseFloat(b.id))
              .map(indicator => (
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
             <FileText size={40} className="text-primary" />
             <h1 className="text-3xl font-bold text-primary ml-3">Radar IDSS</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <label htmlFor="operator-size-select" className="text-sm font-medium text-gray-700 flex items-center mb-1">
                <Users size={16} className="mr-2 text-gray-500" />
                Porte da Operadora:
              </label>
              <select id="operator-size-select" value={operatorSize} onChange={handleOperatorSizeChange} className="block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary">
                {Object.values(OperatorSize).map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="year-select" className="text-sm font-medium text-gray-700 flex items-center mb-1">
                <Database size={16} className="mr-2 text-gray-500" />
                Ano Base de Referência:
              </label>
              <select id="year-select" value={activeReferenceYear} onChange={handleYearChange} className="block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary">
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
             <div className="w-full sm:w-auto self-end pt-5">
                <button 
                  onClick={() => setCurrentView('historicalDataManagement')}
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 flex items-center justify-center text-sm"
                  title="Gerenciar os dados fixos de anos anteriores que servem de base para comparações."
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
