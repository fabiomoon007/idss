import { Indicator, IDSSDimensionName, Periodicity, IDSSIndicatorWeightLevel, OperatorSize } from '../types';
import {
    averageConsolidation,
    calcularNotaFinalParametrizadaDecrescente,
    calcularNotaFinalParametrizadaCrescente,
    calcularNotaFinalPartoCesareo,
    calcularNotaFinalTaxaConsultaPrenatal,
    calcularNotaFinalTaxaPediatria,
    calcularNotaFinalCitopatologia,
    calcularNotaFinalHemoglobinaGlicada,
    calcularNotaFinalTaxaConsultasIdososGeneralista,
    calcularNotaFinalPontuacaoBase,
    calcularNotaFinalBonus,
    calcularNotaFinalHemodialise,
    calcularNotaFinalTaxaConsultasMedicasGeneralistaIdosos,
    calcularNotaFinalIndiceDispersaoUrgenciaEmergencia,
    calcularNotaFinalFrequenciaRedeHospitalQualidade,
    calcularNotaFinalFrequenciaRedeSADTQualidade,
    calcularNotaFinalICR,
    calcularNotaFinalTaxaResolutividadeNIP,
    calcularNotaFinalProporcaoNTRPsAtipicos,
    calcularNotaFinalReajusteMedioPonderado,
    calcularNotaFinalQualidadeCadastralSIB,
    calcularNotaFinalRazaoCompletudeTISS,
    calcularNotaFinalDiagnosticosInespecificos
} from '../constants';

