import { supabase, SUPABASE_TABLES, checkSupabaseConnection } from './supabaseClient';
import { Member, Event, Attendance, User, EventPhoto, ManagementTerm } from '../types';
import { 
  saveMembers as saveLocalMembers,
  saveEvents as saveLocalEvents,
  saveAttendances as saveLocalAttendances,
  saveUsers as saveLocalUsers,
  getMembers as getLocalMembers,
  getEvents as getLocalEvents,
  getAttendances as getLocalAttendances,
  getUsers as getLocalUsers,
  getEventPhotos,
  saveEventPhotos,
  getLocalManagementTerms,
  saveLocalManagementTerms
} from './storage';

/**
 * Pushes individual member data to Supabase.
 */
export async function pushMemberToSupabase(member: Member): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.MEMBERS)
      .upsert({
        id: member.id,
        name: member.name,
        status: member.status,
        joinedAt: member.joinedAt,
        notes: member.notes,
        createdAt: member.createdAt,
        degree: member.degree,
        isNominata: member.isNominata,
        nominataRole: member.nominataRole,
        isNominataIniciacao: member.isNominataIniciacao,
        nominataIniciacaoRole: member.nominataIniciacaoRole,
        isNominataElevacao: member.isNominataElevacao,
        nominataElevacaoRole: member.nominataElevacaoRole,
        management_term_id: member.managementTermId,
        evaluation_start_date: member.evaluationStartDate
      });
    if (error) console.warn('Erro ao salvar membro no Supabase:', error.message);
  } catch (err) {
    console.warn('Erro de rede ao salvar membro no Supabase:', err);
  }
}

/**
 * Deletes member data from Supabase.
 */
export async function deleteMemberFromSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.MEMBERS)
      .delete()
      .eq('id', id);
    if (error) console.warn('Erro ao excluir membro do Supabase:', error.message);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Pushes individual event data to Supabase.
 */
export async function pushEventToSupabase(event: Event): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.EVENTS)
      .upsert({
        id: event.id,
        title: event.title,
        category: event.category,
        date: event.date,
        description: event.description,
        createdAt: event.createdAt,
        requiredFor: event.requiredFor,
        optionalFor: event.optionalFor,
        nominataType: event.nominataType || 'none',
        management_term_id: event.managementTermId
      });
    if (error) console.warn('Erro ao salvar evento no Supabase:', error.message);
  } catch (err) {
    console.warn('Erro de rede ao salvar evento no Supabase:', err);
  }
}

/**
 * Deletes event data from Supabase.
 */
export async function deleteEventFromSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.EVENTS)
      .delete()
      .eq('id', id);
    if (error) console.warn('Erro ao excluir evento do Supabase:', error.message);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Deletes all attendance records associated with a specific event ID.
 */
export async function deleteAttendancesByEventId(eventId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.ATTENDANCES)
      .delete()
      .eq('eventId', eventId);
    if (error) console.warn('Erro ao excluir presenças do evento no Supabase:', error.message);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Deletes all attendance records associated with a specific member ID.
 */
export async function deleteAttendancesByMemberId(memberId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.ATTENDANCES)
      .delete()
      .eq('memberId', memberId);
    if (error) console.warn('Erro ao excluir presenças do membro no Supabase:', error.message);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Pushes attendance list changes to Supabase in bulk or one by one.
 */
export async function pushAttendancesToSupabase(attendances: Attendance[]): Promise<void> {
  try {
    // Upsert the entire array of changed attendances
    const rows = attendances.map(a => ({
      id: a.id,
      eventId: a.eventId,
      memberId: a.memberId,
      status: a.status,
      note: a.note || '',
      eligibility: a.eligibility || 'not_applicable',
      management_term_id: a.managementTermId
    }));

    const { error } = await supabase
      .from(SUPABASE_TABLES.ATTENDANCES)
      .upsert(rows);
    if (error) console.warn('Erro ao salvar presenças no Supabase:', error.message);
  } catch (err) {
    console.warn('Erro de rede ao salvar presenças no Supabase:', err);
  }
}

/**
 * Pushes individual user data to Supabase.
 */
export async function pushUserToSupabase(user: User): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        management_term_id: user.managementTermId,
        created_by: user.createdBy
      });
    if (error) console.warn('Erro ao salvar usuário no Supabase:', error.message);
  } catch (err) {
    console.warn('Erro de rede ao salvar usuário no Supabase:', err);
  }
}

/**
 * Deletes user data from Supabase.
 */
export async function deleteUserFromSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .delete()
      .eq('id', id);
    if (error) console.warn('Erro ao excluir usuário do Supabase:', error.message);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Pushes individual photo to Supabase.
 */
export async function pushPhotoToSupabase(photo: EventPhoto): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.PHOTOS)
      .upsert({
        id: photo.id,
        eventId: photo.eventId,
        photo: photo.photo,
        createdAt: photo.createdAt
      });
    if (error) console.warn('Erro ao salvar foto de comprovação no Supabase:', error.message);
  } catch (err) {
    console.warn('Erro de rede ao salvar foto no Supabase:', err);
  }
}

/**
 * Deletes individual photo from Supabase.
 */
