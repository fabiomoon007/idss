import { CalcularNotaFinalFunction, Periodicity, OperatorSize, IDSSDimensionName } from './types';

// --- Helper Functions ---
const interpolateNotaFinal = (value: number, worse: number, target: number, betterIsLower: boolean = true): number => {
  if (betterIsLower) {
    if (value <= target) return 1;
    if (value >= worse) return 0;
    return parseFloat((1 - (value - target) / (worse - target)).toFixed(3));
  } else {
    if (value >= target) return 1;
    if (value <= worse) return 0;
    return parseFloat(((value - worse) / (target - worse)).toFixed(3));
  }
};

// Generic factory for parametrized linear interpolation scoring functions
const createParametrizedInterpolator = (betterIsLower: boolean): CalcularNotaFinalFunction => {
    return (value, _aux, operatorSize, params) => {
        if (value === null || !operatorSize || !params || !params[operatorSize] || params[operatorSize].target === undefined || params[operatorSize].worse === undefined) {
            return null;
        }
        const { target, worse } = params[operatorSize];
        if (target === undefined || worse === undefined) return null;
        return interpolateNotaFinal(value, worse, target, betterIsLower);
    };
};

// Default consolidation function: average of non-null values
export const averageConsolidation: (periodicValues: (number | null)[]) => number | null = (periodicValues) => {
  const validValues = periodicValues.filter(v => v !== null) as number[];
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((s, val) => s + val, 0);
  return parseFloat((sum / validValues.length).toFixed(4));
};

// --- Scoring Functions (CalcularNotaFinalFunctions) ---

// Generic scoring functions for indicators where lower/higher is better
export const calcularNotaFinalParametrizadaDecrescente = createParametrizedInterpolator(true); // Lower is better
export const calcularNotaFinalParametrizadaCrescente = createParametrizedInterpolator(false); // Higher is better

export const calcularNotaFinalPartoCesareo: CalcularNotaFinalFunction = (currentRate) => {
  if (currentRate === null) return null;
  if (currentRate <= 45) return 1;
  if (currentRate >= 80) return 0;
  return interpolateNotaFinal(currentRate, 80, 45, true); 
};

export const calcularNotaFinalTaxaConsultaPrenatal: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 7) return 1;
  if (value <= 2) return 0;
  return interpolateNotaFinal(value, 2, 7, false); 
};

export const calcularNotaFinalTaxaPediatria: CalcularNotaFinalFunction = (value) => { 
    if (value === null) return null;
    if (value >= 0.95) return 1;
    if (value <= 0.10) return 0;
    return interpolateNotaFinal(value, 0.10, 0.95, false);
};

export const calcularNotaFinalCitopatologia: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 33) return 1;
  if (value <= 3) return 0; 
  return interpolateNotaFinal(value, 3, 33, false);
};

export const calcularNotaFinalHemoglobinaGlicada: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 2) return 1;
  if (value <= 0.20) return 0;
  return interpolateNotaFinal(value, 0.20, 2, false);
};

export const calcularNotaFinalTaxaConsultasIdososGeneralista: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 0.3) return 1;
  if (value <= 0.0769) return 0; 
  return interpolateNotaFinal(value, 0.0769, 0.3, false);
};

export const calcularNotaFinalPontuacaoBase: CalcularNotaFinalFunction = (value) => {
  if(value === null) return null;
  return value === 1 ? 1 : 0
};


export const calcularNotaFinalBonus: CalcularNotaFinalFunction = (value) => {
    if (value === null) return null;
    return value; // The score is the value itself for bonus indicators
};

export const calcularNotaFinalHemodialise: CalcularNotaFinalFunction = (value, auxValue) => { 
  if (value === null) return null;
  let notaFinal = 0;
  const isAuxValueConditionMet = typeof auxValue === 'number' && auxValue < 0.0011513;

  if (value >= 0.062) { 
    notaFinal = isAuxValueConditionMet ? 1 : 0.9; 
  } else if (value > 0 && value < 0.062) { 
    const partialScore = interpolateNotaFinal(value, 0, 0.062, false);
    notaFinal = isAuxValueConditionMet ? partialScore : partialScore * 0.8;
  } else { 
    notaFinal = 0;
  }
  return parseFloat(notaFinal.toFixed(3));
};

export const calcularNotaFinalTaxaConsultasMedicasGeneralistaIdosos: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 2) return 1;
  if (value <= 0.7) return 0;
  return interpolateNotaFinal(value, 0.7, 2, false);
};

export const calcularNotaFinalIndiceDispersaoUrgenciaEmergencia: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 100) return 1;
  if (value <= 0) return 0;
  return interpolateNotaFinal(value, 0, 100, false); 
};

