import React from 'react';
import { IDSS, AnalysisType, IDSSDimensionName, Dimension } from '../types';
import { BarChart as BarChartIcon, Brain, ListChecks, X, AlertCircle, TrendingUp } from 'lucide-react';

interface DashboardHeaderProps {
  idssData: IDSS;
  activeReferenceYear: number;
  loadingStates: Record<string, boolean>;
  onTriggerAnalysis: (analysisType: AnalysisType, relatedData?: Dimension) => void;
  onCloseAnalysis: (type: 'idss' | 'overall_indicators' | 'executive_report', dimensionId?: IDSSDimensionName) => void;
}

const getScoreColor = (score: number | null): string => {
  if (score === null) return 'text-gray-500';
  if (score >= 0.7) return 'text-success';
  if (score >= 0.4) return 'text-warning';
  return 'text-error';
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  idssData,
  activeReferenceYear,
  loadingStates,
  onTriggerAnalysis,
  onCloseAnalysis,
}) => {
  return (
    <section className="bg-base-200 shadow-xl rounded-xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-primary flex items-center">
            <BarChartIcon className="mr-3 text-secondary" /> Painel IDSS Geral ({activeReferenceYear})
          </h2>
          {idssData.notaFinalCalculada !== null ? (
            <p className={`text-3xl font-bold mt-1 ${getScoreColor(idssData.notaFinalCalculada)}`}>
              Nota Simulada: {idssData.notaFinalCalculada.toFixed(3)}
            </p>
          ) : (
             <p className={`text-3xl font-bold mt-1 text-gray-400`}>
              Nota Simulada: N/A
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <button
            onClick={() => onTriggerAnalysis('idss')}
            disabled={loadingStates.idss}
            className="w-full sm:w-auto bg-secondary hover:bg-secondary-focus text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 flex items-center justify-center text-sm disabled:opacity-60"
            aria-label="Gerar análise estratégica para o IDSS Geral"
          >
            <Brain size={16} className="mr-2" />
            {loadingStates.idss ? 'Analisando...' : 'Analisar IDSS Geral'}
          </button>
          <button
            onClick={() => onTriggerAnalysis('overall_indicators')}
            disabled={loadingStates.overall_indicators}
            className="w-full sm:w-auto bg-accent hover:bg-accent-focus text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 flex items-center justify-center text-sm disabled:opacity-60"
            aria-label="Gerar análise consolidada de todos os indicadores"
          >
            <ListChecks size={16} className="mr-2" />
            {loadingStates.overall_indicators ? 'Analisando...' : 'Análise Consolidada'}
          </button>
        </div>
      </div>

      {idssData.analysis && (
        <div className="relative mt-2 p-4 bg-green-50 border border-green-200 rounded-md shadow">
          <button
            onClick={() => onCloseAnalysis('idss')}
            className="absolute top-2 right-2 p-1 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Fechar análise do IDSS Geral"
          >
            <X size={16} />
          </button>
          <h4 className="font-semibold text-success mb-1">Análise Estratégica IDSS:</h4>
          <pre className="text-sm text-green-800 whitespace-pre-wrap font-sans">{idssData.analysis}</pre>
        </div>
      )}
      {idssData.error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-error flex items-center shadow">
          <AlertCircle size={18} className="mr-2 flex-shrink-0" /> {idssData.error}
        </div>
      )}

      {idssData.overallIndicatorAnalysis && (
        <div className="relative mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md shadow">
          <button
            onClick={() => onCloseAnalysis('overall_indicators')}
            className="absolute top-2 right-2 p-1 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Fechar análise consolidada dos indicadores"
          >
            <X size={16} />
          </button>
          <h4 className="font-semibold text-orange-800 mb-1">Análise Consolidada dos Indicadores:</h4>
          <pre className="text-sm text-orange-700 whitespace-pre-wrap font-sans">{idssData.overallIndicatorAnalysis}</pre>
        </div>
      )}
      {idssData.overallIndicatorError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-error flex items-center shadow">
          <AlertCircle size={18} className="mr-2 flex-shrink-0" /> {idssData.overallIndicatorError}
        </div>
      )}

      {idssData.historicalIdssScores && idssData.historicalIdssScores.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow">
          <h4 className="text-md font-semibold text-blue-800 mb-2 flex items-center">
            <TrendingUp size={18} className="mr-2" /> Histórico de Pontuações IDSS (Oficial)
          </h4>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            {idssData.historicalIdssScores
              .filter(s => s.score !== null)
              .sort((a, b) => b.programYear - a.programYear)
              .map(score => (
                <li key={`${score.programYear}-${score.baseYear}`}>
                  IDSS {score.programYear} (Base {score.baseYear}): <span className="font-bold">{score.score!.toFixed(4)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
};
