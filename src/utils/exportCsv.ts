import { MemberStats } from '../types';
import { formatPercent } from './calculations';

export function exportToCSV(statsList: MemberStats[], filename = 'classificacao_demolay.csv'): void {
  // Brazilian Portuguese header names matching methodology
  const headers = [
    'Posição',
    'Nome',
    'Grau',
    'Nominata/Diretoria?',
    'Cargo',
    'Frequência Obrigatória',
    'Recuperação Opcionais',
    'Frequência Final',
    'Zona',
    'Presenças Obrigatórias',
    'Faltas Não Justificadas (U)',
    'Faltas Justificadas',
    'Obrigações Aplicáveis (N)',
    'Atividades Opcionais Totais (O)',
    'Opcionais Utilizadas',
    'Opcionais Excedentes'
  ];

  const rows = statsList.map((stat, index) => {
    let zoneLabel = 'Sem atividades';
    if (stat.hasConsideredEvents) {
      if (stat.zone === 'green') zoneLabel = 'Zona Verde';
      if (stat.zone === 'yellow') zoneLabel = 'Zona Amarela';
      if (stat.zone === 'red') zoneLabel = 'Zona Vermelha';
    }

    const degreeLabel = stat.member.degree === 'demolay' ? 'DeMolay' : 'Iniciático';
    const nominataStr = stat.member.isNominata ? 'Sim' : 'Não';
    const roleStr = stat.member.isNominata ? (stat.member.nominataRole || 'Qualificado') : 'N/A';
    
    const finalPctStr = formatPercent(stat.rawFinalPercentage, stat.hasConsideredEvents);
    const mandatoryFreqStr = formatPercent(stat.rawMandatoryFrequency, stat.hasConsideredEvents);
    const recoveredPctStr = stat.unjustifiedAbsences > 0 && stat.recoveredPresences > 0
      ? `+${formatPercent(stat.rawRecoveredPercentage)}`
      : '0%';

    return [
      `${index + 1}º`,
      stat.member.name,
      degreeLabel,
      nominataStr,
      roleStr,
      mandatoryFreqStr,
      recoveredPctStr,
      finalPctStr,
      zoneLabel,
      stat.mandatoryPresences.toString(),
      stat.unjustifiedAbsences.toString(),
      stat.justifiedAbsences.toString(),
      stat.applicableMandatoryEvents.toString(),
      stat.optionalPresences.toString(),
      stat.optionalUsed.toString(),
      stat.optionalExcess.toString()
    ];
  });

  const csvContent = [
    headers.join(';'), // Excel friendly delimiter
    ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Add UTF-8 BOM for Microsoft Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
