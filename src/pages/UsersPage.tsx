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
  UserCheck
} from 'lucide-react';
import { User, UserRole } from '../types';

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
  // Only Admin and Diretoria have access (extra safety guard)
  if (currentUser.role !== 'admin' && currentUser.role !== 'diretoria') {
    return (
      <div className="bg-red-55 p-6 rounded-xl border border-red-200 text-center space-y-4 max-w-xl mx-auto">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto" />
        <h3 className="text-lg font-bold text-red-900">Acesso Restrito</h3>
        <p className="text-sm text-red-700">
          Você não tem permissões administrativas ou de diretoria suficientes para gerenciar os usuários internos do Capítulo.
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
  const [formError, setFormError] = useState('');

  // Open forms handlers
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole(currentUser.role === 'diretoria' ? 'diretoria' : 'visualizacao');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password);
    setFormRole(user.role);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

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

    if (currentUser.role === 'diretoria' && formRole === 'admin') {
      setFormError('Sua conta possui perfil de Diretoria e não tem privilégios para criar ou modificar contas do tipo Administrador.');
      return;
    }

    // Check if email already used (excluding current user edit)
    const emailConflict = users.some(
      u => u.email.toLowerCase() === formEmail.trim().toLowerCase() && u.id !== editingUser?.id
    );

    if (emailConflict) {
      setFormError('Este e-mail já está sendo utilizado por outro usuário acadêmico.');
      return;
    }

    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole
      });
      setSuccessMessage('Usuário salvo com sucesso.');
    } else {
      onAddUser({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole
      });
      setSuccessMessage('Usuário salvo com sucesso.');
    }

    setTimeout(() => {
      setSuccessMessage('');
    }, 4500);

    setIsFormOpen(false);
  };

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-105 text-red-800 border-red-200';
      case 'diretoria':
        return 'bg-blue-105 text-blue-800 border-blue-200';
      default:
        return 'bg-teal-100 text-teal-800 border-teal-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
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
        {users.map(user => {
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
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate font-display">{user.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* User card Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4">
                <div className="text-[10px] font-mono text-slate-400">
                  Senha: {user.password}
                </div>

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
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Pedro da Silva Ramos"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="Ex: pedro@demolay.com"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-702 uppercase tracking-widest mb-1.5">
                  Senha de Acesso
                </label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Role setting */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                  Perfil de Acesso (Cargo)
                </label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {currentUser.role === 'admin' && (
                    <option value="admin">Administrador (Acesso Irrestrito)</option>
                  )}
                  <option value="diretoria">Diretoria (Cadastra eventos, marca presenças, sem exclusões)</option>
                  <option value="visualizacao">Visualização (Apenas relatórios, sem alterações)</option>
                </select>
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
