import React, { useState } from 'react';
import {
  Shield,
  Search,
  Check,
  X,
  Edit,
  Save,
  Info,
  Users,
  Award,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Member, User } from '../types';
import { useNotification } from '../components/NotificationContext';
import { useManagementTerm } from '../contexts/ManagementTermContext';
import { canEditCurrentManagementTerm } from '../utils/permission';

interface NominataPageProps {
  members: Member[];
  currentUser: User;
  onUpdateMembers: (updatedMembers: Member[]) => void;
}

type NominataType = 'diretoria' | 'iniciacao' | 'elevacao';

const PREDEFINED_ROLES = [
  'Mestre Conselheiro',
  '1º Conselheiro',
  '2º Conselheiro',
  'Escrivão',
  'Tesoureiro',
  'Hospitaleiro',
  'Mestre de Cerimônias',
  'Capelão',
  'Sentinela',
  'Ator/Papel Ritual',
  'Membro de Apoio'
];

export default function NominataPage({
  members,
  currentUser,
  onUpdateMembers
}: NominataPageProps) {
  const { showNotification } = useNotification();
  const { activeTerm } = useManagementTerm();
  const canEditTerm = canEditCurrentManagementTerm(currentUser, activeTerm);

  const canModify = (currentUser.role === 'admin' || currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') && canEditTerm;

  // Active Nominata section
  const [activeNominata, setActiveNominata] = useState<NominataType>('diretoria');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Local draft states for editing
  // Map of memberId -> { checked: boolean, role: string }
  const [draftSelections, setDraftSelections] = useState<Record<string, { checked: boolean; role: string }>>({});

  // Filter only active members of the chapter
  const activeMembersOfChapter = members.filter(m => m.status === 'active');

  // Helper to extract actual members in a Nominata
  const getNominataMembers = (type: NominataType) => {
    return activeMembersOfChapter.filter(m => {
      if (type === 'diretoria') return m.isNominata;
      if (type === 'iniciacao') return m.isNominataIniciacao;
      if (type === 'elevacao') return m.isNominataElevacao;
      return false;
    }).map(m => {
      let role = '';
      if (type === 'diretoria') role = m.nominataRole || 'Sem função especificada';
      if (type === 'iniciacao') role = m.nominataIniciacaoRole || 'Sem função especificada';
      if (type === 'elevacao') role = m.nominataElevacaoRole || 'Sem função especificada';
      return { member: m, role };
    }).sort((a, b) => a.member.name.localeCompare(b.member.name));
  };

  const currentNominataList = getNominataMembers(activeNominata);

  // Initialize draft when entering edit mode
  const handleStartEdit = () => {
    if (!canModify) return;

    const initialDraft: Record<string, { checked: boolean; role: string }> = {};
    activeMembersOfChapter.forEach(m => {
      let checked = false;
      let role = '';

      if (activeNominata === 'diretoria') {
        checked = !!m.isNominata;
        role = m.nominataRole || '';
      } else if (activeNominata === 'iniciacao') {
        checked = !!m.isNominataIniciacao;
        role = m.nominataIniciacaoRole || '';
      } else if (activeNominata === 'elevacao') {
        checked = !!m.isNominataElevacao;
        role = m.nominataElevacaoRole || '';
      }

      initialDraft[m.id] = { checked, role };
    });

    setDraftSelections(initialDraft);
    setSearchTerm('');
    setIsEditing(true);
  };

  // Toggle draft checkbox for a member
  const handleToggleMember = (memberId: string) => {
    setDraftSelections(prev => {
      const current = prev[memberId] || { checked: false, role: '' };
      return {
        ...prev,
        [memberId]: {
          ...current,
          checked: !current.checked,
          // Set standard default role if checking for the first time
          role: !current.checked && !current.role ? 'Membro de Apoio' : current.role
        }
      };
    });
  };

  // Update role string in draft
  const handleUpdateDraftRole = (memberId: string, role: string) => {
    setDraftSelections(prev => {
      const current = prev[memberId] || { checked: false, role: '' };
      return {
        ...prev,
        [memberId]: {
          ...current,
          role
        }
      };
    });
  };

  // Save changes back to storage / state
  const handleSave = () => {
    const updatedMembersList = members.map(m => {
      // If member is not active, keep untouched
      if (m.status !== 'active') return m;

      const draft = draftSelections[m.id];
      if (!draft) return m;

      const updated = { ...m };
      if (activeNominata === 'diretoria') {
        updated.isNominata = draft.checked;
        updated.nominataRole = draft.checked ? draft.role.trim() : '';
      } else if (activeNominata === 'iniciacao') {
        updated.isNominataIniciacao = draft.checked;
        updated.nominataIniciacaoRole = draft.checked ? draft.role.trim() : '';
      } else if (activeNominata === 'elevacao') {
        updated.isNominataElevacao = draft.checked;
        updated.nominataElevacaoRole = draft.checked ? draft.role.trim() : '';
      }

      return updated;
    });

    onUpdateMembers(updatedMembersList);
    setIsEditing(false);
    showNotification('success', 'Nominata atualizada com sucesso e conectada às frequências de reuniões correspondentes!');
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  // Filter members list under search
  const searchedMembers = activeMembersOfChapter.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNominataDetails = (type: NominataType) => {
    switch (type) {
      case 'diretoria':
        return {
          title: 'Nominata da Diretoria (Semestre)',
          description: 'Membros encarregados de presidir e guiar os trabalhos do Capítulo nesse Semestre. Esta lista é exigida automaticamente na frequência das Reuniões Ritualísticas ordinárias e Terças/Quintas Burocráticas.',
          badge: 'Semestral / Geral',
          color: 'from-amber-500/10 to-amber-600/5 border-amber-200 text-amber-800'
        };
      case 'iniciacao':
        return {
          title: 'Nominata para Iniciação',
          description: 'Membros escalados especificamente para a cerimônia formal e os ensaios de novos membros. Esta lista é conectada diretamente aos eventos de categoria "Ensaio de Iniciação".',
          badge: 'Estudos de Grau',
          color: 'from-teal-500/10 to-teal-600/5 border-teal-250 text-teal-800'
        };
      case 'elevacao':
        return {
          title: 'Nominata para Elevação',
          description: 'Membros escalados para a cerimônia formal e ensaios de elevação ao Grau DeMolay. Esta lista é conectada diretamente aos eventos de categoria "Ensaio de Elevação".',
          badge: 'Estudos de Grau',
          color: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200 text-indigo-800'
        };
    }
  };

  const activeDetails = getNominataDetails(activeNominata);

  return (
    <div className="space-y-6">
      
      {/* Informative Header card */}
      <div className="bg-white p-6 rounded-xl border border-slate-205 shadow-xs flex flex-col md:flex-row items-start gap-4 animate-fade-in">
        <div className="p-3 bg-amber-50 rounded-lg shrink-0">
          <Shield className="h-6 w-6 text-amber-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
            Gestão Inteligente de Nominatas
            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Monte escalações fixas para as cerimônias e reuniões do Capítulo neste semestre. O sistema determinará automaticamente a obrigatoriedade dos participantes com base na Nominata vinculada a cada tipo de evento.
          </p>
        </div>
      </div>

      {/* Nominata Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['diretoria', 'iniciacao', 'elevacao'] as NominataType[]).map(type => {
          const det = getNominataDetails(type);
          const active = activeNominata === type;
          const assignedCount = getNominataMembers(type).length;

          return (
            <button
              key={type}
              onClick={() => {
                if (isEditing) {
                  if (confirm('Você está editando a Nominata atual. Deseja descartar as alterações para trocar de aba?')) {
                    setIsEditing(false);
                    setActiveNominata(type);
                  }
                } else {
                  setActiveNominata(type);
                }
              }}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 cursor-pointer transition duration-150 ${
                active
                  ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-xs font-bold text-slate-800 font-display truncate pr-1">
                  {det.title}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${det.color}`}>
                  {det.badge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-505 font-semibold">
                  <strong>{assignedCount}</strong> {assignedCount === 1 ? 'membro escalado' : 'membros escalados'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Nominata Details Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        
        {/* Banner with Active Nominata Description */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h4 className="text-base font-bold font-display flex items-center gap-2 text-white">
              <Shield className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              {activeDetails.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeDetails.description}
            </p>
          </div>
          
          {canModify && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 transition text-slate-950 text-xs font-bold cursor-pointer shrink-0 shadow-sm"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar Escalados
            </button>
          )}
        </div>

        {/* Read Block representation */}
        {!isEditing ? (
          <div className="p-6">
            {currentNominataList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50">
                <Shield className="h-10 w-10 text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-700">Nenhum membro escalado nesta Nominata</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Para que o sistema considere a obrigatoriedade adaptativa nas frequências rituais, clique em "Editar Escalados" acima e monte a listagem.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentNominataList.map(({ member, role }) => (
                  <div key={member.id} className="p-4 rounded-xl border border-slate-150 hover:bg-slate-50/50 transition duration-150 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-850 truncate">{member.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md max-w-[130px] truncate border border-slate-200/50 text-right">
                      {role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Edit Block representation */
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar membro pelo nome..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar Nominata
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-3 border-b border-slate-200 text-[10px] font-extrabold text-slate-405 uppercase tracking-wider grid grid-cols-2">
                <span>Membro Ativo</span>
                <span>Função / Cargo na Nominata</span>
              </div>
              <div className="divide-y divide-slate-150 max-h-[420px] overflow-y-auto">
                {searchedMembers.length === 0 ? (
                  <p className="p-6 text-center text-slate-500 text-xs font-medium">Nenhum membro ativo corresponde à sua busca.</p>
                ) : (
                  searchedMembers.map(member => {
                    const status = draftSelections[member.id] || { checked: false, role: '' };
                    return (
                      <div
                        key={member.id}
                        className={`p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center transition-colors ${
                          status.checked ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Member Checkbox & Name */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`check_${member.id}`}
                            checked={status.checked}
                            onChange={() => handleToggleMember(member.id)}
                            className="w-4 h-4 text-amber-500 bg-slate-100 border-slate-300 rounded focus:ring-amber-400 focus:ring-1 pointer-events-auto cursor-pointer"
                          />
                          <label
                            htmlFor={`check_${member.id}`}
                            className="text-xs font-semibold text-slate-800 cursor-pointer flex-1 select-none pr-2"
                          >
                            <p className="font-bold text-slate-900">{member.name}</p>
                            <p className="text-[10px] text-slate-450 mt-0.5 font-normal">
                              {member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                              {member.isNominata && activeNominata !== 'diretoria' && ' • Diretoria'}
                              {member.isNominataIniciacao && activeNominata !== 'iniciacao' && ' • Iniciação'}
                              {member.isNominataElevacao && activeNominata !== 'elevacao' && ' • Elevação'}
                            </p>
                          </label>
                        </div>

                        {/* Predefined select with Custom input support */}
                        <div className="flex items-center gap-2">
                          {status.checked ? (
                            <div className="flex gap-1.5 w-full">
                              <select
                                value={PREDEFINED_ROLES.includes(status.role) ? status.role : 'Outro...'}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === 'Outro...') {
                                    handleUpdateDraftRole(member.id, '');
                                  } else {
                                    handleUpdateDraftRole(member.id, val);
                                  }
                                }}
                                className="border border-slate-300 rounded-lg p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                              >
                                {PREDEFINED_ROLES.map(role => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                                <option value="Outro...">Customizado (Digitar)...</option>
                              </select>
                              
                              {(!PREDEFINED_ROLES.includes(status.role) || status.role === '') && (
                                <input
                                  type="text"
                                  placeholder="Digite cargo customizado..."
                                  value={status.role}
                                  onChange={e => handleUpdateDraftRole(member.id, e.target.value)}
                                  className="border border-slate-300 rounded-lg p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-900 flex-1 focus:bg-white"
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Membro não escalado para esta nominata</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] leading-relaxed flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Uso no capítulo:</p>
                <p className="mt-0.5">As funções que você escalar aqui serão guardadas permanentemente. Sempre que criar um novo evento que requer "Nominata", a presença deles será recomendada/exigida automaticamente pelo validador do sistema de forma 100% dinâmica.</p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
