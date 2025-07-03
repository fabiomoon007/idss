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
  periodLabel: string;
  value: number | null;
  auxValue?: number | null;
}

export interface IndicatorResult {
  year: number;
  periodicData: PeriodicEntry[];
  periodicityUsed?: Periodicity;
  consolidatedValue: number | null;
  consolidatedAuxValue?: number | null;
  notaFinal: number | null;

  analysisLastPeriod?: string;
  analysisYearlyConsolidated?: string;
  analysisYearlyComparison?: string;

  errorLastPeriod?: string;
  errorYearlyConsolidated?: string;
  errorYearlyComparison?: string;
}

export interface IndicatorParameters {
  target?: number;
  worse?: number;
  indiceReferenciaRPC?: number;
  [key: string]: any;
}

export type CalcularNotaFinalFunction = (
  consolidatedValue: number | null,
  consolidatedAuxValue?: number | null,
  operatorSize?: OperatorSize,
  indicatorParameters?: Record<string, IndicatorParameters>
) => number | null;

export enum IDSSIndicatorWeightLevel {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export interface Indicator {
  id: string;
  name: string;
  simpleName: string;
  dimensionId: IDSSDimensionName;
  weightInDimension: number;
  idssWeightLevel?: IDSSIndicatorWeightLevel;
  description: string;
  targetDescription: string;
  periodicityOptions: Periodicity[];
  currentPeriodicity: Periodicity;
  results: IndicatorResult[];
  parametersByPorte?: Record<OperatorSize, IndicatorParameters>;
  calcularNotaFinalFn: CalcularNotaFinalFunction;
  requiresAuxValue?: boolean;
  auxValueLabel?: string;
  valueLabel?: string;
  isRate?: boolean;
  valueConsolidationFn?: (periodicValues: (number | null)[]) => number | null;
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
  notaFinalCalculada: number | null;
  analysis?: string;
  error?: string;
}

export interface HistoricalIdssScore {
  programYear: number;
  baseYear: number;
  score: number | null;
  source: string;
}

export interface IDSS {
  dimensions: Dimension[];
  notaFinalCalculada: number | null;
  analysis?: string;
  error?: string;
  overallIndicatorAnalysis?: string;
  overallIndicatorError?: string;
  executiveReport?: string;
  executiveReportError?: string;
  historicalIdssScores?: HistoricalIdssScore[];
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
    activeReferenceYear?: number;
  };
  dimensionData?: Dimension; 
  idssData?: IDSS; 
  overallIndicatorsData?: Indicator[]; 
  operatorSize?: OperatorSize;
  activeReferenceYear?: number;
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

export type IdssAction =
  | { type: 'MERGE_OPERATIONAL_DATA'; payload: Partial<IDSS> }
  | { type: 'UPDATE_INDICATOR'; payload: Indicator }
  | { type: 'CALCULATE_ALL_SCORES'; payload: { activeReferenceYear: number; operatorSize: OperatorSize } }
  | { type: 'SET_ANALYSIS_RESULT'; payload: {
      analysisType: AnalysisType;
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
  | { type: 'UPDATE_INDICATOR_FIELD'; payload: { year: number; indicatorId: string; field: 'notaFinal' | 'consolidatedValue' | 'consolidatedAuxValue'; value: number | null; } }
  | { type: 'UPDATE_INDICATOR_PERIODICITY'; payload: { year: number; indicatorId: string; periodicity: Periodicity | null } }
  | { type: 'UPDATE_PERIODIC_DATA'; payload: { year: number; indicatorId: string; periodIndex: number; field: 'value' | 'auxValue'; value: number | null } }
  | { type: 'ENSURE_YEAR_DATA_EXISTS'; payload: { year: number; initialIndicators: Indicator[] }};