export const calcularNotaFinalFrequenciaRedeHospitalQualidade: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 0.30) return 1;
  if (value <= 0) return 0;
  return interpolateNotaFinal(value, 0, 0.30, false);
};

export const calcularNotaFinalFrequenciaRedeSADTQualidade: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 0.20) return 1;
  if (value <= 0) return 0;
  return interpolateNotaFinal(value, 0, 0.20, false);
};

export const calcularNotaFinalICR: CalcularNotaFinalFunction = (value) => {
  if (value === null) return null;
  if (value >= 3.5) return 1;
  if (value >= 2.0) return 0.975;
  if (value >= 1.3) return 0.95;
  if (value >= 1.0) return 0.90;
  return 0;
};

export const calcularNotaFinalTaxaResolutividadeNIP: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 95) return 1;
  if (value < 70) return 0; 
  return interpolateNotaFinal(value, 70, 95, false); 
};

export const calcularNotaFinalProporcaoNTRPsAtipicos: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value <= 0.05) return 1;
  if (value >= 0.95) return 0;
  return interpolateNotaFinal(value, 0.95, 0.05, true); 
};

export const calcularNotaFinalReajusteMedioPonderado: CalcularNotaFinalFunction = (mediaReajusteOperadora, cvReajustes, _opSize, params) => { 
  if (mediaReajusteOperadora === null || typeof cvReajustes !== 'number' || !_opSize || !params || !params[_opSize]?.indiceReferenciaRPC ) return null;
  const { indiceReferenciaRPC } = params[_opSize];
  
  let scoreComponente1 = 0;
  if (mediaReajusteOperadora <= indiceReferenciaRPC) {
    scoreComponente1 = 1;
  } else if (mediaReajusteOperadora < 2 * indiceReferenciaRPC) {
    scoreComponente1 = 1 - ((mediaReajusteOperadora - indiceReferenciaRPC) / indiceReferenciaRPC);
  }

  let scoreComponente2 = 0;
  if (cvReajustes <= 0.15) {
    scoreComponente2 = 1;
  } else if (cvReajustes <= 1) {
    scoreComponente2 = 1 - ((cvReajustes - 0.15) / 0.85);
  }
  
  return parseFloat(((0.5 * Math.max(0, scoreComponente1)) + (0.5 * Math.max(0, scoreComponente2))).toFixed(3));
};

export const calcularNotaFinalQualidadeCadastralSIB: CalcularNotaFinalFunction = (value, percDependentesMenoresValidos) => { 
  if (value === null) return null;
  let notaFinalBase = 0;
  if (value >= 99) notaFinalBase = 1;
  else if (value >= 65) notaFinalBase = interpolateNotaFinal(value, 65, 99, false); 
  
  let bonus = 0;
  if (typeof percDependentesMenoresValidos === 'number') {
      if (percDependentesMenoresValidos > 95) bonus = 0.10;
      else if (percDependentesMenoresValidos >= 85) bonus = 0.05;
  }
  return parseFloat(Math.min(1, notaFinalBase + bonus).toFixed(3)); 
};

export const calcularNotaFinalRazaoCompletudeTISS: CalcularNotaFinalFunction = (value) => { 
  if (value === null) return null;
  if (value >= 1) return 1;
  if (value < 0.30) return 0; 
  return interpolateNotaFinal(value, 0.30, 1, false);
};

export const calcularNotaFinalDiagnosticosInespecificos: CalcularNotaFinalFunction = (value) => {
    if (value === null) return null;
    return value <= 0.30 ? 1 : 0; // Bonus indicator, 1 if goal met, 0 otherwise
};

export const DIMENSION_WEIGHTS: Record<IDSSDimensionName, number> = {
  [IDSSDimensionName.IDQS]: 0.30,
  [IDSSDimensionName.IDGA]: 0.30,
  [IDSSDimensionName.IDSM]: 0.30,
  [IDSSDimensionName.IDGR]: 0.10,
};

export const CURRENT_YEAR = new Date().getFullYear();
export const PREVIOUS_YEARS_COUNT = 3; 

export const getPeriodLabels = (periodicity: Periodicity): string[] => {
  switch (periodicity) {
    case Periodicity.ANUAL: return ["Anual"];
    case Periodicity.SEMESTRAL: return ["Semestre 1", "Semestre 2"];
    case Periodicity.QUADRIMESTRAL: return ["Quad. 1", "Quad. 2", "Quad. 3"];
    case Periodicity.TRIMESTRAL: return ["Trim. 1", "Trim. 2", "Trim. 3", "Trim. 4"];
    case Periodicity.BIMESTRAL: return ["Bim. 1", "Bim. 2", "Bim. 3", "Bim. 4", "Bim. 5", "Bim. 6"];
    case Periodicity.MENSAL: return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    default: return [];
  }
};
