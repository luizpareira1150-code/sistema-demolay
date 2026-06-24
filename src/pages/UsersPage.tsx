import React, { useState } from 'react';
import {
  UserCircle,
  Plus,
  Edit2,
  Trash2,
  Mail,
  ShieldAlert,
  X,
  AlertCircle,
  UserCheck,
  Calendar
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getLocalManagementTerms } from '../utils/storage';

interface UsersPageProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export default function UsersPage({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: UsersPageProps) {
  const managementTerms = getLocalManagementTerms();

  // Only Admin and Diretoria Admin have access (extra safety guard)
  if (currentUser.role !== 'admin' && currentUser.role !== 'diretoria_admin') {
    return (
      <div className="bg-red-55 p-6 rounded-xl border border-red-200 text-center space-y-4 max-w-xl mx-auto">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto" />
        <h3 className="text-lg font-bold text-red-900">Acesso Restrito</h3>
        <p className="text-sm text-red-700 font-semibold font-sans">
          Ação não permitida para este perfil.
        </p>
      </div>
    );
  }

  // Block if Diretoria Admin doesn't have a linked management term
  if (currentUser.role === 'diretoria_admin' && !currentUser.managementTermId) {
    return (
      <div className="bg-red-55 p-6 rounded-xl border border-red-200 text-center space-y-4 max-w-xl mx-auto">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto" />
        <h3 className="text-lg font-bold text-red-900">Gestão Não Vinculada</h3>
        <p className="text-sm text-red-700 font-semibold font-sans">
          Sua conta Diretoria Admin não está vinculada a uma gestão. Procure um administrador.
        </p>
      </div>
    );
  }

  // Form modals state
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form input fields state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('visualizacao');
  const [formManagementTermId, setFormManagementTermId] = useState<string>('');
  const [formPosition, setFormPosition] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Open forms handlers
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPosition('');
    
    const initialRole = (currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') ? 'diretoria' : 'visualizacao';
    const initialTermId = (currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') ? (currentUser.managementTermId || '') : '';
    
    setFormRole(initialRole);
    setFormManagementTermId(initialTermId);
    
    if ((currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') && !currentUser.managementTermId) {
      setFormError('Sua conta não está vinculada a uma gestão. Procure um administrador.');
    } else {
      setFormError('');
    }
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    if (currentUser.role === 'diretoria') {
      alert('Ação não permitida para este perfil.');
      return;
    }

    if (currentUser.role === 'diretoria_admin') {
      if (!currentUser.managementTermId) {
        alert('Sua conta Diretoria Admin não está vinculada a uma gestão. Procure um administrador.');
        return;
      }
      if (user.role !== 'diretoria' || user.managementTermId !== currentUser.managementTermId) {
        alert('Você não pode editar usuários de outra gestão.');
        return;
      }
    }

    if (currentUser.role === 'admin') {
      if (user.role === 'admin' && user.id !== currentUser.id) {
        // Can edit self, but let admin edit other admins too if allowed, or keep standard
      }
    }

    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password);
    setFormPosition(user.position || '');
    
    setFormRole(user.role);
    setFormManagementTermId(user.managementTermId || '');
    
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (currentUser.role === 'visualizacao') {
      setFormError('Visualização não pode criar usuários.');
      return;
    }
    if (currentUser.role === 'diretoria') {
      setFormError('Diretoria não pode criar usuários.');
      return;
    }

    if (!formName.trim()) {
      setFormError('O nome completo é obrigatório.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('E-mail válido é obrigatório.');
      return;
    }
    if (formPassword.length < 4) {
      setFormError('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    if (editingUser) {
      // Editing Mode
      if (currentUser.role === 'diretoria_admin') {
        if (editingUser.role !== 'diretoria' || editingUser.managementTermId !== currentUser.managementTermId) {
          setFormError('Você não pode editar usuários de outra gestão.');
          return;
        }
        if (formRole !== editingUser.role || formManagementTermId !== editingUser.managementTermId) {
          setFormError('Você não pode alterar o perfil ou a gestão vinculada deste usuário.');
          return;
        }
      } else if (currentUser.role === 'admin') {
        if (formRole === 'diretoria_admin' && !formManagementTermId) {
          setFormError('Selecione uma gestão para esta conta de Diretoria Admin.');
          return;
        }
        if (formRole === 'diretoria' && !formManagementTermId) {
          setFormError('Selecione uma gestão para esta conta de Diretoria.');
          return;
        }
      }
    } else {
      // Creation Mode
      if (currentUser.role === 'diretoria_admin') {
        if (!currentUser.managementTermId) {
          setFormError('Sua conta Diretoria Admin não está vinculada a uma gestão. Procure um administrador.');
          return;
        }
        if (formRole !== 'diretoria') {
          setFormError('Diretoria Admin só pode criar contas Diretoria.');
          return;
        }
        if (formManagementTermId !== currentUser.managementTermId) {
          setFormError('Você não pode vincular contas a outra gestão.');
          return;
        }
      } else if (currentUser.role === 'admin') {
        if (formRole === 'diretoria_admin' && !formManagementTermId) {
          setFormError('Selecione uma gestão para esta conta de Diretoria Admin.');
          return;
        }
        if (formRole === 'diretoria' && !formManagementTermId) {
          setFormError('Selecione uma gestão para esta conta de Diretoria.');
          return;
        }
      }
    }

    // Generic fallback checks
    if ((formRole === 'diretoria' || formRole === 'diretoria_admin') && !formManagementTermId) {
      setFormError('Selecione uma gestão para esta conta.');
      return;
    }

    const allowedPositions = [
      "1º Conselheiro",
      "2º Conselheiro",
      "Secretário",
      "Mordomo",
      "Hospitaleiro",
    ];

    if (currentUser.role === 'diretoria_admin' || formRole === 'diretoria') {
      if (!formPosition) {
        setFormError('Selecione o cargo/função deste usuário.');
        return;
      }
      if (!allowedPositions.includes(formPosition)) {
        setFormError('Cargo/função inválido.');
        return;
      }
    }

    // Check if email already used (excluding current user edit)
    const emailConflict = users.some(
      u => u.email.toLowerCase() === formEmail.trim().toLowerCase() && u.id !== editingUser?.id
    );

    if (emailConflict) {
      setFormError('Este e-mail já está sendo utilizado por outro usuário acadêmico.');
      return;
    }

    try {
      if (editingUser) {
        onUpdateUser({
          ...editingUser,
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          role: formRole,
          managementTermId: formManagementTermId || undefined,
          position: formPosition || null
        });
        setSuccessMessage('Usuário salvo com sucesso.');
      } else {
        onAddUser({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          role: formRole,
          managementTermId: formManagementTermId || undefined,
          position: formPosition || null
        });
        if (formRole === 'diretoria_admin') {
          setSuccessMessage('Diretoria Admin criada e vinculada à gestão.');
        } else if (formRole === 'diretoria') {
          setSuccessMessage('Conta de Diretoria criada e vinculada à sua gestão.');
        } else {
          setSuccessMessage('Conta criada com sucesso.');
        }
      }

      setTimeout(() => {
        setSuccessMessage('');
      }, 4500);

      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar usuário.');
    }
  };

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-105 text-red-800 border-red-200';
      case 'diretoria_admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'diretoria':
        return 'bg-blue-105 text-blue-800 border-blue-200';
      default:
        return 'bg-teal-100 text-teal-800 border-teal-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'diretoria_admin': return 'Diretoria Admin';
      case 'diretoria': return 'Diretoria';
      default: return 'Visualização';
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition duration-200 animate-fade-in animate-duration-150">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4 p-1 cursor-pointer">✕</button>
        </div>
      )}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-display">Contas Internas do Sistema</h3>
          <p className="text-xs text-slate-500 mt-0.5">Defina cargos e permissões para moderadores do painel.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4.5 py-2 border border-transparent rounded-lg text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-550 shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {/* Users visual list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {users
          .filter(user => {
            if (currentUser.role === 'admin') {
              return true;
            }
            if (currentUser.role === 'diretoria_admin') {
              return user.role === 'diretoria' && user.managementTermId === currentUser.managementTermId;
            }
            return false;
          })
          .map(user => {
            const isSelf = user.id === currentUser.id;

          return (
            <div
              key={user.id}
              className="bg-white hover:bg-slate-50 border border-slate-205 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeClasses(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] font-bold text-slate-400 font-mono">Você mesmo</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-900 border border-amber-400/30 rounded-full flex items-center justify-center font-bold text-white font-display uppercase tracking-wide shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-sm truncate font-display">{user.name}</h4>
                    {user.position && (
                      <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5 mb-1 w-fit">
                        {user.position}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate mb-1 mt-1">
                      <Mail className="h-3 w-3 shrink-0" /> {user.email}
                    </p>
                    {user.managementTermId && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100/55 border border-slate-150 rounded px-1.5 py-0.5 mt-1 font-sans font-medium w-fit">
                        <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span>Gestão vinculada: <strong className="text-indigo-900 font-bold font-mono">{managementTerms.find(t => t.id === user.managementTermId)?.name || 'Carregando...'}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User card Actions */}
              <div className="flex items-center justify-end border-t border-slate-100 pt-3.5 mt-4">
                <div className="flex items-center gap-1.5">
                  {(currentUser.role === 'admin' || user.role !== 'admin') ? (
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition cursor-pointer"
                      title="Editar usuário"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium px-1.5 py-1">Sem Acesso</span>
                  )}

                  <button
                    disabled={isSelf || (currentUser.role === 'diretoria' && user.role === 'admin')}
                    onClick={() => {
                      if (confirm(`Deseja realmente apagar a conta de ${user.name}?`)) {
                        onDeleteUser(user.id);
                        setSuccessMessage('Usuário excluído com sucesso.');
                        setTimeout(() => {
                          setSuccessMessage('');
                        }, 4500);
                      }
                    }}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      (isSelf || (currentUser.role === 'diretoria' && user.role === 'admin'))
                        ? 'text-slate-350 bg-slate-100 cursor-not-allowed'
                        : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                    }`}
                    title={
                      isSelf 
                        ? 'Você não pode excluir sua própria conta acadêmica' 
                        : (currentUser.role === 'diretoria' && user.role === 'admin')
                        ? 'Contas com perfil de Diretoria não podem deletar administradores'
                        : 'Excluir usuário'
                    }
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add/Edit Overlay Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-202">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold font-display text-base">
                {editingUser ? 'Editar Conta' : 'Cadastrar Novo Usuário'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-850 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  disabled={editingUser !== null && currentUser.role === 'diretoria_admin'}
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Pedro da Silva Ramos"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-702 uppercase tracking-widest mb-1.5">
                  E-mail institucional (Login)
                </label>
                <input
                  type="email"
                  required
                  disabled={editingUser !== null && currentUser.role === 'diretoria_admin'}
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="Ex: pedro@demolay.com"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-702 uppercase tracking-widest mb-1.5">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  disabled={editingUser !== null && currentUser.role === 'diretoria_admin'}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {/* Role setting */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                  Perfil de Acesso
                </label>
                <select
                  disabled={currentUser.role !== 'admin'}
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {currentUser.role === 'admin' ? (
                    <>
                      <option value="admin">Administrador (Acesso Irrestrito)</option>
                      <option value="diretoria_admin">Diretoria Admin (Gerencia usuários da sua gestão)</option>
                      <option value="diretoria">Diretoria (Cadastra eventos, marca presenças, sem exclusões)</option>
                      <option value="visualizacao">Visualização (Apenas relatórios, sem alterações)</option>
                    </>
                  ) : (
                    <>
                      {formRole === 'diretoria_admin' && (
                        <option value="diretoria_admin">Diretoria Admin (Gerencia usuários da sua gestão)</option>
                      )}
                      <option value="diretoria">Diretoria (Cadastra eventos, marca presenças, sem exclusões)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Cargo/Função Dropdown */}
              {(formRole === 'diretoria' || currentUser.role === 'diretoria_admin') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                    <span>Cargo / Função</span>
                    <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-150 px-1.5 rounded font-bold uppercase tracking-wider">Obrigatório</span>
                  </label>
                  <select
                    required
                    value={formPosition}
                    onChange={e => setFormPosition(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
                  >
                    <option value="">Selecione o cargo/função...</option>
                    <option value="1º Conselheiro">1º Conselheiro</option>
                    <option value="2º Conselheiro">2º Conselheiro</option>
                    <option value="Secretário">Secretário</option>
                    <option value="Mordomo">Mordomo</option>
                    <option value="Hospitaleiro">Hospitaleiro</option>
                  </select>
                </div>
              )}

              {/* Management selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                  <span>Gestão Vinculada</span>
                  {(formRole === 'diretoria' || formRole === 'diretoria_admin') ? (
                    <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-150 px-1.5 rounded font-bold uppercase tracking-wider">Obrigatório</span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-normal">Opcional</span>
                  )}
                </label>
                {currentUser.role === 'diretoria_admin' ? (
                  <div className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-100 font-medium text-slate-700 select-none cursor-not-allowed">
                    Gestão vinculada: {managementTerms.find(term => term.id === currentUser.managementTermId)?.name || 'Nenhuma'}
                  </div>
                ) : (
                  <select
                    value={formManagementTermId}
                    onChange={e => setFormManagementTermId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
                  >
                    <option value="">Nenhuma gestão vinculada</option>
                    {managementTerms.map(term => (
                      <option key={term.id} value={term.id}>
                        {term.name} ({term.status === 'active' ? 'Ativo' : 'Arquivado'})
                      </option>
                    ))}
                  </select>
                )}
                {currentUser.role === 'diretoria_admin' && (
                  <p className="mt-1.5 text-xs text-amber-600 font-medium font-sans">
                    As contas criadas por você serão vinculadas automaticamente à sua gestão.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-55 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-955 bg-amber-400 hover:bg-amber-550 transition shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Atualizar Conta' : 'Gravar Moderador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
