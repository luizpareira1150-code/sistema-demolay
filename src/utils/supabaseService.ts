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
    const payload = {
      id: member.id,
      name: member.name,
      status: member.status ?? 'active',
      joinedAt: member.joinedAt || null,
      notes: member.notes || null,
      createdAt: member.createdAt || null,
      degree: member.degree ?? 'iniciatico',
      isNominata: member.isNominata ?? false,
      nominataRole: member.nominataRole || null,
      isNominataIniciacao: member.isNominataIniciacao ?? false,
      nominataIniciacaoRole: member.nominataIniciacaoRole || null,
      isNominataElevacao: member.isNominataElevacao ?? false,
      nominataElevacaoRole: member.nominataElevacaoRole || null,
      management_term_id: member.managementTermId || null,
      evaluation_start_date: member.evaluationStartDate || null
    };

    const { error } = await supabase
      .from(SUPABASE_TABLES.MEMBERS)
      .upsert(payload);
    if (error) {
      console.warn('Erro ao salvar membro no Supabase:', error.message);
      throw error;
    }
  } catch (err) {
    console.warn('Erro de rede ao salvar membro no Supabase:', err);
    throw err;
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
    const payload: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      management_term_id: user.managementTermId || null,
      created_by: user.createdBy || null,
      position: user.position || null
    };

    let { error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .upsert(payload);

    // Se houver erro relacionado ao campo 'position' (coluna inexistente no banco antigo)
    if (error && (
      error.message.includes('position') ||
      error.message.includes('column') ||
      error.message.includes('schema cache')
    )) {
      console.warn('Falha ao salvar usuário com "position". Tentando sem este campo...');
      delete payload.position;
      const retryResult = await supabase
        .from(SUPABASE_TABLES.USERS)
        .upsert(payload);
      error = retryResult.error;
    }

    // Se houver erro relacionado ao campo 'created_by' (coluna inexistente ou chave estrangeira violada)
    if (error && (
      error.message.includes('created_by') || 
      error.message.includes('column') || 
      error.message.includes('schema cache') ||
      error.message.includes('foreign key') || 
      error.message.includes('constraint') ||
      error.code === '23503' ||
      error.code === 'PGRST204'
    )) {
      console.warn('Falha ao salvar usuário com "created_by". Tentando sem este campo...');
      const { created_by, ...payloadWithoutCreatedBy } = payload;
      const retryResult = await supabase
        .from(SUPABASE_TABLES.USERS)
        .upsert(payloadWithoutCreatedBy);
      error = retryResult.error;
    }

    // Se ainda houver erro de chave estrangeira (por exemplo, em management_term_id) e o perfil não for Diretoria/Diretoria Admin, tenta sem ela
    if (error && user.role !== 'diretoria' && user.role !== 'diretoria_admin' && (
      error.message.includes('management_term') ||
      error.message.includes('foreign key') ||
      error.code === '23503'
    )) {
      console.warn('Falha persistente do banco. Tentando salvar sem campos de relacionamento...');
      const cleanPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        management_term_id: null,
        created_by: null
      };
      const retryResult = await supabase
        .from(SUPABASE_TABLES.USERS)
        .upsert(cleanPayload);
      error = retryResult.error;
    }

    if (error) {
      console.warn('Erro definitivo ao salvar usuário no Supabase:', error.message, error.code);
    } else {
      console.log(`Usuário ${user.email} salvo com sucesso no Supabase.`);
    }
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
        status: member.status ?? 'active',
        joinedAt: member.joinedAt || null,
        notes: member.notes || null,
        createdAt: member.createdAt || null,
        degree: member.degree ?? 'iniciatico',
        isNominata: member.isNominata ?? false,
        nominataRole: member.nominataRole || null,
        isNominataIniciacao: member.isNominataIniciacao ?? false,
        nominataIniciacaoRole: member.nominataIniciacaoRole || null,
        isNominataElevacao: member.isNominataElevacao ?? false,
        nominataElevacaoRole: member.nominataElevacaoRole || null,
        management_term_id: member.managementTermId || null,
        evaluation_start_date: member.evaluationStartDate || null
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
        management_term_id: user.managementTermId || null,
        created_by: user.createdBy || null,
        position: user.position || null
      }));
      let { error } = await supabase.from(SUPABASE_TABLES.USERS).upsert(rows);

      // Se houver erro relacionado ao campo 'position' (coluna inexistente)
      if (error && (
        error.message.includes('position') ||
        error.message.includes('column') ||
        error.message.includes('schema cache')
      )) {
        console.warn('Tentando sincronização em lote de usuários sem a coluna "position"...');
        const rowsWithoutPosition = rows.map(({ position, ...rest }) => rest);
        const retryResult = await supabase.from(SUPABASE_TABLES.USERS).upsert(rowsWithoutPosition);
        error = retryResult.error;
      }

      // Se houver erro relacionado ao campo 'created_by' (coluna inexistente ou chave estrangeira violada)
      if (error && (
        error.message.includes('created_by') || 
        error.message.includes('column') || 
        error.message.includes('schema cache') ||
        error.message.includes('foreign key') || 
        error.message.includes('constraint') ||
        error.code === '23503' ||
        error.code === 'PGRST204'
      )) {
        console.warn('Tentando sincronização em lote de usuários sem a coluna "created_by"...');
        const rowsWithoutCreatedBy = rows.map(({ created_by, ...rest }) => rest);
        const retryResult = await supabase.from(SUPABASE_TABLES.USERS).upsert(rowsWithoutCreatedBy);
        error = retryResult.error;
      }

      // Se houver erro de chave estrangeira nas gestões para usuários normais, tenta sem relacionamentos
      if (error && rows.some(r => r.role !== 'diretoria' && r.role !== 'diretoria_admin') && (
        error.message.includes('management_term') ||
        error.message.includes('foreign key') ||
        error.code === '23503'
      )) {
        console.warn('Tentando sincronização em lote limpando chaves estrangeiras de usuários não-diretoria...');
        const rowsCleaned = rows.map(r => {
          if (r.role !== 'diretoria' && r.role !== 'diretoria_admin') {
            return { ...r, management_term_id: null, created_by: null };
          }
          return r;
        });
        const retryResult = await supabase.from(SUPABASE_TABLES.USERS).upsert(rowsCleaned);
        error = retryResult.error;
      }

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

