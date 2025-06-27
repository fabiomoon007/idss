
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { 
  HistoricalDataArchive, 
  HistoricalIdssScore,
  HistoricalDimensionYearlyScores,
  HistoricalIndicatorRecord,
  HistoricalIndicatorYearlyEntry,
  HistoricalPeriodicEntry,
  IDSSDimensionName,
  Indicator,
  Dimension, // For listing dimensions
  Periodicity 
} from '../types.js';
import { getPeriodLabels, INITIAL_INDICATORS, CURRENT_YEAR as APP_CURRENT_YEAR } from '../constants.js'; // Using APP_CURRENT_YEAR to avoid conflict
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface HistoricalDataManagementPageProps {
  onClose: () => void;
  initialIndicators: Indicator[]; // To list all available indicators
  allDimensions: Dimension[]; // To list all dimensions for scores
  currentHistoricalData: HistoricalDataArchive | null;
  onHistoricalDataUpdated: () => Promise<void>; // Callback to inform App.tsx to reload historical data
}

const getDefaultHistoricalPeriodicData = (periodicity: Periodicity | null): HistoricalPeriodicEntry[] | null => {
  if (!periodicity) return null;
  const labels = getPeriodLabels(periodicity);
  return labels.map(label => ({ periodLabel: label, value: null, auxValue: null }));
};

const parseNumericInput = (value: string): number | null => {
    if (value.trim() === '') return null;
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? null : num;
};


