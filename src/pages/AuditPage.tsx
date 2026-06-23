import React, { useState, useEffect } from 'react';
import { User, ManagementTerm } from '../types';
import { fetchAuditLogs } from '../utils/supabaseService';
import { useManagementTerm } from '../contexts/ManagementTermContext';
import { 
  Search, 
  Calendar, 
  Filter, 
  Clock, 
  User as UserIcon, 
  RefreshCw, 
  AlertCircle,
  Eye,
  FileText,
  Activity,
  X
} from 'lucide-react';

interface AuditPageProps {
  currentUser: User;
}

export default function AuditPage({ currentUser }: AuditPageProps) {
  const { activeTerm } = useManagementTerm();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLogDetails, setSelectedLogDetails] = useState<any | null>(null);

  // Determine which managementTermId to filter by for the fetch
  const effectiveTermId = currentUser.role === 'diretoria_admin' 
    ? currentUser.managementTermId 
    : activeTerm?.id;

  const loadLogs = async () => {
    if (!effectiveTermId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchAuditLogs(effectiveTermId);
    if (res.success) {
      setLogs(res.data);
    } else {
      setError(res.message || 'Erro ao carregar logs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [effectiveTermId]);

  // Authorization Check
  if (currentUser.role !== 'admin' && currentUser.role !== 'diretoria_admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-xs border border-slate-200">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-800">Acesso Negado</h3>
        <p className="text-sm text-slate-500 mt-1">Ação não permitida para este perfil.</p>
      </div>
    );
  }

  // Action Translation
  const translateAction = (action: string) => {
    const actions: { [key: string]: string } = {
      created: 'criou',
      updated: 'atualizou',
      deleted: 'excluiu',
      archived: 'arquivou',
      restored: 'restaurou',
      attendance_saved: 'salvou presenças do evento',
      user_created: 'criou usuário',
      user_updated: 'atualizou usuário',
      user_deleted: 'excluiu usuário',
      management_term_created: 'criou gestão',
      management_term_updated: 'atualizou gestão',
      management_term_deleted: 'excluiu gestão'
    };
    return actions[action] || action;
  };

  // Action badge colors
  const getActionBadgeClass = (action: string) => {
    if (action.includes('created') || action === 'created') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('updated') || action === 'updated') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('deleted') || action === 'deleted') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('archived') || action === 'archived') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // Entity Translation
  const translateEntity = (entity: string) => {
    const entities: { [key: string]: string } = {
      member: 'membro',
      event: 'evento',
      attendance: 'presença',
      user: 'usuário',
      management_term: 'gestão',
      setting: 'configuração'
    };
    return entities[entity] || entity;
  };

  // Date utilities
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}h`;
    } catch {
      return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  // Filter logs based on inputs
  const filteredLogs = logs.filter(log => {
    // 1. Text Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const userNameMatch = log.user_name?.toLowerCase().includes(term);
      const descMatch = log.description?.toLowerCase().includes(term);
      const entityNameMatch = log.entity_name?.toLowerCase().includes(term);
      if (!userNameMatch && !descMatch && !entityNameMatch) {
        return false;
      }
    }

    // 2. Action Type Filter
    if (selectedAction && log.action !== selectedAction) {
      return false;
    }

    // 3. Entity Type Filter
    if (selectedEntity && log.entity_type !== selectedEntity) {
      return false;
    }

    // 4. Date Range Filters
    if (startDate) {
      const logTime = new Date(log.created_at).getTime();
      const startLimit = new Date(startDate + 'T00:00:00').getTime();
      if (logTime < startLimit) return false;
    }

    if (endDate) {
      const logTime = new Date(log.created_at).getTime();
      const endLimit = new Date(endDate + 'T23:59:59').getTime();
      if (logTime > endLimit) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAction('');
    setSelectedEntity('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Filtros de Auditoria</h3>
            <p className="text-xs text-slate-500">Filtre as ações realizadas na gestão corrente</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Recarregar logs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </button>
            {(searchTerm || selectedAction || selectedEntity || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {/* Search Term */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Usuário, ação, item..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Action Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ação</label>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Todas as ações</option>
              <option value="created">Criou</option>
              <option value="updated">Atualizou</option>
              <option value="deleted">Excluiu</option>
              <option value="attendance_saved">Salvou presenças</option>
              <option value="user_created">Criou usuário</option>
              <option value="user_updated">Atualizou usuário</option>
              <option value="user_deleted">Excluiu usuário</option>
              <option value="management_term_created">Criou gestão</option>
              <option value="management_term_updated">Atualizou gestão</option>
            </select>
          </div>

          {/* Entity Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Todas as categorias</option>
              <option value="member">Membro</option>
              <option value="event">Evento</option>
              <option value="attendance">Presença</option>
              <option value="user">Usuário</option>
              <option value="management_term">Gestão</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">De (Data)</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Até (Data)</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit List Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-xs border border-slate-200">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm text-slate-600 font-medium">Carregando auditoria...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-xs border border-slate-200 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
          <h4 className="text-sm font-bold text-slate-800">Erro ao carregar auditoria</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md">{error}</p>
          <button
            onClick={loadLogs}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-xs border border-slate-200 text-center">
          <Activity className="h-10 w-10 text-slate-300 mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Nenhum log encontrado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {logs.length === 0 
              ? 'Nenhuma ação registrada nesta gestão.' 
              : 'Nenhum log corresponde aos filtros informados.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-3.5">Horário / Data</th>
                  <th className="px-6 py-3.5">Usuário</th>
                  <th className="px-6 py-3.5">Ação</th>
                  <th className="px-6 py-3.5">Detalhe</th>
                  <th className="px-6 py-3.5">Visualizar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-slate-800 font-bold">{formatTime(log.created_at)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{formatDate(log.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                          {log.user_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{log.user_name || 'Sistema'}</p>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {log.user_role || 'Visualizador'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionBadgeClass(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                      <span className="ml-1.5 text-[10px] font-semibold text-slate-500 lowercase">
                        {translateEntity(log.entity_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium leading-relaxed">{log.description}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLogDetails(log)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                        title="Ver dados JSON"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredLogs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {formatDate(log.created_at)}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
                    {formatTime(log.created_at)}
                  </span>
                </div>
                
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {log.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-500">
                      {log.user_name || 'Sistema'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedLogDetails(log)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    <Eye className="h-3 w-3" />
                    Ver Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* JSON Detail Modal */}
      {selectedLogDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 rounded-xl max-w-2xl w-full flex flex-col max-h-[85vh] border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold font-display text-sm">Detalhes Técnicos do Log</h3>
              </div>
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Ação / Identificador</p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-indigo-400 font-bold">{selectedLogDetails.action}</span> on <span className="text-emerald-400">{selectedLogDetails.entity_type}</span> (ID: {selectedLogDetails.entity_id || 'N/A'})
                </div>
              </div>

              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Descrição do Evento</p>
                <p className="p-3 bg-slate-950 rounded-lg border border-slate-800 leading-relaxed text-slate-300">
                  {selectedLogDetails.description}
                </p>
              </div>

              {selectedLogDetails.old_data && (
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Dados Anteriores (Old Snapshot)</p>
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-[11px] text-slate-400">
                    {JSON.stringify(selectedLogDetails.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLogDetails.new_data && (
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Dados Novos (New Snapshot)</p>
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-[11px] text-emerald-400/90">
                    {JSON.stringify(selectedLogDetails.new_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLogDetails.metadata && (
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Metadados Adicionais</p>
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-[11px] text-indigo-300">
                    {JSON.stringify(selectedLogDetails.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
