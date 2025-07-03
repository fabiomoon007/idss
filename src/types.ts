export enum OperatorSize {
  PEQUENO = "Pequeno Porte",
  MEDIO = "Médio Porte",
  GRANDE = "Grande Porte",
}

export enum Periodicity {
  ANUAL = "Anual",
  SEMESTRAL = "Semestral",
  QUADRIMESTRAL = "Quadrimestral",
  TRIMESTRAL = "Trimestral",
  BIMESTRAL = "Bimestral",
  MENSAL = "Mensal",
}

export interface PeriodicEntry {
  periodLabel: string; // e.g., "Jan", "Fev", ..., "Sem1", "Anual"
  value: number | null;
  auxValue?: number | null;
}

export interface IndicatorResult { // Represents data for ONE YEAR for an indicator
  year: number;
  periodicData: PeriodicEntry[]; // Raw data from periods
  periodicityUsed?: Periodicity;
  consolidatedValue: number | null; // Consolidated value for the year (e.g., average, sum)
  consolidatedAuxValue?: number | null; // Consolidated auxiliary value if needed
  notaFinal: number | null; // Score calculated on the consolidatedValue

  // Analyses for the current year's results
  analysisLastPeriod?: string; // Analysis A: Last period's result vs. IDSS spec
  analysisYearlyConsolidated?: string; // Analysis B: Year's consolidated result vs. IDSS spec
  analysisYearlyComparison?: string; // Analysis C: Year's consolidated result vs. Previous Year

  errorLastPeriod?: string;
  errorYearlyConsolidated?: string;
  errorYearlyComparison?: string;
}

export interface IndicatorParameters {
  target?: number;
  worse?: number;
  indiceReferenciaRPC?: number;
  [key: string]: any; // Keep for flexibility for other less-common params
}

export type CalcularNotaFinalFunction = (
  consolidatedValue: number | null,
  consolidatedAuxValue?: number | null,
  operatorSize?: OperatorSize,
  indicatorParameters?: Record<string, IndicatorParameters> // Accept string for OperatorSize keys
) => number | null;

export enum IDSSIndicatorWeightLevel {
  HIGH = 1,   // Corresponds to PDF Peso 3 (User's Peso 1 - Red)
  MEDIUM = 2, // Corresponds to PDF Peso 2 (User's Peso 2 - Yellow)
  LOW = 3,    // Corresponds to PDF Peso 1 (User's Peso 3 - Green)
}

export interface Indicator {
  id: string;
  name: string;
  simpleName: string;
  dimensionId: IDSSDimensionName;
  weightInDimension: number;
  idssWeightLevel?: IDSSIndicatorWeightLevel; // Importance level based on PDF "Peso"
  description: string;
  targetDescription: string;
  periodicityOptions: Periodicity[];
  currentPeriodicity: Periodicity; // This will now reflect the periodicity for the ACTIVE REFERENCE YEAR if modified
  results: IndicatorResult[]; // Array of yearly results
  parametersByPorte?: Record<OperatorSize, IndicatorParameters>;
  calcularNotaFinalFn: CalcularNotaFinalFunction;
  requiresAuxValue?: boolean;
  auxValueLabel?: string;
  valueLabel?: string;
  isRate?: boolean;
  valueConsolidationFn?: (periodicValues: (number | null)[]) => number | null; // e.g. average, sum, last
  responsibleSector?: string;
  targetDirection?: 'up' | 'down' | 'none';
}

export enum IDSSDimensionName {
  IDQS = "IDQS",
  IDGA = "IDGA",
  IDSM = "IDSM",
  IDGR = "IDGR",
}

export interface Dimension {
  id: IDSSDimensionName;
  name: string;
  weightInIDSS: number;
  indicators: Indicator[];
  notaFinalCalculada: number | null; // This will be for the activeReferenceYear
  analysis?: string;
  error?: string;
}

export interface HistoricalIdssScore {
  programYear: number; // e.g. IDSS 2024
  baseYear: number;    // e.g. Dados de 2023
  score: number | null;
  source: string; // "Unimed Resende (Oficial)" or "ANS"
}

export interface IDSS {
  dimensions: Dimension[];
  notaFinalCalculada: number | null; // This will be for the activeReferenceYear
  analysis?: string;
  error?: string;
  overallIndicatorAnalysis?: string;
  overallIndicatorError?: string;
  executiveReport?: string;
  executiveReportError?: string;
  historicalIdssScores?: HistoricalIdssScore[]; // Populated from historical_data.json
}

