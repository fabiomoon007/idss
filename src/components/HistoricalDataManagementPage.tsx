import React, { useState, useEffect, useReducer, ChangeEvent } from 'react';
import { 
  HistoricalDataArchive, 
  IDSSDimensionName,
  Indicator,
  Dimension,
  Periodicity, 
  HistoricalDataAction
} from '../types';
import { getPeriodLabels, CURRENT_YEAR as APP_CURRENT_YEAR } from '../constants';
import { historicalDataReducer } from '../state/historicalDataReducer';
import { ArrowLeft, AlertTriangle, CheckCircle, Download, Loader2 } from 'lucide-react';

interface HistoricalDataManagementPageProps {
  onClose: () => void;
  initialIndicators: Indicator[];
  allDimensions: Dimension[];
  currentHistoricalData: HistoricalDataArchive;
  onHistoricalDataUpdated: () => Promise<void>;
}

const parseNumericInput = (value: string): number | null => {
    if (value.trim() === '') return null;
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? null : num;
};

export const HistoricalDataManagementPage: React.FC<HistoricalDataManagementPageProps> = ({
  onClose,
  initialIndicators,
  allDimensions,
  currentHistoricalData,
}) => {
  const [formData, dispatch] = useReducer(historicalDataReducer, currentHistoricalData);
  const [selectedYear, setSelectedYear] = useState<number>(APP_CURRENT_YEAR - 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const yearsOptions = Array.from({ length: 20 }, (_, i) => APP_CURRENT_YEAR - i);

  useEffect(() => {
      dispatch({ type: 'SET_ARCHIVE_DATA', payload: currentHistoricalData });
  }, [currentHistoricalData]);

  useEffect(() => {
    dispatch({ type: 'ENSURE_YEAR_DATA_EXISTS', payload: { year: selectedYear, initialIndicators } });
  }, [selectedYear, initialIndicators]);

  const handleIdssScoreChange = (e: ChangeEvent<HTMLInputElement>) => {
    const score = parseNumericInput(e.target.value);
    dispatch({ type: 'UPDATE_IDSS_SCORE', payload: { year: selectedYear, score } });
  };

  const handleDimensionScoreChange = (dimId: IDSSDimensionName, e: ChangeEvent<HTMLInputElement>) => {
      const score = parseNumericInput(e.target.value);
      dispatch({ type: 'UPDATE_DIMENSION_SCORE', payload: { year: selectedYear, dimensionId: dimId, score } });
  };

  const handleIndicatorFieldChange = (indicatorId: string, field: 'notaFinal' | 'consolidatedValue' | 'consolidatedAuxValue', e: ChangeEvent<HTMLInputElement>) => {
      const value = parseNumericInput(e.target.value);
      dispatch({ type: 'UPDATE_INDICATOR_FIELD', payload: { year: selectedYear, indicatorId, field, value } });
  };
  
  const handleIndicatorPeriodicityChange = (indicatorId: string, e: ChangeEvent<HTMLSelectElement>) => {
      const periodicity = e.target.value === "" ? null : e.target.value as Periodicity;
      dispatch({ type: 'UPDATE_INDICATOR_PERIODICITY', payload: { year: selectedYear, indicatorId, periodicity } });
  };

  const handlePeriodicDataChange = (indicatorId: string, periodIndex: number, field: 'value' | 'auxValue', e: ChangeEvent<HTMLInputElement>) => {
      const value = parseNumericInput(e.target.value);
      dispatch({ type: 'UPDATE_PERIODIC_DATA', payload: { year: selectedYear, indicatorId, periodIndex, field, value } });
  };

  const handleGenerateAndDownload = () => {
    if (!formData) {
        setSaveStatus({ message: "Nenhum dado para salvar.", type: 'error' });
        return;
    }
    setIsLoading(true);
    setSaveStatus(null);
    try {
      const fileData = JSON.stringify(formData, null, 2);
      const blob = new Blob([fileData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'historical_data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSaveStatus({
        message: 'Arquivo "historical_data.json" gerado! Para aplicar, substitua o arquivo na pasta `public` do projeto e reinicie o servidor de desenvolvimento.',
        type: 'info'
      });
    } catch (error: any) {
      setSaveStatus({ message: `Erro ao gerar arquivo: ${error.message || 'Erro desconhecido'}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!formData) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-16 w-16 text-secondary" />
            <p className="ml-4 text-xl text-primary">Carregando...</p>
        </div>
    );
  }

  const currentIdssScoreEntry = formData.idssHistoricalScores.find(s => s.baseYear === selectedYear);
  const currentDimensionScoresEntry = formData.dimensionHistoricalData.find(d => d.year === selectedYear);

  return (
    <div className="p-4 sm:p-6 bg-base-100 shadow-xl rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Gerenciar Dados Históricos Fixos</h2>
        <button
          onClick={onClose}
          className="bg-secondary hover:bg-secondary-focus text-white font-semibold py-2 px-3 rounded-md shadow-sm transition duration-150 flex items-center text-sm"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Voltar ao Painel
        </button>
      </div>

      <div className="mb-6">
        <label htmlFor="historical-year-select" className="block text-sm font-medium text-gray-700 mb-1">
          Selecione o Ano Base para Gerenciamento:
        </label>
        <select
          id="historical-year-select"
          value={selectedYear}
          onChange={(e) => {
            setSaveStatus(null); 
            setSelectedYear(parseInt(e.target.value));
          }}
          className="mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm rounded-md shadow-sm"
        >
          {yearsOptions.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        <section className="p-4 border border-gray-200 rounded-lg shadow-sm bg-base-200">
          <h3 className="text-lg font-semibold text-primary mb-3">IDSS Global ({selectedYear})</h3>
          <div>
            <label htmlFor={`idss-global-score-${selectedYear}`} className="block text-sm font-medium text-gray-700">
              Nota Final IDSS (Programa ${selectedYear + 1}, Base ${selectedYear}):
            </label>
            <input
              type="text"
              id={`idss-global-score-${selectedYear}`}
              value={currentIdssScoreEntry?.score ?? ''}
              onChange={handleIdssScoreChange}
              placeholder="Ex: 0,7787"
              className="mt-1 block w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
            />
          </div>
        </section>

        <section className="p-4 border border-gray-200 rounded-lg shadow-sm bg-base-200">
          <h3 className="text-lg font-semibold text-primary mb-3">Notas Finais das Dimensões ({selectedYear})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allDimensions.map(dim => (
              <div key={dim.id}>
                <label htmlFor={`dim-score-${dim.id}-${selectedYear}`} className="block text-sm font-medium text-gray-700">
                  {dim.name} ({dim.id}):
                </label>
                <input
                  type="text"
                  id={`dim-score-${dim.id}-${selectedYear}`}
                  value={currentDimensionScoresEntry?.dimensionScores[dim.id] ?? ''}
                  onChange={(e) => handleDimensionScoreChange(dim.id, e)}
                  placeholder="Ex: 0,850"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="p-4 border border-gray-200 rounded-lg shadow-sm bg-base-200">
          <h3 className="text-lg font-semibold text-primary mb-3">Dados dos Indicadores ({selectedYear})</h3>
          <div className="space-y-6">
            {initialIndicators.sort((a,b) => parseFloat(a.id) - parseFloat(b.id)).map(indicator => {
              const yearEntry = formData.indicatorHistoricalData.find(ih => ih.id === indicator.id)
                                ?.results.find(r => r.year === selectedYear);

              if (!yearEntry) return null;

              return (
                <div key={indicator.id} className="p-3 border border-gray-100 rounded-md bg-gray-50">
                  <h4 className="text-md font-medium text-gray-800 mb-2">{indicator.id} - {indicator.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Nota Final</label>
                      <input type="text" placeholder="Ex: 0,950" 
                             value={yearEntry.notaFinal ?? ''} 
                             onChange={e => handleIndicatorFieldChange(indicator.id, 'notaFinal', e)}
                             className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Resultado Consolidado</label>
                      <input type="text" placeholder={indicator.valueLabel || "Valor"} 
                             value={yearEntry.consolidatedValue ?? ''}
                             onChange={e => handleIndicatorFieldChange(indicator.id, 'consolidatedValue', e)}
                             className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    {indicator.requiresAuxValue && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">{indicator.auxValueLabel || "Valor Aux. Consolidado"}</label>
                        <input type="text" placeholder={indicator.auxValueLabel || "Valor Aux."}
                               value={yearEntry.consolidatedAuxValue ?? ''}
                               onChange={e => handleIndicatorFieldChange(indicator.id, 'consolidatedAuxValue', e)}
                               className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm"/>
                      </div>
                    )}
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-xs font-medium text-gray-600">Periodicidade Usada em {selectedYear}</label>
                      <select value={yearEntry.periodicityUsed ?? ''} 
                              onChange={(e) => handleIndicatorPeriodicityChange(indicator.id, e)}
                              className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm">
                        <option value="">Não Registrar Periodicidade</option>
                        {Object.values(Periodicity).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  {(yearEntry.periodicityUsed && yearEntry.periodicData) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-1.5">Dados Periódicos ({yearEntry.periodicityUsed}, {selectedYear})</h5>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${indicator.requiresAuxValue ? 3 : 4} gap-x-3 gap-y-2`}>
                        {yearEntry.periodicData.map((pd, pIdx) => (
                          <div key={pd.periodLabel} className={`flex flex-col space-y-1 ${indicator.requiresAuxValue ? '' : 'sm:col-span-1'}`}>
                            <span className="text-xs text-gray-500 self-center">{pd.periodLabel}:</span>
                            <div className="flex space-x-1">
                              <input type="text" placeholder="Valor" 
                                     value={pd.value ?? ''}
                                     onChange={(e) => handlePeriodicDataChange(indicator.id, pIdx, 'value', e)}
                                     className="w-full text-xs p-1 border-gray-300 rounded-md shadow-sm"/>
                              {indicator.requiresAuxValue && (
                                <input type="text" placeholder="Aux." 
                                       value={pd.auxValue ?? ''}
                                       onChange={(e) => handlePeriodicDataChange(indicator.id, pIdx, 'auxValue', e)}
                                       className="w-full text-xs p-1 border-gray-300 rounded-md shadow-sm"/>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={handleGenerateAndDownload}
            disabled={isLoading}
            className="w-full sm:w-auto bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2.5 px-6 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Download size={18} className="mr-2" />}
            {isLoading ? 'Gerando...' : `Gerar e Baixar Arquivo de Dados Históricos`}
          </button>
          {saveStatus && (
             <div className={`mt-3 p-2.5 rounded-md text-sm flex items-center ${
                saveStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                saveStatus.type === 'info' ? 'bg-blue-50 text-blue-700' :
                'bg-red-50 text-red-700'
            }`}>
              {saveStatus.type === 'success' && <CheckCircle size={18} className="mr-2"/>}
              {saveStatus.type === 'info' && <AlertTriangle size={18} className="mr-2"/>}
              {saveStatus.type === 'error' && <AlertTriangle size={18} className="mr-2"/>}
              <span className="text-center">{saveStatus.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
