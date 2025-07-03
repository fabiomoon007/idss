import React from 'react';
import { Dimension, IDSSDimensionName, Indicator, AnalysisType } from '../types';
import { Zap, CheckSquare, DollarSign, Activity, ListChecks, Brain, X, AlertCircle, Eye } from 'lucide-react';

interface DimensionsGridProps {
  dimensions: Dimension[];
  activeReferenceYear: number;
  loadingStates: Record<string, boolean>;
  onTriggerAnalysis: (analysisType: AnalysisType, relatedData: Dimension) => void;
  onCloseAnalysis: (type: 'dimension', dimensionId: IDSSDimensionName) => void;
  setCurrentView: (view: 'dashboard' | 'dimensionDetail' | 'historicalDataManagement') => void;
  setSelectedDimensionId: (id: IDSSDimensionName) => void;
}

const getDimensionIcon = (dimId: IDSSDimensionName) => {
  const commonProps = { className: "mr-2", size: 22 };
  switch (dimId) {
    case IDSSDimensionName.IDQS: return <CheckSquare {...commonProps} color="var(--secondary)" />;
    case IDSSDimensionName.IDGA: return <Zap {...commonProps} color="var(--accent)" />;
    case IDSSDimensionName.IDSM: return <DollarSign {...commonProps} color="#1d4ed8" />; // a shade of blue
    case IDSSDimensionName.IDGR: return <Activity {...commonProps} color="#7e22ce" />; // a shade of purple
    default: return <ListChecks {...commonProps} className="text-gray-500" />;
  }
};

const getScoreColor = (score: number | null): string => {
  if (score === null) return 'text-gray-500';
  if (score >= 0.7) return 'text-success';
  if (score >= 0.4) return 'text-warning';
  return 'text-error';
};

export const DimensionsGrid: React.FC<DimensionsGridProps> = ({
  dimensions,
  activeReferenceYear,
  loadingStates,
  onTriggerAnalysis,
  onCloseAnalysis,
  setCurrentView,
  setSelectedDimensionId,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {dimensions.map((dim: Dimension) => (
        <div key={dim.id} className="bg-base-200 shadow-xl rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-semibold text-primary flex items-center">
                {getDimensionIcon(dim.id)} {dim.name}
              </h3>
              <p className="text-xs text-gray-500">Peso no IDSS: {(dim.weightInIDSS * 100).toFixed(0)}%</p>
            </div>
            <button
              onClick={() => {
                setSelectedDimensionId(dim.id);
                setCurrentView('dimensionDetail');
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-1.5 px-3 rounded-md shadow-sm transition duration-150 text-xs flex items-center"
              title={`Ver/Editar Indicadores de ${dim.name}`}
              aria-label={`Ver indicadores da dimensão ${dim.name}`}
            >
              <Eye size={14} className="mr-1.5" /> Ver Indicadores
            </button>
          </div>
          {dim.notaFinalCalculada !== null ? (
            <p className={`text-2xl font-bold mb-3 ${getScoreColor(dim.notaFinalCalculada)}`}>
              Nota Simulada ({activeReferenceYear}): {dim.notaFinalCalculada.toFixed(3)}
            </p>
          ) : (
             <p className={`text-2xl font-bold mb-3 text-gray-400`}>
              Nota Simulada ({activeReferenceYear}): N/A
            </p>
          )}
          <button
            onClick={() => onTriggerAnalysis('dimension', dim)}
            disabled={loadingStates[`dimension-${dim.id}`]}
            className="w-full bg-accent hover:bg-accent-focus text-white font-semibold py-2 px-3 rounded-md shadow-md transition duration-150 ease-in-out mb-3 text-sm flex items-center justify-center disabled:opacity-60"
            aria-label={`Gerar análise da dimensão ${dim.name}`}
          >
            <Brain size={16} className="mr-2" />
            {loadingStates[`dimension-${dim.id}`] ? 'Analisando...' : 'Analisar Dimensão'}
          </button>

          {dim.analysis && (
            <div className="relative mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md shadow-sm">
              <button
                onClick={() => onCloseAnalysis('dimension', dim.id)}
                className="absolute top-1.5 right-1.5 p-0.5 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={`Fechar análise da dimensão ${dim.name}`}
              >
                <X size={14} />
              </button>
              <pre className="text-xs text-blue-800 whitespace-pre-wrap font-sans">{dim.analysis}</pre>
            </div>
          )}
          {dim.error && (
            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-error flex items-center shadow-sm">
              <AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {dim.error}
            </div>
          )}

          <div className="mt-3 border-t border-gray-200 pt-3 flex-grow">
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="text-sm font-medium text-gray-600">Indicadores ({activeReferenceYear}):</h4>
              <span className="text-xs text-primary font-semibold">Nota Simulada</span>
            </div>
            <ul className="space-y-1 text-xs">
              {dim.indicators
                .sort((a,b) => parseFloat(a.id) - parseFloat(b.id))
                .map((ind: Indicator) => {
                const resultForYear = ind.results.find(r => r.year === activeReferenceYear);
                return (
                  <li key={ind.id} className="flex justify-between items-center py-0.5">
                    <span className="text-gray-700 flex-1 pr-2 truncate" title={ind.name}>
                      {ind.id} - {ind.simpleName}
                    </span>
                    <span className={`font-semibold px-1.5 py-0.5 rounded-md text-xs ${resultForYear && resultForYear.notaFinal !== null ? getScoreColor(resultForYear.notaFinal) : 'text-gray-400 bg-gray-100'}`}>
                      {resultForYear && resultForYear.notaFinal !== null ? resultForYear.notaFinal.toFixed(3) : 'N/P'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};
