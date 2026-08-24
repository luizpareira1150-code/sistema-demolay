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
  managementTermId?: string;
  evaluationStartDate: string;
}

export type EventCategory = 
  | 'ritualistica' 
  | 'burocratica'
  | 'filantropia' 
  | 'limpeza' 
  | 'ensaio_iniciacao' 
  | 'ensaio_elevacao' 
  | 'outros'
  | 'terca_burocratica'
  | 'quinta_burocratica';

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  description: string;
  createdAt: string;
  requiredFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
  optionalFor: Array<'iniciatico' | 'demolay' | 'nominata'>;
  nominataType?: string;
  managementTermId?: string;
}

export interface CustomNominata {
  id: string;
  name: string;
  managementTermId?: string;
  members: Array<{
    memberId: string;
    role: string;
  }>;
}

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'not_attended' | 'not_applicable';

export interface Attendance {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  note: string;
  eligibility?: 'required' | 'optional' | 'not_applicable';
  managementTermId?: string;
}

export type UserRole = 'admin' | 'diretoria_admin' | 'diretoria' | 'visualizacao';

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
  managementTermId?: string;
  createdBy?: string;
  position?: string | null;
}

export interface ManagementTerm {
  id: string;
  name: string;
  year: number;
  semester: 1 | 2;
  startDate: string;
  endDate: string;
  status: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
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

  // New methodology fields
  applicableMandatoryEvents: number; // N
  mandatoryPresences: number; // P
  justifiedAbsences: number;
  unjustifiedAbsences: number; // U
  optionalPresences: number; // O
  optionalCreditsGross: number; // O * 0.25
  optionalCreditsUsable: number; // min(gross, U)
  recoveredPresences: number; // usable * 0.75
  recoveredPercentage: number; // (recoveredPresences / N) * 100
  optionalUsed: number; // min(O, U * 4)
  optionalExcess: number; // max(O - optionalUsed, 0)

  extraParticipations: number;
  extraComputedPoints: number;

  mandatoryFrequency: number;
  finalPercentage: number;
  rawMandatoryFrequency: number;
  rawFinalPercentage: number;
  rawRecoveredPercentage: number;

  attendanceRate: number; // Maps to finalPercentage with precision for backward-compatibility
  presents: number; // Backward-compatibility (mapped to requiredPresences)
  absents: number; // Backward-compatibility (mapped to requiredAbsences)
  justified: number; // Backward-compatibility (mapped to requiredJustifications)
  consideredEvents: number; // Backward-compatibility (mapped to requiredEventsConsidered)
  hasConsideredEvents: boolean;
  zone: 'green' | 'yellow' | 'red';
  evaluationStartDate?: string;
  ignoredEventsBeforeEvaluationStart?: number;
}
