
import { IDSS, IdssAction, Dimension, Indicator, IndicatorResult, HistoricalDataArchive, OperatorSize } from '../src/types';

const calculateScores = (state: IDSS, activeReferenceYear: number, operatorSize: string): IDSS => {
    let finalIdssScore = 0;
    let totalIdssWeight = 0;

    const updatedDimensions = state.dimensions.map(dim => {
        let dimTotalScore = 0;
        let dimTotalWeight = 0;
        let dimBonusScore = 0;

        const updatedIndicators = dim.indicators.map(ind => {
            const resultForYear = ind.results.find(r => r.year === activeReferenceYear);
            
            // If there's no result for the active year, return the indicator as is.
            if (!resultForYear) {
                return ind;
            }

            const consolidatedValue = ind.valueConsolidationFn 
                ? ind.valueConsolidationFn(resultForYear.periodicData.map(p => p.value))
                : null;
            
            const consolidatedAuxValue = ind.requiresAuxValue && ind.valueConsolidationFn
                ? ind.valueConsolidationFn(resultForYear.periodicData.map(p => p.auxValue ?? null))
                : null;

            const notaFinal = ind.calcularNotaFinalFn(
                consolidatedValue, 
                consolidatedAuxValue, 
                operatorSize as any, 
                ind.parametersByPorte
            );

            // Update the specific year's result immutably
            const updatedResults = ind.results.map(r => 
                r.year === activeReferenceYear 
                    ? { ...r, consolidatedValue, consolidatedAuxValue, notaFinal } 
                    : r
            );
            
            if (notaFinal !== null) {
                // Bonus indicators contribute differently
                if (ind.name.toLowerCase().includes('bônus')) {
                    dimBonusScore += notaFinal * ind.weightInDimension; // weightInDimension is the bonus factor (e.g., 0.1, 0.15)
                } else {
                    dimTotalScore += notaFinal * ind.weightInDimension;
                    dimTotalWeight += ind.weightInDimension;
                }
            }
            return { ...ind, results: updatedResults };
        });

        const baseDimScore = dimTotalWeight > 0 ? dimTotalScore / dimTotalWeight : 0;
        const finalDimScore = Math.min(1, baseDimScore + dimBonusScore);

        if (finalDimScore !== null && !isNaN(finalDimScore)) {
            finalIdssScore += finalDimScore * dim.weightInIDSS;
            totalIdssWeight += dim.weightInIDSS;
        }

        return { ...dim, indicators: updatedIndicators, notaFinalCalculada: finalDimScore };
    });

    const finalCalculatedIdss = totalIdssWeight > 0 ? finalIdssScore / totalIdssWeight : null;

    return { ...state, dimensions: updatedDimensions, notaFinalCalculada: finalCalculatedIdss };
};


export const idssReducer = (state: IDSS, action: IdssAction): IDSS => {
    switch (action.type) {
        case 'MERGE_OPERATIONAL_DATA': {
            const savedData = action.payload;
            if (!savedData || !Array.isArray(savedData.dimensions)) {
                return state;
            }

            // A deep merge of the saved data into the initial state structure.
            const mergedDimensions = state.dimensions.map(initialDim => {
                const savedDim = savedData.dimensions?.find(d => d.id === initialDim.id);
                if (!savedDim) return initialDim;

                const mergedIndicators = initialDim.indicators.map(initialIndicator => {
                    const savedIndicator = savedDim.indicators?.find(i => i.id === initialIndicator.id);
                    if (!savedIndicator) return initialIndicator;

                    // Merge results, prioritizing saved data over initial blank structures.
                    const mergedResults = initialIndicator.results.map(initialResult => {
                        const savedResult = savedIndicator.results?.find(r => r.year === initialResult.year);
                        return savedResult ? { ...initialResult, ...savedResult } : initialResult;
                    });

                    // Merge indicator properties
                    return {
                        ...initialIndicator,
                        ...savedIndicator,
                        results: mergedResults
                    };
                });
                
                // Merge dimension properties
                return {
                    ...initialDim,
                    ...savedDim,
                    indicators: mergedIndicators
                };
            });
            
            // Merge top-level IDSS properties
            return {
                ...state,
                ...savedData,
                dimensions: mergedDimensions,
            };
        }
        
        case 'UPDATE_INDICATOR': {
            return {
                ...state,
                dimensions: state.dimensions.map(dim =>
                    dim.id === action.payload.dimensionId
                        ? {
                            ...dim,
                            indicators: dim.indicators.map(ind =>
                                ind.id === action.payload.id ? action.payload : ind
                            ),
                          }
                        : dim
                ),
            };
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
                        dimensions: state.dimensions.map(dim =>
                            dim.id === dimensionId ? { ...dim, analysis: analysisText, error: error } : dim
                        ),
                    };
                default:
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
                        dimensions: state.dimensions.map(dim =>
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

            const newDimensions = state.dimensions.map(dim => ({
                ...dim,
                indicators: dim.indicators.map(ind => {
                    const historicalInd = historicalArchive.indicatorHistoricalData.find(h => h.id === ind.id);
                    if (!historicalInd) return ind;

                    const newResults = ind.results.map(opResult => {
                        const histResult = historicalInd.results.find(h => h.year === opResult.year);
                        if (histResult) {
                            return {
                                ...opResult,
                                consolidatedValue: histResult.consolidatedValue,
                                consolidatedAuxValue: histResult.consolidatedAuxValue,
                                notaFinal: histResult.notaFinal,
                            };
                        }
                        return opResult;
                    });

                    return { ...ind, results: newResults.sort((a,b) => a.year - b.year) };
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