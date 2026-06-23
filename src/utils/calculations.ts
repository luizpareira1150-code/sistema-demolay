import { Member, Event, Attendance, MemberStats, EventCategory } from '../types';

export function getMemberEligibility(
  member: Member,
  event: Event
): 'required' | 'optional' | 'not_applicable' {
  // Resolve which Nominata should apply to this event
  let isNominata = false;
  const nominataType = event.nominataType || (
    event.category === 'ensaio_iniciacao' ? 'iniciacao' :
    event.category === 'ensaio_elevacao' ? 'elevacao' :
    (event.category === 'outros' ? 'none' : 'diretoria')
  );

  if (nominataType === 'diretoria') {
    isNominata = member.isNominata ?? false;
  } else if (nominataType === 'iniciacao') {
    isNominata = member.isNominataIniciacao ?? false;
  } else if (nominataType === 'elevacao') {
    isNominata = member.isNominataElevacao ?? false;
  }

  const degree = member.degree ?? 'iniciatico';
  const requiredFor = event.requiredFor ?? [];
  const optionalFor = event.optionalFor ?? [];

  // 1. If Nominata and requiredFor contains 'nominata', return 'required'
  if (isNominata && requiredFor.includes('nominata')) {
    return 'required';
  }
  // 2. If degree is in requiredFor, return 'required'
  if (requiredFor.includes(degree)) {
    return 'required';
  }
  // 3. If Nominata and optionalFor contains 'nominata', return 'optional'
  if (isNominata && optionalFor.includes('nominata')) {
    return 'optional';
  }
  // 4. If degree is in optionalFor, return 'optional'
  if (optionalFor.includes(degree)) {
    return 'optional';
  }
  
  return 'not_applicable';
}

export const EXTRA_PARTICIPATION_WEIGHT = 0.5;

export function calculateMemberStats(
  member: Member,
  events: Event[],
  attendances: Attendance[],
  filters?: {
    startDate?: string;
    endDate?: string;
    category?: EventCategory | 'all';
  }
): MemberStats {
  // 1. Filter events based on criteria
  let filteredEvents = events;
  if (filters) {
    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(e => e.date >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(e => e.date <= filters.endDate!);
    }
    if (filters.category && filters.category !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.category === filters.category);
    }
  }

  // 2. Identify finalized events (has at least one attendance record)
  const finalizedEvents = filteredEvents.filter(e =>
    attendances.some(a => a.eventId === e.id)
  );

  let requiredPresences = 0;
  let requiredAbsences = 0;
  let requiredJustifications = 0;
  let extraParticipations = 0;
  let ignoredEventsBeforeEvaluationStart = 0;

  for (const event of finalizedEvents) {
    const isAfterEvaluationStart = !member.evaluationStartDate || event.date >= member.evaluationStartDate;
    if (!isAfterEvaluationStart) {
      ignoredEventsBeforeEvaluationStart++;
      continue;
    }

    const eligibility = getMemberEligibility(member, event);
    const attendance = attendances.find(a => a.eventId === event.id && a.memberId === member.id);

    if (eligibility === 'required') {
      if (attendance) {
        if (attendance.status === 'present') {
          requiredPresences++;
        } else if (attendance.status === 'justified') {
          requiredJustifications++;
        } else {
          // If status is 'absent' or any other status, treated as absent
          requiredAbsences++;
        }
      } else {
        // Event is finalized but member has no marking -> Treated as absent
        requiredAbsences++;
      }
    } else if (eligibility === 'optional') {
      if (attendance && attendance.status === 'present') {
        extraParticipations++;
      }
    }
    // 'not_applicable' does not enter any calculations
  }

  // 3. Calculate consideredEvents and points
  const requiredEventsConsidered = requiredPresences + requiredAbsences;
  const extraComputedPoints = extraParticipations * EXTRA_PARTICIPATION_WEIGHT;
  const hasConsideredEvents = requiredEventsConsidered > 0;

  let mandatoryFrequency = 0;
  if (hasConsideredEvents) {
    mandatoryFrequency = (requiredPresences / requiredEventsConsidered) * 100;
  }

  let finalPercentage = 0;
  const finalDenominator = requiredEventsConsidered + extraComputedPoints;
  if (finalDenominator > 0) {
    finalPercentage = ((requiredPresences + extraComputedPoints) / finalDenominator) * 100;
  } else if (extraParticipations > 0) {
    // If no mandatory events but has extra participations, final percentage is 100% as per Scenario 6
    finalPercentage = 100;
  }

  // Round percentages with 1 decimal place precision
  const roundedMandatoryFrequency = Math.round(mandatoryFrequency * 10) / 10;
  const roundedFinalPercentage = Math.round(finalPercentage * 10) / 10;

  // 4. Determine zone based on finalPercentage
  // Acima de 70% (i.e. finalPercentage > 70) = Zona Verde
  // De 60% até 70% (i.e. finalPercentage >= 60) = Zona Amarela
  // Abaixo de 60% = Zona Vermelha
  let zone: 'green' | 'yellow' | 'red' = 'red';
  if (roundedFinalPercentage > 70) {
    zone = 'green';
  } else if (roundedFinalPercentage >= 60) {
    zone = 'yellow';
  } else {
    zone = 'red';
  }

  return {
    member,
    memberId: member.id,
    memberName: member.name,
    degree: member.degree ?? 'iniciatico',
    isNominata: member.isNominata ?? false,
    nominataRole: member.nominataRole,
    evaluationStartDate: member.evaluationStartDate,
    ignoredEventsBeforeEvaluationStart,

    requiredPresences,
    requiredAbsences,
    requiredJustifications,
    requiredEventsConsidered,

    extraParticipations,
    extraComputedPoints,

    mandatoryFrequency: roundedMandatoryFrequency,
    finalPercentage: roundedFinalPercentage,

    // Backward compatibility mappings
    attendanceRate: roundedFinalPercentage,
    presents: requiredPresences,
    absents: requiredAbsences,
    justified: requiredJustifications,
    consideredEvents: requiredEventsConsidered,
    hasConsideredEvents: hasConsideredEvents || extraParticipations > 0,
    zone
  };
}