export type AnalysisType = 
  | "indicator_last_period" 
  | "indicator_yearly_consolidated" 
  | "indicator_yearly_comparison"
  | "dimension" 
  | "idss" 
  | "overall_indicators" 
  | "executive_report";

export interface GeminiAnalysisRequest {
  type: AnalysisType;
  indicatorData?: { 
    indicatorName: string;
    simpleName: string;
    description: string;
    targetDescription: string;
    isRate?: boolean;
    currentValue?: number | null; 
    currentPeriodLabel?: string; 
    previousYearValue?: number | null; 
    parametersForPorte?: IndicatorParameters;
    notaFinal?: number | null;
    responsibleSector?: string;
    targetDirection?: 'up' | 'down' | 'none';
    activeReferenceYear?: number; // Year this specific indicator data pertains to
  };
  dimensionData?: Dimension; 
  idssData?: IDSS; 
  overallIndicatorsData?: Indicator[]; 
  operatorSize?: OperatorSize;
  activeReferenceYear?: number; // Overarching reference year for the analysis context
}

// --- Historical Data Archive Structure ---

export interface HistoricalDimensionScoreEntry {
  dimensionId: IDSSDimensionName;
  score: number | null;
}

export interface HistoricalDimensionYearlyScores {
  year: number;
  dimensionScores: Partial<Record<IDSSDimensionName, number | null>>;
}

export interface HistoricalPeriodicEntry {
  periodLabel: string;
  value: number | null;
  auxValue?: number | null;
}

export interface HistoricalIndicatorYearlyEntry {
  year: number;
  notaFinal: number | null;
  consolidatedValue: number | null;
  consolidatedAuxValue: number | null;
  periodicityUsed: Periodicity | null; 
  periodicData: HistoricalPeriodicEntry[] | null; 
}

export interface HistoricalIndicatorRecord {
  id: string; 
  results: HistoricalIndicatorYearlyEntry[];
}

export interface HistoricalDataArchive {
  idssHistoricalScores: HistoricalIdssScore[];
  dimensionHistoricalData: HistoricalDimensionYearlyScores[]; 
  indicatorHistoricalData: HistoricalIndicatorRecord[];
}


// --- REDUCER ACTION TYPES ---

export type IdssAction =
  | { type: 'MERGE_OPERATIONAL_DATA'; payload: Partial<IDSS> }
  | { type: 'UPDATE_INDICATOR'; payload: Indicator }
  | { type: 'CALCULATE_ALL_SCORES'; payload: { activeReferenceYear: number; operatorSize: OperatorSize } }
  | { type: 'SET_ANALYSIS_RESULT'; payload: {
      analysisType: 'dimension' | 'idss' | 'overall_indicators' | 'executive_report';
      analysisText?: string;
      error?: string;
      dimensionId?: IDSSDimensionName;
    }}
  | { type: 'CLOSE_ANALYSIS'; payload: {
      type: 'dimension' | 'idss' | 'overall_indicators' | 'executive_report';
      dimensionId?: IDSSDimensionName;
    }}
  | { type: 'MERGE_HISTORICAL_DATA'; payload: {
      historicalArchive: HistoricalDataArchive;
    }};


export type HistoricalDataAction =
  | { type: 'SET_ARCHIVE_DATA'; payload: HistoricalDataArchive }
  | { type: 'UPDATE_IDSS_SCORE'; payload: { year: number; score: number | null } }
  | { type: 'UPDATE_DIMENSION_SCORE'; payload: { year:number; dimensionId: IDSSDimensionName; score: number | null } }
  | { type: 'UPDATE_INDICATOR_FIELD'; payload: { year: number; indicatorId: string; field: keyof Omit<HistoricalIndicatorYearlyEntry, 'year' | 'periodicData'>; value: any; } }
  | { type: 'UPDATE_INDICATOR_PERIODICITY'; payload: { year: number; indicatorId: string; periodicity: Periodicity | null } }
  | { type: 'UPDATE_PERIODIC_DATA'; payload: { year: number; indicatorId: string; periodIndex: number; field: 'value' | 'auxValue'; value: number | null } }
  | { type: 'ENSURE_YEAR_DATA_EXISTS'; payload: { year: number; initialIndicators: Indicator[] }};