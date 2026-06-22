import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { Member, Event, Attendance, EventCategory, MemberStats } from '../types';
import { calculateMemberStats, calculateChapterAverage, CATEGORY_LABELS } from '../utils/calculations';
import { exportToCSV } from '../utils/exportCsv';

interface ReportsPageProps {
  members: Member[];
  events: Event[];
  attendances: Attendance[];
}

export default function ReportsPage({ members, events, attendances }: ReportsPageProps) {
  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Calculate stats for active members
  const activeMembers = members.filter(m => m.status === 'active');
  const computedList: MemberStats[] = activeMembers.map(m =>
    calculateMemberStats(m, events, attendances, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: categoryFilter
    })
  );

  // 2. Perform filters
  const filteredList = computedList
    .filter(stat => {
      const matchesZone = zoneFilter === 'all' || (stat.hasConsideredEvents && stat.zone === zoneFilter);
      return matchesZone;
    })
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
    });

  // Calculate Chapter stats within filters
  const selectedEvents = events.filter(e => {
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesStart = !startDate || e.date >= startDate;
    const matchesEnd = !endDate || e.date <= endDate;
    return matchesCategory && matchesStart && matchesEnd;
  });

  const activeFinalizedEventsCount = selectedEvents.filter(e =>
    attendances.some(a => a.eventId === e.id)
  ).length;

  // Distribution on the filtered set
  const greenCount = filteredList.filter(s => s.hasConsideredEvents && s.zone === 'green').length;
  const yellowCount = filteredList.filter(s => s.hasConsideredEvents && s.zone === 'yellow').length;
  const redCount = filteredList.filter(s => s.hasConsideredEvents && s.zone === 'red').length;
  const nullCount = filteredList.filter(s => !s.hasConsideredEvents).length;

  // Export Trigger
  const handleExport = () => {
    const filename = `relatorio_demolay_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filteredList, filename);
  };

  // Print Trigger
  const handlePrint = () => {
    window.print();
  };

  const getZoneLabel = (zone: 'green' | 'yellow' | 'red' | 'none') => {
    switch (zone) {
      case 'green': return 'Verde';
      case 'yellow': return 'Amarela';
      case 'red': return 'Vermelha';
      default: return 'Sem dados';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Printable-Only header (hidden on screen) */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-black font-display uppercase tracking-wide text-slate-950">
          Relatório de Avaliação DeMolay
        </h1>
        <p className="text-sm font-medium text-slate-700 mt-1">
          Capítulo da Ordem DeMolay &bull; Registro de Frequência e Engajamento
        </p>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Gerado em: {new Date().toLocaleString('pt-BR')}
        </p>
        
        {/* Filters status info during printing */}
        <div className="mt-4 grid grid-cols-2 text-left text-xs gap-2 pt-3 border-t border-dashed border-slate-300">
          <div>
            <strong>Categoria analisada:</strong> {categoryFilter === 'all' ? 'Todas' : CATEGORY_LABELS[categoryFilter]}
          </div>
          <div>
            <strong>Filtro de Zona:</strong> {zoneFilter === 'all' ? 'Todas' : getZoneLabel(zoneFilter)}
          </div>
          {startDate && (
            <div>
              <strong>Período analisado:</strong> {new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {endDate ? new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
            </div>
          )}
        </div>
      </div>

      {/* 1. Filter configuration box */}
      <div className="no-print bg-white p-5 rounded-xl border border-slate-205 shadow-xs space-y-4">
        <h4 className="text-sm font-bold font-display text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
          <Layers className="h-4.5 w-4.5 text-slate-400" />
          Filtros de Consolidação dos Relatórios
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

          {/* Zone filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Filtro de Zona
            </label>
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value as 'all' | 'green' | 'yellow' | 'red')}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="all">Todas as Zonas</option>
              <option value="green">Apenas Zona Verde</option>
              <option value="yellow">Apenas Zona Amarela</option>
              <option value="red">Apenas Zona Vermelha</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Início Período
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Término Período
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
          {(startDate || endDate || categoryFilter !== 'all' || zoneFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setZoneFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 border border-slate-300 text-slate-650 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Resetar Filtros
            </button>
          )}

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 hover:bg-slate-105 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white shadow-xs transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Exportar planilha (CSV)
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 border border-transparent rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-400" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* 2. Chapter KPI Summary Block */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-sm space-y-4 print-container print:bg-white print:text-black print:border-slate-200">
        <h3 className="text-base font-bold font-display text-white print:text-slate-905 flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          Consolidado Geral de Resultados
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
          <div className="border-l-4 border-amber-500 pl-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membros Avaliados</p>
            <p className="text-xl font-extrabold text-slate-100 print:text-slate-900 mt-0.5">{filteredList.length}</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Atividades Analisadas</p>
            <p className="text-xl font-extrabold text-slate-100 print:text-slate-900 mt-0.5">{activeFinalizedEventsCount}</p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Irmãos na Zona Verde</p>
            <p className="text-xl font-extrabold text-slate-100 print:text-slate-900 mt-0.5">{greenCount}</p>
          </div>

          <div className="border-l-4 border-rose-500 pl-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Irmãos na Zona Vermelha</p>
            <p className="text-xl font-extrabold text-slate-100 print:text-slate-900 mt-0.5">{redCount}</p>
          </div>
        </div>

        {/* Informative text */}
        <div className="no-print pt-2.5 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Info className="h-4 w-4 text-slate-500 shrink-0" />
          Estes dados mudam dinamicamente conforme você restringe o escopo de análise utilizando o painel de filtros superior.
        </div>
      </div>

      {/* 3. Detailed Ranking Listing Table (Perfect for clean printing!) */}
      <div className="bg-white rounded-xl border border-slate-205 shadow-xs overflow-hidden print-container">
        <div className="no-print bg-slate-50 px-5 py-3 border-b border-slate-150 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Membros e Aproveitamento Individual</span>
          <span className="text-xs text-slate-400 font-medium">Total: {filteredList.length} registros</span>
        </div>

        {filteredList.length === 0 ? (
          <p className="text-slate-550 text-xs py-8 text-center bg-slate-50 italic">Nenhum membro ativo atende aos critérios.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm print:text-[10px]">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Posição</th>
                  <th className="px-5 py-3.5">Nome completo</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">% Final</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">Freq. Obr.</th>
                  <th className="px-5 py-3.5">Zona</th>
                  <th className="px-5 py-3.5 text-center">Presenças</th>
                  <th className="px-5 py-3.5 text-center">Ausências</th>
                  <th className="px-5 py-3.5 text-center font-sans whitespace-nowrap">Justificativas</th>
                  <th className="px-5 py-3.5 text-center uppercase whitespace-nowrap">Plus (Extras)</th>
                  <th className="px-5 py-3.5 text-center font-sans">Atividades considered.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredList.map((stat, idx) => {
                  let zoneBadge = '';
                  if (stat.hasConsideredEvents) {
                    if (stat.zone === 'green') zoneBadge = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                    else if (stat.zone === 'yellow') zoneBadge = 'text-amber-700 bg-amber-50 border-amber-200';
                    else zoneBadge = 'text-rose-700 bg-rose-50 border-rose-100';
                  } else {
                    zoneBadge = 'text-slate-500 bg-slate-50 border-slate-200';
                  }

                  return (
                    <tr key={stat.member.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3 text-slate-650 font-bold font-mono">
                        {idx + 1}º
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{stat.member.name}</span>
                          <span className="text-[10px] text-slate-505 font-medium whitespace-nowrap">
                            {stat.member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                            {stat.member.isNominata && ` • ${stat.member.nominataRole}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-black text-slate-800">
                          {stat.hasConsideredEvents ? `${stat.finalPercentage}%` : 'S/E'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-semibold text-slate-600">
                          {stat.hasConsideredEvents ? `${stat.mandatoryFrequency}%` : 'S/E'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border rounded ${zoneBadge}`}>
                          {stat.hasConsideredEvents ? getZoneLabel(stat.zone) : 'Sem atividades'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-bold font-mono text-emerald-600">
                        {stat.requiredPresences}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-rose-600 font-mono">
                        {stat.requiredAbsences}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-amber-600 font-mono">
                        {stat.requiredJustifications}
                      </td>
                      <td className="px-5 py-3 text-center font-bold font-mono text-indigo-600">
                        {stat.extraParticipations > 0 ? (
                          <div className="flex flex-col items-center justify-center">
                            <span>+{stat.extraParticipations}</span>
                            <span className="text-[9px] text-indigo-500 font-medium tracking-tight">+{stat.extraComputedPoints} pts</span>
                          </div>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-5 py-3 text-center font-mono font-medium text-slate-750">
                        {stat.requiredEventsConsidered}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
