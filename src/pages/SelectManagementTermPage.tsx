import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Clock, LogOut, RefreshCw } from 'lucide-react';
import { ManagementTerm, User } from '../types';
import { getLocalManagementTerms, saveLocalManagementTerms } from '../utils/storage';
import { downloadSupabaseToLocal, pushManagementTermToSupabase } from '../utils/supabaseService';
import { useManagementTerm } from '../contexts/ManagementTermContext';
import { generateUUID } from '../utils/supabaseClient';

interface SelectManagementTermPageProps {
  currentUser: User;
  onLogout?: () => void;
}

export default function SelectManagementTermPage({
  currentUser,
  onLogout
}: SelectManagementTermPageProps) {
  const navigate = useNavigate();
  const { activeTerm, setActiveTerm } = useManagementTerm();
  const [terms, setTerms] = useState<ManagementTerm[]>(() => getLocalManagementTerms());
  const [loading, setLoading] = useState(false);

  const fetchLatest = async (showFeedback = false) => {
    setLoading(true);
    try {
      const res = await downloadSupabaseToLocal();
      if (res.success && res.data) {
        const fetched = getLocalManagementTerms();
        setTerms(fetched);
        
        // Auto create default term if absolutely none exist
        if (fetched.length === 0) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;
          const currentSemester = currentMonth <= 6 ? 1 : 2;
          const defaultId = generateUUID();
          
          const defaultTerm: ManagementTerm = {
            id: defaultId,
            name: `${currentYear}/${currentSemester}`,
            year: currentYear,
            semester: currentSemester as 1 | 2,
            startDate: currentSemester === 1 ? `${currentYear}-01-01` : `${currentYear}-07-01`,
            endDate: currentSemester === 1 ? `${currentYear}-06-30` : `${currentYear}-12-31`,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const initialList = [defaultTerm];
          setTerms(initialList);
          saveLocalManagementTerms(initialList);
          await pushManagementTermToSupabase(defaultTerm);
        }
        if (showFeedback) {
          alert('Dados sincronizados com sucesso!');
        }
      } else {
        if (showFeedback) {
          alert('Falha ao sincronizar: ' + res.message);
        }
      }
    } catch (err: any) {
      console.error('Falha ao obter gestões atualizadas:', err);
      if (showFeedback) {
        alert('Erro ao sincronizar: ' + (err.message || err));
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch from Supabase on mount of selection page to ensure up-to-date options
  useEffect(() => {
    fetchLatest(false);
  }, []);

  const handleManualRefresh = () => {
    fetchLatest(true);
  };

  // 2. Filter terms that user is authorized to manage:
  // - Admin: can see and switch to ALL management terms
  // - Other profiles (diretoria, etc): if they have a bound managementTermId, they may still select it,
  //   or standard active terms. Let's list all terms, but if they have a bound term, highlight or restrict.
  const authorizedTerms = terms.filter(term => {
    if (currentUser.role === 'admin' || !currentUser.managementTermId) {
      return true; // Admin can see any
    }
    return term.id === currentUser.managementTermId; // Bound users see only their bound term
  });

  const handleSelect = (term: ManagementTerm) => {
    setActiveTerm(term);
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12 select-none">
      {/* Container display wrapper */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-700/35 overflow-hidden">
        {/* Banner header logo */}
        <div className="bg-indigo-650 px-6 py-8 text-center text-white space-y-2 relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-850">
          <Calendar className="h-12 w-12 mx-auto text-indigo-100 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight font-sans">
            Selecionar Gestão / Semestre
          </h1>
          <p className="text-xs text-indigo-150 leading-relaxed max-w-sm mx-auto">
            Escolha uma gestão semestral ativa para navegar e gerenciar as atividades do Capítulo.
          </p>
        </div>

        {/* List content */}
        <div className="p-6 space-y-5">
          {loading && authorizedTerms.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-gray-500 font-mono">Buscando gestões disponíveis no Supabase...</p>
            </div>
          ) : authorizedTerms.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8 space-y-3 border border-dashed border-gray-250 rounded-xl bg-gray-50/50">
                <Clock className="h-8 w-8 text-gray-400 mx-auto animate-bounce" />
                <h3 className="text-sm font-bold text-gray-700">Nenhuma gestão autorizada</h3>
                <p className="text-xs text-gray-500 px-6 leading-relaxed">
                  {currentUser.managementTermId
                    ? 'Sua conta de Diretoria está vinculada a uma gestão que ainda não foi cadastrada ou sincronizada neste dispositivo. Clique em Sincronizar ou solicite ao administrador para configurá-la.'
                    : 'Nenhum semestre cadastrado. Entre como Administrador para configurar a primeira gestão de semestre.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/40 hover:bg-indigo-50 font-medium text-xs transition-colors cursor-pointer select-none"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Sincronizando...' : 'Atualizar Dados do Supabase'}
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-250 text-red-750 bg-red-50/30 hover:bg-red-50 font-medium text-xs transition-colors cursor-pointer select-none"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair desta conta (Logout)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              <div className="space-y-2">
                {authorizedTerms
                  .sort((a, b) => b.year - a.year || b.semester - a.semester)
                  .map((term) => {
                    const isSelected = activeTerm?.id === term.id;
                    
                    return (
                      <button
                        key={term.id}
                        onClick={() => handleSelect(term)}
                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all group duration-200 outline-none select-none text-slate-800 hover:text-slate-900 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-white border-gray-200 hover:border-indigo-250 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-mono font-bold tracking-tight text-gray-900">
                              {term.name}
                            </span>
                            {term.status === 'archived' && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-150 px-1.5 py-0.5 rounded font-mono font-semibold">
                                Arquivada
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                                Selecionada
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-450">
                            Período:{' '}
                            {new Date(term.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}{' '}
                            a{' '}
                            {new Date(term.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-650 group-hover:text-indigo-800 transition-colors">
                          Entrar
                          <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* User metadata footer representation */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-450 font-mono">
            <div className="flex items-center gap-2">
              <span>Usuário:</span>
              <span className="font-semibold text-gray-600 block max-w-[120px] truncate">{currentUser.name}</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-gray-500 uppercase font-bold text-[9px]">
                {currentUser.role}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                title="Sincronizar dados"
                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sair da Conta"
                  className="p-1 flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer font-bold"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
