import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle, 
  XSquare, 
  Copy, 
  Check, 
  AlertTriangle, 
  Terminal,
  HelpCircle
} from 'lucide-react';
import { checkSupabaseConnection } from '../utils/supabaseClient';
import { uploadLocalToSupabase, downloadSupabaseToLocal } from '../utils/supabaseService';

interface DatabaseSyncPageProps {
  onSyncComplete?: () => void;
}

export default function DatabaseSyncPage({ onSyncComplete }: DatabaseSyncPageProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    tablesStatus: {
      members: boolean;
      events: boolean;
      attendances: boolean;
      users: boolean;
    };
    error?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCheckConnection = async () => {
    setChecking(true);
    setSyncMessage(null);
    try {
      const status = await checkSupabaseConnection();
      setConnectionStatus(status);
    } catch (e: any) {
      setConnectionStatus({
        connected: false,
        tablesStatus: { members: false, events: false, attendances: false, users: false },
        error: e.message || 'Erro inesperado'
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    handleCheckConnection();
  }, []);

  const handleUpload = async () => {
    if (!window.confirm('Isto enviará TODOS os membros, eventos, presenças e usuários locais para o Supabase. Deseja continuar?')) return;
    setLoading(true);
    setSyncMessage(null);
    try {
      const res = await uploadLocalToSupabase();
      if (res.success) {
        setSyncMessage({ type: 'success', text: res.message });
        await handleCheckConnection();
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Erro de rede' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!window.confirm('Atenção: Isto substituirá seus dados locais no navegador pelos dados que estão no Supabase. Deseja continuar?')) return;
    setLoading(true);
    setSyncMessage(null);
    try {
      const res = await downloadSupabaseToLocal();
      if (res.success) {
        setSyncMessage({ type: 'success', text: res.message });
        await handleCheckConnection();
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Erro de rede' });
    } finally {
      setLoading(false);
    }
  };

  const sqlScript = `-- 1. CRIAR TABELA DE MEMBROS
CREATE TABLE IF NOT EXISTS "demolay_members" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "joinedAt" TEXT,
  "notes" TEXT,
  "createdAt" TEXT,
  "degree" TEXT NOT NULL DEFAULT 'iniciatico',
  "isNominata" BOOLEAN NOT NULL DEFAULT false,
  "nominataRole" TEXT,
  "isNominataIniciacao" BOOLEAN,
  "nominataIniciacaoRole" TEXT,
  "isNominataElevacao" BOOLEAN,
  "nominataElevacaoRole" TEXT
);

-- 2. CRIAR TABELA DE EVENTOS
CREATE TABLE IF NOT EXISTS "demolay_events" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TEXT,
  "requiredFor" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "optionalFor" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "nominataType" TEXT DEFAULT 'none'
);

-- 3. CRIAR TABELA DE PRESENÇAS / ATTENDANCE
CREATE TABLE IF NOT EXISTS "demolay_attendance" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'absent',
  "note" TEXT,
  "eligibility" TEXT
);

-- 4. CRIAR TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS "demolay_users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'visualizacao'
);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-indigo-600 h-5 w-5" />
            Integração com Supabase
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Configure e sincronize os dados da sua aplicação com a nuvem do Supabase em tempo real.
          </p>
        </div>
        <button
          onClick={handleCheckConnection}
          disabled={checking || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
          Verificar Conexão
        </button>
      </div>

      {/* Sync Alerts */}
      {syncMessage && (
        <div className={`p-4 rounded-xl border ${
          syncMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        } text-xs font-semibold`}>
          {syncMessage.text}
        </div>
      )}

      {/* Connection status panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Connection status */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Status do Banco de Dados</h3>
          
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            {checking ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Verificando tabelas no Supabase...</span>
              </div>
            ) : connectionStatus?.connected ? (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Conectado com Sucesso!</h4>
                  <p className="text-[10px] text-slate-550 mt-0.5">Todas as tabelas foram detectadas no seu projeto Supabase.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Pendência de Estruturação</h4>
                  <p className="text-[10px] text-slate-550 mt-0.5">
                    Não foi possível consultar as tabelas necessárias no Supabase. Copie o script SQL ao lado e execute-o no Editor SQL do seu painel Supabase.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Verificação de Tabelas (Esquema)</span>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
                <span className="font-mono text-[11px]">demolay_members</span>
                {checking ? (
                  <span className="text-slate-400">...</span>
                ) : connectionStatus?.tablesStatus.members ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Ativa</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-750 px-1.5 py-0.5 rounded font-bold">Inativa</span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
                <span className="font-mono text-[11px]">demolay_events</span>
                {checking ? (
                  <span className="text-slate-400">...</span>
                ) : connectionStatus?.tablesStatus.events ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Ativa</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-750 px-1.5 py-0.5 rounded font-bold">Inativa</span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
                <span className="font-mono text-[11px]">demolay_attendance</span>
                {checking ? (
                  <span className="text-slate-400">...</span>
                ) : connectionStatus?.tablesStatus.attendances ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Ativa</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-750 px-1.5 py-0.5 rounded font-bold">Inativa</span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
                <span className="font-mono text-[11px]">demolay_users</span>
                {checking ? (
                  <span className="text-slate-400">...</span>
                ) : connectionStatus?.tablesStatus.users ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Ativa</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-750 px-1.5 py-0.5 rounded font-bold">Inativa</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-150">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Destinação das Operações</span>
            <div className="text-[10.5px] font-medium text-slate-650 bg-indigo-50 border border-indigo-100 p-2.5 rounded text-left leading-normal">
              A URL do banco configurada é: <strong className="font-mono text-[10px] text-indigo-900 block mt-0.5 select-all">https://udvdqptyzncoiybilelm.supabase.co</strong>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUpload}
              disabled={loading || checking}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              Enviar Dados Locais
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || checking || !connectionStatus?.connected}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              title={!connectionStatus?.connected ? 'Crie o esquema de tabelas primeiro' : 'Baixar do Supabase'}
            >
              <DownloadCloud className="h-4 w-4" />
              Baixar do Supabase
            </button>
          </div>

        </div>

        {/* Copy schema */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Estruturação de Tabelas (SQL)</h3>
            <button
              onClick={copyToClipboard}
              className="text-xs inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-semibold"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar Script
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Se for a primeira vez integrando, abra o painel do seu projeto no Supabase, navegue em <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, cole este script abaixo e clique em <strong>Run</strong>:
          </p>

          <div className="font-mono text-[9px] bg-slate-900 text-slate-200 p-4 rounded-lg overflow-y-auto max-h-48 whitespace-pre border border-slate-950 flex-1 relative">
            <Terminal className="h-4 w-4 text-slate-650 absolute right-3 top-3 pointer-events-none" />
            {sqlScript}
          </div>
        </div>

      </div>

    </div>
  );
}