const HistoricalDataManagementPage: React.FC<HistoricalDataManagementPageProps> = ({
  onClose,
  initialIndicators,
  allDimensions,
  currentHistoricalData,
  onHistoricalDataUpdated
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(APP_CURRENT_YEAR - 1);
  const [formData, setFormData] = useState<HistoricalDataArchive | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const yearsOptions = Array.from({ length: 20 }, (_, i) => APP_CURRENT_YEAR - i);

  useEffect(() => {
    console.log("[HistPage] useEffect triggered. SelectedYear:", selectedYear, "currentHistoricalData changed.");
    if (currentHistoricalData) {
        let newFormData: HistoricalDataArchive = {
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
                histIndRecord.results.sort((a,b) => b.year - a.year); 
            }

            if (histIndYearEntry.periodicityUsed) {
                const expectedLabels = getPeriodLabels(histIndYearEntry.periodicityUsed);
                let needsRecreation = false;
                if (!histIndYearEntry.periodicData || histIndYearEntry.periodicData.length !== expectedLabels.length) {
                    needsRecreation = true;
                } else {
                    if (!histIndYearEntry.periodicData.every((pd, idx) => pd.periodLabel === expectedLabels[idx])) {
                        needsRecreation = true;
                    }
                }
                if (needsRecreation) {
                    histIndYearEntry.periodicData = getDefaultHistoricalPeriodicData(histIndYearEntry.periodicityUsed);
                }
            } else { 
                if (histIndYearEntry.periodicData !== null) {
                    histIndYearEntry.periodicData = null; 
                }
            }
        });
        setFormData(newFormData);
    } else { 
        const blankArchive: HistoricalDataArchive = {
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


  const handleIdssScoreChange = (e: ChangeEvent<HTMLInputElement>) => {
    const score = parseNumericInput(e.target.value);
    setFormData(prev => {
        if (!prev) return null;
        const updatedArchive = JSON.parse(JSON.stringify(prev)) as HistoricalDataArchive;
        let scoreEntry = updatedArchive.idssHistoricalScores.find(s => s.baseYear === selectedYear);
        if (scoreEntry) {
            scoreEntry.score = score ?? 0; 
        } else { 
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

  const handleDimensionScoreChange = (dimId: IDSSDimensionName, e: ChangeEvent<HTMLInputElement>) => {
      const score = parseNumericInput(e.target.value);
      setFormData(prev => {
          if (!prev) return null;
          const updatedArchive = JSON.parse(JSON.stringify(prev)) as HistoricalDataArchive;
          let yearEntry = updatedArchive.dimensionHistoricalData.find(d => d.year === selectedYear);
          if (yearEntry) {
              yearEntry.dimensionScores[dimId] = score;
          } else { 
              const newDimScores: Partial<Record<IDSSDimensionName, number | null>> = {};
              allDimensions.forEach(d_initial => newDimScores[d_initial.id] = (d_initial.id === dimId ? score : null));
              updatedArchive.dimensionHistoricalData.push({ year: selectedYear, dimensionScores: newDimScores });
              updatedArchive.dimensionHistoricalData.sort((a, b) => b.year - a.year);
          }
          return updatedArchive;
      });
  };

  const handleIndicatorFieldChange = (indicatorId: string, field: keyof HistoricalIndicatorYearlyEntry, value: any) => {
      setFormData(prev => {
          if (!prev) return null;
          const updatedArchive = JSON.parse(JSON.stringify(prev)) as HistoricalDataArchive;
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
              indRecord.results.sort((a,b) => b.year - a.year);
          }
          
          (yearEntry as any)[field] = value;

          if (field === 'periodicityUsed') {
              if (value !== null && value !== "") { 
                  yearEntry.periodicData = getDefaultHistoricalPeriodicData(value as Periodicity);
              } else { 
                  yearEntry.periodicData = null;
              }
          }
          return updatedArchive;
      });
  };

  const handlePeriodicDataChange = (indicatorId: string, periodIndex: number, field: 'value' | 'auxValue', e: ChangeEvent<HTMLInputElement>) => {
      const numValue = parseNumericInput(e.target.value);
      setFormData(prev => {
          if (!prev) return null;
          const updatedArchive = JSON.parse(JSON.stringify(prev)) as HistoricalDataArchive;
          const indRecord = updatedArchive.indicatorHistoricalData.find(ir => ir.id === indicatorId);
          if (indRecord) {
              const yearEntry = indRecord.results.find(r => r.year === selectedYear);
              if (yearEntry && yearEntry.periodicData && yearEntry.periodicData[periodIndex]) {
                  (yearEntry.periodicData[periodIndex] as any)[field] = numValue;
              }
          }
          return updatedArchive;
      });
  };

  const handleDownload = () => {
    if (!formData) {
        setStatus({ message: "Nenhum dado para baixar.", type: 'error' });
        return;
    }
    setIsProcessing(true);
    setStatus(null);
    try {
      const jsonString = JSON.stringify(formData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'historical_data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ message: `Arquivo 'historical_data.json' gerado com sucesso!`, type: 'success' });
    } catch (error: any) {
      setStatus({ message: `Erro ao gerar arquivo JSON: ${error.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentIdssScoreEntry = formData?.idssHistoricalScores.find(s => s.baseYear === selectedYear);
  const currentDimensionScoresEntry = formData?.dimensionHistoricalData.find(d => d.year === selectedYear);

  if (!formData) {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00995d]"></div>
            <p className="ml-4 text-xl text-[#004e4c]">Carregando dados históricos...</p>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white shadow-xl rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#004e4c]">Gerenciar Dados Históricos Fixos</h2>
        <button
          onClick={onClose}
          className="bg-[#00995d] hover:bg-[#007a4a] text-white font-semibold py-2 px-3 rounded-md shadow-sm transition duration-150 flex items-center text-sm"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Voltar ao Painel
        </button>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded-r-lg">
          <div className="flex items-start">
              <Info size={20} className="mr-3 mt-0.5 flex-shrink-0"/>
              <div>
                  <h4 className="font-bold">Como Funciona esta Página</h4>
                  <p className="text-sm">
                      Esta seção permite editar os dados históricos fixos. Como a aplicação não possui um banco de dados, as alterações <strong>não são salvas no servidor</strong>. Em vez disso, ao clicar no botão "Baixar Arquivo JSON", um novo arquivo <code>historical_data.json</code> será gerado e baixado para o seu computador. Para que as alterações tenham efeito permanente na aplicação, você precisará substituir o arquivo existente no projeto por este novo e fazer o deploy novamente.
                  </p>
              </div>
          </div>
      </div>


      <div className="mb-6">
        <label htmlFor="historical-year-select" className="block text-sm font-medium text-gray-700 mb-1">
          Selecione o Ano Base para Gerenciamento:
        </label>
        <select
          id="historical-year-select"
          value={selectedYear}
          onChange={(e) => {
            setStatus(null); 
            setSelectedYear(parseInt(e.target.value));
          }}
          className="mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#00995d] focus:border-[#00995d] sm:text-sm rounded-md shadow-sm"
        >
          {yearsOptions.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        <section className="p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-[#004e4c] mb-3">IDSS Global ({selectedYear})</h3>
          <div>
            <label htmlFor={`idss-global-score-${selectedYear}`} className="block text-sm font-medium text-gray-700">
              Nota Final IDSS (Programa {selectedYear + 1}, Base {selectedYear}):
            </label>
            <input
              type="text"
              id={`idss-global-score-${selectedYear}`}
              value={currentIdssScoreEntry?.score === null || currentIdssScoreEntry?.score === undefined ? '' : String(currentIdssScoreEntry.score)}
              onChange={handleIdssScoreChange}
              placeholder="Ex: 0.7787"
              className="mt-1 block w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00995d] focus:border-[#00995d] sm:text-sm"
            />
          </div>
        </section>

        <section className="p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-[#004e4c] mb-3">Notas Finais das Dimensões ({selectedYear})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allDimensions.map(dim => (
              <div key={dim.id}>
                <label htmlFor={`dim-score-${dim.id}-${selectedYear}`} className="block text-sm font-medium text-gray-700">
                  {dim.name} ({dim.id}):
                </label>
                <input
                  type="text"
                  id={`dim-score-${dim.id}-${selectedYear}`}
                  value={currentDimensionScoresEntry?.dimensionScores[dim.id] === null || currentDimensionScoresEntry?.dimensionScores[dim.id] === undefined ? '' : String(currentDimensionScoresEntry?.dimensionScores[dim.id])}
                  onChange={(e) => handleDimensionScoreChange(dim.id, e)}
                  placeholder="Ex: 0.850"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00995d] focus:border-[#00995d] sm:text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-[#004e4c] mb-3">Dados dos Indicadores ({selectedYear})</h3>
          <div className="space-y-6">
            {initialIndicators.map(indicator => {
              const indicatorHistData = formData.indicatorHistoricalData.find(ih => ih.id === indicator.id);
              const yearEntry = indicatorHistData?.results.find(r => r.year === selectedYear);

              return (
                <div key={indicator.id} className="p-3 border border-gray-100 rounded-md bg-gray-50">
                  <h4 className="text-md font-medium text-gray-800 mb-2">{indicator.id} - {indicator.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Nota Final</label>
                      <input type="text" placeholder="Ex: 0.950" 
                             value={yearEntry?.notaFinal === null || yearEntry?.notaFinal === undefined ? '' : String(yearEntry.notaFinal)} 
                             onChange={e => handleIndicatorFieldChange(indicator.id, 'notaFinal', parseNumericInput(e.target.value))}
                             className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Resultado Consolidado</label>
                      <input type="text" placeholder={indicator.valueLabel || "Valor"} 
                             value={yearEntry?.consolidatedValue === null || yearEntry?.consolidatedValue === undefined ? '' : String(yearEntry.consolidatedValue)}
                             onChange={e => handleIndicatorFieldChange(indicator.id, 'consolidatedValue', parseNumericInput(e.target.value))}
                             className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    {indicator.requiresAuxValue && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">{indicator.auxValueLabel || "Valor Aux. Consolidado"}</label>
                        <input type="text" placeholder={indicator.auxValueLabel || "Valor Aux."}
                               value={yearEntry?.consolidatedAuxValue === null || yearEntry?.consolidatedAuxValue === undefined ? '' : String(yearEntry.consolidatedAuxValue)}
                               onChange={e => handleIndicatorFieldChange(indicator.id, 'consolidatedAuxValue', parseNumericInput(e.target.value))}
                               className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm"/>
                      </div>
                    )}
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-xs font-medium text-gray-600">Periodicidade Usada em {selectedYear}</label>
                      <select value={yearEntry?.periodicityUsed ?? ''} 
                              onChange={e => handleIndicatorFieldChange(indicator.id, 'periodicityUsed', e.target.value === "" ? null : e.target.value as Periodicity)}
                              className="mt-0.5 w-full text-xs p-1.5 border-gray-300 rounded-md shadow-sm">
                        <option value="">Não Registrar Periodicidade</option>
                        {Object.values(Periodicity).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  {(yearEntry?.periodicityUsed && yearEntry.periodicData && yearEntry.periodicData.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-1.5">Dados Periódicos ({yearEntry.periodicityUsed}, {selectedYear})</h5>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${indicator.requiresAuxValue ? 3 : 4} gap-x-3 gap-y-2`}>
                        {yearEntry.periodicData.map((pd, pIdx) => (
                          <div key={pd.periodLabel} className={`flex flex-col space-y-1 ${indicator.requiresAuxValue ? '' : 'sm:col-span-1'}`}>
                            <span className="text-xs text-gray-500 self-center">{pd.periodLabel}:</span>
                            <div className="flex space-x-1">
                              <input type="text" placeholder="Valor" 
                                     value={pd.value === null || pd.value === undefined ? '' : String(pd.value)}
                                     onChange={(e) => handlePeriodicDataChange(indicator.id, pIdx, 'value', e)}
                                     className="w-full text-xs p-1 border-gray-300 rounded-md shadow-sm"/>
                              {indicator.requiresAuxValue && (
                                <input type="text" placeholder="Aux." 
                                       value={pd.auxValue === null || pd.auxValue === undefined ? '' : String(pd.auxValue)}
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
            onClick={handleDownload}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1c3276] text-white font-semibold py-2.5 px-6 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Download size={18} className="mr-2" />
            {isProcessing ? 'Gerando...' : `Baixar Arquivo JSON Histórico`}
          </button>
          {status && (
            <div className={`mt-3 p-2.5 rounded-md text-sm flex items-center ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {status.type === 'success' ? <CheckCircle size={18} className="mr-2"/> : <AlertTriangle size={18} className="mr-2"/>}
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricalDataManagementPage;