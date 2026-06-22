import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  UserCheck,
  UserMinus,
  AlertCircle
} from 'lucide-react';
import { Member, MemberStatus, User } from '../types';
import { useNotification } from '../components/NotificationContext';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';

interface MembersPageProps {
  members: Member[];
  currentUser: User;
  onAddMember: (member: Omit<Member, 'id' | 'createdAt'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onViewMember: (member: Member) => void;
}

const NOMINATA_ROLES = [
  'Mestre Conselheiro',
  '1º Conselheiro',
  '2º Conselheiro',
  'Escrivão',
  'Tesoureiro',
  'Hospitaleiro',
  'Mestre de Cerimônias',
  'Capelão',
  'Sentinela'
];

export default function MembersPage({
  members,
  currentUser,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onViewMember
}: MembersPageProps) {
  const { showNotification } = useNotification();

  // Permission checks
  const canModify = currentUser.role === 'admin' || currentUser.role === 'diretoria';
  const canDelete = currentUser.role === 'admin' || currentUser.role === 'diretoria';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [degreeFilter, setDegreeFilter] = useState<'all' | 'iniciatico' | 'demolay'>('all');
  const [nominataFilter, setNominataFilter] = useState<'all' | 'nominata' | 'no_nominata'>('all');

  // Form states (Add/Edit)
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<MemberStatus>('active');
  const [formJoinedAt, setFormJoinedAt] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDegree, setFormDegree] = useState<'iniciatico' | 'demolay'>('iniciatico');
  const [formIsNominata, setFormIsNominata] = useState(false);
  const [formNominataRoleSelect, setFormNominataRoleSelect] = useState('Mestre Conselheiro');
  const [formNominataRoleCustom, setFormNominataRoleCustom] = useState('');
  const [formError, setFormError] = useState('');

