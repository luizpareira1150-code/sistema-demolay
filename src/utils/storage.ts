import { Member, Event, Attendance, User, EventCategory, EventPhoto } from '../types';
import { defaultMembers, defaultEvents, defaultAttendances, defaultUsers } from '../data/defaultData';

const KEYS = {
  MEMBERS: 'demolay_members',
  EVENTS: 'demolay_events',
  ATTENDANCES: 'demolay_attendance',
  USERS: 'demolay_users',
  CURRENT_USER: 'demolay_current_user',
  MIGRATION_VERSION: 'demolay_migration_version',
  PHOTOS: 'demolay_event_photos'
};

export function getEventCategoryPreset(category: EventCategory): {
  requiredFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
  optionalFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
} {
  switch (category) {
    case 'ritualistica':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'terca_burocratica':
      return {
        requiredFor: ['iniciatico', 'nominata'],
        optionalFor: ['demolay']
      };
    case 'quinta_burocratica':
      return {
        requiredFor: ['demolay', 'nominata'],
        optionalFor: []
      };
    case 'filantropia':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'limpeza':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'ensaio_iniciacao':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'ensaio_elevacao':
      return {
        requiredFor: ['demolay', 'nominata'],
        optionalFor: []
      };
    case 'outros':
    default:
      return {
        requiredFor: [],
        optionalFor: []
      };
  }
}

// Special legacy fallbacks for event categories during migration
function getEventCategoryPresetForMigration(category: string): {
  requiredFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
  optionalFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
} {
  switch (category) {
    case 'ritualistica':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'terca_burocratica':
    case 'burocratica':
      return {
        requiredFor: ['iniciatico', 'nominata'],
        optionalFor: ['demolay']
      };
    case 'quinta_burocratica':
      return {
        requiredFor: ['demolay', 'nominata'],
        optionalFor: []
      };
    case 'filantropia':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'limpeza':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'ensaio_iniciacao':
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
    case 'ensaio_elevacao':
      return {
        requiredFor: ['demolay', 'nominata'],
        optionalFor: []
      };
    case 'outros':
    default:
      // For legacy migration "Outros ou categoria desconhecida" we default to all required
      return {
        requiredFor: ['iniciatico', 'demolay', 'nominata'],
        optionalFor: []
      };
  }
}

export const getMembers = (): Member[] => {
  const data = localStorage.getItem(KEYS.MEMBERS);
  if (!data) {
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(defaultMembers));
    return defaultMembers;
  }
  
  const members: any[] = JSON.parse(data);
  let migrated = false;

  const migratedMembers = members.map(m => {
    let copy = { ...m };
    if (!copy.degree) {
      copy.degree = 'iniciatico';
      migrated = true;
    }
    if (copy.isNominata === undefined) {
      copy.isNominata = false;
      migrated = true;
    }
    if (copy.isNominata && copy.nominataRole === undefined) {
      copy.nominataRole = '';
      migrated = true;
    }
    if (!copy.status) {
      copy.status = 'active';
      migrated = true;
    }
    return copy as Member;
  });

  if (migrated) {
    saveMembers(migratedMembers);
  }

  return migratedMembers;
};

export const saveMembers = (members: Member[]): void => {
  localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
};

export const getEvents = (): Event[] => {
  const data = localStorage.getItem(KEYS.EVENTS);
  if (!data) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(defaultEvents));
    return defaultEvents;
  }

  const events: any[] = JSON.parse(data);
  let migrated = false;

  const migratedEvents = events.map(e => {
    let copy = { ...e };
    
    // Migrate legacy 'burocratica' category to 'terca_burocratica'
    if (copy.category === 'burocratica') {
      copy.category = 'terca_burocratica';
      migrated = true;
    }

    if (!copy.requiredFor || !copy.optionalFor) {
      const preset = getEventCategoryPresetForMigration(copy.category);
      copy.requiredFor = copy.requiredFor ?? preset.requiredFor ?? [];
      copy.optionalFor = copy.optionalFor ?? preset.optionalFor ?? [];
      migrated = true;
    }
    return copy as Event;
  });

  if (migrated) {
    saveEvents(migratedEvents);
  }

  return migratedEvents;
};

