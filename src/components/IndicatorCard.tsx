
import React, { useState, useCallback, useEffect, useMemo, ChangeEvent } from 'react';
import { Indicator, IndicatorResult, OperatorSize, Periodicity, PeriodicEntry, AnalysisType as GeminiAnalysisTypeInternal, GeminiAnalysisRequest } from '../src/types';
import { ChartComponent, PeriodicChartDataPoint } from './ChartComponent'; 
import { IndicatorWeightBar } from './IndicatorWeightBar';
import { IndicatorAnalysisSection } from './IndicatorAnalysisSection';
import { getPeriodLabels } from '../src/constants';
import { getGeminiAnalysis } from '../src/services';
import { Save, ArrowUpCircle, ArrowDownCircle, BarChart2, TrendingUp, Info, Check } from 'lucide-react';

interface IndicatorCardProps {
  indicator: Indicator;
  onUpdateIndicator: (updatedIndicator: Indicator) => void;
  operatorSize: OperatorSize;
  activeReferenceYear: number;
}

type LocalAnalysisType = 'lastPeriod' | 'yearlyConsolidated' | 'yearlyComparison';


export const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator, onUpdateIndicator, operatorSize, activeReferenceYear }) => {
  const activeYearResult = indicator.results.find((r: IndicatorResult) => r.year === activeReferenceYear);
  
  const getInitialPeriodicity = () => {
    if (activeYearResult && activeYearResult.periodicityUsed && indicator.periodicityOptions.includes(activeYearResult.periodicityUsed)) {
        return activeYearResult.periodicityUsed;
    }
    return indicator.currentPeriodicity;
  };

  const [currentPeriodicity, setCurrentPeriodicity] = useState<Periodicity>(getInitialPeriodicity());

  const getInitialPeriodicData = useCallback((year: number, periodicity: Periodicity) => {
    const existingResult = indicator.results.find((r: IndicatorResult) => r.year === year);
    const periodLabels = getPeriodLabels(periodicity);
    
    if (existingResult && Array.isArray(existingResult.periodicData) && existingResult.periodicData.length > 0) {
      return periodLabels.map(label => {
        const foundEntry = existingResult.periodicData.find(pd => pd.periodLabel === label);
        return foundEntry || { periodLabel: label, value: null, auxValue: null };
      });
    }
    
    return periodLabels.map((label: string): PeriodicEntry => ({
      periodLabel: label,
      value: null,
      auxValue: null,
    }));
  }, [indicator.results]);

  const [activeYearPeriodicInput, setActiveYearPeriodicInput] = useState<PeriodicEntry[]>([]);
  const [analysisLoadingStates, setAnalysisLoadingStates] = useState({ lastPeriod: false, yearlyConsolidated: false, yearlyComparison: false });
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'idle'>('idle');

  useEffect(() => {
    setCurrentPeriodicity(getInitialPeriodicity());
    setActiveYearPeriodicInput(getInitialPeriodicData(activeReferenceYear, getInitialPeriodicity()));
    setIsDirty(false);
    setSaveStatus('idle');
  }, [activeReferenceYear, currentPeriodicity, indicator.results, indicator.id, getInitialPeriodicData, getInitialPeriodicity]);

  const consolidateValues = useCallback((data: PeriodicEntry[], field: 'value' | 'auxValue' = 'value'): number | null => {
    if (!data) return null;
    const values = data.map((entry: PeriodicEntry) => field === 'value' ? entry.value : entry.auxValue).filter(v => v !== null) as number[];
    if (values.length === 0) return null;

    if(indicator.valueConsolidationFn){
      return indicator.valueConsolidationFn(values);
    }
    // Default: average
    const sum = values.reduce((s, v) => s + v, 0);
    return parseFloat((sum / values.length).toFixed(4));
  }, [indicator.valueConsolidationFn]);

  const { localConsolidatedValue, localNotaFinal } = useMemo(() => {
    const cv = consolidateValues(activeYearPeriodicInput, 'value');
    const cAv = indicator.requiresAuxValue ? consolidateValues(activeYearPeriodicInput, 'auxValue') : undefined;
    const nf = indicator.calcularNotaFinalFn(cv, cAv, operatorSize, indicator.parametersByPorte);
    return { localConsolidatedValue: cv, localNotaFinal: nf };
  }, [activeYearPeriodicInput, consolidateValues, indicator.calcularNotaFinalFn, indicator.requiresAuxValue, indicator.parametersByPorte, operatorSize]);

  const handlePeriodicInputChange = (index: number, field: 'value' | 'auxValue', inputValue: string) => {
    const numericValue = inputValue === '' ? null : parseFloat(inputValue.replace(',', '.'));
    setActiveYearPeriodicInput((prev: PeriodicEntry[]) =>
      prev.map((entry: PeriodicEntry, i: number) => (i === index ? { ...entry, [field]: numericValue } : entry))
    );
    setIsDirty(true);
    setSaveStatus('idle');
  };
  
  const handleSubmitResults = useCallback(() => {
    if(!isDirty) return;

    const updatedResults = indicator.results.map((r: IndicatorResult) => {
      if (r.year === activeReferenceYear) {
        return {
          ...r,
          periodicData: [...activeYearPeriodicInput],
          periodicityUsed: currentPeriodicity, // Save the used periodicity
          consolidatedValue: localConsolidatedValue,
          consolidatedAuxValue: indicator.requiresAuxValue ? consolidateValues(activeYearPeriodicInput, 'auxValue') : r.consolidatedAuxValue,
          notaFinal: localNotaFinal,
          // Clear previous analyses as data has changed
          analysisLastPeriod: undefined, analysisYearlyConsolidated: undefined, analysisYearlyComparison: undefined,
          errorLastPeriod: undefined, errorYearlyConsolidated: undefined, errorYearlyComparison: undefined,
        };
      }
      return r;
    });
    
    // Ensure result for the year exists
    if (!updatedResults.find(r => r.year === activeReferenceYear)) {
      updatedResults.push({
        year: activeReferenceYear,
        periodicData: [...activeYearPeriodicInput],
        periodicityUsed: currentPeriodicity,
        consolidatedValue: localConsolidatedValue,
        consolidatedAuxValue: indicator.requiresAuxValue ? consolidateValues(activeYearPeriodicInput, 'auxValue') : undefined,
        notaFinal: localNotaFinal,
      } as IndicatorResult);
    }

    onUpdateIndicator({ ...indicator, currentPeriodicity, results: updatedResults.sort((a, b) => a.year - b.year) });
    setIsDirty(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [isDirty, activeYearPeriodicInput, indicator, operatorSize, onUpdateIndicator, activeReferenceYear, currentPeriodicity, consolidateValues, localConsolidatedValue, localNotaFinal]);

  const handleTriggerAnalysis = async (analysisType: LocalAnalysisType) => {
    setAnalysisLoadingStates(prev => ({ ...prev, [analysisType]: true }));
    const errorField = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
    let geminiRequestType: GeminiAnalysisTypeInternal;
    let requestData: GeminiAnalysisRequest['indicatorData'] = {
        indicatorName: indicator.name, simpleName: indicator.simpleName, description: indicator.description,
        targetDescription: indicator.targetDescription, isRate: indicator.isRate,
        parametersForPorte: operatorSize && indicator.parametersByPorte ? indicator.parametersByPorte[operatorSize] : undefined,
        responsibleSector: indicator.responsibleSector, targetDirection: indicator.targetDirection,
        activeReferenceYear: activeReferenceYear
    };
    
    const updateError = (message: string) => {
       onUpdateIndicator({...indicator, results: indicator.results.map(r => r.year === activeReferenceYear ? {...r, [errorField]: message} : r)});
       setAnalysisLoadingStates(prev => ({...prev, [analysisType]: false}));
    }

    if (analysisType === 'lastPeriod') {
      const lastFilledEntry = [...activeYearPeriodicInput].reverse().find(p => p.value !== null);
      if (!lastFilledEntry || lastFilledEntry.value === null) { return updateError("Nenhum valor preenchido no período atual para análise."); }
      requestData.currentValue = lastFilledEntry.value;
      requestData.currentPeriodLabel = lastFilledEntry.periodLabel;
      geminiRequestType = 'indicator_last_period';
    } else { // yearlyConsolidated or yearlyComparison
      if (localConsolidatedValue === null) { return updateError("Valor consolidado anual é nulo. Análise não pode ser gerada."); }
      requestData.currentValue = localConsolidatedValue;
      if (analysisType === 'yearlyConsolidated') {
        requestData.notaFinal = localNotaFinal;
        geminiRequestType = 'indicator_yearly_consolidated';
      } else { // yearlyComparison
        const previousYearResult = indicator.results.find(r => r.year === activeReferenceYear - 1);
        requestData.previousYearValue = previousYearResult?.consolidatedValue ?? null;
        geminiRequestType = 'indicator_yearly_comparison';
      }
    }
    
    const finalRequest: GeminiAnalysisRequest = { type: geminiRequestType, indicatorData: requestData, operatorSize, activeReferenceYear };
    try {
      const analysisText = await getGeminiAnalysis(finalRequest);
      const analysisField = `analysis${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
      onUpdateIndicator({...indicator, results: indicator.results.map(r => r.year === activeReferenceYear ? { ...r, [analysisField]: analysisText, [errorField]: undefined } : r)});
    } catch (e: any) {
      updateError(e.message || `Erro na análise (${analysisType})`);
    } finally {
       setAnalysisLoadingStates(prev => ({ ...prev, [analysisType]: false }));
    }
  };

  const handleCloseAnalysis = (analysisTypeToClose: LocalAnalysisType) => {
    const analysisField = `analysis${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}` as keyof IndicatorResult;
    const errorField = `error${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}` as keyof IndicatorResult;
    onUpdateIndicator({...indicator, results: indicator.results.map(r => r.year === activeReferenceYear ? { ...r, [analysisField]: undefined, [errorField]: undefined } : r)});
  };

  const activeYearDisplayResult = indicator.results.find((r: IndicatorResult) => r.year === activeReferenceYear);
  const isAnyAnalysisButtonDisabled = localConsolidatedValue === null;
  const hasAnyPeriodicValueForActiveYear = activeYearPeriodicInput.some(p => p.value !== null);
  
  const renderTargetDirectionIcon = () => {
    if (indicator.targetDirection === 'up') return <ArrowUpCircle size={18} className="text-black inline-block ml-1" aria-label="Meta é subir" />;
    if (indicator.targetDirection === 'down') return <ArrowDownCircle size={18} className="text-black inline-block ml-1" aria-label="Meta é descer" />;
    return null; 
  };

  const getBarColorForPeriodicNotaFinal = (nota: number | null): string => {
    if (nota === null) return '#9ca3af'; // gray-400
    if (nota <= 0.19) return '#ef4444'; // red-500
    if (nota <= 0.39) return '#f97316'; // orange-500
    if (nota <= 0.59) return '#eab308'; // yellow-500
    if (nota <= 0.79) return '#84cc16'; // lime-500
    return '#22c55e'; // green-500
  };

  const periodicChartData: PeriodicChartDataPoint[] = useMemo(() => {
     return activeYearPeriodicInput
      .filter(entry => entry.value !== null)
      .map(entry => {
        const notaFinalForPeriod = indicator.calcularNotaFinalFn(entry.value, entry.auxValue, operatorSize, indicator.parametersByPorte);
        const fillColor = getBarColorForPeriodicNotaFinal(notaFinalForPeriod);
        return { periodLabel: entry.periodLabel, value: entry.value!, fillColor };
      });
  }, [activeYearPeriodicInput, indicator.calcularNotaFinalFn, operatorSize, indicator.parametersByPorte]);
  
  const baseId = `${indicator.id}-${activeReferenceYear}`;
  const analysisSections = [
    { type: 'lastPeriod', label: 'Último Período vs Ficha Técnica', analysis: activeYearDisplayResult?.analysisLastPeriod, error: activeYearDisplayResult?.errorLastPeriod, loading: analysisLoadingStates.lastPeriod, disabledOverride: analysisLoadingStates.lastPeriod || !hasAnyPeriodicValueForActiveYear },
    { type: 'yearlyConsolidated', label: 'Resultado Anual vs Ficha Técnica', analysis: activeYearDisplayResult?.analysisYearlyConsolidated, error: activeYearDisplayResult?.errorYearlyConsolidated, loading: analysisLoadingStates.yearlyConsolidated, disabledOverride: isAnyAnalysisButtonDisabled || analysisLoadingStates.yearlyConsolidated },
    { type: 'yearlyComparison', label: 'Resultado Anual vs Ano Anterior', analysis: activeYearDisplayResult?.analysisYearlyComparison, error: activeYearDisplayResult?.errorYearlyComparison, loading: analysisLoadingStates.yearlyComparison, disabledOverride: isAnyAnalysisButtonDisabled || analysisLoadingStates.yearlyComparison },
  ];

  const SaveButtonContent = () => {
      if (saveStatus === 'saved') return <><Check size={18} className="mr-2"/> Salvo!</>;
      if (isDirty) return <><Save size={18} className="mr-2"/> Salvar Resultados</>;
      return <><Save size={18} className="mr-2"/> Resultados Salvos</>;
  };

  return (
    <div className="bg-base-200 shadow-lg rounded-xl p-6 mb-6 transition-all duration-300 hover:shadow-xl flex flex-col h-full">
      <h3 className="text-xl font-semibold text-primary mb-1">{indicator.id} - {indicator.name}</h3>
      {indicator.responsibleSector && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Setor Responsável:</span> {indicator.responsibleSector}</p>}
      <p className="text-xs text-gray-500 my-2 flex items-start"><Info size={16} className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" /><span className="font-medium text-gray-700 mr-1">Meta:</span> {indicator.targetDescription}</p>
      {indicator.targetDirection !== 'none' && <p className="text-sm text-gray-700 mb-2 flex items-center"><span className="font-medium">Direção da Meta:</span>{renderTargetDirectionIcon()}</p>}
      {indicator.idssWeightLevel && <IndicatorWeightBar level={indicator.idssWeightLevel} />}
      
      <div className="my-4">
        <p className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Periodicidade ({activeReferenceYear}):</span> {currentPeriodicity}
        </p>
      </div>

      <div className="space-y-2 mb-4 flex-grow overflow-y-auto pr-2 max-h-60">
        <p className="text-sm font-medium text-gray-700 sticky top-0 bg-base-200 py-1">Resultados ({activeReferenceYear}):</p>
        {activeYearPeriodicInput.map((entry: PeriodicEntry, index: number) => (
          <div key={`${entry.periodLabel}-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <label htmlFor={`input-value-${baseId}-${index}`} className="text-xs text-gray-600 font-medium whitespace-nowrap">{entry.periodLabel}:</label>
            <input
              id={`input-value-${baseId}-${index}`}
              type="text" placeholder={indicator.valueLabel || (indicator.isRate ? "Taxa (%)" : "Valor")}
              value={entry.value === null ? '' : String(entry.value)}
              onChange={(e) => handlePeriodicInputChange(index, 'value', e.target.value)}
              className="col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-xs"
              aria-label={`${indicator.valueLabel || "Valor"} para ${entry.periodLabel} em ${activeReferenceYear}`}
            />
            {indicator.requiresAuxValue && (
              <input
                id={`input-aux-value-${baseId}-${index}`}
                type="text" placeholder={indicator.auxValueLabel || "Valor Aux."}
                value={entry.auxValue === null ? '' : String(entry.auxValue)}
                onChange={(e) => handlePeriodicInputChange(index, 'auxValue', e.target.value)}
                className="col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-xs"
                aria-label={`${indicator.auxValueLabel || "Valor Auxiliar"} para ${entry.periodLabel} em ${activeReferenceYear}`}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmitResults}
          disabled={!isDirty || Object.values(analysisLoadingStates).some(s => s) || saveStatus === 'saved'}
          className={`font-bold py-2 px-4 rounded-lg shadow-md flex items-center transition-colors duration-200
            ${!isDirty || saveStatus === 'saved' ? 'bg-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-secondary-focus'}
            ${saveStatus === 'saved' ? 'bg-green-500 hover:bg-green-600' : ''}
             text-white`}
        >
          <SaveButtonContent />
        </button>
      </div>

      <div className="mt-6 border-t border-gray-300 pt-4 space-y-4">
        <h4 className="text-md font-semibold text-gray-800 flex items-center"><TrendingUp size={18} className="mr-2 text-accent"/> Análises com IA</h4>
        <div className="grid grid-cols-1 gap-4">
          {analysisSections.map((section) => (
            <IndicatorAnalysisSection
              key={section.type}
              type={section.type as LocalAnalysisType}
              label={section.label}
              analysis={section.analysis}
              error={section.error}
              loading={section.loading}
              disabled={section.disabledOverride}
              onTrigger={() => handleTriggerAnalysis(section.type as LocalAnalysisType)}
              onClose={() => handleCloseAnalysis(section.type as LocalAnalysisType)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-gray-300 pt-4">
        <h4 className="text-md font-semibold text-gray-800 flex items-center mb-2"><BarChart2 size={18} className="mr-2 text-primary"/> Gráfico de Desempenho ({activeReferenceYear})</h4>
        <ChartComponent data={periodicChartData} valueLabel={indicator.valueLabel || 'Valor'} isRate={indicator.isRate} />
      </div>

    </div>
  );
};