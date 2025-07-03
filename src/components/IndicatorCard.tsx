import React, { useState, useCallback, useEffect, useMemo, ChangeEvent } from 'react';
import { Indicator, IndicatorResult, OperatorSize, Periodicity, PeriodicEntry, AnalysisType as GeminiAnalysisTypeInternal, GeminiAnalysisRequest } from '../types';
import { ChartComponent, PeriodicChartDataPoint } from './ChartComponent'; 
import { IndicatorWeightBar } from './IndicatorWeightBar';
import { IndicatorAnalysisSection } from './IndicatorAnalysisSection';
import { getPeriodLabels } from '../constants';
import { getGeminiAnalysis } from '../services/geminiService';
import { Save, ArrowUpCircle, ArrowDownCircle, BarChart2, TrendingUp, Info, Check } from 'lucide-react';

interface IndicatorCardProps {
  indicator: Indicator;
  onUpdateIndicator: (updatedIndicator: Indicator) => void;
  operatorSize: OperatorSize;
  activeReferenceYear: number;
}

type LocalAnalysisType = 'lastPeriod' | 'yearlyConsolidated' | 'yearlyComparison';

export const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator, onUpdateIndicator, operatorSize, activeReferenceYear }) => {
  const [activeYearResult, setActiveYearResult] = useState(() => indicator.results.find(r => r.year === activeReferenceYear));
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'idle'>('idle');
  
  const getInitialPeriodicity = useCallback(() => {
    return activeYearResult?.periodicityUsed || indicator.currentPeriodicity;
  }, [activeYearResult, indicator.currentPeriodicity]);

  const [currentPeriodicity, setCurrentPeriodicity] = useState<Periodicity>(getInitialPeriodicity());

  const getInitialPeriodicData = useCallback(() => {
    const periodLabels = getPeriodLabels(currentPeriodicity);
    const existingData = activeYearResult?.periodicData;

    if (existingData && existingData.length > 0 && activeYearResult?.periodicityUsed === currentPeriodicity) {
        return periodLabels.map(label => {
            const foundEntry = existingData.find(pd => pd.periodLabel === label);
            return foundEntry || { periodLabel: label, value: null, auxValue: null };
        });
    }
    
    return periodLabels.map((label: string): PeriodicEntry => ({
      periodLabel: label,
      value: null,
      auxValue: null,
    }));
  }, [currentPeriodicity, activeYearResult]);

  const [activeYearPeriodicInput, setActiveYearPeriodicInput] = useState<PeriodicEntry[]>(getInitialPeriodicData());
  const [analysisLoadingStates, setAnalysisLoadingStates] = useState({ lastPeriod: false, yearlyConsolidated: false, yearlyComparison: false });

  useEffect(() => {
    const newActiveYearResult = indicator.results.find(r => r.year === activeReferenceYear);
    setActiveYearResult(newActiveYearResult);
    const newPeriodicity = newActiveYearResult?.periodicityUsed || indicator.currentPeriodicity;
    setCurrentPeriodicity(newPeriodicity);
  }, [activeReferenceYear, indicator.results, indicator.currentPeriodicity]);

  useEffect(() => {
    setActiveYearPeriodicInput(getInitialPeriodicData());
    setSaveStatus('idle');
    setIsDirty(false);
  }, [activeYearResult, getInitialPeriodicData]);

  const consolidateValues = useCallback((data: PeriodicEntry[], field: 'value' | 'auxValue' = 'value'): number | null => {
    if (!data) return null;
    const values = data.map(entry => field === 'value' ? entry.value : entry.auxValue).filter(v => v !== null) as number[];
    if (values.length === 0) return null;

    if (indicator.valueConsolidationFn) {
      return indicator.valueConsolidationFn(values);
    }
    // Default: first value if only one, otherwise average
    return values.length === 1 ? values[0] : averageConsolidation(values);
  }, [indicator.valueConsolidationFn]);
  
  const averageConsolidation = (periodicValues: (number | null)[]) => {
      const validValues = periodicValues.filter(v => v !== null) as number[];
      if (validValues.length === 0) return null;
      const sum = validValues.reduce((s, val) => s + val, 0);
      return parseFloat((sum / validValues.length).toFixed(4));
  };

  const { localConsolidatedValue, localNotaFinal } = useMemo(() => {
    const cv = consolidateValues(activeYearPeriodicInput, 'value');
    const cAv = indicator.requiresAuxValue ? consolidateValues(activeYearPeriodicInput, 'auxValue') : undefined;
    const nf = indicator.calcularNotaFinalFn(cv, cAv, operatorSize, indicator.parametersByPorte);
    return { localConsolidatedValue: cv, localNotaFinal: nf };
  }, [activeYearPeriodicInput, consolidateValues, indicator, operatorSize]);

  const handlePeriodicityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newPeriodicity = e.target.value as Periodicity;
    setCurrentPeriodicity(newPeriodicity);
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handlePeriodicInputChange = (index: number, field: 'value' | 'auxValue', inputValue: string) => {
    const numericValue = inputValue.trim() === '' ? null : parseFloat(inputValue.replace(',', '.'));
    setActiveYearPeriodicInput(prev =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: numericValue } : entry))
    );
    setIsDirty(true);
    setSaveStatus('idle');
  };
  
  const handleSubmitResults = useCallback(() => {
    if(!isDirty) return;

    const newResultForYear = {
        ...(activeYearResult || { year: activeReferenceYear }),
        periodicData: [...activeYearPeriodicInput],
        periodicityUsed: currentPeriodicity,
        consolidatedValue: localConsolidatedValue,
        consolidatedAuxValue: indicator.requiresAuxValue ? consolidateValues(activeYearPeriodicInput, 'auxValue') : activeYearResult?.consolidatedAuxValue,
        notaFinal: localNotaFinal,
        analysisLastPeriod: undefined, analysisYearlyConsolidated: undefined, analysisYearlyComparison: undefined,
        errorLastPeriod: undefined, errorYearlyConsolidated: undefined, errorYearlyComparison: undefined,
    };
    
    const otherResults = indicator.results.filter(r => r.year !== activeReferenceYear);
    const updatedResults = [...otherResults, newResultForYear].sort((a,b) => a.year - b.year);

    onUpdateIndicator({ ...indicator, results: updatedResults });
    setIsDirty(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);

  }, [isDirty, activeYearPeriodicInput, indicator, onUpdateIndicator, activeReferenceYear, currentPeriodicity, consolidateValues, localConsolidatedValue, localNotaFinal, activeYearResult]);

  const handleTriggerAnalysis = async (analysisType: LocalAnalysisType) => {
    setAnalysisLoadingStates(prev => ({ ...prev, [analysisType]: true }));
    const errorField = `error${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
    
    const updateError = (message: string) => {
       const updatedResults = indicator.results.map(r => r.year === activeReferenceYear ? {...r, [errorField]: message} : r);
       onUpdateIndicator({...indicator, results: updatedResults});
       setAnalysisLoadingStates(prev => ({...prev, [analysisType]: false}));
    };
    
    let request: GeminiAnalysisRequest;
    
    try {
        const lastFilledEntry = [...activeYearPeriodicInput].reverse().find(p => p.value !== null);
        const previousYearResult = indicator.results.find(r => r.year === activeReferenceYear - 1);

        const baseIndicatorData = {
          indicatorName: indicator.name, simpleName: indicator.simpleName, description: indicator.description,
          targetDescription: indicator.targetDescription, isRate: indicator.isRate,
          parametersForPorte: operatorSize && indicator.parametersByPorte ? indicator.parametersByPorte[operatorSize] : undefined,
          responsibleSector: indicator.responsibleSector, targetDirection: indicator.targetDirection,
          activeReferenceYear: activeReferenceYear
        };

        if (analysisType === 'lastPeriod') {
            if (!lastFilledEntry || lastFilledEntry.value === null) { throw new Error("Nenhum valor preenchido no período atual para análise."); }
            request = { type: 'indicator_last_period', indicatorData: { ...baseIndicatorData, currentValue: lastFilledEntry.value, currentPeriodLabel: lastFilledEntry.periodLabel }, operatorSize, activeReferenceYear };
        } else if (analysisType === 'yearlyConsolidated') {
            if (localConsolidatedValue === null) { throw new Error("Valor consolidado anual é nulo. Análise não pode ser gerada."); }
            request = { type: 'indicator_yearly_consolidated', indicatorData: { ...baseIndicatorData, currentValue: localConsolidatedValue, notaFinal: localNotaFinal }, operatorSize, activeReferenceYear };
        } else if (analysisType === 'yearlyComparison') {
            if (localConsolidatedValue === null) { throw new Error("Valor consolidado anual é nulo. Análise não pode ser gerada."); }
            request = { type: 'indicator_yearly_comparison', indicatorData: { ...baseIndicatorData, currentValue: localConsolidatedValue, previousYearValue: previousYearResult?.consolidatedValue ?? null }, operatorSize, activeReferenceYear };
        } else {
            throw new Error("Tipo de análise desconhecido.");
        }
    
        const analysisText = await getGeminiAnalysis(request);
        const analysisField = `analysis${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}` as keyof IndicatorResult;
        const updatedResults = indicator.results.map(r => r.year === activeReferenceYear ? { ...r, [analysisField]: analysisText, [errorField]: undefined } : r);
        onUpdateIndicator({...indicator, results: updatedResults});
    } catch (e: any) {
        updateError(e.message || `Erro na análise (${analysisType})`);
    } finally {
        setAnalysisLoadingStates(prev => ({...prev, [analysisType]: false }));
    }
  };

  const handleCloseAnalysis = (analysisTypeToClose: LocalAnalysisType) => {
    const analysisField = `analysis${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}` as keyof IndicatorResult;
    const errorField = `error${analysisTypeToClose.charAt(0).toUpperCase() + analysisTypeToClose.slice(1)}` as keyof IndicatorResult;
    const updatedResults = indicator.results.map(r => r.year === activeReferenceYear ? { ...r, [analysisField]: undefined, [errorField]: undefined } : r);
    onUpdateIndicator({...indicator, results: updatedResults});
  };

  const renderTargetDirectionIcon = () => {
    if (indicator.targetDirection === 'up') return <ArrowUpCircle size={18} className="text-gray-800 inline-block ml-1" aria-label="Meta é subir" />;
    if (indicator.targetDirection === 'down') return <ArrowDownCircle size={18} className="text-gray-800 inline-block ml-1" aria-label="Meta é descer" />;
    return null; 
  };

  const getBarColorForPeriodicNotaFinal = (nota: number | null): string => {
    if (nota === null) return '#9ca3af';
    if (nota <= 0.19) return '#ef4444';
    if (nota <= 0.39) return '#f97316';
    if (nota <= 0.59) return '#eab308';
    if (nota <= 0.79) return '#84cc16';
    return '#22c55e';
  };

  const periodicChartData: PeriodicChartDataPoint[] = useMemo(() => {
     return activeYearPeriodicInput
      .filter(entry => entry.value !== null)
      .map(entry => {
        const notaFinalForPeriod = indicator.calcularNotaFinalFn(entry.value, entry.auxValue, operatorSize, indicator.parametersByPorte);
        const fillColor = getBarColorForPeriodicNotaFinal(notaFinalForPeriod);
        return { periodLabel: entry.periodLabel, value: entry.value!, fillColor };
      });
  }, [activeYearPeriodicInput, indicator, operatorSize]);
  
  const baseId = `${indicator.id}-${activeReferenceYear}`;
  const analysisSections = [
    { type: 'lastPeriod', label: 'Último Período vs Ficha Técnica', analysis: activeYearResult?.analysisLastPeriod, error: activeYearResult?.errorLastPeriod, loading: analysisLoadingStates.lastPeriod, disabledOverride: !activeYearPeriodicInput.some(p => p.value !== null) },
    { type: 'yearlyConsolidated', label: 'Resultado Anual vs Ficha Técnica', analysis: activeYearResult?.analysisYearlyConsolidated, error: activeYearResult?.errorYearlyConsolidated, loading: analysisLoadingStates.yearlyConsolidated, disabledOverride: localConsolidatedValue === null },
    { type: 'yearlyComparison', label: 'Resultado Anual vs Ano Anterior', analysis: activeYearResult?.analysisYearlyComparison, error: activeYearResult?.errorYearlyComparison, loading: analysisLoadingStates.yearlyComparison, disabledOverride: localConsolidatedValue === null },
  ];
  
  const SaveButtonContent = () => {
      if (saveStatus === 'saved') return <><Check size={18} className="mr-2"/> Salvo!</>;
      if (isDirty) return <><Save size={18} className="mr-2"/> Salvar Resultados</>;
      return <><Save size={18} className="mr-2"/> Resultados Salvos</>;
  };

  return (
    <div className="bg-base-200 shadow-lg rounded-xl p-6 mb-6 transition-all duration-300 hover:shadow-xl flex flex-col h-full">
      <h3 className="text-xl font-semibold text-primary mb-1">{indicator.id} - {indicator.name}</h3>
      <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Nome Simplificado:</span> {indicator.simpleName}</p>
      {indicator.responsibleSector && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Setor Responsável:</span> {indicator.responsibleSector}</p>}
      <p className="text-xs text-gray-500 my-2 flex items-start"><Info size={16} className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" /><span className="font-medium text-gray-700 mr-1">Meta:</span> {indicator.targetDescription}</p>
      {indicator.targetDirection !== 'none' && <p className="text-sm text-gray-700 mb-2 flex items-center"><span className="font-medium">Direção da Meta:</span>{renderTargetDirectionIcon()}</p>}
      {indicator.idssWeightLevel && <IndicatorWeightBar level={indicator.idssWeightLevel} />}
      
      <div className="my-4">
        <label htmlFor={`periodicity-${baseId}`} className="block text-sm font-medium text-gray-700 mb-1">Periodicidade ({activeReferenceYear}):</label>
        <select id={`periodicity-${baseId}`} value={currentPeriodicity} onChange={handlePeriodicityChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm rounded-md shadow-sm">
          {indicator.periodicityOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="space-y-2 mb-4 flex-grow overflow-y-auto pr-2 max-h-60">
        <p className="text-sm font-medium text-gray-700 sticky top-0 bg-base-200 py-1">Resultados ({activeReferenceYear}):</p>
        {activeYearPeriodicInput.map((entry: PeriodicEntry, index: number) => (
          <div key={`${entry.periodLabel}-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <label htmlFor={`input-value-${baseId}-${index}`} className="text-xs text-gray-600 font-medium whitespace-nowrap">{entry.periodLabel}:</label>
            <input
              id={`input-value-${baseId}-${index}`}
              type="text" placeholder={indicator.valueLabel || (indicator.isRate ? "Taxa (%)" : "Valor")}
              value={entry.value === null ? '' : String(entry.value).replace('.',',')}
              onChange={(e) => handlePeriodicInputChange(index, 'value', e.target.value)}
              className="col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-xs"
              aria-label={`${indicator.valueLabel || "Valor"} para ${entry.periodLabel}`}
            />
            {indicator.requiresAuxValue && (
              <input
                id={`input-aux-value-${baseId}-${index}`}
                type="text" placeholder={indicator.auxValueLabel || "Valor Aux."}
                value={entry.auxValue === null ? '' : String(entry.auxValue).replace('.',',')}
                onChange={(e) => handlePeriodicInputChange(index, 'auxValue', e.target.value)}
                className="col-span-1 mt-1 md:mt-0 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-xs"
                aria-label={`${indicator.auxValueLabel || "Valor Auxiliar"} para ${entry.periodLabel}`}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmitResults}
          disabled={!isDirty}
          className={`font-bold py-2 px-4 rounded-lg shadow-md flex items-center transition-colors duration-200
            ${!isDirty && saveStatus === 'idle' ? 'bg-gray-400 cursor-not-allowed' : ''}
            ${isDirty ? 'bg-secondary hover:bg-secondary-focus text-white' : ''}
            ${saveStatus === 'saved' ? 'bg-success text-white' : ''}
          `}
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
              disabled={section.disabledOverride || Object.values(analysisLoadingStates).some(s => s)}
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