const ATTENDANCE_PAGE_SIZE = 500;
const MAX_ATTENDANCE_PAGES = 10_000;

type AttendanceRow = {
  id: string;
  eventId: string;
  memberId: string;
  status: Attendance['status'];
  note?: string | null;
  eligibility?: Attendance['eligibility'] | null;
  management_term_id?: string | null;
};

type DownloadData = {
  members: Member[];
  events: Event[];
  attendances: Attendance[];
  users: User[];
  managementTerms: ManagementTerm[];
};

type DownloadResult = {
  success: boolean;
  message: string;
  data?: DownloadData;
};

type DownloadSnapshot = {
  data: DownloadData;
  photos: EventPhoto[];
  shouldSaveManagementTerms: boolean;
};

let activeDownload: Promise<DownloadResult> | null = null;
let refreshRequested = false;

function validateAttendancePage(
  page: AttendanceRow[],
  seenIds: Set<string>,
  seenAttendanceKeys: Set<string>
): void {
  for (const attendance of page) {
    if (typeof attendance.id !== 'string' || attendance.id.length === 0) {
      throw new Error('Presença recebida sem id válido durante a paginação.');
    }

    if (typeof attendance.eventId !== 'string' || typeof attendance.memberId !== 'string') {
      throw new Error(`Presença ${attendance.id} recebida sem eventId ou memberId válido.`);
    }

    if (seenIds.has(attendance.id)) {
      throw new Error(`ID de presença duplicado durante a paginação: ${attendance.id}.`);
    }

    const attendanceKey = JSON.stringify([attendance.eventId, attendance.memberId]);
    if (seenAttendanceKeys.has(attendanceKey)) {
      throw new Error(`Presença duplicada para evento e membro durante a paginação: ${attendance.id}.`);
    }

    seenIds.add(attendance.id);
    seenAttendanceKeys.add(attendanceKey);
  }
}

