import React, { useState } from 'react';
import {
  Trophy,
  Search,
  Eye,
  Info,
  Layers,
  Award,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Member, Event, Attendance, MemberStats, EventCategory } from '../types';
import { calculateMemberStats, CATEGORY_LABELS, EXTRA_PARTICIPATION_WEIGHT } from '../utils/calculations';
import ProgressBar from '../components/ProgressBar';
import MemberProfileModal from '../components/MemberProfileModal';

interface PublicRankingPageProps {
  members: Member[];
  events: Event[];
  attendances: Attendance[];
}

export default function PublicRankingPage({
  members,
  events,
  attendances
}: PublicRankingPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [degreeFilter, setDegreeFilter] = useState<'all' | 'iniciatico' | 'demolay'>('all');
  const [selectedMemberModal, setSelectedMemberModal] = useState<Member | null>(null);

  // Filter only active members as required: "filtro apenas para membros ativos"
  const activeMembersOnly = members.filter(m => m.status === 'active');

  const computedList: MemberStats[] = activeMembersOnly.map(m =>
    calculateMemberStats(m, events, attendances, {
      category: categoryFilter === 'all' ? undefined : categoryFilter
    })
  );

  const filteredAndSortedList = computedList
    .filter(stat => {
      const matchesSearch = stat.member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDegree = degreeFilter === 'all' || stat.member.degree === degreeFilter;
      return matchesSearch && matchesDegree;
    })
    .sort((a, b) => {
      if (!a.hasConsideredEvents && b.hasConsideredEvents) return 1;
      if (a.hasConsideredEvents && !b.hasConsideredEvents) return -1;
      if (!a.hasConsideredEvents && !b.hasConsideredEvents) return a.member.name.localeCompare(b.member.name);

      if (b.finalPercentage !== a.finalPercentage) {
        return b.finalPercentage - a.finalPercentage;
      }
      if (b.mandatoryFrequency !== a.mandatoryFrequency) {
        return b.mandatoryFrequency - a.mandatoryFrequency;
      }
      if (b.requiredPresences !== a.requiredPresences) {
        return b.requiredPresences - a.requiredPresences;
      }
      if (b.extraParticipations !== a.extraParticipations) {
        return b.extraParticipations - a.extraParticipations;
      }
      return a.member.name.localeCompare(b.member.name);
    });

  const getTodayFormatted = () => {
    return new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Sleek Minimalist Public Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 py-6 px-4 md:px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center font-extrabold text-slate-900 text-base shadow-sm">
              DM
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-lg tracking-wider font-display text-white">
                PAINEL DE AVALIAÇÃO DEMOLAY
              </h1>
              <p className="text-slate-400 text-xs font-semibold">
                Gestão de Presença &amp; Classificação de Membros
              </p>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
              Última Atualização
            </span>
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50 text-slate-200">
              {getTodayFormatted()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Welcome and Institutional Subtitle Section */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-display flex items-center justify-center md:justify-start gap-2.5">
              <Trophy className="text-amber-500 h-8 w-8 animate-bounce-slow" />
              Classificação de Participação
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Confira abaixo o rank oficial de aproveitamento dos membros ativos do capítulo. Este índice traduz a assiduidade em rituais, comitês, filantropias e demais atividades do período corrente.
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 p-4.5 rounded-xl shrink-0 max-w-xs md:max-w-sm">
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
              <Layers className="h-4 w-4 text-indigo-650" />
              Critério da Porcentagem Final
            </h4>
            <p className="text-indigo-955 text-xs font-medium leading-normal">
              A porcentagem final considera presenças obrigatórias nas atividades do nosso Capítulo.
            </p>
          </div>
        </div>

        {/* Legend Panel & Filter Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Readonly Filters Block */}
          <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Pesquisar Membro
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Filtrar por Grau
                </label>
                <select
                  value={degreeFilter}
                  onChange={e => setDegreeFilter(e.target.value as 'all' | 'iniciatico' | 'demolay')}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="all">Todos os Graus</option>
                  <option value="iniciatico">Grau Iniciático</option>
                  <option value="demolay">Grau DeMolay</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Filtrar Categoria de Atividades
                </label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as EventCategory | 'all')}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="all">Todas as Categoria (Semestre)</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Zones Legend card */}
          <div className="lg:col-span-4 bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-center space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Legenda de Zonas
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs bg-slate-800/40 px-3 py-1.5 rounded border border-slate-850">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  DeMolay Exemplo
                </span>
                <strong className="text-emerald-400">&ge; 70% de Freq.</strong>
              </div>
              <div className="flex items-center justify-between text-xs bg-slate-800/40 px-3 py-1.5 rounded border border-slate-850">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  DeMolay em Alerta
                </span>
                <strong className="text-amber-400">60% - 70% de Freq.</strong>
              </div>
              <div className="flex items-center justify-between text-xs bg-slate-800/40 px-3 py-1.5 rounded border border-slate-850">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  DeMolay Não Exemplo
                </span>
                <strong className="text-rose-400">&lt; 60% de Freq.</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Classification Ranking Feed */}
        <div className="space-y-4">
          {filteredAndSortedList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Trophy className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="mt-4 font-bold text-slate-700">Nenhum membro ativo corresponde aos filtros selecionados</h4>
              <p className="text-xs text-slate-500 mt-1">Experimente buscar por outro nome ou remover o filtro de categoria.</p>
            </div>
          ) : (
            filteredAndSortedList.map((stat, idx) => {
              let borderClass = 'border-slate-205';
              let badgeBg = 'bg-slate-100 text-slate-700';

              if (stat.hasConsideredEvents) {
                if (stat.zone === 'green') {
                  borderClass = 'border-emerald-200 hover:border-emerald-350 bg-emerald-50/5';
                  if (idx < 3) badgeBg = 'bg-emerald-500 text-white border-emerald-450 font-black shadow-xs';
                } else if (stat.zone === 'yellow') {
                  borderClass = 'border-amber-200 hover:border-amber-350 bg-amber-50/5';
                  if (idx < 3) badgeBg = 'bg-amber-400 text-slate-900 border-amber-300 font-black shadow-xs';
                } else {
                  borderClass = 'border-rose-200 hover:border-rose-350 bg-rose-50/5';
                  if (idx < 3) badgeBg = 'bg-rose-500 text-white border-rose-450 font-black';
                }
              }

              return (
                <div
                  key={stat.member.id}
                  onClick={() => setSelectedMemberModal(stat.member)}
                  className={`bg-white p-5 rounded-xl border ${borderClass} shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:shadow-md transition duration-200 cursor-pointer group`}
                >
                  {/* Position & Details of Member */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <span className={`w-9 h-9 font-display text-sm border flex items-center justify-center shrink-0 rounded-full mt-1 ${badgeBg}`}>
                      {idx + 1}º
                    </span>

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-amber-500 transition-colors font-display">
                          {stat.member.name}
                        </h4>
                        <span className="text-[9px] font-bold uppercase text-slate-550 bg-slate-100 px-1.5 py-0.5 rounded">
                          {stat.member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                        </span>
                        {(stat.member.isNominata ?? false) && (
                          <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-55 px-1.5 py-0.5 rounded border border-amber-100">
                            {stat.member.nominataRole || 'Diretoria'}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          stat.zone === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                          stat.zone === 'yellow' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                          'bg-rose-50 text-rose-800 border-rose-100'
                        }`}>
                          {stat.zone === 'green' ? 'DeMolay Exemplo' : stat.zone === 'yellow' ? 'DeMolay em Alerta' : 'DeMolay Não Exemplo'}
                        </span>
                      </div>

                      {/* Readonly stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 p-3 rounded-lg bg-slate-50 border border-slate-150 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Porcentagem Final</span>
                          <strong className="text-slate-800 text-sm font-display">{stat.finalPercentage}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-450 block text-[9px] uppercase font-bold tracking-wider">Frequência Obrigatória</span>
                          <strong className="text-slate-700 text-sm">{stat.mandatoryFrequency}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Presenças Obrigatórias</span>
                          <span className="font-bold">
                            <span className="text-emerald-600">{stat.requiredPresences}</span>
                            <span className="text-slate-400"> / </span>
                            <span className="text-slate-700">{stat.requiredEventsConsidered}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Participações Extras (Plus)</span>
                          <strong className="text-indigo-650 font-bold">+{stat.extraParticipations} extras</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meter Progress Bar */}
                  <div className="w-full lg:w-52 shrink-0 flex flex-col justify-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-left lg:text-right">Aproveitamento</span>
                    <ProgressBar value={stat.finalPercentage} hasEvents={stat.hasConsideredEvents} showText={false} />
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 lg:justify-end lg:gap-3">
                      <span>Resultado: <strong>{stat.finalPercentage}%</strong></span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="self-end lg:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemberModal(stat.member);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg transition cursor-pointer"
                    >
                      <Eye className="h-4 w-4" /> Ver Detalhes
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </main>

      {/* Discrete Public Footer */}
      <footer className="no-print bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs shrink-0 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500">
            &copy; {new Date().getFullYear()} PAAD - Painel de Avaliação DeMolay. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="text-slate-400 hover:text-white underline transition font-medium tracking-tight text-[11px]"
            >
              Acesso administrativo
            </Link>
          </div>
        </div>
      </footer>

      {/* Profile detail modal */}
      {selectedMemberModal && (
        <MemberProfileModal
          member={selectedMemberModal}
          events={events}
          attendances={attendances}
          onClose={() => setSelectedMemberModal(null)}
        />
      )}

    </div>
  );
}
