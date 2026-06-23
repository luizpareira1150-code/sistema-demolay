import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Archive,
  Check,
  X,
  AlertTriangle,
  Lock,
  Clock,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { ManagementTerm, User } from '../types';
import { getLocalManagementTerms, saveLocalManagementTerms } from '../utils/storage';
import { pushManagementTermToSupabase, downloadSupabaseToLocal, logAuditAction } from '../utils/supabaseService';
import { generateUUID } from '../utils/supabaseClient';

interface ManagementTermsPageProps {
  currentUser: User;
  onRefreshData?: () => void;
}

export default function ManagementTermsPage({
  currentUser,
  onRefreshData
}: ManagementTermsPageProps) {
  // 1. Guard check to ensure only admin users can access
  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 text-center space-y-4 max-w-xl mx-auto my-12">
        <Lock className="h-10 w-10 text-amber-600 mx-auto" />
        <h3 className="text-lg font-bold text-amber-900">Acesso Restrito</h3>
        <p className="text-sm text-amber-700">
          Ação permitida apenas para administradores.
        </p>
      </div>
    );
  }

  // 2. Component state
  const [terms, setTerms] = useState<ManagementTerm[]>(() => getLocalManagementTerms());
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ManagementTerm | null>(null);

  // Form input fields
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formSemester, setFormSemester] = useState<1 | 2>(1);
  const [formStatus, setFormStatus] = useState<'active' | 'archived'>('active');

  // Trigger dynamic message alerts
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // 3. Sync data initially on mount to resolve stale local storage issues
  useEffect(() => {
    const syncData = async () => {
      const res = await downloadSupabaseToLocal();
      if (res.success && res.data) {
        setTerms(getLocalManagementTerms());
      }
    };
    syncData();
  }, []);

  // 4. Computed auto-calculations fields based on Year and Semester
  const calculatedName = `${formYear}/${formSemester}`;
  const calculatedStartDate = formSemester === 1 ? `${formYear}-01-01` : `${formYear}-07-01`;
  const calculatedEndDate = formSemester === 1 ? `${formYear}-06-30` : `${formYear}-12-31`;

  // 5. Form handlers
  const handleOpenAdd = () => {
    setEditingTerm(null);
    setFormYear(new Date().getFullYear());
    setFormSemester(1);
    setFormStatus('active');
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (term: ManagementTerm) => {
    setEditingTerm(term);
    setFormYear(term.year);
    setFormSemester(term.semester);
    setFormStatus(term.status);
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!formYear || formYear < 1900 || formYear > 2100) {
      triggerError('Por favor, informe um ano válido entre 1900 e 2100.');
      return;
    }

    // Check for Duplicity (excluding current editing term)
    const conflict = terms.some(
      t => t.year === formYear && t.semester === formSemester && t.id !== editingTerm?.id
    );

    if (conflict) {
      triggerError(`Já existe uma gestão cadastrada para a combinação de Ano e Semestre: ${formYear}/${formSemester}`);
      return;
    }

    const termData: ManagementTerm = {
      id: editingTerm?.id || generateUUID(),
      name: calculatedName,
      year: formYear,
      semester: formSemester,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      status: formStatus,
      createdAt: editingTerm?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save locally and update state
    let updatedTerms: ManagementTerm[] = [];
    if (editingTerm) {
      updatedTerms = terms.map(t => (t.id === termData.id ? termData : t));
    } else {
      updatedTerms = [...terms, termData];
    }

    setTerms(updatedTerms);
    saveLocalManagementTerms(updatedTerms);
    setIsFormOpen(false);

    // Push changes to Supabase and handle response
    const res = await pushManagementTermToSupabase(termData);
    if (res.success) {
      triggerSuccess(editingTerm ? 'Gestão updated com sucesso no sistema e no Supabase!' : 'Gestão cadastrada e sincronizada com sucesso!');
    } else {
      triggerError(`Gestão salva localmente, mas falhou ao sincronizar com o Supabase: ${res.message}`);
    }

    // Register audit log
    if (currentUser) {
      logAuditAction({
        managementTermId: termData.id,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: editingTerm ? 'management_term_updated' : 'management_term_created',
        entityType: 'management_term',
        entityId: termData.id,
        entityName: termData.name,
        description: editingTerm 
          ? `${currentUser.name || currentUser.email} atualizou a gestão ${termData.name}`
          : `${currentUser.name || currentUser.email} criou a gestão ${termData.name}`,
        oldData: editingTerm || null,
        newData: termData
      });
    }
    
    // Refresh the application data in main state
    if (onRefreshData) {
      onRefreshData();
    }
  };

  const handleToggleArchive = async (term: ManagementTerm) => {
    const updatedStatus = term.status === 'active' ? 'archived' : 'active';
    const updatedTerm: ManagementTerm = {
      ...term,
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    const updatedList = terms.map(t => (t.id === term.id ? updatedTerm : t));
    setTerms(updatedList);
    saveLocalManagementTerms(updatedList);

    const res = await pushManagementTermToSupabase(updatedTerm);
    if (res.success) {
      triggerSuccess(
        updatedStatus === 'archived'
          ? `Gestão ${term.name} arquivada com sucesso!`
          : `Gestão ${term.name} ativada novamente!`
      );
    } else {
      triggerError(`Estado alterado localmente, mas falhou no Supabase: ${res.message}`);
    }

    // Register audit log
    if (currentUser) {
      logAuditAction({
        managementTermId: term.id,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: updatedStatus === 'archived' ? 'archived' : 'management_term_updated',
        entityType: 'management_term',
        entityId: term.id,
        entityName: term.name,
        description: updatedStatus === 'archived'
          ? `${currentUser.name || currentUser.email} arquivou a gestão ${term.name}`
          : `${currentUser.name || currentUser.email} reativou a gestão ${term.name}`,
        oldData: term,
        newData: updatedTerm
      });
    }

    if (onRefreshData) {
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-sans text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            Gestão de Semestres
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre, edite e ative/arquive os semestres letivos da Ordem DeMolay do seu Capítulo.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nova Gestão
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 text-red-800 border border-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Terms Grid/List */}
      {terms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-xl mx-auto space-y-4">
          <Clock className="h-12 w-12 text-gray-350 mx-auto" />
          <h3 className="text-base font-bold text-gray-700">Nenhuma Gestão Encontrada</h3>
          <p className="text-xs text-gray-500">
            Cadastre a primeira gestão semestral para começar a organizar membros, eventos e presenças.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Adicionar primeira Gestão
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terms
            .sort((a, b) => b.year - a.year || b.semester - a.semester)
            .map((term) => (
              <div
                key={term.id}
                className={`bg-white rounded-xl border p-5 shadow-sm space-y-4 transition-all duration-250 ${
                  term.status === 'archived'
                    ? 'border-gray-200 opacity-75 grayscale bg-gray-50/50'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Header Information */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-2xl font-mono font-bold text-gray-900 tracking-tight">
                      {term.name}
                    </span>
                    <p className="text-[11px] font-mono text-gray-400">
                      ID: {term.id.slice(0, 8)}...
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      term.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {term.status === 'active' ? 'Ativa' : 'Arquivada'}
                  </span>
                </div>

                {/* Period segment */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 font-mono text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Início:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(term.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fim:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(term.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Administrative Controls */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEdit(term)}
                    aria-label="Editar Gestão"
                    title="Editar Gestão"
                    className="flex-1 py-1.5 flex justify-center items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleArchive(term)}
                    aria-label={term.status === 'active' ? 'Arquivar Gestão' : 'Ativar Gestão'}
                    title={term.status === 'active' ? 'Arquivar Gestão' : 'Ativar Gestão'}
                    className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      term.status === 'active'
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {term.status === 'active' ? 'Arquivar' : 'Reativar'}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 shadow-lg flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-250 transform transition-all duration-300 overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-150 p-4 bg-slate-50">
              <h3 className="text-base font-bold text-gray-900 font-sans tracking-tight">
                {editingTerm ? 'Editar Gestão' : 'Nova Gestão Semestral'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-650 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ano Letivo
                </label>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  required
                  placeholder="Ex: 2026"
                  value={formYear}
                  onChange={(e) => setFormYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Semestre
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setFormSemester(1)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      formSemester === 1
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    1º Semestre (Janeiro-Junho)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSemester(2)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      formSemester === 2
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    2º Semestre (Julho-Dezembro)
                  </button>
                </div>
              </div>

              {/* Dynamic calculations preview card */}
              <div className="bg-slate-50 rounded-lg border border-slate-150 p-3.5 space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Visualização Automática do Período
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 uppercase">Nome gerado</span>
                    <p className="font-bold text-indigo-700 text-sm">{calculatedName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 uppercase">Duração</span>
                    <p className="text-gray-700">6 meses</p>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase">Data Inicial</span>
                    <p className="text-gray-800">
                      {new Date(calculatedStartDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase">Data Final</span>
                    <p className="text-gray-800">
                      {new Date(calculatedEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status Inicial
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-sans bg-white"
                >
                  <option value="active">Ativo (Sistematicamente aberto para navegação)</option>
                  <option value="archived">Arquivado (Sistematicamente histórico)</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100 mt-5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  Salvar Gestão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
