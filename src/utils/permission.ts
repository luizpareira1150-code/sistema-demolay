import { User, ManagementTerm, Event, EventCategory } from '../types';

export const PERMISSION_ERRORS = {
  mordomoCreate: "O cargo Mordomo só pode criar eventos de Limpeza.",
  mordomoAttendance: "O cargo Mordomo só pode confirmar presenças em eventos de Limpeza.",
  hospitaleiroCreate: "O cargo Hospitaleiro só pode criar eventos de Filantropia e Outros.",
  hospitaleiroAttendance: "O cargo Hospitaleiro só pode confirmar presenças em eventos de Filantropia e Outros.",
  actionNotAllowed: "Ação não permitida para este cargo."
};

export function getAllowedEventCategoriesForProfile(profile: User | null): 'all' | EventCategory[] {
  if (!profile) return [];

  if (profile.role === 'admin') {
    return 'all';
  }

  if (profile.role === 'diretoria_admin') {
    return 'all';
  }

  if (profile.role === 'diretoria') {
    if (profile.position === 'Mordomo') {
      return ['limpeza'];
    }
    if (profile.position === 'Hospitaleiro') {
      return ['filantropia', 'outros'];
    }
    // "1º Conselheiro", "2º Conselheiro", "Secretário" and other/default positions retain full access
    return 'all';
  }

  if (profile.role === 'visualizacao') {
    return [];
  }

  return [];
}

export function canCreateEventCategory(profile: User | null, category: EventCategory): boolean {
  if (!profile) return false;
  if (profile.role === 'visualizacao') return false;

  const allowed = getAllowedEventCategoriesForProfile(profile);
  if (allowed === 'all') return true;
  return allowed.includes(category);
}

export function canManageAttendanceForEvent(profile: User | null, event: Event): boolean {
  if (!profile || !event) return false;
  if (profile.role === 'visualizacao') return false;

  const allowed = getAllowedEventCategoriesForProfile(profile);
  if (allowed === 'all') return true;
  return allowed.includes(event.category);
}

export function validateEventCategoryPermission(profile: User | null, category: EventCategory): void {
  if (!profile) {
    throw new Error(PERMISSION_ERRORS.actionNotAllowed);
  }
  
  if (profile.role === 'diretoria') {
    if (profile.position === 'Mordomo' && category !== 'limpeza') {
      throw new Error(PERMISSION_ERRORS.mordomoCreate);
    }
    if (profile.position === 'Hospitaleiro' && category !== 'filantropia' && category !== 'outros') {
      throw new Error(PERMISSION_ERRORS.hospitaleiroCreate);
    }
  }

  if (!canCreateEventCategory(profile, category)) {
    throw new Error(PERMISSION_ERRORS.actionNotAllowed);
  }
}

export function validateAttendancePermission(profile: User | null, event: Event | null): void {
  if (!profile || !event) {
    throw new Error(PERMISSION_ERRORS.actionNotAllowed);
  }
  
  if (profile.role === 'diretoria') {
    if (profile.position === 'Mordomo' && event.category !== 'limpeza') {
      throw new Error(PERMISSION_ERRORS.mordomoAttendance);
    }
    if (profile.position === 'Hospitaleiro' && event.category !== 'filantropia' && event.category !== 'outros') {
      throw new Error(PERMISSION_ERRORS.hospitaleiroAttendance);
    }
  }

  if (!canManageAttendanceForEvent(profile, event)) {
    throw new Error(PERMISSION_ERRORS.actionNotAllowed);
  }
}

export function canEditCurrentManagementTerm(
  currentUser: User | null,
  activeTerm: ManagementTerm | null
): boolean {
  if (!currentUser) return false;
  
  // Rule: Admin can edit any management term
  if (currentUser.role === 'admin') return true;

  // Rule: Diretoria/Diretoria Admin can edit only if user.managementTermId matches activeTerm.id
  if (currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') {
    if (!activeTerm) return false;
    return currentUser.managementTermId === activeTerm.id;
  }

  // Rule: Visualização can never edit
  return false;
}
