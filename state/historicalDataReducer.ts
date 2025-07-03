import { HistoricalDataArchive, HistoricalDataAction, Periodicity, HistoricalPeriodicEntry, Indicator } from '@/types';
import { getPeriodLabels } from '@/constants';

const getDefaultHistoricalPeriodicData = (periodicity: Periodicity | null): HistoricalPeriodicEntry[] | null => {
  if (!periodicity) return null;
  const labels = getPeriodLabels(periodicity);
  return labels.map(label => ({ periodLabel: label, value: null, auxValue: null }));
};

export const historicalDataReducer = (state: HistoricalDataArchive, action: HistoricalDataAction): HistoricalDataArchive => {
    switch (action.type) {
        case 'SET_ARCHIVE_DATA':
            return action.payload;

        case 'ENSURE_YEAR_DATA_EXISTS': {
            const { year, initialIndicators } = action.payload;
            let newState = { ...state };
            let needsUpdate = false;

            const updatedIndicatorData = [...state.indicatorHistoricalData];

            initialIndicators.forEach(initInd => {
                let indRecordIndex = updatedIndicatorData.findIndex(ir => ir.id === initInd.id);
                let indRecord = indRecordIndex !== -1 ? updatedIndicatorData[indRecordIndex] : null;

                if (!indRecord) {
                    indRecord = { id: initInd.id, results: [] };
                    indRecordIndex = updatedIndicatorData.push(indRecord) - 1;
                    needsUpdate = true;
                }

                let yearEntry = indRecord.results.find(r => r.year === year);
                if (!yearEntry) {
                    const newYearEntry = {
                        year: year,
                        notaFinal: null,
                        consolidatedValue: null,
                        consolidatedAuxValue: null,
                        periodicityUsed: null,
                        periodicData: null
                    };
                    const newResults = [...indRecord.results, newYearEntry].sort((a, b) => b.year - a.year);
                    updatedIndicatorData[indRecordIndex] = { ...indRecord, results: newResults };
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                return { ...newState, indicatorHistoricalData: updatedIndicatorData };
            }
            return state; // No changes needed
        }

        case 'UPDATE_IDSS_SCORE': {
            const { year, score } = action.payload;
            const existingIndex = state.idssHistoricalScores.findIndex(s => s.baseYear === year);
            
            if (existingIndex > -1) {
                return {
                    ...state,
                    idssHistoricalScores: state.idssHistoricalScores.map((s, index) => 
                        index === existingIndex ? { ...s, score } : s
                    )
                };
            } else {
                const newScores = [
                    ...state.idssHistoricalScores,
                    { programYear: year + 1, baseYear: year, score, source: "Unimed Resende (Input)" }
                ].sort((a, b) => b.baseYear - a.baseYear);
                return { ...state, idssHistoricalScores: newScores };
            }
        }

        case 'UPDATE_DIMENSION_SCORE': {
            const { year, dimensionId, score } = action.payload;
            const existingIndex = state.dimensionHistoricalData.findIndex(d => d.year === year);
            
            if (existingIndex > -1) {
                return {
                    ...state,
                    dimensionHistoricalData: state.dimensionHistoricalData.map((d, index) => {
                        if (index !== existingIndex) return d;
                        return {
                            ...d,
                            dimensionScores: { ...d.dimensionScores, [dimensionId]: score }
                        };
                    })
                };
            } else {
                const newDimData = [
                    ...state.dimensionHistoricalData,
                    { year: year, dimensionScores: { [dimensionId]: score } }
                ].sort((a, b) => b.year - a.year);
                return { ...state, dimensionHistoricalData: newDimData };
            }
        }
        
        case 'UPDATE_INDICATOR_FIELD': {
            const { year, indicatorId, field, value } = action.payload;
            return {
                ...state,
                indicatorHistoricalData: state.indicatorHistoricalData.map(indRecord => {
                    if (indRecord.id !== indicatorId) return indRecord;
                    
                    const resIndex = indRecord.results.findIndex(r => r.year === year);
                    if (resIndex > -1) {
                        return {
                            ...indRecord,
                            results: indRecord.results.map((r, index) => 
                                index === resIndex ? { ...r, [field]: value } : r
                            )
                        };
                    } else {
                        const newEntry: any = { year, notaFinal: null, consolidatedValue: null, consolidatedAuxValue: null, periodicityUsed: null, periodicData: null };
                        newEntry[field] = value;
                        const newResults = [...indRecord.results, newEntry].sort((a, b) => b.year - a.year);
                        return { ...indRecord, results: newResults };
                    }
                })
            };
        }

        case 'UPDATE_INDICATOR_PERIODICITY': {
             const { year, indicatorId, periodicity } = action.payload;
             return {
                ...state,
                indicatorHistoricalData: state.indicatorHistoricalData.map(indRecord => {
                    if (indRecord.id !== indicatorId) return indRecord;
                    return {
                        ...indRecord,
                        results: indRecord.results.map(res => {
                            if (res.year !== year) return res;
                            return {
                                ...res,
                                periodicityUsed: periodicity,
                                periodicData: getDefaultHistoricalPeriodicData(periodicity)
                            };
                        })
                    };
                })
            };
        }

        case 'UPDATE_PERIODIC_DATA': {
            const { year, indicatorId, periodIndex, field, value } = action.payload;
            return {
                ...state,
                indicatorHistoricalData: state.indicatorHistoricalData.map(indRecord => {
                    if (indRecord.id !== indicatorId) return indRecord;
                    
                    return {
                        ...indRecord,
                        results: indRecord.results.map(res => {
                            if (res.year !== year || !res.periodicData) return res;
                            
                            return {
                                ...res,
                                periodicData: res.periodicData.map((pd, index) => 
                                    index === periodIndex ? { ...pd, [field]: value } : pd
                                )
                            };
                        })
                    };
                })
            };
        }
        
        default:
            return state;
    }
};