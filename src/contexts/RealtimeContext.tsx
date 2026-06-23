import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useManagementTerm } from './ManagementTermContext';
import { User } from '../types';

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RealtimeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  payload: any;
}

interface RealtimeContextType {
  status: RealtimeStatus;
  triggerRefetch: () => void;
  registerListener: (tableName: string, callback: (event: RealtimeEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: React.ReactNode;
  currentUser: User | null;
  onRefreshData?: () => Promise<void> | void;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ 
  children, 
  currentUser, 
  onRefreshData 
}) => {
  const { activeTerm } = useManagementTerm();
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const listenersRef = useRef<{ [tableName: string]: ((event: RealtimeEvent) => void)[] }>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEventsRef = useRef<RealtimeEvent[]>([]);

  // Register page/component specific listeners
  const registerListener = (tableName: string, callback: (event: RealtimeEvent) => void) => {
    if (!listenersRef.current[tableName]) {
      listenersRef.current[tableName] = [];
    }
    listenersRef.current[tableName].push(callback);
    
    // Return cleanup function to unsubscribe
    return () => {
      listenersRef.current[tableName] = listenersRef.current[tableName].filter(
        cb => cb !== callback
      );
    };
  };

  // Helper to trigger refetch with debounce (groups multiple rapid updates)
  const triggerRefetch = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setStatus('connecting'); // show updating/re-syncing state briefly

    debounceTimeoutRef.current = setTimeout(async () => {
      console.log('[Realtime] Disparando refetch debulhado e agrupado...');
      try {
        if (onRefreshData) {
          await onRefreshData();
        }
        
        // Notify any active page-specific listeners with the pending events
        const eventsToNotify = [...pendingEventsRef.current];
        pendingEventsRef.current = [];
        
        eventsToNotify.forEach(event => {
          const tableListeners = listenersRef.current[event.table] || [];
          tableListeners.forEach(listener => {
            try {
              listener(event);
            } catch (err) {
              console.error(`[Realtime] Erro ao disparar listener na tabela ${event.table}:`, err);
            }
          });
        });

        setStatus('connected');
      } catch (err) {
        console.error('[Realtime] Erro ao sincronizar dados em background:', err);
        setStatus('error');
      }
    }, 500); // 500ms debounce
  };

  useEffect(() => {
    // Determine the relevant management term filter
    const activeTermId = activeTerm?.id;
    // diretoria_admin is strictly bound to their own term
    const restrictTermId = currentUser?.role === 'diretoria_admin' 
      ? currentUser.managementTermId 
      : activeTermId;

    console.log(`[Realtime] Iniciando canal central. Gestão ativa: ${activeTermId}. Restrição: ${restrictTermId}`);
    setStatus('connecting');

    // Create single central channel
    const channel = supabase.channel('central-realtime-channel');

    const handleTableEvent = (table: string, payload: any) => {
      console.log(`[Realtime] Evento recebido na tabela "${table}":`, payload);

      // Check management term constraint to ignore events from other terms
      const changedTermId = payload.new?.management_term_id || payload.old?.management_term_id;

      if (changedTermId && restrictTermId && changedTermId !== restrictTermId) {
        console.log(`[Realtime] Evento ignorado por gestão diferente. Evento: ${changedTermId}, Atual: ${restrictTermId}`);
        return;
      }

      // Buffer this event
      pendingEventsRef.current.push({
        table,
        eventType: payload.eventType,
        payload
      });

      // Trigger debounced refresh
      triggerRefetch();
    };

    // Subscriptions setup
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demolay_members' },
        (p) => handleTableEvent('demolay_members', p)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demolay_events' },
        (p) => handleTableEvent('demolay_events', p)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demolay_attendance' },
        (p) => handleTableEvent('demolay_attendance', p)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (p) => handleTableEvent('profiles', p)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'management_terms' },
        (p) => handleTableEvent('management_terms', p)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (p) => handleTableEvent('audit_logs', p)
      );

    // Subscribe and track status
    channel.subscribe((subStatus, err) => {
      if (err) {
        console.warn('[Realtime] Erro na inscrição do canal central:', err.message);
        setStatus('error');
      } else {
        console.log(`[Realtime] Conexão alterada: ${subStatus}`);
        if (subStatus === 'SUBSCRIBED') {
          setStatus('connected');
          console.log('[Realtime] Central sincronizada em tempo real.');
        } else if (subStatus === 'TIMED_OUT' || subStatus === 'CHANNEL_ERROR') {
          setStatus('error');
        } else if (subStatus === 'CLOSED') {
          // Normal close on cleanup
        }
      }
    });

    // Cleanup on unmount, logout, or term change
    return () => {
      console.log('[Realtime] Removendo canal central Realtime...');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [activeTerm?.id, currentUser?.id, currentUser?.managementTermId]);

  return (
    <RealtimeContext.Provider value={{ status, triggerRefetch, registerListener }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeSync = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeSync deve ser utilizado dentro de um RealtimeProvider');
  }
  return context;
};
