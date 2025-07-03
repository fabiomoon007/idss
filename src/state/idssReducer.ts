import { IDSS, IdssAction, OperatorSize } from '../types';

const calculateScores = (state: IDSS, activeReferenceYear: number, operatorSize: OperatorSize): IDSS => {
    let finalIdssScore = 0;

    const updatedDimensions = state.dimensions.map(dim => {
        let dimTotalScore = 0;
        let dimTotalWeight = 0;
        let dimBonusScore = 0;

        const updatedIndicators = dim.indicators.map(ind => {
            let resultForYear = ind.results.find(r => r.year === activeReferenceYear);
            
            if (!resultForYear) {
                // Safeguard: Create a default result structure if none exists for the active year.
                // This is crucial for new years added to the system.
                const newResult = {
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
                : (periodicValues.length > 0 ? periodicValues[0] : null);
            
            const periodicAuxValues = resultForYear.periodicData.map(p => p.auxValue ?? null);
            const consolidatedAuxValue = (ind.requiresAuxValue && ind.valueConsolidationFn)
                ? ind.valueConsolidationFn(periodicAuxValues)
                : (ind.requiresAuxValue && periodicAuxValues.length > 0 ? periodicAuxValues[0] : null);

            const notaFinal = ind.calcularNotaFinalFn(
                consolidatedValue, 
                consolidatedAuxValue, 
                operatorSize,
                ind.parametersByPorte
            );

            const updatedResults = ind.results.map(r => 
                r.year === activeReferenceYear 
                    ? { ...r, consolidatedValue, consolidatedAuxValue, notaFinal } 
                    : r
            );
            
            if (notaFinal !== null) {
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
        const finalDimScore = Math.min(1, baseDimScore + dimBonusScore);

        if (finalDimScore !== null && !isNaN(finalDimScore)) {
            finalIdssScore += finalDimScore * dim.weightInIDSS;
        }

        return { ...dim, indicators: updatedIndicators, notaFinalCalculada: finalDimScore };
    });

    const finalCalculatedIdss = finalIdssScore > 0 ? parseFloat(finalIdssScore.toFixed(4)) : null;

    return { ...state, dimensions: updatedDimensions, notaFinalCalculada: finalCalculatedIdss };
};


export const idssReducer = (state: IDSS, action: IdssAction): IDSS => {
    switch (action.type) {
        case 'MERGE_OPERATIONAL_DATA': {
            const savedData = action.payload;
            if (!savedData || !Array.isArray(savedData.dimensions)) {
                return state;
            }

            const mergedDimensions = state.dimensions.map(initialDim => {
                const savedDim = savedData.dimensions?.find(d => d.id === initialDim.id);
                if (!savedDim) return initialDim;

                const mergedIndicators = initialDim.indicators.map(initialIndicator => {
                    const savedIndicator = savedDim.indicators?.find(i => i.id === initialIndicator.id);
                    if (!savedIndicator) return initialIndicator;
                    
                    const allYears = new Set([...initialIndicator.results.map(r => r.year), ...(savedIndicator.results?.map(r => r.year) ?? [])]);
                    
                    const mergedResults = Array.from(allYears).map(year => {
                         const initialResult = initialIndicator.results.find(r => r.year === year) ?? { year, periodicData: [], consolidatedValue: null, notaFinal: null };
                         const savedResult = savedIndicator.results?.find(r => r.year === year);
                         return { ...initialResult, ...savedResult };
                    });

                    return {
                        ...initialIndicator,
                        ...savedIndicator,
                        results: mergedResults.sort((a,b) => a.year - b.year)
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

                    let opResults = [...ind.results];
                    
                    historicalInd.results.forEach(histResult => {
                        const opResultIndex = opResults.findIndex(r => r.year === histResult.year);
                        if (opResultIndex > -1) {
                            // Merge historical data into existing operational year data
                            opResults[opResultIndex] = {
                                ...opResults[opResultIndex],
                                consolidatedValue: opResults[opResultIndex].consolidatedValue ?? histResult.consolidatedValue,
                                consolidatedAuxValue: opResults[opResultIndex].consolidatedAuxValue ?? histResult.consolidatedAuxValue,
                                notaFinal: opResults[opResultIndex].notaFinal ?? histResult.notaFinal
                            };
                        } else {
                            // Add historical year if not present in operational data
                            opResults.push({
                                year: histResult.year,
                                consolidatedValue: histResult.consolidatedValue,
                                consolidatedAuxValue: histResult.consolidatedAuxValue,
                                notaFinal: histResult.notaFinal,
                                periodicData: [], // Start with empty periodic data for simplicity
                            });
                        }
                    });

                    return { ...ind, results: opResults.sort((a,b) => a.year - b.year) };
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