export const saveEvents = (events: Event[]): void => {
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
};

export const getAttendances = (): Attendance[] => {
  let data = localStorage.getItem(KEYS.ATTENDANCES);
  if (!data) {
    // Try old key fallback 'demolay_attendances'
    const oldData = localStorage.getItem('demolay_attendances');
    if (oldData) {
      data = oldData;
      localStorage.setItem(KEYS.ATTENDANCES, oldData);
      localStorage.removeItem('demolay_attendances');
    }
  }

  let list: Attendance[] = [];
  if (!data) {
    localStorage.setItem(KEYS.ATTENDANCES, JSON.stringify(defaultAttendances));
    list = defaultAttendances;
  } else {
    try {
      list = JSON.parse(data);
    } catch (e) {
      list = defaultAttendances;
    }
  }

  // Deduplicate and normalize statuses
  const mapUnique = new Map<string, Attendance>();
  let hasChanges = false;
  
  list.forEach(a => {
    if (a && a.eventId && a.memberId) {
      const key = `${a.eventId}_${a.memberId}`;
      let copy = { ...a };
      if (!copy.status) {
        copy.status = 'absent';
        hasChanges = true;
      }
      mapUnique.set(key, copy);
    }
  });

  const final = Array.from(mapUnique.values());
  if (final.length !== list.length || hasChanges) {
    localStorage.setItem(KEYS.ATTENDANCES, JSON.stringify(final));
  }

  return final;
};

export const saveAttendances = (attendances: Attendance[]): void => {
  localStorage.setItem(KEYS.ATTENDANCES, JSON.stringify(attendances));
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(KEYS.USERS);
  if (!data) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  
  let users: any[] = JSON.parse(data);
  let migrated = false;

  const hasThiago = users.some(u => u.email === 'thiago@capitulotx.com.br');
  if (!hasThiago) {
    users.push({
      id: 'u_thiago',
      name: 'Thiago (Administrador)',
      email: 'thiago@capitulotx.com.br',
      password: '123mudar456',
      role: 'admin'
    });
    migrated = true;
  }
  
  const migratedUsers = users.map(u => {
    let copy = { ...u };
    // Maintain Thiago's updated credentials if already added but password/role mismatches
    if (copy.email === 'thiago@capitulotx.com.br') {
      if (copy.password !== '123mudar456' || copy.role !== 'admin') {
        copy.password = '123mudar456';
        copy.role = 'admin';
        migrated = true;
      }
    }
    if (!copy.role) {
      copy.role = 'visualizacao';
      migrated = true;
    }
    return copy as User;
  });

  if (migrated) {
    saveUsers(migratedUsers);
  }

  return migratedUsers;
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  if (!data) return null;
  return JSON.parse(data);
};

export const saveCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
};

export const getEventPhotos = (): EventPhoto[] => {
  const data = localStorage.getItem(KEYS.PHOTOS);
  if (!data) return [];
  try {
    const photos: EventPhoto[] = JSON.parse(data);
    
    // Auto-delete photos older than 8 months
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);
    const limitTime = eightMonthsAgo.getTime();
    
    const validPhotos = photos.filter(p => {
      const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
      return createdTime >= limitTime;
    });
    
    if (validPhotos.length !== photos.length) {
      localStorage.setItem(KEYS.PHOTOS, JSON.stringify(validPhotos));
    }
    
    return validPhotos;
  } catch (e) {
    return [];
  }
};

export const saveEventPhotos = (photos: EventPhoto[]): void => {
  localStorage.setItem(KEYS.PHOTOS, JSON.stringify(photos));
};
