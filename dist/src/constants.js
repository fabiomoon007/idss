import { IDSSDimensionName, OperatorSize, Periodicity, IDSSIndicatorWeightLevel } from './types.js';
// --- Helper Functions ---
const interpolateNotaFinal = (value, worse, target, betterIsLower = true) => {
    if (betterIsLower) {
        if (value <= target)
            return 1;
        if (value >= worse)
            return 0;
        return parseFloat((1 - (value - target) / (worse - target)).toFixed(3));
    }
    else {
        if (value >= target)
            return 1;
        if (value <= worse)
            return 0;
        return parseFloat(((value - worse) / (target - worse)).toFixed(3));
    }
};
// Default consolidation function: average of non-null values
const averageConsolidation = (periodicValues) => {
    const validValues = periodicValues.filter((v) => v !== null);
    if (validValues.length === 0)
        return null;
    return parseFloat((validValues.reduce((sum, val) => sum + val, 0) / validValues.length).toFixed(3));
};
// --- Scoring Functions (now CalcularNotaFinalFunctions) ---
const calcularNotaFinalPartoCesareo = (currentRate, _auxValue, operatorSize, params) => {
    if (currentRate === null)
        return null;
    if (currentRate <= 45)
        return 1;
    if (currentRate >= 80)
        return 0;
    return interpolateNotaFinal(currentRate, 80, 45, true);
};
const calcularNotaFinalTaxaConsultaPrenatal = (value) => {
    if (value === null)
        return null;
    if (value >= 7)
        return 1;
    if (value <= 2)
        return 0;
    return interpolateNotaFinal(value, 2, 7, false);
};
const calcularNotaFinalFraturaFemur = (value, _aux, operatorSize, params) => {
    if (value === null || !operatorSize || !params || !params[operatorSize]?.meta || !params[operatorSize]?.limiteSuperior)
        return null;
    const { meta, limiteSuperior } = params[operatorSize];
    return interpolateNotaFinal(value, limiteSuperior, meta, true);
};
const calcularNotaFinalTaxaPediatria = (value) => {
    if (value === null)
        return null;
    if (value >= 0.95)
        return 1;
    if (value <= 0.10)
        return 0;
    return interpolateNotaFinal(value, 0.10, 0.95, false);
};
const calcularNotaFinalCitopatologia = (value) => {
    if (value === null)
        return null;
    if (value >= 33)
        return 1;
    if (value <= 3)
        return 0;
    return interpolateNotaFinal(value, 3, 33, false);
};
const calcularNotaFinalHemoglobinaGlicada = (value) => {
    if (value === null)
        return null;
    if (value >= 2)
        return 1;
    if (value <= 0.20)
        return 0;
    return interpolateNotaFinal(value, 0.20, 2, false);
};
const calcularNotaFinalTaxaConsultasIdososGeneralista = (value) => {
    if (value === null)
        return null;
    if (value >= 0.3)
        return 1;
    if (value <= 0.0769)
        return 0;
    return interpolateNotaFinal(value, 0.0769, 0.3, false);
};
const calcularNotaFinalPontuacaoBase = (value) => (value === 1 ? 1 : 0);
const calcularNotaFinalHemodialise = (value, auxValue) => {
    if (value === null)
        return null;
    let notaFinal = 0;
    const isAuxValueConditionMet = typeof auxValue === 'number' && auxValue < 0.0011513;
    if (value >= 0.062) {
        notaFinal = isAuxValueConditionMet ? 1 : 0.9;
    }
    else if (value > 0 && value < 0.062) {
        const partialScore = interpolateNotaFinal(value, 0, 0.062, false);
        notaFinal = isAuxValueConditionMet ? partialScore : partialScore * 0.8;
    }
    else {
        notaFinal = 0;
    }
    return parseFloat(notaFinal.toFixed(3));
};
const calcularNotaFinalTaxaConsultasMedicasGeneralistaIdosos = (value) => {
    if (value === null)
        return null;
    if (value >= 2)
        return 1;
    if (value <= 0.7)
        return 0;
    return interpolateNotaFinal(value, 0.7, 2, false);
};
const calcularNotaFinalIndiceDispersaoUrgenciaEmergencia = (value) => {
    if (value === null)
        return null;
    if (value >= 100)
        return 1;
    if (value <= 0)
        return 0;
    return interpolateNotaFinal(value, 0, 100, false);
};
const calcularNotaFinalFrequenciaRedeHospitalQualidade = (value) => {
    if (value === null)
        return null;
    if (value >= 0.30)
        return 1;
    if (value <= 0)
        return 0;
    return interpolateNotaFinal(value, 0, 0.30, false);
};
const calcularNotaFinalFrequenciaRedeSADTQualidade = (value) => {
    if (value === null)
        return null;
    if (value >= 0.20)
        return 1;
    if (value <= 0)
        return 0;
    return interpolateNotaFinal(value, 0, 0.20, false);
};
const calcularNotaFinalICR = (value) => {
    if (value === null)
        return null;
    if (value >= 3.5)
        return 1;
    if (value >= 2.0 && value < 3.5)
        return 0.975;
    if (value >= 1.3 && value < 2.0)
        return 0.95;
    if (value >= 1.0 && value < 1.3)
        return 0.90;
    return 0;
};
const calcularNotaFinalTaxaResolutividadeNIP = (value) => {
    if (value === null)
        return null;
    if (value >= 95)
        return 1;
    if (value < 70)
        return 0;
    return interpolateNotaFinal(value, 70, 95, false);
};
const calcularNotaFinalIGRAnual = (value, _aux, opSize, params) => {
    if (value === null || !opSize || !params || !params[opSize])
        return null;
    const { metaIGR, piorIGR } = params[opSize];
    if (metaIGR === undefined || piorIGR === undefined)
        return null;
    return interpolateNotaFinal(value, piorIGR, metaIGR, true);
};
const calcularNotaFinalProporcaoNTRPsAtipicos = (value) => {
    if (value === null)
        return null;
    if (value <= 0.05)
        return 1;
    if (value >= 0.95)
        return 0;
    return interpolateNotaFinal(value, 0.95, 0.05, true);
};
const calcularNotaFinalReajusteMedioPonderado = (mediaReajusteOperadora, cvReajustes, _opSize, params) => {
    if (mediaReajusteOperadora === null || typeof cvReajustes !== 'number' || !_opSize || !params || !params[_opSize]?.indiceReferenciaRPC)
        return null;
    const { indiceReferenciaRPC } = params[_opSize];
    let scoreComponente1 = 0;
    if (mediaReajusteOperadora <= indiceReferenciaRPC) {
        scoreComponente1 = 1;
    }
    else if (mediaReajusteOperadora < 2 * indiceReferenciaRPC) {
        scoreComponente1 = 1 - ((mediaReajusteOperadora - indiceReferenciaRPC) / indiceReferenciaRPC);
    }
    let scoreComponente2 = 0;
    if (cvReajustes <= 0.15) {
        scoreComponente2 = 1;
    }
    else if (cvReajustes <= 1) {
        scoreComponente2 = 1 - ((cvReajustes - 0.15) / 0.85);
    }
    return parseFloat(((0.5 * Math.max(0, scoreComponente1)) + (0.5 * Math.max(0, scoreComponente2))).toFixed(3));
};
const calcularNotaFinalQualidadeCadastralSIB = (value, percDependentesMenoresValidos) => {
    if (value === null)
        return null;
    let notaFinalBase = 0;
    if (value >= 99)
        notaFinalBase = 1;
    else if (value >= 65)
        notaFinalBase = interpolateNotaFinal(value, 65, 99, false);
    let bonus = 0;
    if (typeof percDependentesMenoresValidos === 'number') {
        if (percDependentesMenoresValidos > 95)
            bonus = 0.10;
        else if (percDependentesMenoresValidos >= 85)
            bonus = 0.05;
    }
    return parseFloat(Math.min(1, notaFinalBase + bonus).toFixed(3));
};
const calcularNotaFinalTaxaUtilizacaoSUS = (value, _aux, opSize, params) => {
    if (value === null || !opSize || !params || !params[opSize]?.P80 || !params[opSize]?.P97_5)
        return null;
    const { P80, P97_5 } = params[opSize];
    if (value <= P80)
        return 1;
    if (value >= P97_5)
        return 0;
    return interpolateNotaFinal(value, P97_5, P80, true);
};
const calcularNotaFinalRazaoCompletudeTISS = (value) => {
    if (value === null)
        return null;
    if (value >= 1)
        return 1;
    if (value < 0.30)
        return 0;
    return interpolateNotaFinal(value, 0.30, 1, false);
};
const calcularNotaFinalProporcaoGlosas = (value, _aux, opSize, params) => {
    if (value === null || !opSize || !params || !params[opSize]?.P15 || !params[opSize]?.P85)
        return null;
    const { P15, P85 } = params[opSize];
    if (value <= P15)
        return 1;
    if (value > P85)
        return 0;
    return interpolateNotaFinal(value, P85, P15, true);
};
// --- Initial Data ---
export const INITIAL_INDICATORS = [
    // === IDQS ===
    {
        id: "1.1", name: `Proporção de Parto Cesáreo`, simpleName: "Parto Cesáreo",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: `Percentual de partos cesáreos realizados pela operadora no período considerado.`,
        targetDescription: `Meta: Taxa ≤ 45% OU Redução da taxa em relação ao ano anterior ≥ 10%. Pontuação 0 se taxa ≥ 80% E Redução ≤ 5%.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPartoCesareo, isRate: true, valueLabel: "Taxa Parto Cesáreo (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "APS", targetDirection: "down",
    },
    {
        id: "1.2", name: `Taxa de Consultas Médicas de Pré-Natal`, simpleName: "Pré-Natal",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Número médio de consultas médicas de pré-natal por beneficiária grávida no período considerado.`,
        targetDescription: `Meta: ≥ 7 consultas. Pontuação 0 se ≤ 2 consultas.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaConsultaPrenatal, valueLabel: "Nº Médio Consultas Pré-Natal", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Responsável não definido", targetDirection: "up",
    },
    {
        id: "1.3", name: `Taxa de Internação por Fratura de Fêmur em Idosos`, simpleName: "Fratura Fêmur Idosos",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Número médio de internações hospitalares por Fratura de Fêmur para cada 1000 beneficiários na faixa etária de 60 anos ou mais.`,
        targetDescription: `Atingir valor menor ou igual à média das medianas por porte (ano atual e anterior) + 20%.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { meta: 3.435, limiteSuperior: 8.588, media: 2.863 },
            [OperatorSize.MEDIO]: { meta: 4.841, limiteSuperior: 12.103, media: 4.034 },
            [OperatorSize.GRANDE]: { meta: 4.271, limiteSuperior: 10.677, media: 3.559 },
        },
        calcularNotaFinalFn: calcularNotaFinalFraturaFemur, valueLabel: "Taxa/1000 benef. 60+", valueConsolidationFn: averageConsolidation,
        responsibleSector: "APS", targetDirection: "down",
    },
    {
        id: "1.4", name: `Razão de Consultas Ambulatoriais de Pediatria por Beneficiário de 0 a 4 anos`, simpleName: "Consultas Pediatria 0-4 anos",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Razão de consultas ambulatoriais de pediatria para crianças de 0 a 4 anos em relação ao total de consultas recomendadas na literatura.`,
        targetDescription: `Meta: Razão ≥ 0,95. Pontuação 0 se Razão ≤ 0,10.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaPediatria, valueLabel: "Razão Consultas Pediatria", valueConsolidationFn: averageConsolidation,
        responsibleSector: "APS", targetDirection: "up",
    },
    {
        id: "1.5", name: `Taxa de Citopatologia Cérvico-Vaginal Oncótica`, simpleName: "Papanicolau",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Número de procedimentos diagnósticos em citopatologia cérvico-vaginal oncótica para cada 100 beneficiárias de 25 a 64 anos.`,
        targetDescription: `Meta: ≥ 33 exames/100 benef. Pontuação 0 se ≤ 3 exames/100 benef.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalCitopatologia, valueLabel: "Taxa Exames/100 Benef.", valueConsolidationFn: averageConsolidation,
        responsibleSector: "APS", targetDirection: "up",
    },
    {
        id: "1.6", name: `Taxa de Exames de Hemoglobina Glicada`, simpleName: "Hemoglobina Glicada",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: `Número médio de exames de hemoglobina glicada por beneficiário com diabetes (19-75 anos).`,
        targetDescription: `Meta: ≥ 2 exames/benef./ano. Pontuação 0 se ≤ 0,20 exames/benef./ano.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalHemoglobinaGlicada, valueLabel: "Nº Médio Exames/Benef.", valueConsolidationFn: averageConsolidation,
        responsibleSector: "APS", targetDirection: "up",
    },
    {
        id: "1.9", name: `Razão de Consultas Médicas Ambulatoriais com Generalista/Especialista para idosos`, simpleName: "Consultas Idosos Generalista/Especialista",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: `Razão de consultas ambulatoriais com generalistas pelo número de consultas com especialistas para beneficiários de 60+ anos.`,
        targetDescription: `Meta: Razão ≥ 0,3 (Ex: 1,5 consultas generalista para 5 especialista). Pontuação 0 se Razão ≤ 0,0769 (1 para 13).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaConsultasIdososGeneralista, valueLabel: "Razão Consultas Generalista/Especialista", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Responsável não definido", targetDirection: "up",
    },
    {
        id: "1.10", name: `Programa de Promoção da Saúde e Prevenção de Riscos e Doenças – Pontuação Base`, simpleName: "Promoção e Prevenção (Bônus)",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 0.10,
        description: `Pontuação base atribuída se a operadora tiver programas de promoção da saúde e prevenção de riscos e doenças cadastrados e aprovados na ANS.`,
        targetDescription: `Participar (Formulário de Cadastramento e Monitoramento aprovados).`,
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase, valueLabel: "Participou (1=Sim, 0=Não)", valueConsolidationFn: (v) => v[0],
        responsibleSector: "Responsável não definido", targetDirection: "none",
    },
    {
        id: "1.11", name: `Participação em Programas de Indução de Melhoria da Qualidade - Pontuação Base`, simpleName: "Projetos Indução Qualidade (Bônus)",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 0.15,
        description: `Pontuação base por participação em Programas de Certificação em Boas Práticas ou Projetos de Indução de Qualidade (APS, Parto Adequado).`,
        targetDescription: `Participar em pelo menos um dos programas/projetos elegíveis.`,
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: (v) => (v !== null && v > 0 ? 1 : 0),
        valueLabel: "Nº Projetos/Certificações (0, 1, 2+)", valueConsolidationFn: (v) => v[0],
        responsibleSector: "Responsável não definido", targetDirection: "none",
    },
    {
        id: "1.12", name: `Participação no Projeto de Modelos de Remuneração Baseados em Valor- Pontuação Base`, simpleName: "Remuneração por Valor (Bônus)",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 0.10,
        description: `Pontuação base por participação no Projeto de Modelos de Remuneração Baseados em Valor da ANS.`,
        targetDescription: `Participar efetivamente do projeto (2ª edição).`,
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase, valueLabel: "Participou (1=Sim, 0=Não)", valueConsolidationFn: (v) => v[0],
        responsibleSector: "Responsável não definido", targetDirection: "none",
    },
    // === IDGA ===
    {
        id: "2.1", name: `Taxa de Sessões de Hemodiálise Crônica por Beneficiário`, simpleName: "Hemodiálise Crônica",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Número médio de sessões de hemodiálise crônica realizadas por beneficiário.`,
        targetDescription: `Resultado ≥ 0,062 sessões/benef./ano E Taxa de Utilização do SUS < 0,0011513.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalHemodialise, valueLabel: "Sessões/Benef./Ano", requiresAuxValue: true, auxValueLabel: "Taxa Utilização SUS", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede", targetDirection: "up",
    },
    {
        id: "2.2", name: `Taxa de Consultas Médicas Ambulatoriais com Generalista por Idosos`, simpleName: "Consultas Generalista Idosos",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Número médio de consultas ambulatoriais com médico generalista por idoso (60+ anos), limitado a 2 consultas/benef./ano.`,
        targetDescription: `Meta: ≥ 2 consultas/idoso/ano. Pontuação 0 se ≤ 0,7.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaConsultasMedicasGeneralistaIdosos, valueLabel: "Nº Médio Consultas/Idoso", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Responsável não definido", targetDirection: "up",
    },
    {
        id: "2.3", name: `Índice de Dispersão Combinado de Serviços de Urgência e Emergência 24 Horas`, simpleName: "Dispersão Urgência/Emergência",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Analisa a dispersão e utilização dos serviços de urgência e emergência 24h.`,
        targetDescription: `Meta: 100% (Dispersão de 100%).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalIndiceDispersaoUrgenciaEmergencia, valueLabel: "Índice (%)", isRate: true, valueConsolidationFn: averageConsolidation,
        responsibleSector: "ANS", targetDirection: "up",
    },
    {
        id: "2.6", name: `Frequência de Utilização de Rede de Hospitais com Atributo de Qualidade`, simpleName: "Uso Rede Hospitalar Qualificada",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Proporção de utilização de hospitais com acreditação QUALISS ou outras certificações ISQUA.`,
        targetDescription: `Meta: ≥ 0,30 (30%).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalFrequenciaRedeHospitalQualidade, valueLabel: "Frequência (%)", isRate: true, valueConsolidationFn: averageConsolidation,
        responsibleSector: "ANS", targetDirection: "up",
    },
    {
        id: "2.7", name: `Frequência de Utilização de Rede de SADT com Atributo de Qualidade`, simpleName: "Uso Rede SADT Qualificada",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Proporção de utilização de SADT com acreditação QUALISS ou outras certificações ISQUA.`,
        targetDescription: `Meta: ≥ 0,20 (20%).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalFrequenciaRedeSADTQualidade, valueLabel: "Frequência (%)", isRate: true, valueConsolidationFn: averageConsolidation,
        responsibleSector: "ANS", targetDirection: "up",
    },
    {
        id: "2.8", name: `Índice de efetiva comercialização de planos individuais - Bônus`, simpleName: "Comercialização Planos Individuais (Bônus)",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 0.10,
        description: `Crescimento de beneficiários titulares na carteira de planos individuais regulamentados.`,
        targetDescription: `Crescimento da carteira: MH ≥ 1,5% a.a.; OD ≥ 4,0% a.a.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: (v) => (v !== null && v >= 1 ? 0.10 : 0),
        valueLabel: "Atingiu Meta (1=Sim, 0=Não)", valueConsolidationFn: (v) => v[0],
        responsibleSector: "Comercial", targetDirection: "up",
    },
    {
        id: "2.10", name: `Frequência de Utilização de Rede de Hospitais com Atributo: Qualidade Monitorada - Bônus`, simpleName: "Uso Hospitais Qualidade Monitorada (Bônus)",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 0.20,
        description: `Proporção de utilização de hospitais gerais que participam do PM-Qualiss Hospitalar.`,
        targetDescription: `Frequência ≥ 90% para bônus máximo de 20%.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: (v) => {
            if (v === null)
                return 0;
            if (v >= 0.9)
                return 0.20;
            if (v >= 0.7)
                return 0.15;
            if (v >= 0.5)
                return 0.10;
            if (v > 0.3)
                return 0.05;
            return 0;
        },
        valueLabel: "Frequência (%)", isRate: true, valueConsolidationFn: (v) => v[0],
        responsibleSector: "ANS", targetDirection: "none",
    },
    // === IDSM ===
    {
        id: "3.1", name: `Índice de Capital Regulatório (ICR)`, simpleName: "Capital Regulatório (ICR)",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: `Razão entre o Patrimônio Líquido Ajustado e o Capital Regulatório exigido.`,
        targetDescription: `Meta: ICR ≥ 1 (100%). Pontuação varia de 0 a 1 conforme faixas de ICR.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalICR, valueLabel: "ICR (Ratio)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Contabilidade", targetDirection: "up",
    },
    {
        id: "3.2", name: `Taxa de Resolutividade de Notificação de Intermediação Preliminar`, simpleName: "Resolutividade NIP",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Taxa de demandas NIP classificadas como INATIVA, NP ou RVE em relação ao total de demandas NIP classificadas.`,
        targetDescription: `Meta: Taxa ≥ 95%. Pontuação 0 se < 70% (com exceções).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaResolutividadeNIP, valueLabel: "Taxa Resolutividade (%)", isRate: true, valueConsolidationFn: averageConsolidation,
        responsibleSector: "ANS", targetDirection: "up",
    },
    {
        id: "3.3", name: `Índice Geral de Reclamação Anual (IGR Anual)`, simpleName: "IGR Anual",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Número médio de reclamações de beneficiários (NIPs) para cada 100.000 beneficiários, por segmento (MH/OD).`,
        targetDescription: `Meta (Taxa ANS): IGR_MH ≤ 2 (2 reclamações / 100k benef.); IGR_OD ≤ 0,5. Pior Caso: IGR_MH ≥ 30 ou IGR_OD ≥ 1,5. Insira a taxa IGR calculada para sua operadora.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalIGRAnual,
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { metaIGR: 2, piorIGR: 30 },
            [OperatorSize.MEDIO]: { metaIGR: 2, piorIGR: 30 },
            [OperatorSize.GRANDE]: { metaIGR: 2, piorIGR: 30 },
        },
        valueLabel: "IGR (Reclamações/100k Benef.)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "ANS", targetDirection: "down",
    },
    {
        id: "3.4", name: `Proporção de NTRPs com Valor Comercial da Mensalidade Atípicos`, simpleName: "NTRPs com Mensalidade Atípica",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Proporção de NTRPs com VCM abaixo do limite inferior estatístico.`,
        targetDescription: `Meta: Proporção ≤ 0,05 (5%). Pontuação 0 se ≥ 0,95 (95%).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalProporcaoNTRPsAtipicos, valueLabel: "Proporção NTRPs Atípicos (%)", isRate: true, valueConsolidationFn: averageConsolidation,
        responsibleSector: "Comercial", targetDirection: "down",
    },
    {
        id: "3.5", name: `Pesquisa de Satisfação do Beneficiário - Pontuação base`, simpleName: "Satisfação Beneficiário (Bônus)",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 0.25,
        description: `Pontuação base para Operadoras que realizam e divulgam Pesquisa de Satisfação de Beneficiário conforme metodologia ANS.`,
        targetDescription: `Realizar, auditar, divulgar e comunicar à ANS.`,
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase, valueLabel: "Realizou Pesquisa (1=Sim, 0=Não)", valueConsolidationFn: (v) => v[0],
        responsibleSector: "Qualidade", targetDirection: "none",
    },
    {
        id: "3.6", name: `Índice de Reajuste Médio Ponderado aplicado aos Planos Coletivos`, simpleName: "Reajuste Planos Coletivos",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Avalia a média ponderada dos reajustes aplicados e a dispersão (CV) desses reajustes em planos coletivos.`,
        targetDescription: `Média Ponderada ≤ RPC e Coeficiente de Variação (CV) ≤ 0,15.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalReajusteMedioPonderado,
        requiresAuxValue: true, auxValueLabel: "Coef. Variação (CV)", valueLabel: "Média Reajuste (%)",
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { indiceReferenciaRPC: 0.08 },
            [OperatorSize.MEDIO]: { indiceReferenciaRPC: 0.08 },
            [OperatorSize.GRANDE]: { indiceReferenciaRPC: 0.08 },
        },
        valueConsolidationFn: averageConsolidation,
        responsibleSector: "Comercial", targetDirection: "down",
    },
    // === IDGR ===
    {
        id: "4.1", name: `Índice composto de Qualidade Cadastral (SIB)`, simpleName: "Qualidade Cadastral (SIB)",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Mede a qualidade do preenchimento dos campos identificadores do beneficiário e do plano no SIB.`,
        targetDescription: `Meta: 100% de qualidade. Bônus se % Dependentes Menores Validados > 85% ou > 95%.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalQualidadeCadastralSIB, valueLabel: "% Campos Válidos", isRate: true,
        requiresAuxValue: true, auxValueLabel: "% Dep. Menores Válidos",
        valueConsolidationFn: averageConsolidation,
        responsibleSector: "Cadastro", targetDirection: "up",
    },
    {
        id: "4.2", name: `Taxa de utilização do SUS`, simpleName: "Utilização do SUS",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Classifica operadoras conforme sua utilização do SUS, baseada no número de eventos de utilização da rede pública.`,
        targetDescription: `Resultado (Taxa_Op) ≤ Percentil 80 (P80) do setor. Pontuação 0 se Resultado ≥ P97,5.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { P80: 0.0011513, P97_5: 0.034669376 },
            [OperatorSize.MEDIO]: { P80: 0.0011513, P97_5: 0.034669376 },
            [OperatorSize.GRANDE]: { P80: 0.0011513, P97_5: 0.034669376 },
        },
        calcularNotaFinalFn: calcularNotaFinalTaxaUtilizacaoSUS, valueLabel: "Taxa Utilização SUS", valueConsolidationFn: averageConsolidation,
        responsibleSector: "ANS", targetDirection: "down",
    },
    {
        id: "4.3", name: `Razão de Completude do Envio dos Dados do Padrão TISS (Razão TISS/DIOPS)`, simpleName: "Completude TISS/DIOPS",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: `Relação entre o Total do Valor Informado em Reais (TISS) e o Total do Valor em Reais da Despesa (DIOPS).`,
        targetDescription: `Meta: Razão = 1,0 (100%). Pontuação 0 se < 0,30 (30%).`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalRazaoCompletudeTISS, valueLabel: "Razão TISS/DIOPS", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Contabilidade e TISS", targetDirection: "up",
    },
    {
        id: "4.4", name: `Proporção de Glosas de Pagamentos a Prestadores de Serviços de Saúde`, simpleName: "Proporção de Glosas",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: `Relação entre valores glosados e informados (financeiro) e entre prestadores com glosa e total de prestadores (quantitativo).`,
        targetDescription: `Resultado ≤ Percentil 15 (P15) do setor/segmento. Pontuação 0 se Resultado > P85.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { P15: 0.025736833, P85: 0.215059903 },
            [OperatorSize.MEDIO]: { P15: 0.025736833, P85: 0.215059903 },
            [OperatorSize.GRANDE]: { P15: 0.025736833, P85: 0.215059903 },
        },
        calcularNotaFinalFn: calcularNotaFinalProporcaoGlosas, valueLabel: "Proporção Glosas", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Contas Médicas", targetDirection: "down",
    },
    {
        id: "4.5", name: `Proporção de Diagnósticos Inespecíficos nos Eventos de Internação Preenchidos nas Guias TISS - Bônus`, simpleName: "Diagnósticos Inespecíficos (Bônus)",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 0.10,
        description: `Relação entre quantidade de diagnósticos inespecíficos e o total de eventos de internação com CID.`,
        targetDescription: `Resultado ≤ 30% para bônus de 10% no IDGR.`,
        periodicityOptions: Object.values(Periodicity), currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: (v) => (v !== null && v <= 0.30 ? 0.10 : 0),
        valueLabel: "Proporção Diag. Inespecíficos (%)", isRate: true, valueConsolidationFn: (v) => v[0],
        responsibleSector: "Rede", targetDirection: "down",
    },
];
export const DIMENSION_WEIGHTS = {
    [IDSSDimensionName.IDQS]: 0.30,
    [IDSSDimensionName.IDGA]: 0.30,
    [IDSSDimensionName.IDSM]: 0.30,
    [IDSSDimensionName.IDGR]: 0.10,
};
export const CURRENT_YEAR = new Date().getFullYear();
export const PREVIOUS_YEARS_COUNT = 3;
export const getPeriodLabels = (periodicity) => {
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
//# sourceMappingURL=constants.js.map