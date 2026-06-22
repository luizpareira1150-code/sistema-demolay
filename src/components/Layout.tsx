import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  Trophy,
  FileText,
  UserCircle,
  LogOut,
  Menu,
  X,
  Database
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export default function Layout({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  children
}: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'diretoria', 'visualizacao'] },
    { id: 'membros', label: 'Membros', icon: Users, roles: ['admin', 'diretoria', 'visualizacao'] },
    { id: 'nominata', label: 'Nominatas', icon: Shield, roles: ['admin', 'diretoria', 'visualizacao'] },
    { id: 'eventos', label: 'Eventos', icon: Calendar, roles: ['admin', 'diretoria', 'visualizacao'] },
    { id: 'presencas', label: 'Presenças', icon: CheckSquare, roles: ['admin', 'diretoria', 'visualizacao'] }, 
    { id: 'classificacao', label: 'Classificação', icon: Trophy, roles: ['admin', 'diretoria', 'visualizacao'] },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'diretoria', 'visualizacao'] },
    { id: 'database', label: 'Banco Supabase', icon: Database, roles: ['admin'] },
    { id: 'usuarios', label: 'Usuários', icon: UserCircle, roles: ['admin', 'diretoria'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', classes: 'bg-red-100 text-red-800 border-red-200' };
      case 'diretoria':
        return { label: 'Diretoria', classes: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'Visualização', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const roleInfo = getRoleLabel(currentUser.role);

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Desktop Sidebar (hidden on printing and on mobile) */}
      <aside className="no-print hidden md:flex md:flex-col md:w-64 bg-slate-900 text-white border-r border-slate-800 shrink-0">
        {/* Sidebar Header - Brand Icon & Text matching 'Sleek Interface' theme */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-900 text-sm shrink-0">
              DM
            </div>
            <h1 className="text-white font-semibold text-sm leading-tight tracking-wide font-display">
              PAINEL<br/>DEMOLAY
            </h1>
          </div>
        </div>

        {/* Action Menu Links */}
        <nav className="flex-1 px-4 space-y-1">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Status and Sidebar Logout Footer */}
        <div className="mt-auto p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-705 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0" style={{ backgroundColor: '#475569' }}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-450 truncate uppercase tracking-wider">{roleInfo.label}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/35 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Mobile Header Menu (hidden on printing and on desktop) */}
      <header className="no-print md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-900 text-xs shrink-0">
            DM
          </div>
          <h2 className="font-bold text-sm tracking-wide font-display text-white">
            Painel DeMolay
          </h2>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col w-5/6 max-w-xs bg-slate-900 text-white h-full p-4 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-900 text-sm shrink-0">
                  DM
                </div>
                <span className="font-bold font-display text-white">Painel DeMolay</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current user summary */}
            <div className="py-4 border-b border-slate-800">
              <p className="text-xs text-slate-405" style={{ color: '#94a3b8' }}>Usuário conectado</p>
              <p className="font-semibold text-sm truncate mt-0.5">{currentUser.name}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.classes}`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="flex-1 py-4 space-y-1 overflow-y-auto">
              {filteredMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-850 text-white font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-404'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-400 hover:bg-rose-955/20 hover:text-rose-300 transition"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header containing active view title and metadata */}
        <header className="no-print hidden md:flex items-center justify-between px-8 bg-white border-b border-slate-200 h-16 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 font-display capitalize">
              {
                activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'membros' ? 'Membros' :
                activeTab === 'nominata' ? 'Nominatas' :
                activeTab === 'eventos' ? 'Eventos' :
                activeTab === 'presencas' ? 'Presenças' :
                activeTab === 'classificacao' ? 'Classificação' :
                activeTab === 'relatorios' ? 'Relatórios' :
                activeTab === 'usuarios' ? 'Usuários' :
                activeTab
              }
            </h2>
            <span className="text-slate-400 text-xs font-medium">• Gestão de Presença Capítulo</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Período Letivo</p>
              <p className="text-xs font-semibold text-slate-700">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        {/* Child Pages Router Container - Scroll locked body */}
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto bg-slate-50">
          {/* Supabase Database Sync Status Notice */}
          {currentUser.role === 'admin' && (
            <div className="no-print bg-indigo-50 border border-indigo-200/60 p-3 rounded-lg text-indigo-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs mb-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[10px] bg-indigo-250 text-indigo-950 px-1.5 py-0.5 rounded uppercase shrink-0">Supabase</span>
                <p className="leading-relaxed font-sans text-[11px] text-indigo-850">
                  Integração ativa! Os dados estão sincronizados em tempo real com o banco de dados Supabase na nuvem.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('database')} 
                className="text-[10px] shrink-0 bg-indigo-600 font-extrabold text-white px-2 py-1 rounded shadow-xs hover:bg-indigo-750 transition duration-150"
              >
                Configurações
              </button>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