async function fetchAllAttendance(): Promise<AttendanceRow[]> {
  const attendances: AttendanceRow[] = [];
  const seenIds = new Set<string>();
  const seenAttendanceKeys = new Set<string>();
  let lastId: string | undefined;

  for (let pageIndex = 0; pageIndex <= MAX_ATTENDANCE_PAGES; pageIndex += 1) {
    let query = supabase.from(SUPABASE_TABLES.ATTENDANCES).select('*');
    if (lastId !== undefined) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query
      .order('id', { ascending: true })
      .limit(ATTENDANCE_PAGE_SIZE);

    if (error) {
      throw new Error(`Erro ao buscar presenças na página ${pageIndex + 1}: ${error.message}`);
    }

    const page: AttendanceRow[] = data || [];
    if (page.length === 0) {
      return attendances;
    }

    if (pageIndex === MAX_ATTENDANCE_PAGES) {
      throw new Error(`Limite defensivo de ${MAX_ATTENDANCE_PAGES} páginas de presença excedido.`);
    }

    validateAttendancePage(page, seenIds, seenAttendanceKeys);

    const nextLastId = page[page.length - 1].id;
    if (nextLastId === lastId) {
      throw new Error('Cursor de presença não avançou durante a paginação.');
    }

    attendances.push(...page);
    lastId = nextLastId;
  }

  throw new Error(`Limite defensivo de ${MAX_ATTENDANCE_PAGES} páginas de presença excedido.`);
}

async function loadDownloadSnapshot(): Promise<DownloadSnapshot> {
  // 1. Fetch Members
  const membersRes = await supabase.from(SUPABASE_TABLES.MEMBERS).select('*');
  if (membersRes.error) throw new Error(`Erro ao buscar Membros: ${membersRes.error.message}`);

  // 2. Fetch Events
  const eventsRes = await supabase.from(SUPABASE_TABLES.EVENTS).select('*');
  if (eventsRes.error) throw new Error(`Erro ao buscar Eventos: ${eventsRes.error.message}`);

  // 3. Fetch Attendances
  const attendanceRows = await fetchAllAttendance();

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

  const fetchedAttendances: Attendance[] = attendanceRows.map(a => ({
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
    createdBy: u.created_by || undefined,
    position: u.position || undefined
  }));

  return {
    data: {
      members: fetchedMembers,
      events: fetchedEvents,
      attendances: fetchedAttendances,
      users: fetchedUsers,
      managementTerms: fetchedManagementTerms
    },
    photos: fetchedPhotos,
    shouldSaveManagementTerms: !termLoadError
  };
}

function publishDownloadSnapshot(snapshot: DownloadSnapshot): void {
  saveLocalMembers(snapshot.data.members);
  saveLocalEvents(snapshot.data.events);
  saveLocalAttendances(snapshot.data.attendances);
  saveLocalUsers(snapshot.data.users);
  if (snapshot.shouldSaveManagementTerms) {
    saveLocalManagementTerms(snapshot.data.managementTerms);
  }
  saveEventPhotos(snapshot.photos);
}

function toDownloadError(error: unknown): DownloadResult {
  const message = error instanceof Error ? error.message : String(error);
  return { success: false, message: `Erro ao baixar dados: ${message}` };
}