export async function deletePhotoFromSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.PHOTOS)
      .delete()
      .eq('id', id);
    if (error) console.warn('Erro ao excluir foto do Supabase:', error.message);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Pushes all local storage tables to Supabase.
 * Useful to initialize or force-sync the database.
 */
export async function uploadLocalToSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    const testConn = await checkSupabaseConnection();
    if (!testConn.connected) {
      return { success: false, message: testConn.error || 'Conexão mal sucedida' };
    }

    const localMembers = getLocalMembers();
    const localEvents = getEventsList();
    const localAttendances = getAttendancesList();
    const localUsers = getLocalUsers();
    const localPhotos = getEventPhotos();

    // 1. Members
    if (localMembers.length > 0) {
      const rows = localMembers.map(member => ({
        id: member.id,
        name: member.name,
        status: member.status,
        joinedAt: member.joinedAt,
        notes: member.notes,
        createdAt: member.createdAt,
        degree: member.degree,
        isNominata: member.isNominata,
        nominataRole: member.nominataRole,
        isNominataIniciacao: member.isNominataIniciacao,
        nominataIniciacaoRole: member.nominataIniciacaoRole,
        isNominataElevacao: member.isNominataElevacao,
        nominataElevacaoRole: member.nominataElevacaoRole,
        management_term_id: member.managementTermId,
        evaluation_start_date: member.evaluationStartDate
      }));
      const { error } = await supabase.from(SUPABASE_TABLES.MEMBERS).upsert(rows);
      if (error) throw new Error(`Membros: ${error.message}`);
    }

    // 2. Events
    if (localEvents.length > 0) {
      const rows = localEvents.map(event => ({
        id: event.id,
        title: event.title,
        category: event.category,
        date: event.date,
        description: event.description,
        createdAt: event.createdAt,
        requiredFor: event.requiredFor,
        optionalFor: event.optionalFor,
        nominataType: event.nominataType || 'none',
        management_term_id: event.managementTermId
      }));
      const { error } = await supabase.from(SUPABASE_TABLES.EVENTS).upsert(rows);
      if (error) throw new Error(`Eventos: ${error.message}`);
    }

    // 3. Attendances
    if (localAttendances.length > 0) {
      const rows = localAttendances.map(a => ({
        id: a.id,
        eventId: a.eventId,
        memberId: a.memberId,
        status: a.status,
        note: a.note || '',
        eligibility: a.eligibility || 'not_applicable',
        management_term_id: a.managementTermId
      }));
      const { error } = await supabase.from(SUPABASE_TABLES.ATTENDANCES).upsert(rows);
      if (error) throw new Error(`Presenças: ${error.message}`);
    }

    // 4. Users
    if (localUsers.length > 0) {
      const rows = localUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        management_term_id: user.managementTermId,
        created_by: user.createdBy
      }));
      const { error } = await supabase.from(SUPABASE_TABLES.USERS).upsert(rows);
      if (error) throw new Error(`Usuários: ${error.message}`);
    }

    // 5. Photos
    if (localPhotos.length > 0) {
      const rows = localPhotos.map(p => ({
        id: p.id,
        eventId: p.eventId,
        photo: p.photo,
        createdAt: p.createdAt
      }));
      try {
        await supabase.from(SUPABASE_TABLES.PHOTOS).upsert(rows);
      } catch (photoErr) {
        console.warn('Erro não-crítico ao sincronizar fotos local -> Supabase:', photoErr);
      }
    }

    return { success: true, message: 'Todos os dados locais foram enviados com sucesso para o banco de dados Supabase!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao enviar dados: ${err.message}` };
  }
}

/**
 * Downloads all data from Supabase and replaces local storage.
 */