export const INITIAL_INDICATORS: Indicator[] = [
    // --- IDQS Indicators ---
    {
      id: "1.1", name: "Proporção de Parto Cesáreo", simpleName: "Parto Cesáreo",
      dimensionId: IDSSDimensionName.IDQS, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
      description: "Percentual de partos cesáreos realizados pela operadora no período considerado.",
      targetDescription: "Meta: Taxa ≤ 45% OU Redução da taxa em relação ao ano anterior ≥ 10%. Pontuação 0 se taxa ≥ 80% E Redução ≤ 5%.",
      periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
      currentPeriodicity: Periodicity.ANUAL, results: [],
      calcularNotaFinalFn: calcularNotaFinalPartoCesareo,
      isRate: true, valueLabel: "Taxa Parto Cesáreo (%)", valueConsolidationFn: averageConsolidation,
      responsibleSector: "Atenção à Saúde", targetDirection: 'down'
    },
    {
      id: "1.2", name: "Taxa de Consultas Médicas de Pré-Natal", simpleName: "Pré-Natal",
      dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
      description: "Número médio de consultas médicas de pré-natal por beneficiária grávida no período considerado.",
      targetDescription: "Meta: ≥ 7 consultas. Pontuação 0 se ≤ 2 consultas.",
      periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
      currentPeriodicity: Periodicity.ANUAL, results: [],
      calcularNotaFinalFn: calcularNotaFinalTaxaConsultaPrenatal,
      valueLabel: "Nº Médio Consultas", valueConsolidationFn: averageConsolidation,
      responsibleSector: "Atenção à Saúde", targetDirection: 'up'
    },
    {
      id: "1.3", name: "Taxa de Internação por Fratura de Fêmur em Idosos", simpleName: "Fratura Fêmur Idosos",
      dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
      description: "Número médio de internações hospitalares por Fratura de Fêmur para cada 1000 beneficiários na faixa etária de 60 anos ou mais.",
      targetDescription: "Atingir valor menor ou igual à média das medianas por porte (ano atual e anterior) + 20%.",
      parametersByPorte: {
          [OperatorSize.PEQUENO]: { target: 3.435, worse: 8.588 },
          [OperatorSize.MEDIO]: { target: 4.841, worse: 12.103 },
          [OperatorSize.GRANDE]: { target: 4.271, worse: 10.677 }
      },
      periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
      currentPeriodicity: Periodicity.ANUAL, results: [],
      calcularNotaFinalFn: calcularNotaFinalParametrizadaDecrescente,
      valueLabel: "Taxa/1000 benef. 60+", valueConsolidationFn: averageConsolidation,
      responsibleSector: "Atenção à Saúde", targetDirection: 'down'
    },
    {
        id: "1.4", name: "Razão de Consultas Ambulatoriais de Pediatria por Beneficiário de 0 a 4 anos", simpleName: "Consultas Pediatria 0-4 anos",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: "Razão de consultas ambulatoriais de pediatria para crianças de 0 a 4 anos em relação ao total de consultas recomendadas na literatura.",
        targetDescription: "Meta: Razão ≥ 0,95. Pontuação 0 se Razão ≤ 0,10.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaPediatria,
        valueLabel: "Razão Consultas Pediatria", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Atenção à Saúde", targetDirection: 'up'
    },
    {
        id: "1.5", name: "Taxa de Citopatologia Cérvico-Vaginal Oncótica", simpleName: "Papanicolau",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: "Número de procedimentos diagnósticos em citopatologia cérvico-vaginal oncótica para cada 100 beneficiárias de 25 a 64 anos.",
        targetDescription: "Meta: ≥ 33 exames/100 benef. Pontuação 0 se ≤ 3 exames/100 benef.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalCitopatologia,
        valueLabel: "Taxa Exames/100 Benef.", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Atenção à Saúde", targetDirection: 'up'
    },
    {
        id: "1.6", name: "Taxa de Exames de Hemoglobina Glicada", simpleName: "Hemoglobina Glicada",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: "Número médio de exames de hemoglobina glicada por beneficiário com diabetes (19-75 anos).",
        targetDescription: "Meta: ≥ 2 exames/benef./ano. Pontuação 0 se ≤ 0,20 exames/benef./ano.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalHemoglobinaGlicada,
        valueLabel: "Nº Médio Exames/Benef.", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Atenção à Saúde", targetDirection: 'up'
    },
    {
        id: "1.9", name: "Razão de Consultas Médicas Ambulatoriais com Generalista/Especialista para idosos", simpleName: "Consultas Idosos Generalista/Especialista",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: "Razão de consultas ambulatoriais com generalistas pelo número de consultas com especialistas para beneficiários de 60+ anos.",
        targetDescription: "Meta: Razão ≥ 0,3 (Ex: 1,5 consultas generalista para 5 especialista). Pontuação 0 se Razão ≤ 0,0769 (1 para 13).",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaConsultasIdososGeneralista,
        valueLabel: "Razão Consultas Generalista/Especialista", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede Credenciada", targetDirection: 'up'
    },
    {
        id: "1.10", name: "Programa de Promoção da Saúde e Prevenção de Riscos e Doenças – Pontuação Base", simpleName: "Promoção e Prevenção (Bônus)",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 0.1,
        description: "Pontuação base atribuída se a operadora tiver programas de promoção da saúde e prevenção de riscos e doenças cadastrados e aprovados na ANS.",
        targetDescription: "Participar (Formulário de Cadastramento e Monitoramento aprovados).",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase,
        valueLabel: "Participou (1=Sim, 0=Não)", responsibleSector: "Atenção à Saúde", targetDirection: 'none'
    },
    {
        id: "1.11", name: "Participação em Programas de Indução de Melhoria da Qualidade - Pontuação Base", simpleName: "Projetos Indução Qualidade (Bônus)",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 0.15,
        description: "Pontuação base por participação em Programas de Certificação em Boas Práticas ou Projetos de Indução de Qualidade (APS, Parto Adequado).",
        targetDescription: "Participar em pelo menos um dos programas/projetos elegíveis.",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase,
        valueLabel: "Participou (1=Sim, 0=Não)", responsibleSector: "Qualidade", targetDirection: 'none'
    },
    {
        id: "1.12", name: "Participação no Projeto de Modelos de Remuneração Baseados em Valor- Pontuação Base", simpleName: "Remuneração por Valor (Bônus)",
        dimensionId: IDSSDimensionName.IDQS, weightInDimension: 0.1,
        description: "Pontuação base por participação no Projeto de Modelos de Remuneração Baseados em Valor da ANS.",
        targetDescription: "Participar efetivamente do projeto (2ª edição).",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase,
        valueLabel: "Participou (1=Sim, 0=Não)", responsibleSector: "Rede Credenciada", targetDirection: 'none'
    },
    
    // --- IDGA Indicators ---
    {
        id: "2.1", name: "Taxa de Sessões de Hemodiálise Crônica por Beneficiário", simpleName: "Hemodiálise Crônica",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Número médio de sessões de hemodiálise crônica realizadas por beneficiário.",
        targetDescription: "Resultado ≥ 0,062 sessões/benef./ano E Taxa de Utilização do SUS < 0,0011513.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalHemodialise,
        requiresAuxValue: true, valueLabel: "Sessões/Benef./Ano", auxValueLabel: "Taxa Utilização SUS",
        valueConsolidationFn: averageConsolidation, responsibleSector: "Rede Credenciada", targetDirection: 'up'
    },
    {
        id: "2.2", name: "Taxa de Consultas Médicas Ambulatoriais com Generalista por Idosos", simpleName: "Consultas Generalista Idosos",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: "Número médio de consultas ambulatoriais com médico generalista por idoso (60+ anos), limitado a 2 consultas/benef./ano.",
        targetDescription: "Meta: ≥ 2 consultas/idoso/ano. Pontuação 0 se ≤ 0,7.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaConsultasMedicasGeneralistaIdosos,
        valueLabel: "Nº Médio Consultas/Idoso", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede Credenciada", targetDirection: 'up'
    },
    {
        id: "2.3", name: "Índice de Dispersão Combinado de Serviços de Urgência e Emergência 24 Horas", simpleName: "Dispersão Urgência/Emergência",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Analisa a dispersão e utilização dos serviços de urgência e emergência 24h.",
        targetDescription: "Meta: 100% (Dispersão de 100%).",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalIndiceDispersaoUrgenciaEmergencia,
        isRate: true, valueLabel: "Índice (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede Credenciada", targetDirection: 'up'
    },
    {
        id: "2.6", name: "Frequência de Utilização de Rede de Hospitais com Atributo de Qualidade", simpleName: "Uso Rede Hospitalar Qualificada",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Proporção de utilização de hospitais com acreditação QUALISS ou outras certificações ISQUA.",
        targetDescription: "Meta: ≥ 0,30 (30%).",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalFrequenciaRedeHospitalQualidade,
        isRate: true, valueLabel: "Frequência (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede Credenciada", targetDirection: 'up'
    },
    {
        id: "2.7", name: "Frequência de Utilização de Rede de SADT com Atributo de Qualidade", simpleName: "Uso Rede SADT Qualificada",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Proporção de utilização de SADT com acreditação QUALISS ou outras certificações ISQUA.",
        targetDescription: "Meta: ≥ 0,20 (20%).",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.SEMESTRAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalFrequenciaRedeSADTQualidade,
        isRate: true, valueLabel: "Frequência (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede Credenciada", targetDirection: 'up'
    },
    {
        id: "2.8", name: "Índice de efetiva comercialização de planos individuais - Bônus", simpleName: "Comercialização Planos Individuais (Bônus)",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 0.1,
        description: "Crescimento de beneficiários titulares na carteira de planos individuais regulamentados.",
        targetDescription: "Crescimento da carteira: MH ≥ 1,5% a.a.; OD ≥ 4,0% a.a.",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase,
        valueLabel: "Atingiu Meta (1=Sim, 0=Não)", responsibleSector: "Comercial", targetDirection: 'none'
    },
    {
        id: "2.10", name: "Frequência de Utilização de Rede de Hospitais com Atributo: Qualidade Monitorada - Bônus", simpleName: "Uso Hospitais Qualidade Monitorada (Bônus)",
        dimensionId: IDSSDimensionName.IDGA, weightInDimension: 0.2,
        description: "Proporção de utilização de hospitais gerais que participam do PM-Qualiss Hospitalar.",
        targetDescription: "Frequência ≥ 90% para bônus máximo de 20%.",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalBonus,
        isRate: true, valueLabel: "Frequência (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Rede Credenciada", targetDirection: 'none'
    },

    // --- IDSM Indicators ---
    {
        id: "3.1", name: "Índice de Capital Regulatório (ICR)", simpleName: "Capital Regulatório (ICR)",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 3, idssWeightLevel: IDSSIndicatorWeightLevel.HIGH,
        description: "Razão entre o Patrimônio Líquido Ajustado e o Capital Regulatório exigido.",
        targetDescription: "Meta: ICR ≥ 1 (100%). Pontuação varia de 0 a 1 conforme faixas de ICR.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.QUADRIMESTRAL, Periodicity.TRIMESTRAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalICR,
        valueLabel: "ICR (Ratio)", valueConsolidationFn: (values) => values[values.length -1] ?? null, // Last value
        responsibleSector: "Financeiro", targetDirection: 'up'
    },
    {
        id: "3.2", name: "Taxa de Resolutividade de Notificação de Intermediação Preliminar", simpleName: "Resolutividade NIP",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: "Taxa de demandas NIP classificadas como INATIVA, NP ou RVE em relação ao total de demandas NIP classificadas.",
        targetDescription: "Meta: Taxa ≥ 95%. Pontuação 0 se < 70% (com exceções).",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalTaxaResolutividadeNIP,
        isRate: true, valueLabel: "Taxa Resolutividade (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Relacionamento com Cliente", targetDirection: 'up'
    },
    {
        id: "3.3", name: "Índice Geral de Reclamação Anual (IGR Anual)", simpleName: "IGR Anual",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Número médio de reclamações de beneficiários (NIPs) para cada 100.000 beneficiários, por segmento (MH/OD).",
        targetDescription: "Meta IGR_MH ≤ 2; Meta IGR_OD ≤ 0,5. Pontuação 0 se IGR_MH ≥ 30 ou IGR_OD ≥ 1,5.",
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { target: 2, worse: 30 },
            [OperatorSize.MEDIO]: { target: 2, worse: 30 },
            [OperatorSize.GRANDE]: { target: 2, worse: 30 }
        },
        periodicityOptions: [Periodicity.ANUAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.MENSAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalParametrizadaDecrescente,
        valueLabel: "IGR (Reclamações/100k)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Relacionamento com Cliente", targetDirection: 'down'
    },
    {
        id: "3.4", name: "Proporção de NTRPs com Valor Comercial da Mensalidade Atípicos", simpleName: "NTRPs com Mensalidade Atípica",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Proporção de NTRPs com VCM abaixo do limite inferior estatístico.",
        targetDescription: "Meta: Proporção ≤ 0,05 (5%). Pontuação 0 se ≥ 0,95 (95%).",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalProporcaoNTRPsAtipicos,
        isRate: true, valueLabel: "Proporção NTRPs Atípicos (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Atuarial", targetDirection: 'down'
    },
    {
        id: "3.5", name: "Pesquisa de Satisfação do Beneficiário - Pontuação base", simpleName: "Satisfação Beneficiário (Bônus)",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 0.25,
        description: "Pontuação base para Operadoras que realizam e divulgam Pesquisa de Satisfação de Beneficiário conforme metodologia ANS.",
        targetDescription: "Realizar, auditar, divulgar e comunicar à ANS.",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalPontuacaoBase,
        valueLabel: "Realizou Pesquisa (1=Sim, 0=Não)", responsibleSector: "Relacionamento com Cliente", targetDirection: 'none'
    },
    {
        id: "3.6", name: "Índice de Reajuste Médio Ponderado aplicado aos Planos Coletivos", simpleName: "Reajuste Planos Coletivos",
        dimensionId: IDSSDimensionName.IDSM, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Avalia a média ponderada dos reajustes aplicados e a dispersão (CV) desses reajustes em planos coletivos.",
        targetDescription: "Média Ponderada ≤ RPC e Coeficiente de Variação (CV) ≤ 0,15.",
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { indiceReferenciaRPC: 0.08 },
            [OperatorSize.MEDIO]: { indiceReferenciaRPC: 0.08 },
            [OperatorSize.GRANDE]: { indiceReferenciaRPC: 0.08 }
        },
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalReajusteMedioPonderado,
        requiresAuxValue: true, valueLabel: "Média Reajuste (%)", auxValueLabel: "Coef. Variação (CV)",
        responsibleSector: "Atuarial", targetDirection: 'down'
    },

    // --- IDGR Indicators ---
    {
        id: "4.1", name: "Índice composto de Qualidade Cadastral (SIB)", simpleName: "Qualidade Cadastral (SIB)",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: "Mede a qualidade do preenchimento dos campos identificadores do beneficiário e do plano no SIB.",
        targetDescription: "Meta: 100% de qualidade. Bônus se % Dependentes Menores Validados > 85% ou > 95%.",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalQualidadeCadastralSIB,
        requiresAuxValue: true, isRate: true, valueLabel: "% Campos Válidos", auxValueLabel: "% Dep. Menores Válidos",
        valueConsolidationFn: averageConsolidation, responsibleSector: "Cadastro", targetDirection: 'up'
    },
    {
        id: "4.2", name: "Taxa de utilização do SUS", simpleName: "Utilização do SUS",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Classifica operadoras conforme sua utilização do SUS, baseada no número de eventos de utilização da rede pública.",
        targetDescription: "Resultado (Taxa_Op) ≤ Percentil 80 (P80) do setor. Pontuação 0 se Resultado ≥ P97,5.",
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { target: 0.0011513, worse: 0.034669376 },
            [OperatorSize.MEDIO]: { target: 0.0011513, worse: 0.034669376 },
            [OperatorSize.GRANDE]: { target: 0.0011513, worse: 0.034669376 }
        },
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalParametrizadaDecrescente,
        valueLabel: "Taxa Utilização SUS", responsibleSector: "Financeiro", targetDirection: 'down'
    },
    {
        id: "4.3", name: "Razão de Completude do Envio dos Dados do Padrão TISS (Razão TISS/DIOPS)", simpleName: "Completude TISS/DIOPS",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 2, idssWeightLevel: IDSSIndicatorWeightLevel.MEDIUM,
        description: "Relação entre o Total do Valor Informado em Reais (TISS) e o Total do Valor em Reais da Despesa (DIOPS).",
        targetDescription: "Meta: Razão = 1,0 (100%). Pontuação 0 se < 0,30 (30%).",
        periodicityOptions: [Periodicity.ANUAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalRazaoCompletudeTISS,
        valueLabel: "Razão TISS/DIOPS", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Contas Médicas", targetDirection: 'up'
    },
    {
        id: "4.4", name: "Proporção de Glosas de Pagamentos a Prestadores de Serviços de Saúde", simpleName: "Proporção de Glosas",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 1, idssWeightLevel: IDSSIndicatorWeightLevel.LOW,
        description: "Relação entre valores glosados e informados (financeiro) e entre prestadores com glosa e total de prestadores (quantitativo).",
        targetDescription: "Resultado ≤ Percentil 15 (P15) do setor/segmento. Pontuação 0 se Resultado > P85.",
        parametersByPorte: {
            [OperatorSize.PEQUENO]: { target: 0.025736833, worse: 0.215059903 },
            [OperatorSize.MEDIO]: { target: 0.025736833, worse: 0.215059903 },
            [OperatorSize.GRANDE]: { target: 0.025736833, worse: 0.215059903 }
        },
        periodicityOptions: [Periodicity.ANUAL, Periodicity.TRIMESTRAL, Periodicity.MENSAL],
        currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalParametrizadaDecrescente,
        valueLabel: "Proporção Glosas", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Contas Médicas", targetDirection: 'down'
    },
    {
        id: "4.5", name: "Proporção de Diagnósticos Inespecíficos nos Eventos de Internação Preenchidos nas Guias TISS - Bônus", simpleName: "Diagnósticos Inespecíficos (Bônus)",
        dimensionId: IDSSDimensionName.IDGR, weightInDimension: 0.1,
        description: "Relação entre quantidade de diagnósticos inespecíficos e o total de eventos de internação com CID.",
        targetDescription: "Resultado ≤ 30% para bônus de 10% no IDGR.",
        periodicityOptions: [Periodicity.ANUAL], currentPeriodicity: Periodicity.ANUAL, results: [],
        calcularNotaFinalFn: calcularNotaFinalDiagnosticosInespecificos,
        isRate: true, valueLabel: "Proporção Diag. Inespecíficos (%)", valueConsolidationFn: averageConsolidation,
        responsibleSector: "Contas Médicas", targetDirection: 'none'
    },
];
