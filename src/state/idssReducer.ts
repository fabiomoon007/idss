

import { IDSS, IdssAction, Dimension, Indicator, IndicatorResult, HistoricalDataArchive, OperatorSize, HistoricalIndicatorYearlyEntry } from '@/types';

const calculateScores = (state: IDSS, activeReferenceYear: number, operatorSize: OperatorSize): IDSS => {
    let finalIdssScore = 0;
    const totalIdssWeight = state.dimensions.reduce((sum, dim) => sum + dim.weightInIDSS, 0);

    const updatedDimensions = state.dimensions.map((dim: Dimension) => {
        let dimTotalScore = 0;
        let dimTotalWeight = 0;
        let dimBonusScore = 0;

        const updatedIndicators = dim.indicators.map((ind: Indicator) => {
            let resultForYear = ind.results.find((r: IndicatorResult) => r.year === activeReferenceYear);
            
            if (!resultForYear) {
                const newResult: IndicatorResult = {
                    year: activeReferenceYear,
                    periodicData: [],
                    consolidatedValue: null,
                    consolidatedAuxValue: null,
                    notaFinal: null,
                };
                ind.results.push(newResult);
                resultForYear = newResult;
            }

            const periodicValues = resultForYear.periodicData.map(p => p.value);
            const consolidatedValue = ind.valueConsolidationFn 
                ? ind.valueConsolidationFn(periodicValues)
                : (periodicValues[0] ?? null);
            
            const periodicAuxValues = resultForYear.periodicData.map(p => p.auxValue ?? null);
            const consolidatedAuxValue = (ind.requiresAuxValue && ind.valueConsolidationFn)
                ? ind.valueConsolidationFn(periodicAuxValues)
                : (ind.requiresAuxValue ? (periodicAuxValues[0] ?? null) : null);

            const notaFinal = ind.calcularNotaFinalFn(
                consolidatedValue, 
                consolidatedAuxValue, 
                operatorSize,
                ind.parametersByPorte
            );

            const updatedResults = ind.results.map((r: IndicatorResult) => 
                r.year === activeReferenceYear 
                    ? { ...r, consolidatedValue, consolidatedAuxValue, notaFinal } 
                    : r
            );
            
            if (notaFinal !== null && !isNaN(notaFinal)) {
                if (ind.simpleName.toLowerCase().includes('(bônus)')) {
                    dimBonusScore += notaFinal * ind.weightInDimension;
                } else {
                    dimTotalScore += notaFinal * ind.weightInDimension;
                    dimTotalWeight += ind.weightInDimension;
                }
            }
            return { ...ind, results: updatedResults };
        });

        const baseDimScore = dimTotalWeight > 0 ? dimTotalScore / dimTotalWeight : 0;
        const finalDimScore = parseFloat(Math.min(1, baseDimScore + dimBonusScore).toFixed(4));

        if (!isNaN(finalDimScore)) {
            finalIdssScore += finalDimScore * dim.weightInIDSS;
        }

        return { ...dim, indicators: updatedIndicators, notaFinalCalculada: finalDimScore };
    });

    const finalCalculatedIdss = totalIdssWeight > 0 ? parseFloat((finalIdssScore / totalIdssWeight).toFixed(4)) : null;

    return { ...state, dimensions: updatedDimensions, notaFinalCalculada: finalCalculatedIdss };
};


