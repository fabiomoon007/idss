
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
            let newState = JSON.parse(JSON.stringify(state)); // Deep copy to ensure no mutation
            let needsUpdate = false;

            initialIndicators.forEach((initInd: Indicator) => {
                let indRecord = newState.indicatorHistoricalData.find((ir: any) => ir.id === initInd.id);

                if (!indRecord) {
                    indRecord = { id: initInd.id, results: [] };
                    newState.indicatorHistoricalData.push(indRecord);
                }

                let yearEntry = indRecord.results.find((r: any) => r.year === year);
                if (!yearEntry) {
                    indRecord.results.push({
                        year: year,
                        notaFinal: null,
                        consolidatedValue: null,
                        consolidatedAuxValue: null,
                        periodicityUsed: null,
                        periodicData: null
                    });
                    indRecord.results.sort((a: any, b: any) => b.year - a.year);
                    needsUpdate = true;
                }
            });
            
            if (!newState.dimensionHistoricalData.some((d: any) => d.year === year)) {
                newState.dimensionHistoricalData.push({ year, dimensionScores: {} });
                newState.dimensionHistoricalData.sort((a: any, b: any) => b.year - a.year);
                needsUpdate = true;
            }
            
            if (!newState.idssHistoricalScores.some((s: any) => s.baseYear === year)) {
                 newState.idssHistoricalScores.push({ programYear: year + 1, baseYear: year, score: null, source: "Unimed Resende (Input)" });
                 newState.idssHistoricalScores.sort((a: any, b: any) => b.baseYear - a.year);
                 needsUpdate = true;
            }

            return needsUpdate ? newState : state;
        }

        case 'UPDATE_IDSS_SCORE': {
            const { year, score } = action.payload;
            const existingIndex = state.idssHistoricalScores.findIndex(s => s.baseYear === year);
            let newScores = [...state.idssHistoricalScores];
            
            if (existingIndex > -1) {
                newScores[existingIndex] = {...newScores[existingIndex], score};
            } else {
                newScores.push({ programYear: year + 1, baseYear: year, score, source: "Unimed Resende (Input)" });
                newScores.sort((a, b) => b.baseYear - a.baseYear);
            }
            return { ...state, idssHistoricalScores: newScores };
        }

        case 'UPDATE_DIMENSION_SCORE': {
            const { year, dimensionId, score } = action.payload;
            const existingIndex = state.dimensionHistoricalData.findIndex(d => d.year === year);
            let newDimData = [...state.dimensionHistoricalData];

            if (existingIndex > -1) {
                const updatedEntry = {...newDimData[existingIndex]};
                updatedEntry.dimensionScores = {...updatedEntry.dimensionScores, [dimensionId]: score};
                newDimData[existingIndex] = updatedEntry;
            } else {
                newDimData.push({ year: year, dimensionScores: { [dimensionId]: score } });
                newDimData.sort((a, b) => b.year - a.year);
            }
            return { ...state, dimensionHistoricalData: newDimData };
        }
        
        case 'UPDATE_INDICATOR_FIELD': {
            const { year, indicatorId, field, value } = action.payload;
            return {
                ...state,
                indicatorHistoricalData: state.indicatorHistoricalData.map(indRecord => {
                    if (indRecord.id !== indicatorId) return indRecord;
                    
                    const newResults = [...indRecord.results];
                    const resIndex = newResults.findIndex(r => r.year === year);

                    if (resIndex > -1) {
                        const updatedRes = {...newResults[resIndex], [field]: value};
                        newResults[resIndex] = updatedRes;
                    } else {
                        const newEntry: any = { year, notaFinal: null, consolidatedValue: null, consolidatedAuxValue: null, periodicityUsed: null, periodicData: null };
                        newEntry[field] = value;
                        newResults.push(newEntry);
                        newResults.sort((a, b) => b.year - a.year);
                    }
                    return { ...indRecord, results: newResults };
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
                            
                            const newPeriodicData = [...res.periodicData];
                            if(newPeriodicData[periodIndex]){
                                newPeriodicData[periodIndex] = {...newPeriodicData[periodIndex], [field]: value};
                            }

                            return { ...res, periodicData: newPeriodicData };
                        })
                    };
                })
            };
        }
        
        default:
            return state;
    }
};