export async function downloadSupabaseToLocal(): Promise<{ success: boolean; message: string; data?: { members: Member[]; events: Event[]; attendances: Attendance[]; users: User[]; managementTerms: ManagementTerm[] } }> {
  try {
    // 1. Fetch Members
    const membersRes = await supabase.from(SUPABASE_TABLES.MEMBERS).select('*');
    if (membersRes.error) throw new Error(`Erro ao buscar Membros: ${membersRes.error.message}`);

    // 2. Fetch Events
    const eventsRes = await supabase.from(SUPABASE_TABLES.EVENTS).select('*');
    if (eventsRes.error) throw new Error(`Erro ao buscar Eventos: ${eventsRes.error.message}`);

    // 3. Fetch Attendances
    const attendancesRes = await supabase.from(SUPABASE_TABLES.ATTENDANCES).select('*');
    if (attendancesRes.error) throw new Error(`Erro ao buscar Presenças: ${attendancesRes.error.message}`);

    // 4. Fetch Users
    const usersRes = await supabase.from(SUPABASE_TABLES.USERS).select('*');
    if (usersRes.error) throw new Error(`Erro ao buscar Usuários: ${usersRes.error.message}`);

    // 5. Fetch Management Terms
    let fetchedManagementTerms: ManagementTerm[] = [];
    let termLoadError = false;
    try {
      const termsRes = await supabase.from(SUPABASE_TABLES.MANAGEMENT_TERMS).select('*');
      if (termsRes.error) {
        console.warn('Erro ao baixar gestões do Supabase:', termsRes.error.message);
        termLoadError = true;
      } else if (termsRes.data) {
        fetchedManagementTerms = termsRes.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          semester: t.semester,
          startDate: t.start_date,
          endDate: t.end_date,
          status: t.status,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
      }
    } catch (termErr) {
      console.warn('Erro não-crítico ao baixar gestões do Supabase:', termErr);
      termLoadError = true;
    }

    // 6. Fetch Photos (Non-blocking fallback to keep the sync resilient)
    let fetchedPhotos: EventPhoto[] = [];
    try {
      const photosRes = await supabase.from(SUPABASE_TABLES.PHOTOS).select('*');
      if (!photosRes.error && photosRes.data) {
        fetchedPhotos = photosRes.data.map((p: any) => ({
          id: p.id,
          eventId: p.eventId,
          photo: p.photo,
          createdAt: p.createdAt || new Date().toISOString()
        }));
      }
    } catch (photoErr) {
      console.warn('Erro não-crítico ao baixar fotos do Supabase:', photoErr);
    }

    const fetchedMembers: Member[] = (membersRes.data || []).map(m => ({
      id: m.id,
      name: m.name,
      status: m.status || 'active',
      joinedAt: m.joinedAt || '',
      notes: m.notes || '',
      createdAt: m.createdAt || '',
      degree: m.degree || 'iniciatico',
      isNominata: m.isNominata ?? false,
      nominataRole: m.nominataRole || '',
      isNominataIniciacao: m.isNominataIniciacao ?? false,
      nominataIniciacaoRole: m.nominataIniciacaoRole || '',
      isNominataElevacao: m.isNominataElevacao ?? false,
      nominataElevacaoRole: m.nominataElevacaoRole || '',
      managementTermId: m.management_term_id || undefined,
      evaluationStartDate: m.evaluation_start_date || m.joinedAt || m.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
    }));

    const fetchedEvents: Event[] = (eventsRes.data || []).map(e => ({
      id: e.id,
      title: e.title || '',
      category: e.category,
      date: e.date,
      description: e.description || '',
      createdAt: e.createdAt || '',
      requiredFor: Array.isArray(e.requiredFor) ? e.requiredFor : [],
      optionalFor: Array.isArray(e.optionalFor) ? e.optionalFor : [],
      nominataType: e.nominataType || 'none',
      managementTermId: e.management_term_id || undefined
    }));

    const fetchedAttendances: Attendance[] = (attendancesRes.data || []).map(a => ({
      id: a.id,
      eventId: a.eventId,
      memberId: a.memberId,
      status: a.status,
      note: a.note || '',
      eligibility: a.eligibility || 'not_applicable',
      managementTermId: a.management_term_id || undefined
    }));

    const fetchedUsers: User[] = (usersRes.data || []).map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      password: u.password || '',
      role: u.role || 'visualizacao',
      managementTermId: u.management_term_id || undefined,
      createdBy: u.created_by || undefined
    }));

    // Update local storage so that subsequent syncs and UI loads remain unified
    saveLocalMembers(fetchedMembers);
    saveLocalEvents(fetchedEvents);
    saveLocalAttendances(fetchedAttendances);
    saveLocalUsers(fetchedUsers);
    if (!termLoadError) {
      saveLocalManagementTerms(fetchedManagementTerms);
    }
    saveEventPhotos(fetchedPhotos);

    return {
      success: true,
      message: 'Dados baixados com sucesso e unificados no navegador!',
      data: {
        members: fetchedMembers,
        events: fetchedEvents,
        attendances: fetchedAttendances,
        users: fetchedUsers,
        managementTerms: fetchedManagementTerms
      }
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao baixar dados: ${err.message}` };
  }
}

// Helpers to read without circular import issues
function getEventsList(): Event[] {
  try {
    return getLocalEvents();
  } catch {
    return [];
  }
}

function getAttendancesList(): Attendance[] {
  try {
    return getLocalAttendances();
  } catch {
    return [];
  }
}

/**
 * Pushes general management term data to Supabase.
 */
export async function pushManagementTermToSupabase(term: ManagementTerm): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.MANAGEMENT_TERMS)
      .upsert({
        id: term.id,
        name: term.name,
        year: term.year,
        semester: term.semester,
        start_date: term.startDate,
        end_date: term.endDate,
        status: term.status
      });
    if (error) {
      console.warn('Erro ao salvar gestão no Supabase:', error.message);
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Salvo no Supabase com sucesso.' };
  } catch (err: any) {
    console.warn('Erro de rede ao salvar gestão no Supabase:', err);
    return { success: false, message: err.message || String(err) };
  }
}

/**
 * Deletes management term data from Supabase.
 */
export async function deleteManagementTermFromSupabase(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.MANAGEMENT_TERMS)
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Erro ao excluir gestão do Supabase:', error.message);
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Excluído do Supabase com sucesso.' };
  } catch (err: any) {
    console.warn('Erro de rede ao excluir gestão no Supabase:', err);
    return { success: false, message: err.message || String(err) };
  }
}
