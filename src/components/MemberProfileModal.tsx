import React from 'react';
import { X, Award, CheckCircle, XCircle, AlertCircle, Info, Calendar, Clock } from 'lucide-react';
import { Member, Event, Attendance, EventCategory } from '../types';
import { calculateMemberStats, getMemberEligibility, CATEGORY_LABELS, formatPercent } from '../utils/calculations';
import ProgressBar from './ProgressBar';

interface MemberProfileModalProps {
  member: Member;
  events: Event[];
  attendances: Attendance[];
  onClose: () => void;
}

export default function MemberProfileModal({
  member,
  events,
  attendances,
  onClose
}: MemberProfileModalProps) {
  const [activeTooltipEvent, setActiveTooltipEvent] = React.useState<Event | null>(null);

  // 1. Calculate general stats
  const generalStats = calculateMemberStats(member, events, attendances);

  // 2. Calculate stats by each category
  const categories: EventCategory[] = [
    'ritualistica',
    'burocratica',
    'filantropia',
    'limpeza',
    'ensaio_iniciacao',
    'ensaio_elevacao',
    'outros'
  ];
  const categoryStats = categories.map(cat => {
    const stats = calculateMemberStats(member, events, attendances, { category: cat });
    return {
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      stats
    };
  });

  // 3. Complete attendance history
  const finalizedEvents = events.filter(e =>
    attendances.some(a => a.eventId === e.id)
  );

  const history = finalizedEvents
    .map(event => {
      const attendance = attendances.find(a => a.eventId === event.id && a.memberId === member.id);
      return {
        event,
        status: attendance ? attendance.status : 'absent', // Treat missing as absent
        note: attendance ? attendance.note : ''
      };
    })
    .sort((a, b) => b.event.date.localeCompare(a.event.date));

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh] animate-fade-in">
        
        {/* Header Block with Member overview */}
        <div className="bg-slate-950 text-white p-6 relative shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-slate-800 border-2 border-amber-500 rounded-full flex items-center justify-center font-black font-display text-xl text-amber-500">
                {member.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black font-display tracking-tight text-white">{member.name}</h3>
                  {member.status === 'active' ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      Ativo
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                    {member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                  </span>
                  {(member.isNominata ?? false) && (
                    <span className="bg-amber-400/10 text-amber-300 border border-amber-450/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {member.nominataRole || 'Nominata'}
                    </span>
                  )}
                  <span>&bull;</span>
                  <span>Admitido em: {new Date(member.joinedAt + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  <span>&bull;</span>
                  <span className="text-amber-400">Data de início da avaliação: {new Date((member.evaluationStartDate || member.joinedAt || '').split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5.5 w-5.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Contents info */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General progress banner */}
          <div className="flex flex-col gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center bg-slate-100/50 p-1 px-2 rounded-md">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Porcentagem Final (Principal)
                </span>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                  generalStats.zone === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                  generalStats.zone === 'yellow' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                  'bg-rose-50 text-rose-800 border-rose-100'
                }`}>
                  {generalStats.zone === 'green' ? 'DeMolay Exemplo' : generalStats.zone === 'yellow' ? 'DeMolay em Alerta' : 'DeMolay Não Exemplo'}
                </span>
              </div>
              <ProgressBar value={generalStats.finalPercentage} hasEvents={generalStats.hasConsideredEvents} />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Presença Obrigatória:</span>
                  <strong className="text-slate-800 text-sm font-display">
                    {formatPercent(generalStats.rawMandatoryFrequency, generalStats.hasConsideredEvents)}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Recuperação por Opcionais:</span>
                  <strong className="text-indigo-600 text-sm font-display">
                    {generalStats.unjustifiedAbsences > 0 && generalStats.recoveredPresences > 0
                      ? `+${formatPercent(generalStats.rawRecoveredPercentage)}`
                      : '0%'}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Frequência Final:</span>
                  <strong className="text-emerald-700 text-sm font-display">
                    {formatPercent(generalStats.rawFinalPercentage, generalStats.hasConsideredEvents)}
                  </strong>
                </div>
              </div>

              {/* Atividades Opcionais e Faltas detailed breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
                <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 text-center">
                  <span className="text-indigo-400 block text-[9px] uppercase font-bold">Atividades Opcionais</span>
                  <strong className="text-indigo-900 text-sm">{generalStats.optionalPresences}</strong>
                </div>
                <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 text-center">
                  <span className="text-indigo-400 block text-[9px] uppercase font-bold">Opcionais Utilizadas</span>
                  <strong className="text-indigo-900 text-sm">{generalStats.optionalUsed}</strong>
                </div>
                <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 text-center">
                  <span className="text-indigo-400 block text-[9px] uppercase font-bold">Opcionais Excedentes</span>
                  <strong className="text-indigo-900 text-sm">{generalStats.optionalExcess}</strong>
                </div>
                <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100 text-center">
                  <span className="text-amber-500 block text-[9px] uppercase font-bold">Faltas Justificadas</span>
                  <strong className="text-amber-900 text-sm">{generalStats.justifiedAbsences}</strong>
                </div>
                <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-100 text-center col-span-2 sm:col-span-1">
                  <span className="text-rose-400 block text-[9px] uppercase font-bold">Faltas Não Justificadas</span>
                  <strong className="text-rose-900 text-sm">{generalStats.unjustifiedAbsences}</strong>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-4 text-center text-xs border-t border-slate-200 pt-3">
              <div className="flex flex-col items-center px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Obrigações Aplicáveis</p>
                <p className="text-lg font-black text-slate-600 mt-1">{generalStats.applicableMandatoryEvents}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Presenças Obrigatórias</p>
                <p className="text-lg font-black text-emerald-600 mt-1">{generalStats.mandatoryPresences}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Faltas Não Justificadas (U)</p>
                <p className="text-lg font-black text-rose-600 mt-1">{generalStats.unjustifiedAbsences}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Faltas Justificadas</p>
                <p className="text-lg font-black text-amber-500 mt-1">{generalStats.justifiedAbsences}</p>
              </div>
            </div>
          </div>

          {/* Categories Grid Split block */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-amber-500" />
              Métricas por Categorias de Atividades (Soma de Percentuais)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {categoryStats.map(({ category, label, stats }) => {
                let badgeColor = 'emerald';
                if (stats.zone === 'yellow') badgeColor = 'amber';
                if (stats.zone === 'red') badgeColor = 'rose';

                return (
                  <div key={category} className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-xs space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-850 truncate leading-tight mb-2 uppercase tracking-wide text-[11px] border-b border-slate-100 pb-1">
                        {label}
                      </p>
                      
                      {stats.hasConsideredEvents ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={`text-${badgeColor === 'emerald' ? 'emerald-600' : badgeColor === 'amber' ? 'amber-500' : 'rose-600'} uppercase text-[9px] font-bold`}>
                              {stats.zone === 'green' ? 'DeMolay Exemplo' : stats.zone === 'yellow' ? 'DeMolay em Alerta' : 'DeMolay Não Exemplo'}
                            </span>
                            <span className="text-slate-800">{stats.attendanceRate}%</span>
                          </div>
                          <div className="h-1.5 bg-rose-500 rounded-full border border-slate-200/55 overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${stats.attendanceRate}%` }}
                            />
                            <div
                              className="h-full bg-rose-500"
                              style={{ width: `${100 - stats.attendanceRate}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold h-4">
                            <span className="text-slate-400 italic text-[9px] font-bold uppercase">Sem obrigatoriedade</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full border border-slate-200/55" />
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] space-y-1 mt-2.5 bg-slate-50 p-2 rounded-lg border border-slate-150 text-left">
                      <div className="flex justify-between items-center text-slate-650 font-semibold">
                        <span>Presenças:</span>
                        <span className="font-bold text-slate-800">
                          {stats.presents}
                          {stats.extraParticipations > 0 && (
                            <span className="text-indigo-650 font-extrabold ml-1" title="Presenças extra (atividades opcionais)">
                              (+{stats.extraParticipations})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-550">
                        <span>Faltas:</span>
                        <span className="font-bold text-rose-600">{stats.absents}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-550 border-t border-slate-200/60 pt-1 mt-1">
                        <span>Justificadas:</span>
                        <span className="font-bold text-amber-500">{stats.justified}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical attendance table logs */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-slate-500" />
              Histórico Integral de Participação e Aplicabilidade
            </h4>

            {history.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                Nenhum evento avaliado arquivado no sistema para esse membro no momento.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl shadow-xs bg-white overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[10px] rounded-t-xl">
                    <tr>
                      <th className="px-4 py-2.5">Atividade</th>
                      <th className="px-4 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Categoria</th>
                      <th className="px-4 py-2.5 text-center">Relevância</th>
                      <th className="px-4 py-2.5 text-center">Registro</th>
                      <th className="px-4 py-2.5">Notas / Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {history.map(({ event, status, note }) => {
                      let statusBadge = '';
                      if (status === 'present') {
                        statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                      } else if (status === 'absent') {
                        statusBadge = 'bg-rose-50 text-rose-800 border-rose-100';
                      } else {
                        statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                      }

                      const statusLabels = {
                        present: 'Presente',
                        absent: 'Falta',
                        justified: 'Justificado'
                      };

                      const eligibility = getMemberEligibility(member, event);
                      let eligibilityBadge = null;
                      if (eligibility === 'required') {
                        eligibilityBadge = (
                          <span className="bg-blue-50 text-blue-800 border border-blue-100 px-2 py-0.5 rounded text-[9px] uppercase font-bold shrink-0">
                            Obrigatório
                          </span>
                        );
                      } else if (eligibility === 'optional') {
                        eligibilityBadge = (
                          <span className="bg-amber-50 text-amber-850 border border-amber-100 px-2 py-0.5 rounded text-[9px] uppercase font-bold shrink-0">
                            Extra / Opcional
                          </span>
                        );
                      } else {
                        eligibilityBadge = (
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] uppercase font-bold shrink-0">
                            Não Aplicável
                          </span>
                        );
                      }

                      return (
                        <tr key={event.id} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3 font-semibold text-slate-800">{event.title}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {event.category === 'outros' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltipEvent(activeTooltipEvent?.id === event.id ? null : event);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-bold underline decoration-dotted cursor-pointer flex items-center gap-1 focus:outline-none bg-blue-50 hover:bg-blue-100/80 px-2 py-0.5 rounded-md transition-colors"
                                title="Clique para ver detalhes desta atividade"
                              >
                                <span>Outros</span>
                                <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                              </button>
                            ) : (
                              CATEGORY_LABELS[event.category] || event.category
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {eligibilityBadge}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${statusBadge}`}>
                              {statusLabels[status] || status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 italic max-w-[170px] whitespace-normal">
                            {eligibility === 'optional' && status === 'present' ? (
                              <div className="text-indigo-650 font-bold text-[10px]">
                                Participação opcional registrada (+0,25 crédito opcional)
                                {note ? <span className="text-slate-400 block font-normal text-[9px]">Obs: {note}</span> : null}
                              </div>
                            ) : (
                              note || '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {member.notes && (
            <div className="bg-yellow-50/40 border-l-4 border-amber-400 p-4 rounded-r-lg">
              <span className="text-xs font-bold text-slate-705 uppercase tracking-wide block">Observações do Cadastro:</span>
              <p className="text-xs text-slate-600 mt-1 italic font-medium">{member.notes}</p>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="bg-slate-50 border-t border-slate-150 p-4 flex justify-end shrink-0 select-none">
          <button
            onClick={onClose}
            className="px-5 py-2 hover:bg-slate-205 border border-slate-300 text-slate-755 font-semibold bg-white rounded-lg text-sm transition cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </div>

      {/* Custom Activity Detail Card Popup */}
      {activeTooltipEvent && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-fade-in"
          onClick={() => setActiveTooltipEvent(null)}
        >
          <div
            className="bg-slate-950 text-white rounded-2xl p-5 shadow-2xl max-w-sm w-full border border-slate-800 space-y-3.5 relative text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="font-extrabold text-blue-400 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                <Info className="h-4 w-4 text-blue-400" /> Atividade Personalizada
              </div>
              <button
                type="button"
                onClick={() => setActiveTooltipEvent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Título do Evento</span>
                <p className="font-bold text-white text-sm leading-snug">{activeTooltipEvent.title}</p>
              </div>

              <div className="flex items-center gap-2 text-slate-300 text-[11px] font-medium bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                <span>Data: {new Date(activeTooltipEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Descrição / Detalhes</span>
                {activeTooltipEvent.description ? (
                  <p className="text-slate-200 font-normal leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {activeTooltipEvent.description}
                  </p>
                ) : (
                  <p className="text-slate-500 italic text-xs bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                    Nenhuma descrição adicional foi registrada para esta atividade.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTooltipEvent(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-xl transition text-xs cursor-pointer text-center"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
