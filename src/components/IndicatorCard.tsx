




import React, { useState, useCallback, useEffect, useMemo, ChangeEvent } from 'react';
import { Indicator, IndicatorResult, OperatorSize, Periodicity, PeriodicEntry, IDSSIndicatorWeightLevel, AnalysisType as GeminiAnalysisTypeInternal } from '../types.js';
import ChartComponent, { PeriodicChartDataPoint } from './ChartComponent.js'; 
import IndicatorWeightBar from './IndicatorWeightBar.js';
import { getPeriodLabels } from '../constants.js';
import { getGeminiAnalysis } from '../services/geminiService.js';
import { Edit3, Save, Brain, AlertCircle, BarChart2, X, ArrowUpCircle, ArrowDownCircle, Target, TrendingUp } from 'lucide-react';

interface IndicatorCardProps {
  indicator: Indicator;
  onUpdateIndicator: (updatedIndicator: Indicator) => void;
  operatorSize: OperatorSize;
  activeReferenceYear: number;
}

type LocalAnalysisType = 'lastPeriod' | 'yearlyConsolidated' | 'yearlyComparison';


const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator, onUpdateIndicator, operatorSize, activeReferenceYear }) => {
  console.log(`[IndicatorCard ${indicator.id}] Rendering for year ${activeReferenceYear}. Indicator data:`, JSON.parse(JSON.stringify(indicator)));
  
  const periodicityForActiveYearDisplay = indicator.currentPeriodicity;
  
  const getInitialPeriodicDataForYear = useCallback((year: number, periodicityToUse: Periodicity) => {
    const existingResult = indicator.results.find((r: IndicatorResult) => r.year === year);
    const periodLabels = getPeriodLabels(periodicityToUse);

    if (existingResult && Array.isArray(existingResult.periodicData)) {
        const labelsMatch = existingResult.periodicData.length === periodLabels.length && 
                            existingResult.periodicData.every((pd: PeriodicEntry, idx: number) => pd.periodLabel === periodLabels[idx]);
        if (labelsMatch) return [...existingResult.periodicData];
    }
    return periodLabels.map((label: string): PeriodicEntry => ({
      periodLabel: label,
      value: null,
      auxValue: null,
    }));
  }, [indicator.results]);

  const [activeYearPeriodicInput, setActiveYearPeriodicInput] = useState<PeriodicEntry[]>(
    getInitialPeriodicDataForYear(activeReferenceYear, periodicityForActiveYearDisplay)
  );
  
  const [analysisLoadingStates, setAnalysisLoadingStates] = useState({
    lastPeriod: false,
    yearlyConsolidated: false,
    yearlyComparison: false,
  });
  const [periodicChartData, setPeriodicChartData] = useState<PeriodicChartDataPoint[]>([]);

  useEffect(() => {
    const newPeriodLabels = getPeriodLabels(periodicityForActiveYearDisplay);
    const resultForActiveYear = indicator.results.find((r: IndicatorResult) => r.year === activeReferenceYear);
    
    setActiveYearPeriodicInput(newPeriodLabels.map((label: string): PeriodicEntry => {
        const existingEntryForLabel = resultForActiveYear?.periodicData?.find((pd: PeriodicEntry) => pd.periodLabel === label);
        return {
            periodLabel: label,
            value: existingEntryForLabel?.value ?? null,
            auxValue: existingEntryForLabel?.auxValue ?? null,
        };
    }));
  }, [activeReferenceYear, periodicityForActiveYearDisplay, indicator.results, indicator.id]);


  const consolidateValues = (data: PeriodicEntry[], field: 'value' | 'auxValue' = 'value'): number | null => {
    const values = data.map((entry: PeriodicEntry) => field === 'value' ? entry.value : entry.auxValue).filter(v => v !== null) as number[];
    if (values.length === 0) return null;
    const consolidationFn = indicator.valueConsolidationFn || ((arr: (number | null)[]) => {
        const validArr = arr.filter(v => v !== null) as number[];
        return validArr.length > 0 ? validArr.reduce((s, v) => s + v, 0) / validArr.length : null;
    });
    const result = consolidationFn(values);
    return result === null ? null : parseFloat(result.toFixed(4)); // Ensure precision
  };

  const handlePeriodicInputChange = (index: number, field: 'value' | 'auxValue', inputValue: string) => {
    const numericValue = inputValue === '' ? null : parseFloat(inputValue);

    const newActiveYearPeriodicInput = activeYearPeriodicInput.map((entry: PeriodicEntry, i: number) =>
      i === index ? { ...entry, [field]: numericValue } : entry
    );
    setActiveYearPeriodicInput(newActiveYearPeriodicInput);

    // --- Automatic calculation and update logic ---
    const consolidatedValue = consolidateValues(newActiveYearPeriodicInput, 'value');
    const consolidatedAuxValue = indicator.requiresAuxValue ? consolidateValues(newActiveYearPeriodicInput, 'auxValue') : undefined;
    const notaFinal = indicator.calcularNotaFinalFn(consolidatedValue, consolidatedAuxValue, operatorSize, indicator.parametersByPorte);

    const updatedResults = indicator.results.map((r: IndicatorResult) => {
      if (r.year === activeReferenceYear) {
        return {
          ...r,
          periodicData: [...newActiveYearPeriodicInput],
          consolidatedValue,
          consolidatedAuxValue: consolidatedAuxValue !== undefined ? consolidatedAuxValue : r.consolidatedAuxValue,
          notaFinal,
          // Clear previous analyses as data has changed
          analysisLastPeriod: undefined, 
          analysisYearlyConsolidated: undefined,
          analysisYearlyComparison: undefined,
          errorLastPeriod: undefined,
          errorYearlyConsolidated: undefined,
          errorYearlyComparison: undefined,
        };
      }
      return r;
    });

    // Ensure an entry for the active year exists
    let activeYearEntryExists = updatedResults.some((r: IndicatorResult) => r.year === activeReferenceYear);
    if (!activeYearEntryExists) {
      updatedResults.push({
        year: activeReferenceYear,
        periodicData: [...newActiveYearPeriodicInput],
        consolidatedValue,
        consolidatedAuxValue: consolidatedAuxValue,
        notaFinal,
        analysisLastPeriod: undefined,
        analysisYearlyConsolidated: undefined,
        analysisYearlyComparison: undefined,
        errorLastPeriod: undefined,
        errorYearlyConsolidated: undefined,
        errorYearlyComparison: undefined,
      });
    }
    
    onUpdateIndicator({ 
      ...indicator, 
      currentPeriodicity: indicator.currentPeriodicity, // Assuming this is correctly managed elsewhere if it can change per year
      results: updatedResults.sort((a: IndicatorResult, b: IndicatorResult) => b.year - a.year) 
    });
  };

  const handleTriggerAnalysis = async (analysisType: LocalAnalysisType) => {
    // Clear previous analysis/error for this specific type first
    const analysisFieldToClear = `analysis${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
    const errorFieldToClear = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;

    const resultsWithClearedAnalysis = indicator.results.map(r => {
        if (r.year === activeReferenceYear) {
            const resultCopy = { ...r };
            (resultCopy as any)[analysisFieldToClear] = undefined;
            (resultCopy as any)[errorFieldToClear] = undefined;
            return resultCopy;
        }
        return r;
    });
    // Update state to clear UI *before* making the API call and setting loading
    onUpdateIndicator({ ...indicator, results: resultsWithClearedAnalysis });
    
    setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: true }));
    
    const activeYearFullResult = resultsWithClearedAnalysis.find((r: IndicatorResult) => r.year === activeReferenceYear); // Use the version with cleared fields

    if (!activeYearFullResult) {
        setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
        const errorField = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
        
        const updatedResultsWithNoActiveYearError = indicator.results.map(r => r); 
        if (!updatedResultsWithNoActiveYearError.find(r => r.year === activeReferenceYear)) {
             updatedResultsWithNoActiveYearError.push({
                year: activeReferenceYear,
                periodicData: getPeriodLabels(periodicityForActiveYearDisplay).map(l => ({periodLabel: l, value: null, auxValue: null})),
                consolidatedValue: null, notaFinal: null,
                [errorField]: `Resultados do ano ${activeReferenceYear} não encontrados para iniciar a análise.`
            } as IndicatorResult);
        } else {
             updatedResultsWithNoActiveYearError.forEach(r => {
                if (r.year === activeReferenceYear) {
                    (r as any)[errorField] = `Resultados do ano ${activeReferenceYear} não encontrados para iniciar a análise.`;
                }
             });
        }
        onUpdateIndicator({...indicator, results: updatedResultsWithNoActiveYearError });
        return;
    }
    
    let requestData: any = {
        indicatorName: indicator.name,
        simpleName: indicator.simpleName,
        description: indicator.description,
        targetDescription: indicator.targetDescription,
        isRate: indicator.isRate,
        parametersForPorte: operatorSize && indicator.parametersByPorte ? indicator.parametersByPorte[operatorSize] : undefined,
        responsibleSector: indicator.responsibleSector,
        targetDirection: indicator.targetDirection,
        activeReferenceYear: activeReferenceYear
    };
    let geminiRequestType: GeminiAnalysisTypeInternal;

    if (analysisType === 'lastPeriod') {
      const lastFilledEntry = [...activeYearPeriodicInput].reverse().find((p: PeriodicEntry) => p.value !== null);
      if (!lastFilledEntry || lastFilledEntry.value === null) {
         setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
         const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
         onUpdateIndicator({...indicator, results: indicator.results.map((r) => r.year === activeReferenceYear ? {...r, [errorFieldUpdate]: "Nenhum valor preenchido no período atual para análise."} : r) });
         return;
      }
      requestData.currentValue = lastFilledEntry?.value ?? null;
      requestData.currentPeriodLabel = lastFilledEntry?.periodLabel ?? 'N/A';
      geminiRequestType = 'indicator_last_period';
    } else if (analysisType === 'yearlyConsolidated') {
      if (activeYearFullResult.consolidatedValue === null) {
         setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
         const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
         onUpdateIndicator({...indicator, results: indicator.results.map((r) => r.year === activeReferenceYear ? {...r, [errorFieldUpdate]: "Valor consolidado anual é nulo. Análise não pode ser gerada."} : r) });
         return;
      }
      requestData.currentValue = activeYearFullResult.consolidatedValue;
      requestData.notaFinal = activeYearFullResult.notaFinal;
      geminiRequestType = 'indicator_yearly_consolidated';
    } else { // yearlyComparison
      if (activeYearFullResult.consolidatedValue === null) {
         setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
         const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
         onUpdateIndicator({...indicator, results: indicator.results.map((r) => r.year === activeReferenceYear ? {...r, [errorFieldUpdate]: "Valor consolidado anual é nulo. Análise não pode ser gerada."} : r) });
         return;
      }
      const previousYearResult = indicator.results.find((r: IndicatorResult) => r.year === activeReferenceYear - 1);
      requestData.currentValue = activeYearFullResult.consolidatedValue;
      requestData.previousYearValue = previousYearResult?.consolidatedValue ?? null;
      geminiRequestType = 'indicator_yearly_comparison';
    }
    
    let analysisText: string = '';
    let errorMsg : string | undefined = undefined;

    const finalRequest = { type: geminiRequestType, indicatorData: requestData, operatorSize, activeReferenceYear };

    try {
      analysisText = await getGeminiAnalysis(finalRequest);
    } catch (e: any) {
      errorMsg = e.message || `Erro na análise (${analysisType})`;
    }

    const analysisFieldUpdate = `analysis${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
    const errorFieldUpdate = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;

    onUpdateIndicator({
      ...indicator,
      results: indicator.results.map((r: IndicatorResult) =>
        r.year === activeReferenceYear
          ? { ...r, [analysisFieldUpdate]: analysisText, [errorFieldUpdate]: errorMsg }
          : r
      ),
    });
    setAnalysisLoadingStates((prev) => ({ ...prev, [analysisType]: false }));
  };

  const handleCloseAnalysis = (analysisTypeToClose: LocalAnalysisType) => {
    onUpdateIndicator({
      ...indicator,
      results: indicator.results.map((r: IndicatorResult) => {
        if (r.year === activeReferenceYear) {
          const analysisField = `analysis${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}` as keyof IndicatorResult;
          const errorField = `error${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}` as keyof IndicatorResult;
          return { ...r, [analysisField]: undefined, [errorField]: undefined };
        }
        return r;
      }),
    });
  };

  const activeYearDisplayResult = indicator.results.find((r: IndicatorResult) => r.year === activeReferenceYear);
  const isAnyAnalysisButtonDisabled = !activeYearDisplayResult || activeYearDisplayResult.consolidatedValue === null;
  const hasAnyPeriodicValueForActiveYear = activeYearPeriodicInput.some(p => p.value !== null);
  
  const renderTargetDirectionIcon = () => {
    if (indicator.targetDirection === 'up') return <ArrowUpCircle size={18} className="text-black inline-block ml-1" />;
    if (indicator.targetDirection === 'down') return <ArrowDownCircle size={18} className="text-black inline-block ml-1" />;
    return null; 
  };

  const getBarColorForPeriodicNotaFinal = (nota: number | null): string => {
    if (nota === null) return '#6b7280'; 
    if (nota <= 0.19) return '#ef4444'; 
    if (nota <= 0.39) return '#f97316'; 
    if (nota <= 0.59) return '#eab308'; 
    if (nota <= 0.79) return '#84cc16'; 
    return '#16a34a'; 
  };

  useEffect(() => {
    const newChartData: PeriodicChartDataPoint[] = activeYearPeriodicInput
      .filter(entry => entry.value !== null)
      .map(entry => {
        const notaFinalForPeriod = indicator.calcularNotaFinalFn(
          entry.value,
          entry.auxValue,
          operatorSize,
          indicator.parametersByPorte
        );
        const fillColor = getBarColorForPeriodicNotaFinal(notaFinalForPeriod);
        return {
          periodLabel: entry.periodLabel,
          value: entry.value!, 
          fillColor: fillColor,
        };
      });
    setPeriodicChartData(newChartData);
  }, [activeYearPeriodicInput, indicator.calcularNotaFinalFn, operatorSize, indicator.parametersByPorte, indicator.id]);

  const historicalResultBase2023 = indicator.results.find(r => r.year === 2023);
  const historicalResultBase2022 = indicator.results.find(r => r.year === 2022);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 mb-6 transition-all duration-300 hover:shadow-xl flex flex-col h-full">
      <h3 className="text-xl font-semibold text-[#004e4c] mb-1">{indicator.id} - {indicator.name}</h3>
      <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Nome Simplificado:</span> {indicator.simpleName}</p>
      {indicator.responsibleSector && indicator.responsibleSector !== "Não Definido" && (
        <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Setor Responsável:</span> {indicator.responsibleSector}</p>
      )}
      <p className="text-xs text-gray-500 my-2"><span className="font-medium text-gray-700">Meta:</span> {indicator.targetDescription}</p>
      {indicator.targetDirection && indicator.targetDirection !== 'none' && (
        <p className="text-sm text-gray-700 mb-2 flex items-center">
          <span className="font-medium">Direção da Meta:</span>{renderTargetDirectionIcon()}
        </p>
      )}
      {indicator.idssWeightLevel && <IndicatorWeightBar level={indicator.idssWeightLevel} />}
      
      <div className="my-2">
         <p className="text-xs text-gray-500">
           Periodicidade de Medição (configurada para {activeReferenceYear}): <span className="font-medium text-gray-600">{periodicityForActiveYearDisplay}</span>
         </p>
      </div>

      <div className="space-y-2 mb-4 flex-grow overflow-y-auto pr-2 max-h-60">
        <p className="text-sm font-medium text-gray-700 sticky top-0 bg-white py-1">Resultados ({activeReferenceYear}):</p>
        {activeYearPeriodicInput.map((entry: PeriodicEntry, index: number) => (
          <div key={entry.periodLabel} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <span className="text-xs text-gray-600 font-medium whitespace-nowrap">{entry.periodLabel}:</span>
            <input
              type="number" step="any" placeholder={indicator.valueLabel || (indicator.isRate ? "Taxa (%)" : "Valor")}
              value={entry.value === null ? '' : String(entry.value)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handlePeriodicInputChange(index, 'value', e.target.value)}
              className="col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00995d] focus:border-[#00995d] sm:text-xs"
              aria-label={`${indicator.valueLabel || "Valor"} para ${entry.periodLabel} em ${activeReferenceYear}`}
            />
            {indicator.requiresAuxValue && (
              <input
                type="number" step="any" placeholder={indicator.auxValueLabel || "Valor Aux."}
                value={entry.auxValue === null ? '' : String(entry.auxValue)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handlePeriodicInputChange(index, 'auxValue', e.target.value)}
                className="col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00995d] focus:border-[#00995d] sm:text-xs"
                aria-label={`${indicator.auxValueLabel || "Valor Auxiliar"} para ${entry.periodLabel} em ${activeReferenceYear}`}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Botão de Salvar Resultados Removido */}

      {activeYearDisplayResult && activeYearDisplayResult.notaFinal !== null && (
        <p className="text-sm font-medium text-gray-700 my-2 text-center">
          Nota Simulada ({activeReferenceYear}): 
          <span className={`font-bold text-lg ml-2 ${activeYearDisplayResult.notaFinal >= 0.7 ? 'text-green-600' : activeYearDisplayResult.notaFinal >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
            {activeYearDisplayResult.notaFinal.toFixed(3)}
          </span>
        </p>
      )}
      
      {(historicalResultBase2023 || historicalResultBase2022) && (
        <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
          <h5 className="font-semibold text-blue-800 mb-1 flex items-center">
            <TrendingUp size={14} className="mr-1.5" /> Histórico Unimed Resende (Oficial - Pontos Fixos):
          </h5>
          <ul className="list-disc list-inside ml-2">
            {historicalResultBase2023 && (historicalResultBase2023.consolidatedValue !== null || historicalResultBase2023.notaFinal !== null) && (
              <li>
                IDSS 2024 (Base 2023): 
                {historicalResultBase2023.consolidatedValue !== null && ` Resultado: ${Number(historicalResultBase2023.consolidatedValue).toFixed(indicator.isRate ? 2 : 4)}${indicator.isRate ? '%' : ''}`}
                {historicalResultBase2023.notaFinal !== null && `, Nota: ${historicalResultBase2023.notaFinal.toFixed(4)}`}
              </li>
            )}
            {historicalResultBase2022 && (historicalResultBase2022.consolidatedValue !== null || historicalResultBase2022.notaFinal !== null) && (
              <li>
                IDSS 2023 (Base 2022): 
                {historicalResultBase2022.consolidatedValue !== null && ` Resultado: ${Number(historicalResultBase2022.consolidatedValue).toFixed(indicator.isRate ? 2 : 4)}${indicator.isRate ? '%' : ''}`}
                {historicalResultBase2022.notaFinal !== null && `, Nota: ${historicalResultBase2022.notaFinal.toFixed(4)}`}
              </li>
            )}
            {( !historicalResultBase2023 || (historicalResultBase2023.consolidatedValue === null && historicalResultBase2023.notaFinal === null) ) && 
             ( !historicalResultBase2022 || (historicalResultBase2022.consolidatedValue === null && historicalResultBase2022.notaFinal === null) ) &&
             (<li>Nenhum dado histórico fixo registrado para este indicador em 2022 ou 2023.</li>)
            }
          </ul>
        </div>
      )}

      <div className="mt-auto space-y-2">
        <p className="text-sm font-semibold text-gray-700 mt-3">Análises Críticas ({activeReferenceYear}):</p>
        {[
          { type: 'lastPeriod', label: 'Último Período vs Ficha Técnica', analysis: activeYearDisplayResult?.analysisLastPeriod, error: activeYearDisplayResult?.errorLastPeriod, loading: analysisLoadingStates.lastPeriod, 
            disabledOverride: analysisLoadingStates.lastPeriod || !activeYearDisplayResult || !hasAnyPeriodicValueForActiveYear },
          { type: 'yearlyConsolidated', label: 'Resultado Anual vs Ficha Técnica', analysis: activeYearDisplayResult?.analysisYearlyConsolidated, error: activeYearDisplayResult?.errorYearlyConsolidated, loading: analysisLoadingStates.yearlyConsolidated, 
            disabledOverride: isAnyAnalysisButtonDisabled || analysisLoadingStates.yearlyConsolidated },
          { type: 'yearlyComparison', label: 'Resultado Anual vs Ano Anterior', analysis: activeYearDisplayResult?.analysisYearlyComparison, error: activeYearDisplayResult?.errorYearlyComparison, loading: analysisLoadingStates.yearlyComparison, 
            disabledOverride: isAnyAnalysisButtonDisabled || analysisLoadingStates.yearlyComparison },
        ].map(item => (
          <div key={item.type}>
            <button
              onClick={() => { if (!item.disabledOverride) handleTriggerAnalysis(item.type as LocalAnalysisType); }}
              disabled={item.disabledOverride}
              className="w-full bg-[#f47920] hover:bg-[#d8681c] text-white font-semibold py-2 px-3 text-xs rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            > <Brain size={16} className="mr-2" />
              {item.loading ? 'Analisando...' : `Analisar: ${item.label}`}
            </button>
            {item.analysis && (
              <div className="relative mt-2 p-3 pt-5 bg-[#cde3bb] border border-[#b1d34b] rounded-md">
                <button onClick={() => handleCloseAnalysis(item.type as LocalAnalysisType)} className="absolute top-1 right-1 p-0.5 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-500 hover:text-gray-700 transition-colors" aria-label="Fechar análise">
                  <X size={14} />
                </button>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.analysis}</p>
              </div>
            )}
            {item.error && (
              <div className="mt-1 p-1.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {item.error}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 border-t pt-4">
         <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
           <BarChart2 size={16} className="mr-2 text-[#00995d]" /> Resultados Periódicos ({activeReferenceYear})
        </h4>
        <ChartComponent 
            data={periodicChartData} 
            valueLabel={indicator.valueLabel || (indicator.isRate ? "Taxa (%)" : "Valor")} 
            isRate={indicator.isRate} 
        />
      </div>
    </div>
  );
};

export default React.memo(IndicatorCard);