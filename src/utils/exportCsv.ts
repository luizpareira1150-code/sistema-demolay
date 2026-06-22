import { MemberStats } from '../types';

export function exportToCSV(statsList: MemberStats[], filename = 'classificacao_demolay.csv'): void {
  // Brazilian Portuguese header names matching requirements
  const headers = [
    'Posição',
    'Nome',
    'Grau',
    'Nominata/Diretoria?',
    'Cargo',
    'Porcentagem Final',
    'Frequência Obrigatória',
    'Zona',
    'Presenças Obrigatórias',
    'Ausências Obrigatórias',
    'Justificativas Obrigatórias',
    'Eventos Obrigatórios Considerados',
    'Participações Extras',
    'Extras Computados',
    'Peso do Plus'
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
    const finalPctStr = stat.hasConsideredEvents ? `${stat.finalPercentage}%` : 'S/E';
    const mandatoryFreqStr = stat.hasConsideredEvents ? `${stat.mandatoryFrequency}%` : 'S/E';

    return [
      `${index + 1}º`,
      stat.member.name,
      degreeLabel,
      nominataStr,
      roleStr,
      finalPctStr,
      mandatoryFreqStr,
      zoneLabel,
      stat.requiredPresences.toString(),
      stat.requiredAbsences.toString(),
      stat.requiredJustifications.toString(),
      stat.requiredEventsConsidered.toString(),
      stat.extraParticipations.toString(),
      stat.extraComputedPoints.toString(),
      '0.5' // Peso do plus
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