export const idssReducer = (state: IDSS, action: IdssAction): IDSS => {
    switch (action.type) {
        case 'MERGE_OPERATIONAL_DATA': {
            const savedData = action.payload;
            if (!savedData || !Array.isArray(savedData.dimensions)) {
                return state;
            }

            const mergedDimensions = state.dimensions.map((initialDim: Dimension) => {
                const savedDim = savedData.dimensions?.find((d: Dimension) => d.id === initialDim.id);
                if (!savedDim) return initialDim;

                const mergedIndicators = initialDim.indicators.map((initialIndicator: Indicator) => {
                    const savedIndicator = savedDim.indicators?.find((i: Indicator) => i.id === initialIndicator.id);
                    if (!savedIndicator) return initialIndicator;
                    
                    const allYears = new Set([...initialIndicator.results.map(r => r.year), ...(savedIndicator.results?.map(r => r.year) ?? [])]);
                    
                    const mergedResults = Array.from(allYears).map((year: number) => {
                         const initialResult = initialIndicator.results.find((r: IndicatorResult) => r.year === year) ?? { year, periodicData: [], consolidatedValue: null, notaFinal: null };
                         const savedResult = savedIndicator.results?.find((r: IndicatorResult) => r.year === year);
                         return { ...initialResult, ...savedResult };
                    });

                    return {
                        ...initialIndicator,
                        ...savedIndicator,
                        results: mergedResults.sort((a: IndicatorResult, b: IndicatorResult) => a.year - b.year)
                    };
                });
                
                return {
                    ...initialDim,
                    ...savedDim,
                    indicators: mergedIndicators
                };
            });
            
            return {
                ...state,
                ...savedData,
                dimensions: mergedDimensions,
            };
        }
        
        case 'UPDATE_INDICATOR': {
            const newState = {
                ...state,
                dimensions: state.dimensions.map((dim: Dimension) =>
                    dim.id === action.payload.dimensionId
                        ? {
                            ...dim,
                            indicators: dim.indicators.map((ind: Indicator) =>
                                ind.id === action.payload.id ? action.payload : ind
                            ),
                          }
                        : dim
                ),
            };
            return newState;
        }

        case 'CALCULATE_ALL_SCORES': {
            return calculateScores(state, action.payload.activeReferenceYear, action.payload.operatorSize);
        }

        case 'SET_ANALYSIS_RESULT': {
            const { analysisType, analysisText, error, dimensionId } = action.payload;
            switch (analysisType) {
                case 'idss':
                    return { ...state, analysis: analysisText, error: error };
                case 'overall_indicators':
                    return { ...state, overallIndicatorAnalysis: analysisText, overallIndicatorError: error };
                case 'executive_report':
                     return { ...state, executiveReport: analysisText, executiveReportError: error };
                case 'dimension':
                    return {
                        ...state,
                        dimensions: state.dimensions.map((dim: Dimension) =>
                            dim.id === dimensionId ? { ...dim, analysis: analysisText, error: error } : dim
                        ),
                    };
                default:
                     // Handle indicator analysis types if ever dispatched here, though they are handled in the component
                    return state;
            }
        }
        
        case 'CLOSE_ANALYSIS': {
            const { type, dimensionId } = action.payload;
             switch (type) {
                case 'idss':
                    return { ...state, analysis: undefined, error: undefined };
                case 'overall_indicators':
                    return { ...state, overallIndicatorAnalysis: undefined, overallIndicatorError: undefined };
                case 'executive_report':
                     return { ...state, executiveReport: undefined, executiveReportError: undefined };
                case 'dimension':
                    return {
                        ...state,
                        dimensions: state.dimensions.map((dim: Dimension) =>
                            dim.id === dimensionId ? { ...dim, analysis: undefined, error: undefined } : dim
                        ),
                    };
                default:
                    return state;
            }
        }

        case 'MERGE_HISTORICAL_DATA': {
            const { historicalArchive } = action.payload;
            if (!historicalArchive) return state;

            const newDimensions = state.dimensions.map((dim: Dimension) => ({
                ...dim,
                indicators: dim.indicators.map((ind: Indicator) => {
                    const historicalInd = historicalArchive.indicatorHistoricalData.find(h => h.id === ind.id);
                    if (!historicalInd) return ind;

                    let opResults = [...ind.results];
                    
                    historicalInd.results.forEach((histResult: HistoricalIndicatorYearlyEntry) => {
                        const opResultIndex = opResults.findIndex((r: IndicatorResult) => r.year === histResult.year);
                        if (opResultIndex > -1) {
                            // Merge only if operational data is null, preserving user input
                            opResults[opResultIndex] = {
                                ...opResults[opResultIndex],
                                consolidatedValue: opResults[opResultIndex].consolidatedValue ?? histResult.consolidatedValue,
                                consolidatedAuxValue: opResults[opResultIndex].consolidatedAuxValue ?? histResult.consolidatedAuxValue,
                                notaFinal: opResults[opResultIndex].notaFinal ?? histResult.notaFinal
                            };
                        } else {
                            // Add historical result as a new entry if year doesn't exist
                            opResults.push({
                                year: histResult.year,
                                consolidatedValue: histResult.consolidatedValue,
                                consolidatedAuxValue: histResult.consolidatedAuxValue,
                                notaFinal: histResult.notaFinal,
                                periodicData: histResult.periodicData || [],
                                periodicityUsed: histResult.periodicityUsed || undefined,
                            });
                        }
                    });

                    return { ...ind, results: opResults.sort((a: IndicatorResult, b: IndicatorResult) => a.year - b.year) };
                })
            }));

            return {
                ...state,
                dimensions: newDimensions,
                historicalIdssScores: historicalArchive.idssHistoricalScores || []
            };
        }

        default:
            return state;
    }
};