import { createClient } from '@supabase/supabase-js';

// Base credentials specified by the user
const DEFAULT_URL = 'https://udvdqptyzncoiybilelm.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_Ct1ooSZUuCbyWXxMUpHwSg_AkWt1nvS';

// Get and sanitize configured values
let supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_URL;
let supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

// Clean /rest/v1/ from URL prefix if present to prevent any routing errors
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1', '');
}

// Notice regarding Client-Side API security
/**
 * WARNING: This application connects to Supabase client-side in SPA mode.
 * Supabase Row Level Security (RLS) must be enabled on all tables in production
 * to prevent unauthorized anonymous read/write operations.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Table names
export const SUPABASE_TABLES = {
  MEMBERS: 'demolay_members',
  EVENTS: 'demolay_events',
  ATTENDANCES: 'demolay_attendance',
  USERS: 'demolay_users',
  PHOTOS: 'demolay_event_photos',
};

/**
 * Health check to verify tables exist and are querying correctly in the database.
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  tablesStatus: {
    members: boolean;
    events: boolean;
    attendances: boolean;
    users: boolean;
    photos: boolean;
  };
  error?: string;
}> {
  const status = {
    members: false,
    events: false,
    attendances: false,
    users: false,
    photos: false
  };

  try {
    // Check members
    const membersCheck = await supabase.from(SUPABASE_TABLES.MEMBERS).select('id').limit(1);
    status.members = !membersCheck.error;

    // Check events
    const eventsCheck = await supabase.from(SUPABASE_TABLES.EVENTS).select('id').limit(1);
    status.events = !eventsCheck.error;

    // Check attendances
    const attendancesCheck = await supabase.from(SUPABASE_TABLES.ATTENDANCES).select('id').limit(1);
    status.attendances = !attendancesCheck.error;

    // Check users
    const usersCheck = await supabase.from(SUPABASE_TABLES.USERS).select('id').limit(1);
    status.users = !usersCheck.error;

    // Check photos (graceful, if missing it won't block general connection indicator completely but will be logged)
    const photosCheck = await supabase.from(SUPABASE_TABLES.PHOTOS).select('id').limit(1);
    status.photos = !photosCheck.error;

    const connected = status.members && status.events && status.attendances && status.users;

    return {
      connected,
      tablesStatus: status,
      error: (!membersCheck.error && !eventsCheck.error && !attendancesCheck.error && !usersCheck.error) 
        ? undefined 
        : `Tabelas ausentes ou sem permissão: ${[
            membersCheck.error ? 'demolay_members' : '',
            eventsCheck.error ? 'demolay_events' : '',
            attendancesCheck.error ? 'demolay_attendance' : '',
            usersCheck.error ? 'demolay_users' : ''
          ].filter(Boolean).join(', ')}`
    };
  } catch (err: any) {
    return {
      connected: false,
      tablesStatus: status,
      error: err.message || 'Erro de conexão com o Supabase'
    };
  }
}