// Calculate general average for active members (using finalPercentage)
export function calculateChapterAverage(
  members: Member[],
  events: Event[],
  attendances: Attendance[]
): number {
  const activeMembers = members.filter(m => m.status === 'active');
  if (activeMembers.length === 0) return 0;

  let totalFinalPercentage = 0;
  let countWithEvents = 0;

  for (const m of activeMembers) {
    const stats = calculateMemberStats(m, events, attendances);
    if (stats.requiredEventsConsidered > 0 || stats.extraParticipations > 0) {
      totalFinalPercentage += stats.finalPercentage;
      countWithEvents++;
    }
  }

  if (countWithEvents === 0) return 0;
  return Math.round((totalFinalPercentage / countWithEvents) * 10) / 10;
}

// Calculate general average of mandatory frequency for active members
export function calculateChapterMandatoryFrequencyAverage(
  members: Member[],
  events: Event[],
  attendances: Attendance[]
): number {
  const activeMembers = members.filter(m => m.status === 'active');
  if (activeMembers.length === 0) return 0;

  let totalMandatoryFreq = 0;
  let countWithEvents = 0;

  for (const m of activeMembers) {
    const stats = calculateMemberStats(m, events, attendances);
    if (stats.requiredEventsConsidered > 0) {
      totalMandatoryFreq += stats.mandatoryFrequency;
      countWithEvents++;
    }
  }

  if (countWithEvents === 0) return 0;
  return Math.round((totalMandatoryFreq / countWithEvents) * 10) / 10;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  ritualistica: 'Reunião Ritualística',
  terca_burocratica: 'Terça Burocrática',
  quinta_burocratica: 'Quinta Burocrática',
  filantropia: 'Filantropia',
  limpeza: 'Limpeza',
  ensaio_iniciacao: 'Ensaio de Iniciação',
  ensaio_elevacao: 'Ensaio de Elevação',
  outros: 'Outros'
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Presente',
  absent: 'Ausente',
  justified: 'Justificado',
  not_attended: 'Não compareceu',
  not_applicable: 'Não aplicável'
};