  // Handle opening form
  const handleOpenAdd = () => {
    if (!canModify) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    setEditingMember(null);
    setFormName('');
    setFormStatus('active');
    setFormJoinedAt(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormDegree('iniciatico');
    setFormIsNominata(false);
    setFormNominataRoleSelect('Mestre Conselheiro');
    setFormNominataRoleCustom('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    if (!canModify) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    setEditingMember(member);
    setFormName(member.name);
    setFormStatus(member.status);
    setFormJoinedAt(member.joinedAt);
    setFormNotes(member.notes);

    const degree = member.degree || 'iniciatico';
    const isNominata = member.isNominata ?? false;
    setFormDegree(degree);
    setFormIsNominata(isNominata);

    if (isNominata && member.nominataRole) {
      if (NOMINATA_ROLES.includes(member.nominataRole)) {
        setFormNominataRoleSelect(member.nominataRole);
        setFormNominataRoleCustom('');
      } else {
        setFormNominataRoleSelect('Outro');
        setFormNominataRoleCustom(member.nominataRole);
      }
    } else {
      setFormNominataRoleSelect('Mestre Conselheiro');
      setFormNominataRoleCustom('');
    }

    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('O nome completo é obrigatório.');
      showNotification('warning', 'O nome completo é obrigatório.');
      return;
    }
    if (!formJoinedAt) {
      setFormError('A data de admissão é obrigatória.');
      showNotification('warning', 'A data de admissão é obrigatória.');
      return;
    }

    const currentNominataRole = formIsNominata
      ? (formNominataRoleSelect === 'Outro' ? formNominataRoleCustom.trim() : formNominataRoleSelect)
      : undefined;

    if (formIsNominata && formNominataRoleSelect === 'Outro' && !formNominataRoleCustom.trim()) {
      setFormError('Por favor, informe o cargo personalizado na nominata.');
      showNotification('warning', 'Por favor, informe o cargo personalizado na nominata.');
      return;
    }

    setFormLoading(true);

    setTimeout(() => {
      if (editingMember) {
        // Edit mode
        onUpdateMember({
          ...editingMember,
          name: formName.trim().toUpperCase(),
          status: formStatus,
          joinedAt: formJoinedAt,
          notes: formNotes,
          degree: formDegree,
          isNominata: formIsNominata,
          nominataRole: currentNominataRole
        });
        showNotification('success', 'Membro atualizado com sucesso.');
      } else {
        // Add mode
        onAddMember({
          name: formName.trim().toUpperCase(),
          status: formStatus,
          joinedAt: formJoinedAt,
          notes: formNotes,
          degree: formDegree,
          isNominata: formIsNominata,
          nominataRole: currentNominataRole
        });
        showNotification('success', 'Membro salvo com sucesso.');
      }
      setFormLoading(false);
      setIsFormOpen(false);
    }, 550);
  };

  const handleToggleStatus = (member: Member) => {
    if (!canModify) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    const newStatus: MemberStatus = member.status === 'active' ? 'inactive' : 'active';
    onUpdateMember({
      ...member,
      status: newStatus
    });
    showNotification('success', newStatus === 'active' ? 'Membro reativado com sucesso.' : 'Membro inativado com sucesso.');
  };

  const handleToggleDegree = (member: Member) => {
    if (!canModify) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    const newDegree = member.degree === 'iniciatico' ? 'demolay' : 'iniciatico';
    onUpdateMember({
      ...member,
      degree: newDegree
    });
    showNotification('success', `Grau de ${member.name} alterado para ${newDegree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'} com sucesso.`);
  };

  const handleDeleteTrigger = (member: Member) => {
    if (!canDelete) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    setMemberToDelete(member);
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    onDeleteMember(memberToDelete.id);
    showNotification('success', 'Membro excluído com sucesso.');
    setMemberToDelete(null);
  };

  // Filter list
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    const mDegree = member.degree || 'iniciatico';
    const mIsNominata = member.isNominata ?? false;

    const matchesDegree = degreeFilter === 'all' || mDegree === degreeFilter;
    const matchesNominata =
      nominataFilter === 'all' ||
      (nominataFilter === 'nominata' && mIsNominata) ||
      (nominataFilter === 'no_nominata' && !mIsNominata);

    return matchesSearch && matchesStatus && matchesDegree && matchesNominata;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar membro pelo nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {canModify && (
            <Button
              onClick={handleOpenAdd}
              variant="primary"
            >
              <Plus className="h-4 w-4 mr-0.5" />
              Novo Membro
            </Button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
          {/* Status Filter */}
          <div className="flex bg-slate-105 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-slate-100 shadow-xs text-slate-950' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-slate-100 shadow-xs text-slate-950' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Inativos
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-100 shadow-xs text-slate-950' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Degree Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Grau</span>
            <select
              value={degreeFilter}
              onChange={e => setDegreeFilter(e.target.value as any)}
              className="border border-slate-300 rounded-md py-1 px-2.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">Todos os Graus</option>
              <option value="iniciatico">Grau Iniciático</option>
              <option value="demolay">Grau DeMolay</option>
            </select>
          </div>

          {/* Nominata Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Nominata/Diretoria</span>
            <select
              value={nominataFilter}
              onChange={e => setNominataFilter(e.target.value as any)}
              className="border border-slate-300 rounded-md py-1 px-2.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">Filtro Nominata (Todos)</option>
              <option value="nominata">Apenas Nominata/Diretoria</option>
              <option value="no_nominata">Fora da Nominata/Diretoria</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid or Table list */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Nenhum membro encontrado</h3>
          <p className="mt-1 text-xs text-slate-500">Tente ajustar seus filtros ou cadastre um novo irmão.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nome Completo
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Grau / Cargo
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Data de Admissão
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Observações
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-slate-500 uppercase text-xs font-bold tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-sm">
                {filteredMembers.map(member => {
                  const isNom = member.isNominata ?? false;
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-slate-100 rounded-full flex items-center justify-center font-bold font-display text-slate-700">
                            {member.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {canModify ? (
                            <button
                              onClick={() => handleToggleDegree(member)}
                              title="Clique para alternar o Grau do membro"
                              className="text-xs font-bold text-left px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition cursor-pointer max-w-max flex items-center gap-1.5"
                            >
                              <span>{member.degree === 'demolay' ? 'Grau DeMolay ⚔️' : 'Grau Iniciático ✨'}</span>
                              <span className="text-[9px] text-blue-500 font-semibold uppercase tracking-wider">Mudar</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-700">
                              {member.degree === 'demolay' ? 'Grau DeMolay ⚔️' : 'Grau Iniciático ✨'}
                            </span>
                          )}
                          {isNom && (
                            <span className="inline-flex max-w-max items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100 mt-1 uppercase">
                              {member.nominataRole || 'Nominata'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-550">
                        {new Date(member.joinedAt + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-500 italic">
                        {member.notes || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewMember(member)}
                            title="Visualizar Perfil"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>

                          {canModify && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(member)}
                                title={member.status === 'active' ? 'Inativar Membro' : 'Ativar Membro'}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                  member.status === 'active'
                                    ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                              >
                                {member.status === 'active' ? <UserMinus className="h-4.5 w-4.5" /> : <UserCheck className="h-4.5 w-4.5" />}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(member)}
                                title="Editar Dados"
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition cursor-pointer"
                              >
                                <Edit2 className="h-4.5 w-4.5" />
                              </button>
                            </>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteTrigger(member)}
                              title="Remover permanentemente"
                              className="p-1.5 text-rose-600 hover:text-rose-850 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredMembers.map(member => (
              <div key={member.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700 shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm truncate">{member.name}</h4>
                      {canModify ? (
                        <button
                          onClick={() => handleToggleDegree(member)}
                          className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded px-1.5 py-0.5 mt-1 font-bold uppercase cursor-pointer"
                        >
                          {member.degree === 'demolay' ? 'Grau DeMolay ⚔️' : 'Grau Iniciático ✨'}
                        </button>
                      ) : (
                        <p className="text-[10px] text-slate-500 uppercase font-bold">
                          {member.degree === 'demolay' ? 'Grau DeMolay ⚔️' : 'Grau Iniciático ✨'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {member.status === 'active' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>Admissão: <span className="font-semibold">{new Date(member.joinedAt + 'T12:00:00').toLocaleDateString('pt-BR')}</span></p>
                  {(member.isNominata ?? false) && (
                    <p className="font-medium text-amber-700">Cargo: <span className="font-bold">{member.nominataRole || 'Nominata'}</span></p>
                  )}
                  {member.notes && <p className="italic truncate">Nota: "{member.notes}"</p>}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onViewMember(member)}
                    className="inline-flex items-center px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-xs gap-1 font-semibold text-slate-700 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver Perfil
                  </button>

                  {canModify && (
                    <>
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs gap-0.5 font-semibold cursor-pointer ${
                          member.status === 'active'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {member.status === 'active' ? 'Desativar' : 'Reativar'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs gap-1 font-semibold cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </button>
                    </>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteTrigger(member)}
                      className="inline-flex items-center px-2 py-1 bg-rose-50 hover:bg-rose-105 text-rose-700 rounded text-xs gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CRUD Overlay Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold font-display text-base">
                {editingMember ? 'Editar Membro Avaliado' : 'Cadastrar Novo Membro'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Degree */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Grau do Membro
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center text-sm font-medium text-slate-705 cursor-pointer">
                    <input
                      type="radio"
                      name="formDegree"
                      value="iniciatico"
                      checked={formDegree === 'iniciatico'}
                      onChange={() => setFormDegree('iniciatico')}
                      className="form-radio text-slate-905 h-4 w-4 mr-2"
                    />
                    Grau Iniciático
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-705 cursor-pointer">
                    <input
                      type="radio"
                      name="formDegree"
                      value="demolay"
                      checked={formDegree === 'demolay'}
                      onChange={() => setFormDegree('demolay')}
                      className="form-radio text-slate-905 h-4 w-4 mr-2"
                    />
                    Grau DeMolay
                  </label>
                </div>
              </div>

              {/* Nominata Involvement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Participa da Nominata / Diretoria?
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center text-sm font-medium text-slate-705 cursor-pointer">
                    <input
                      type="radio"
                      name="formIsNominata"
                      checked={formIsNominata === true}
                      onChange={() => setFormIsNominata(true)}
                      className="form-radio text-slate-905 h-4 w-4 mr-2"
                    />
                    Sim
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-705 cursor-pointer">
                    <input
                      type="radio"
                      name="formIsNominata"
                      checked={formIsNominata === false}
                      onChange={() => setFormIsNominata(false)}
                      className="form-radio text-slate-905 h-4 w-4 mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>

              {/* Nominata Role (Show if isNominata is true) */}
              {formIsNominata && (
                <div className="space-y-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100 max-w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cargo na Nominata/Diretoria
                    </label>
                    <select
                      value={formNominataRoleSelect}
                      onChange={e => setFormNominataRoleSelect(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {NOMINATA_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                      <option value="Outro">Outro (Digitar manualmente)</option>
                    </select>
                  </div>

                  {formNominataRoleSelect === 'Outro' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Informe o Cargo Manualmente
                      </label>
                      <input
                        type="text"
                        required
                        value={formNominataRoleCustom}
                        onChange={e => setFormNominataRoleCustom(e.target.value)}
                        placeholder="Ex: Sentinela Adjunto"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Status and Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as MemberStatus)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="active">Ativo (Participa das avaliações)</option>
                    <option value="inactive">Inativo (Histórico apenas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Admissão
                  </label>
                  <input
                    type="date"
                    required
                    value={formJoinedAt}
                    onChange={e => setFormJoinedAt(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações Gerais (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ex: Demitido, Escrivão, oficial de rito, histórico médico..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={formLoading}
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={formLoading}
                  disabled={formLoading}
                >
                  {editingMember ? 'Atualizar Dados' : 'Gravar Membro'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memberToDelete && (
        <ConfirmModal
          isOpen={!!memberToDelete}
          title="Excluir Membro permanentemente"
          message={`Deseja realmente excluir o membro ${memberToDelete.name}? Esta ação não pode ser desfeita e removerá todo o histórico de presenças associado.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={() => setMemberToDelete(null)}
        />
      )}
    </div>
  );
}
