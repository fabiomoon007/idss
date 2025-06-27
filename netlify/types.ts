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

export type CalcularNotaFinalFunction = (
  consolidatedValue: number | null,
  consolidatedAuxValue?: number | null,
  operatorSize?: OperatorSize,
  indicatorParameters?: any
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
  parametersByPorte?: Record<OperatorSize, { meta?: number; media?: number; limiteSuperior?: number; limiteInferior?: number; [key: string]: any }>;
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
  score: number;
  source: string; // "Unimed Resende (Oficial)" or "ANS"
}

export interface IDSS {
  dimensions: Dimension[];
  notaFinalCalculada: number | null; // This will be for the activeReferenceYear
  analysis?: string;
  error?: string;
  overallIndicatorAnalysis?: string;
  overallIndicatorError?: string;
  historicalIdssScores?: HistoricalIdssScore[]; // Populated from historical_data.json
}

export type AnalysisType = 
  | "indicator_last_period" 
  | "indicator_yearly_consolidated" 
  | "indicator_yearly_comparison"
  | "dimension" 
  | "idss" 
  | "overall_indicators";
  // | "executive_report"; // Removed as per user request

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
    parametersForPorte?: any;
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
  consolidatedAuxValue?: number | null;
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