async function runDownloadQueue(): Promise<DownloadResult> {
  try {
    while (true) {
      refreshRequested = false;

      let snapshot: DownloadSnapshot | undefined;
      let loadError: unknown;
      try {
        snapshot = await loadDownloadSnapshot();
      } catch (error) {
        loadError = error;
      }

      if (refreshRequested) {
        continue;
      }

      if (loadError !== undefined) {
        return toDownloadError(loadError);
      }

      if (!snapshot) {
        return toDownloadError(new Error('Sincronização concluída sem dados para publicar.'));
      }

      try {
        publishDownloadSnapshot(snapshot);
      } catch (error) {
        return toDownloadError(error);
      }

      return {
        success: true,
        message: 'Dados baixados com sucesso e unificados no navegador!',
        data: snapshot.data
      };
    }
  } finally {
    activeDownload = null;
    refreshRequested = false;
  }
}

/**
 * Downloads all data from Supabase and replaces local storage.
 */
export function downloadSupabaseToLocal(): Promise<DownloadResult> {
  if (activeDownload) {
    refreshRequested = true;
    return activeDownload;
  }

  activeDownload = runDownloadQueue();
  return activeDownload;
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

export interface AuditLogInput {
  managementTermId?: string | null;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
}

function isValidUUID(uuid?: string | null): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Inserts a log of an operation into the audit_logs table on Supabase.
 */
export async function logAuditAction(input: AuditLogInput): Promise<void> {
  try {
    const validatedUserId = isValidUUID(input.userId) ? input.userId : null;
    const validatedTermId = isValidUUID(input.managementTermId) ? input.managementTermId : null;
    const validatedEntityId = isValidUUID(input.entityId) ? input.entityId : null;

    const { error } = await supabase
      .from(SUPABASE_TABLES.AUDIT_LOGS)
      .insert({
        management_term_id: validatedTermId,
        user_id: validatedUserId,
        user_name: input.userName || 'Sistema',
        user_role: input.userRole || 'visualizacao',
        action: input.action,
        entity_type: input.entityType,
        entity_id: validatedEntityId,
        entity_name: input.entityName || null,
        description: input.description,
        old_data: input.oldData || null,
        new_data: input.newData || null,
        metadata: input.metadata || null
      });

    if (error) {
      console.warn('Erro ao salvar log de auditoria no Supabase:', error.message, error.code);
    } else {
      console.log(`[Audit Log] ${input.description}`);
    }
  } catch (err) {
    console.warn('Erro de rede ao salvar log de auditoria no Supabase:', err);
  }
}

/**
 * Fetches audit logs from Supabase, filtered by managementTermId and ordered by created_at desc.
 * Restricts query based on user role and their linked management term ID.
 */
export async function fetchAuditLogs(
  managementTermId: string | null,
  currentUserRole?: string,
  currentUserManagementTermId?: string
): Promise<{ success: boolean; data: any[]; message?: string }> {
  try {
    let termIdToQuery = managementTermId;

    if (currentUserRole === 'diretoria_admin') {
      if (!currentUserManagementTermId) {
        return { 
          success: false, 
          data: [], 
          message: 'Sua conta Diretoria Admin não está vinculada a uma gestão. Procure um administrador.' 
        };
      }
      termIdToQuery = currentUserManagementTermId;
    }

    let query = supabase
      .from(SUPABASE_TABLES.AUDIT_LOGS)
      .select('*')
      .order('created_at', { ascending: false });

    if (termIdToQuery) {
      if (isValidUUID(termIdToQuery)) {
        query = query.eq('management_term_id', termIdToQuery);
      } else {
        // If it's a local/temporary ID (not a valid UUID), return empty array
        return { success: true, data: [] };
      }
    } else {
      // If no managementTermId is provided, and role is not diretoria_admin
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Erro ao carregar logs de auditoria:', error.message);
      return { success: false, data: [], message: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.warn('Erro de rede ao carregar logs de auditoria:', err);
    return { success: false, data: [], message: err.message || String(err) };
  }
}
