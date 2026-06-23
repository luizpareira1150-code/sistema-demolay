import React, { useState } from 'react';
import {
  Trophy,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Award,
  Eye,
  Info
} from 'lucide-react';
import { Member, Event, Attendance, EventCategory, MemberStats } from '../types';
import { calculateMemberStats, CATEGORY_LABELS, EXTRA_PARTICIPATION_WEIGHT } from '../utils/calculations';
import ProgressBar from '../components/ProgressBar';
import { useManagementTerm } from '../contexts/ManagementTermContext';
import MemberProfileModal from '../components/MemberProfileModal';

interface RankingPageProps {
  members: Member[];
  events: Event[];
  attendances: Attendance[];
  onViewMember: (member: Member) => void;
}

export default function RankingPage({
  members,
  events,
  attendances,
  onViewMember
}: RankingPageProps) {
  const { activeTerm } = useManagementTerm();

  // Filter settings state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const isPeriodFiltering = !!(appliedStartDate && appliedEndDate);

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleApplyPeriod = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!draftStartDate || !draftEndDate) {
      setErrorMessage('Selecione uma data inicial e uma data final.');
      return;
    }

    if (draftStartDate > draftEndDate) {
      setErrorMessage('A data inicial não pode ser maior que a data final.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      try {
        const inPeriodEvents = events.filter(e => e.date >= draftStartDate && e.date <= draftEndDate);
        if (inPeriodEvents.length === 0) {
          setErrorMessage('Nenhum evento encontrado neste período.');
          setIsLoading(false);
          return;
        }

        setAppliedStartDate(draftStartDate);
        setAppliedEndDate(draftEndDate);
        setSuccessMessage('Período aplicado com sucesso.');
        setIsLoading(false);
      } catch (err) {
        setErrorMessage('Erro ao carregar dados por período.');
        setIsLoading(false);
      }
    }, 450);
  };

  const handleClearPeriod = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setDraftStartDate('');
    setDraftEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setSuccessMessage('Filtro de período limpo.');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const filteredBaseMembers = members.filter(m => {
    const isStatusMatch = showInactive ? true : m.status === 'active';
    if (!isStatusMatch) return false;
    if (isPeriodFiltering) return true;
    return m.managementTermId === activeTerm?.id;
  });

  const filteredBaseEvents = isPeriodFiltering
    ? events.filter(e => e.date >= appliedStartDate && e.date <= appliedEndDate)
    : events.filter(e => e.managementTermId === activeTerm?.id);

  const eventIdsInPeriod = new Set(filteredBaseEvents.map(e => e.id));

  const filteredBaseAttendances = isPeriodFiltering
    ? attendances.filter(a => eventIdsInPeriod.has(a.eventId))
    : attendances.filter(a => a.managementTermId === activeTerm?.id);

  // Compute stats list based on filters
  const computedList: MemberStats[] = filteredBaseMembers.map(m =>
    calculateMemberStats(m, filteredBaseEvents, filteredBaseAttendances, {
      startDate: isPeriodFiltering ? appliedStartDate : undefined,
      endDate: isPeriodFiltering ? appliedEndDate : undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter
    })
  );

  // Perform list searches and order by rate descending
  const filteredAndSortedList = computedList
    .filter(stat => {
      const matchesSearch = stat.member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesZone = zoneFilter === 'all' || (stat.hasConsideredEvents && stat.zone === zoneFilter);
      return matchesSearch && matchesZone;
    })
    // Sort descending based on multiple rules
    .sort((a, b) => {
      // Members without considered events go to bottom
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
    });

  return (
    <div className="space-y-6">
      
      {/* Visual Header suitable for projection in a meeting */}
      <div className="bg-slate-900 text-white rounded-xl py-6 px-6 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-xl font-bold font-display text-white flex items-center justify-center md:justify-start gap-2">
            <Trophy className="text-amber-400 h-6 w-6" />
            Classificação Quadrimestral do Capítulo
          </h3>
          <p className="text-slate-400 text-xs max-w-xl">
            Tabela ordinal de participação para amparo fraternal. Use filtros abaixo para analisar frequências específicas para comissões e reuniões ritualísticas.
          </p>
        </div>
        <div className="bg-slate-800 px-4 py-2 border border-slate-700/55 rounded-lg text-xs font-semibold text-slate-350 shrink-0 select-none">
          Critério de Classificação: <span className="text-emerald-400 font-bold">&gt;70% DeMolay Exemplo</span> &bull; <span className="text-amber-400 font-bold">60%-70% DeMolay em Alerta</span> &bull; <span className="text-rose-450 font-bold" style={{ color: '#fb7185' }}>&lt;60% DeMolay Não Exemplo</span>
        </div>
      </div>

      {/* Information Header on Visualization Mode */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className={`w-3 h-3 rounded-full ${isPeriodFiltering ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shrink-0`} />
          <div className="text-xs text-slate-700">
            <span className="text-slate-400 uppercase tracking-wider font-bold block text-[9px]">Modo de visualização</span>
            <span className="font-bold text-slate-900 text-sm">
              {isPeriodFiltering ? 'Período personalizado' : 'Gestão atual'}
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-700 text-center sm:text-right">
          <span className="text-slate-400 uppercase tracking-wider font-bold block text-[9px]">
            {isPeriodFiltering ? 'Período analisado' : 'Gestão ativa'}
          </span>
          <span className="font-mono font-black text-slate-950 text-sm">
            {isPeriodFiltering 
              ? `${formatDateBR(appliedStartDate)} a ${formatDateBR(appliedEndDate)}`
              : activeTerm?.name ? `Gestão ${activeTerm.name}` : 'Nenhuma gestão ativa'}
          </span>
        </div>
      </div>

      {/* Filters Area container */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Search & Category selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Search name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Buscar Irmão pelo Nome
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Ex: João Silva..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Categoria Atividades
            </label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as EventCategory | 'all')}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="all">Todas as Categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Zona Classificatória
            </label>
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value as 'all' | 'green' | 'yellow' | 'red')}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="all">Todas as Categorias de Freq.</option>
              <option value="green">DeMolay Exemplo (Acima de 70%)</option>
              <option value="yellow">DeMolay em Alerta (60% até 70%)</option>
              <option value="red">DeMolay Não Exemplo (Abaixo de 60%)</option>
            </select>
          </div>

        </div>

        {/* Date Ranges (Period search) */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Filtrar por período
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={draftStartDate}
                onChange={e => setDraftStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                Data Final
              </label>
              <input
                type="date"
                value={draftEndDate}
                onChange={e => setDraftEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium"
              />
            </div>
          </div>

          {errorMessage && (
            <div id="ranking-filter-error" className="bg-rose-50 border border-rose-200 text-rose-850 text-xs rounded-lg p-3 font-semibold">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div id="ranking-filter-success" className="bg-emerald-50 border border-emerald-200 text-emerald-850 text-xs rounded-lg p-3 font-semibold animate-pulse-once">
              {successMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 items-center">
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleApplyPeriod}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isLoading ? 'Aplicando período...' : 'Aplicar período'}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleClearPeriod}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg border border-slate-300 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                Limpar período
              </button>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 h-10 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-650 font-semibold">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={e => setShowInactive(e.target.checked)}
                  className="rounded border-slate-300 focus:ring-slate-900 h-4 w-4"
                />
                Mostrar Membros Inativos
              </label>

              {(searchTerm || categoryFilter !== 'all' || zoneFilter !== 'all' || draftStartDate || draftEndDate || appliedStartDate || appliedEndDate || showInactive) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setZoneFilter('all');
                    setDraftStartDate('');
                    setDraftEndDate('');
                    setAppliedStartDate('');
                    setAppliedEndDate('');
                    setShowInactive(false);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-[11px] font-bold text-red-650 hover:text-red-800 hover:underline cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Main Ranking visual cards */}
      <div className="space-y-4">
        {filteredAndSortedList.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <Trophy className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="mt-4 font-bold text-slate-700">Nenhum irmão corresponde aos filtros selecionados</h4>
            <p className="text-xs text-slate-550 mt-1">Experimente alargar o filtro de zonas, categoria ou datas.</p>
          </div>
        ) : (
          filteredAndSortedList.map((stat, idx) => {
            // High-impact styling per zone
            let rowBorder = 'border-slate-200';
            let positionBg = 'bg-slate-100 text-slate-700';

            if (stat.hasConsideredEvents) {
              if (stat.zone === 'green') {
                rowBorder = 'border-emerald-250 bg-emerald-50/10 hover:bg-emerald-50/25';
                if (idx < 3) positionBg = 'bg-emerald-500 text-white font-black border-emerald-400 shadow-sm';
              } else if (stat.zone === 'yellow') {
                rowBorder = 'border-amber-250 bg-amber-50/10 hover:bg-amber-50/25';
                if (idx < 3) positionBg = 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-sm';
              } else {
                rowBorder = 'border-rose-200 bg-rose-50/5 hover:bg-rose-50/15';
                if (idx < 3) positionBg = 'bg-rose-500 text-white font-black border-rose-400 shadow-sm';
              }
            }

            return (
              <div
                key={stat.member.id}
                onClick={() => setSelectedMember(stat.member)}
                className={`bg-white p-5 rounded-xl border ${rowBorder} shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 hover:shadow-md transition duration-200 cursor-pointer group`}
              >
                
                {/* Ranking place & Member details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <span className={`w-8.5 h-8.5 font-display text-sm border flex items-center justify-center shrink-0 rounded-full mt-1 ${positionBg}`}>
                    {idx + 1}º
                  </span>
 
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-slate-950 font-display">
                        {stat.member.name}
                      </h4>
                      <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {stat.member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                      </span>
                      {(stat.member.isNominata ?? false) && (
                        <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          {stat.member.nominataRole || 'Nominata'}
                        </span>
                      )}
                      {stat.member.isNominataIniciacao && (
                        <span className="text-[9px] font-bold uppercase text-indigo-850 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {stat.member.nominataIniciacaoRole || 'Comissão Iniciação'}
                        </span>
                      )}
                      {stat.member.isNominataElevacao && (
                        <span className="text-[9px] font-bold uppercase text-purple-850 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                          {stat.member.nominataElevacaoRole || 'Comissão Elevação'}
                        </span>
                      )}
                      {stat.member.status === 'inactive' && (
                        <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          Inativo
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        stat.zone === 'green' ? 'bg-emerald-100/70 text-emerald-850 border border-emerald-250' : 
                        stat.zone === 'yellow' ? 'bg-amber-100/70 text-amber-850 border border-amber-250' : 
                        'bg-red-100/70 text-red-850 border border-red-250'
                      }`}>
                        {stat.zone === 'green' ? 'DeMolay Exemplo' : stat.zone === 'yellow' ? 'DeMolay em Alerta' : 'DeMolay Não Exemplo'}
                      </span>
                    </div>
 
                    {/* Numeric and percentage calculations breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mt-2.5 p-3 rounded-lg bg-slate-50/60 border border-slate-150/75 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-450 block text-[9px] uppercase font-bold tracking-wider">Porcentagem Final</span>
                        <strong className="text-slate-800 text-sm font-display">{stat.finalPercentage}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-450 block text-[9px] uppercase font-bold tracking-wider">Frequência Obrigatória</span>
                        <strong className="text-slate-700 text-sm">{stat.mandatoryFrequency}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-450 block text-[9px] uppercase font-bold tracking-wider">Obrigatoriedades (P / F / J)</span>
                        <span className="font-bold">
                          <span className="text-emerald-600">{stat.requiredPresences}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-rose-500">{stat.requiredAbsences}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-amber-500">{stat.requiredJustifications}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block">de {stat.requiredEventsConsidered} consideradas</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block text-[9px] uppercase font-bold tracking-wider">Participações Extras (Plus)</span>
                        <strong className="text-indigo-650">{stat.extraParticipations} presenças</strong>
                        <span className="text-[9px] text-slate-450 block">
                          +{stat.extraComputedPoints} pts (Peso: {EXTRA_PARTICIPATION_WEIGHT})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Meter progress bar using finalPercentage (attendanceRate maps to finalized percentage) */}
                <div className="w-full xl:w-56 shrink-0 flex flex-col justify-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-left xl:text-right">Progresso (Porcentagem Final)</span>
                  <ProgressBar value={stat.finalPercentage} hasEvents={stat.hasConsideredEvents} showText={false} />
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 xl:justify-end xl:gap-4">
                    <span>Final: <strong className="text-slate-800">{stat.finalPercentage}%</strong></span>
                    <span>Freq. Obr: <strong className="text-slate-800">{stat.mandatoryFrequency}%</strong></span>
                  </div>
                </div>
 
                {/* Actions button */}
                <div className="self-end xl:self-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMember(stat.member);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <Eye className="h-4 w-4" /> Detalhes
                  </button>
                </div>
 
              </div>
            );
          })
        )}
      </div>

      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          events={filteredBaseEvents}
          attendances={filteredBaseAttendances}
          onClose={() => setSelectedMember(null)}
        />
      )}
 
    </div>
  );
}
