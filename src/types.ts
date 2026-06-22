export type MemberStatus = 'active' | 'inactive';

export interface Member {
  id: string;
  name: string;
  status: MemberStatus;
  joinedAt: string;
  notes: string;
  createdAt: string;
  degree: 'iniciatico' | 'demolay';
  isNominata: boolean; // Also represents Nominata da Diretoria / Semestre
  nominataRole?: string;
  isNominataIniciacao?: boolean;
  nominataIniciacaoRole?: string;
  isNominataElevacao?: boolean;
  nominataElevacaoRole?: string;
}

export type EventCategory = 
  | 'ritualistica' 
  | 'terca_burocratica' 
  | 'quinta_burocratica' 
  | 'filantropia' 
  | 'limpeza' 
  | 'ensaio_iniciacao' 
  | 'ensaio_elevacao' 
  | 'outros';

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  description: string;
  createdAt: string;
  requiredFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
  optionalFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
  nominataType?: 'diretoria' | 'iniciacao' | 'elevacao' | 'none';
}

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'not_attended' | 'not_applicable';

export interface Attendance {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  note: string;
  eligibility?: 'required' | 'optional' | 'not_applicable';
}

export type UserRole = 'admin' | 'diretoria' | 'visualizacao';

export interface EventPhoto {
  id: string;
  eventId: string;
  photo: string; // Base64 raw/data URI representing compressed WebP
  createdAt: string; // ISO format date string for age checking
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface MemberStats {
  member: Member;
  memberId: string;
  memberName: string;
  degree: 'iniciatico' | 'demolay';
  isNominata: boolean;
  nominataRole?: string;

  requiredPresences: number;
  requiredAbsences: number;
  requiredJustifications: number;
  requiredEventsConsidered: number;

  extraParticipations: number;
  extraComputedPoints: number;

  mandatoryFrequency: number;
  finalPercentage: number;

  attendanceRate: number; // Maps to finalPercentage with precision for backward-compatibility
  presents: number; // Backward-compatibility (mapped to requiredPresences)
  absents: number; // Backward-compatibility (mapped to requiredAbsences)
  justified: number; // Backward-compatibility (mapped to requiredJustifications)
  consideredEvents: number; // Backward-compatibility (mapped to requiredEventsConsidered)
  hasConsideredEvents: boolean;
  zone: 'green' | 'yellow' | 'red';
}
