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
  } else if (nominataType && nominataType !== 'none') {
    // Check if it's a custom nominata stored as a virtual member
    try {
      const storedMembersData = localStorage.getItem('demolay_members');
      if (storedMembersData) {
        const parsedMembers: Member[] = JSON.parse(storedMembersData);
        const virtualId = `_custom_nominata_${nominataType}`;
        const virtualMember = parsedMembers.find(m => m.id === virtualId);
        if (virtualMember) {
          const membersList = JSON.parse(virtualMember.notes || '[]');
          isNominata = membersList.some((m: any) => m.memberId === member.id);
        }
      }
    } catch (err) {
      console.error('Error checking custom nominata eligibility:', err);
    }
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

export const EXTRA_PARTICIPATION_WEIGHT = 0.25;

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

  // 3. New Methodology Math Calculations:
  // N = applicable mandatory events (requiredPresences + requiredAbsences)
  // Note: requiredJustifications are excluded from N (removed from denominator)
  const N = requiredPresences + requiredAbsences;
  const P = requiredPresences;
  const U = requiredAbsences; // unjustified absences (N - P)
  const O = extraParticipations; // optional presences

  // Gross optional credits: each optional yields 0.25 credit
  const optionalCreditsGross = O * 0.25;

  // Usable credits: min(optionalCreditsGross, U)
  const optionalCreditsUsable = Math.min(optionalCreditsGross, U);

  // Recovered presence units: usable credits * 0.75
  const recoveredPresences = optionalCreditsUsable * 0.75;

  // Optionals used and excess
  // opcionaisUtilizadas = min(O, U * 4)
  const optionalUsed = Math.min(O, U * 4);
  // opcionaisExcedentes = max(O - optionalUsed, 0)
  const optionalExcess = Math.max(O - optionalUsed, 0);

  const hasConsideredEvents = N > 0;

  let mandatoryFrequency = 0;
  let recoveredPercentage = 0;
  let finalPercentage = 0;

  if (hasConsideredEvents) {
    mandatoryFrequency = (P / N) * 100;
    recoveredPercentage = (recoveredPresences / N) * 100;
    // Final frequency capped at 100%
    finalPercentage = Math.min(100, ((P + recoveredPresences) / N) * 100);
  }

  // Round percentages with 1 decimal place precision for UI presentation
  const roundedMandatoryFrequency = Math.round(mandatoryFrequency * 10) / 10;
  const roundedFinalPercentage = Math.round(finalPercentage * 10) / 10;
  const roundedRecoveredPercentage = Math.round(recoveredPercentage * 10) / 10;

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

    // New methodology detailed properties
    applicableMandatoryEvents: N,
    mandatoryPresences: P,
    justifiedAbsences: requiredJustifications,
    unjustifiedAbsences: U,
    optionalPresences: O,
    optionalCreditsGross,
    optionalCreditsUsable,
    recoveredPresences,
    recoveredPercentage: roundedRecoveredPercentage,
    optionalUsed,
    optionalExcess,

    // Existing / backward-compatible properties
    requiredPresences: P,
    requiredAbsences: U,
    requiredJustifications,
    requiredEventsConsidered: N,

    extraParticipations: O,
    extraComputedPoints: recoveredPresences,

    mandatoryFrequency: roundedMandatoryFrequency,
    finalPercentage: roundedFinalPercentage,

    // Raw unrounded values for precise sorting
    rawMandatoryFrequency: mandatoryFrequency,
    rawFinalPercentage: finalPercentage,
    rawRecoveredPercentage: recoveredPercentage,

    // Backward compatibility mappings
    attendanceRate: roundedFinalPercentage,
    presents: P,
    absents: U,
    justified: requiredJustifications,
    consideredEvents: N,
    hasConsideredEvents,
    zone
  };
}

/**
 * Format percentage for UI presentation.
 * - Maximum 2 decimal places with trailing zero stripping (e.g., 90%, 97,5%, 95,63%).
 * - Displays "Frequência ainda não calculada" when member has no applicable mandatory events.
 */
export function formatPercent(value: number | null | undefined, hasEvents: boolean = true): string {
  if (!hasEvents || value === null || value === undefined || isNaN(value)) {
    return 'Frequência ainda não calculada';
  }
  const rounded = Math.round(value * 100) / 100;
  const formatted = rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
  return `${formatted}%`;
}

/**
 * Sorts ranking list strictly according to the official sequence:
 * 1. Maior frequência final (raw unrounded);
 * 2. Maior número total de presenças opcionais;
 * 3. Maior frequência obrigatória (raw unrounded);
 * 4. Maior sequência de presenças (fallback to 0);
 * 5. Nome em ordem alfabética (pt-BR localeCompare).
 * Members with no applicable events go after members with calculated frequencies.
 */
export function sortMemberStatsList(statsList: MemberStats[]): MemberStats[] {
  return [...statsList].sort((a, b) => {
    // Members without considered events go to bottom
    if (!a.hasConsideredEvents && b.hasConsideredEvents) return 1;
    if (a.hasConsideredEvents && !b.hasConsideredEvents) return -1;
    if (!a.hasConsideredEvents && !b.hasConsideredEvents) {
      return a.memberName.localeCompare(b.memberName, 'pt-BR');
    }

    // 1. Maior frequência final (unrounded)
    if (b.rawFinalPercentage !== a.rawFinalPercentage) {
      return b.rawFinalPercentage - a.rawFinalPercentage;
    }

    // 2. Maior número total de presenças opcionais
    if (b.optionalPresences !== a.optionalPresences) {
      return b.optionalPresences - a.optionalPresences;
    }

    // 3. Maior frequência obrigatória (unrounded)
    if (b.rawMandatoryFrequency !== a.rawMandatoryFrequency) {
      return b.rawMandatoryFrequency - a.rawMandatoryFrequency;
    }

    // 4. Sequence of presences (not tracked, equal)

    // 5. Nome em ordem alfabética
    return a.memberName.localeCompare(b.memberName, 'pt-BR');
  });
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
  burocratica: 'Burocrática',
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
