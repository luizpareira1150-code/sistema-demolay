import React from 'react';
import {
  Users,
  Calendar,
  Percent,
  TrendingUp,
  AlertTriangle,
  Award,
  ArrowRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Member, Event, Attendance, MemberStats } from '../types';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import { calculateMemberStats, calculateChapterAverage, calculateChapterMandatoryFrequencyAverage, EXTRA_PARTICIPATION_WEIGHT } from '../utils/calculations';

interface DashboardPageProps {
  members: Member[];
  events: Event[];
  attendances: Attendance[];
  onNavigateToTab: (tab: string) => void;
  onViewMember: (member: Member) => void;
}

export default function DashboardPage({
  members,
  events,
  attendances,
  onNavigateToTab,
  onViewMember
}: DashboardPageProps) {
  // Filter active members
  const activeMembers = members.filter(m => m.status === 'active');
  const inactiveMembers = members.filter(m => m.status === 'inactive');

  // Compute stats for all active members
  const statsList: MemberStats[] = activeMembers.map(m =>
    calculateMemberStats(m, events, attendances)
  );

  // Split in zones
  const greenMembers = statsList.filter(s => s.hasConsideredEvents && s.zone === 'green');
  const yellowMembers = statsList.filter(s => s.hasConsideredEvents && s.zone === 'yellow');
  const redMembers = statsList.filter(s => s.hasConsideredEvents && s.zone === 'red');
  const noEventsMembers = statsList.filter(s => !s.hasConsideredEvents);

  // Group count for totals
  const totalActiveCount = activeMembers.length;
  const totalEventsCount = events.length;
  const chapterAverage = calculateChapterAverage(members, events, attendances);
  const chapterMandatoryAverage = calculateChapterMandatoryFrequencyAverage(members, events, attendances);

  // Compute overall extra metrics totals for dashboard
  const totalExtraParticipations = statsList.reduce((acc, curr) => acc + curr.extraParticipations, 0);
  const totalExtraComputedPoints = statsList.reduce((acc, curr) => acc + curr.extraComputedPoints, 0);

  // Ranking Top 5 (sort descending using strict multi-criteria rules)
  const topMembers = [...statsList]
    .sort((a, b) => {
      if (!a.hasConsideredEvents && b.hasConsideredEvents) return 1;
      if (a.hasConsideredEvents && !b.hasConsideredEvents) return -1;
      if (!a.hasConsideredEvents && !b.hasConsideredEvents) return a.member.name.localeCompare(b.member.name);
      
      // Rule 1: maior porcentagem final
      if (b.finalPercentage !== a.finalPercentage) {
        return b.finalPercentage - a.finalPercentage;
      }
      // Rule 2: maior frequência obrigatória
      if (b.mandatoryFrequency !== a.mandatoryFrequency) {
        return b.mandatoryFrequency - a.mandatoryFrequency;
      }
      // Rule 3: maior número de presenças obrigatórias
      if (b.requiredPresences !== a.requiredPresences) {
        return b.requiredPresences - a.requiredPresences;
      }
      // Rule 4: maior número de participações extras
      if (b.extraParticipations !== a.extraParticipations) {
        return b.extraParticipations - a.extraParticipations;
      }
      // Rule 5: ordem alfabética
      return a.member.name.localeCompare(b.member.name);
    })
    .slice(0, 5);

  // Highlight members in the Red Zone
  const redZoneList = statsList.filter(s => s.hasConsideredEvents && s.zone === 'red');

  // Distribution chart details
  const totalStatsWithEvents = greenMembers.length + yellowMembers.length + redMembers.length;
  const greenPercent = totalStatsWithEvents ? Math.round((greenMembers.length / totalStatsWithEvents) * 100) : 0;
  const yellowPercent = totalStatsWithEvents ? Math.round((yellowMembers.length / totalStatsWithEvents) * 100) : 0;
  const redPercent = totalStatsWithEvents ? Math.round((redMembers.length / totalStatsWithEvents) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* 1. Header welcome */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-md border border-slate-800 bg-radial from-slate-900 to-slate-950 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2 justify-center md:justify-start">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            Capítulo Oficial DeMolay
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Bem-vindo ao Painel de Avaliação de presença e envolvimento. Acompanhe abaixo o resumo das atividades rituais, comissões coletivas e engajamento geral.
          </p>
        </div>
        <div className="flex bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frequência Geral</p>
            <p className="text-3xl font-black text-amber-400 font-display mt-0.5">{chapterAverage}%</p>
          </div>
        </div>
      </div>

      {/* 2. Visual Stat Cards Grid (4-column layout matching Sleek Interface) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Membros Ativos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Membros Ativos</p>
            <h3 className="text-3xl font-extrabold mt-2 text-slate-900 font-display">{totalActiveCount}</h3>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span>Inativos: <strong>{inactiveMembers.length}</strong></span>
            <span>Eventos Realizados: <strong>{totalEventsCount}</strong></span>
          </div>
        </div>

        {/* Card 2: Porcentagem Final Média */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Porcentagem Final Média</p>
            <h3 className="text-3xl font-extrabold mt-2 text-slate-900 font-display">{chapterAverage}%</h3>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span>Freq. Obrigatória Média:</span>
              <strong className="text-slate-700">{chapterMandatoryAverage}%</strong>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 mt-1">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${chapterAverage}%` }} />
            </div>
          </div>
        </div>

        {/* Card 3: Participações Extras (Plus) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atividades Extras (Plus)</p>
            <h3 className="text-3xl font-extrabold mt-2 text-indigo-650 font-display">+{totalExtraParticipations}</h3>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500">
            <span>Extras Computados:</span>
            <span className="text-indigo-650 font-black">+{totalExtraComputedPoints} pts (Peso: {EXTRA_PARTICIPATION_WEIGHT})</span>
          </div>
        </div>

        {/* Card 4: Distribuição de Zonas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribuição de Zonas</p>
            {/* Relative flex colored tracks */}
            <div className="flex gap-1 mt-3">
              <div 
                className="h-4 bg-emerald-500 rounded-xs transition-all hover:opacity-85 cursor-pointer flex items-center justify-center text-[8px] font-black text-white" 
                style={{ flexGrow: greenMembers.length || 1 }}
                title={`Zona Verde: ${greenMembers.length} membros`}
              >
                {greenMembers.length > 0 && greenMembers.length}
              </div>
              <div 
                className="h-4 bg-amber-400 rounded-xs transition-all hover:opacity-85 cursor-pointer flex items-center justify-center text-[8px] font-black text-slate-900" 
                style={{ flexGrow: yellowMembers.length || 1 }}
                title={`Zona Amarela: ${yellowMembers.length} membros`}
              >
                {yellowMembers.length > 0 && yellowMembers.length}
              </div>
              <div 
                className="h-4 bg-rose-500 rounded-xs transition-all hover:opacity-85 cursor-pointer flex items-center justify-center text-[8px] font-black text-white" 
                style={{ flexGrow: redMembers.length || 1 }}
                title={`Zona Vermelha: ${redMembers.length} membros`}
              >
                {redMembers.length > 0 && redMembers.length}
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] font-bold">
            <span className="text-emerald-600">Verde: {greenMembers.length}</span>
            <span className="text-amber-600">Amarela: {yellowMembers.length}</span>
            <span className="text-rose-600">Vermelha: {redMembers.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Detailed Ranking and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Top 5 Member Ranking & Distribution Ratio */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Melhores Históricos (Rankings Top 5)
              </h3>
              <button
                onClick={() => onNavigateToTab('classificacao')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ver tudo <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-4">
              {topMembers.length === 0 ? (
                <p className="text-slate-550 text-sm text-center py-6">Nenhum membro ativo cadastrado.</p>
              ) : (
                topMembers.map((stat, idx) => {
                  const placeColors = [
                    'bg-amber-100 text-amber-800 border-amber-300 font-bold',
                    'bg-slate-100 text-slate-800 border-slate-300 font-bold',
                    'bg-orange-100 text-orange-800 border-orange-300 font-bold',
                    'bg-slate-50 text-slate-650 border-slate-200',
                    'bg-slate-50 text-slate-650 border-slate-200'
                  ];
                  return (
                    <div
                      key={stat.member.id}
                      onClick={() => onViewMember(stat.member)}
                      className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6.5 h-6.5 flex items-center justify-center text-xs rounded-full border shrink-0 ${placeColors[idx] || 'bg-slate-50'}`}>
                          {idx + 1}º
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-950 flex items-center gap-1.5">
                            {stat.member.name}
                            <span className="text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-500 font-bold shrink-0">
                              {stat.member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-550">
                            P: <strong className="text-emerald-600">{stat.requiredPresences}</strong> &bull; F: <strong className="text-rose-500">{stat.requiredAbsences}</strong> &bull; J: <strong className="text-amber-500">{stat.requiredJustifications}</strong>
                            {stat.extraParticipations > 0 && <span className="text-indigo-650 font-semibold"> (+{stat.extraParticipations} Plus: +{stat.extraComputedPoints}pts)</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-sm font-black ${
                          stat.zone === 'green' ? 'text-emerald-600' : stat.zone === 'yellow' ? 'text-amber-550' : 'text-rose-500'
                        }`}>
                          {stat.hasConsideredEvents ? `${stat.finalPercentage}%` : 'S/E'}
                        </span>
                        <p className="text-[9px] font-bold text-slate-400">Freq. Obr: {stat.mandatoryFrequency}%</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Graphical Zone Distribution Meter */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Distribuição Relativa por Zona
            </h3>
            <p className="text-xs text-slate-500">Visualização de como o Capítulo está distribuído para tomada de decisões pedagógicas.</p>
            
            <div className="space-y-3.5 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Zona Verde ({greenMembers.length} membros)
                  </span>
                  <span>{greenPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${greenPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Zona Amarela ({yellowMembers.length} membros)
                  </span>
                  <span>{yellowPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${yellowPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-slate-705">
                  <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Zona Vermelha ({redMembers.length} membros)
                  </span>
                  <span>{redPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${redPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Red Zone Attention List (Acompanhamento) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Membros em Acompanhamento (Zona Vermelha)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Frequência de participação abaixo de 60%. Recomenda-se orientação e acompanhamento fraternal.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[460px] pr-1">
            {redZoneList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-250 rounded-lg bg-slate-50 h-56 text-center">
                <ShieldCheck className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-700">Ótimo trabalho coletivo!</p>
                <p className="text-xs text-slate-550 mt-1">Nenhum membro ativo está na zona vermelha no momento.</p>
              </div>
            ) : (
              redZoneList.map(stat => (
                <div
                  key={stat.member.id}
                  onClick={() => onViewMember(stat.member)}
                  className="flex flex-col p-4 rounded-xl border border-rose-100 bg-rose-50/25 hover:bg-rose-50/50 transition cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-slate-950 flex flex-wrap items-center gap-1.5">
                        {stat.member.name}
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold uppercase tracking-wider scale-95 origin-left shadow-2xs">
                          {stat.member.degree === 'demolay' ? 'DeMolay' : 'Iniciático'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Membro desde: {new Date(stat.member.joinedAt + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="text-rose-600 font-black text-sm">
                      {stat.attendanceRate}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 mt-3 pt-2.5 border-t border-rose-100/50 text-[11px] text-slate-600 font-medium">
                    <div>Presenças: <strong className="text-slate-900">{stat.presents}</strong></div>
                    <div>Ausências: <strong className="text-slate-900">{stat.absents}</strong></div>
                    <div>Justificativas: <strong className="text-slate-900">{stat.justified}</strong></div>
                  </div>

                  {stat.member.notes && (
                    <div className="mt-2 bg-white/60 text-[10px] text-slate-550 italic p-1.5 rounded border border-rose-100/30 truncate">
                      Obs: {stat.member.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
