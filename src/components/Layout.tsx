import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagementTerm } from '../contexts/ManagementTermContext';
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
  Database,
  AlertTriangle,
  CheckCircle,
  Eye,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { canEditCurrentManagementTerm } from '../utils/permission';
import { useRealtimeSync } from '../contexts/RealtimeContext';

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
  const navigate = useNavigate();
  const { activeTerm } = useManagementTerm();
  const { status } = useRealtimeSync();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderRealtimeBadge = (isMobile: boolean = false) => {
    switch (status) {
      case 'connecting':
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse ${isMobile ? 'text-[10px]' : ''}`}>
            <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
            <span>Atualizando...</span>
          </div>
        );
      case 'connected':
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 ${isMobile ? 'text-[10px]' : ''}`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>Sincronizado</span>
          </div>
        );
      case 'error':
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 ${isMobile ? 'text-[10px]' : ''}`}>
            <WifiOff className="h-3 w-3 text-rose-500" />
            <span>Conexão Offline</span>
          </div>
        );
      default:
        return null;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] },
    { id: 'membros', label: 'Membros', icon: Users, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] },
    { id: 'nominata', label: 'Nominatas', icon: Shield, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] },
    { id: 'eventos', label: 'Eventos', icon: Calendar, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] },
    { id: 'presencas', label: 'Presenças', icon: CheckSquare, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] }, 
    { id: 'classificacao', label: 'Classificação', icon: Trophy, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'diretoria_admin', 'diretoria', 'visualizacao'] },
    { id: 'auditoria', label: 'Auditoria', icon: Eye, roles: ['admin', 'diretoria_admin'] },
    { id: 'database', label: 'Banco Supabase', icon: Database, roles: ['admin'] },
    { id: 'usuarios', label: 'Usuários', icon: UserCircle, roles: ['admin', 'diretoria_admin'] },
    { id: 'gestoes', label: 'Gestões', icon: Calendar, roles: ['admin'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', classes: 'bg-red-100 text-red-800 border-red-200' };
      case 'diretoria_admin':
        return { label: 'Diretoria Admin', classes: 'bg-orange-100 text-orange-800 border-orange-200' };
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
            PAAD - DeMolay
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {renderRealtimeBadge(true)}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
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
                <span className="font-bold font-display text-white">PAAD - DeMolay</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current user summary */}
            <div className="py-4 border-b border-slate-800">
              <p className="text-xs text-slate-400" style={{ color: '#94a3b8' }}>Usuário conectado</p>
              <p className="font-semibold text-sm truncate mt-0.5">{currentUser.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.classes}`}>
                  {roleInfo.label}
                </span>
                {activeTerm && (
                  <span className="inline-flex items-center bg-indigo-900/50 border border-indigo-700/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-indigo-200">
                    S: {activeTerm.name}
                  </span>
                )}
              </div>
              {activeTerm && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin/selecionar-gestao');
                  }}
                  className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Trocar Gestão
                </button>
              )}
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
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 font-display capitalize">
              {
                activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'membros' ? 'Membros' :
                activeTab === 'nominata' ? 'Nominatas' :
                activeTab === 'eventos' ? 'Eventos' :
                activeTab === 'presencas' ? 'Presenças' :
                activeTab === 'classificacao' ? 'Classificação' :
                activeTab === 'relatorios' ? 'Relatórios' :
                activeTab === 'auditoria' ? 'Auditoria' :
                activeTab === 'usuarios' ? 'Usuários' :
                activeTab === 'gestoes' ? 'Gestões' :
                activeTab
              }
            </h2>
            <span className="text-slate-400 text-xs font-medium">• Gestão de Presença Capítulo</span>
            {renderRealtimeBadge(false)}
          </div>
          <div className="flex items-center gap-4">
            {activeTerm && (
              <div className="bg-indigo-50 border border-indigo-150 rounded-lg px-3 py-1 flex items-center gap-2 shadow-xs shrink-0 select-none">
                <span className="text-xs text-indigo-850 font-sans font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                  Gestão atual: <strong className="font-mono font-bold text-indigo-950">{activeTerm.name}</strong>
                </span>
                <button
                  onClick={() => navigate('/admin/selecionar-gestao')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-all duration-150 cursor-pointer"
                >
                  Trocar gestão
                </button>
              </div>
            )}
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
          {/* Management Term Active Warning / Success Banner */}
          {activeTerm && (
            canEditCurrentManagementTerm(currentUser, activeTerm) ? (
              <div className="no-print bg-emerald-50 border border-emerald-200/60 p-3 rounded-lg text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-xs mb-3">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="leading-relaxed font-sans text-[11px] text-emerald-850">
                  Você está lançando dados na gestão: <strong className="text-emerald-950 font-mono font-bold">{activeTerm.name}</strong>
                </p>
              </div>
            ) : (
              <div className="no-print bg-amber-50 border border-amber-200/60 p-3 rounded-lg text-amber-900 text-xs font-semibold flex items-center gap-2 shadow-xs mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="leading-relaxed font-sans text-[11px] text-amber-850">
                  Você está visualizando uma gestão fora da sua permissão de edição. Nesta gestão, seu acesso é somente leitura.
                </p>
              </div>
            )
          )}

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
