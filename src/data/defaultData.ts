import { Member, Event, Attendance, User } from '../types';

export const defaultMembers: Member[] = [
  {
    id: 'm1',
    name: 'João Silva',
    status: 'active',
    joinedAt: '2024-02-15',
    notes: 'Iniciado exemplar, MC do Capítulo.',
    createdAt: '2026-01-10T10:00:00Z',
    degree: 'demolay',
    isNominata: true,
    nominataRole: 'Mestre Conselheiro'
  },
  {
    id: 'm2',
    name: 'Pedro Almeida',
    status: 'active',
    joinedAt: '2024-08-20',
    notes: 'Esforçado mas com conflito de horários de aula.',
    createdAt: '2026-01-10T10:05:00Z',
    degree: 'demolay',
    isNominata: false
  },
  {
    id: 'm3',
    name: 'Lucas Santos',
    status: 'active',
    joinedAt: '2025-01-10',
    notes: 'Grande aptidão na ritualística, oficial de cerimônias.',
    createdAt: '2026-01-10T10:10:00Z',
    degree: 'demolay',
    isNominata: true,
    nominataRole: 'Mestre de Cerimônias'
  },
  {
    id: 'm4',
    name: 'Rafael Costa',
    status: 'active',
    joinedAt: '2025-03-22',
    notes: 'Trabalhando em outra cidade nos fins de semana.',
    createdAt: '2026-01-10T10:15:00Z',
    degree: 'iniciatico',
    isNominata: false
  },
  {
    id: 'm5',
    name: 'Marcos Oliveira',
    status: 'active',
    joinedAt: '2023-11-05',
    notes: 'Membro antigo, auxiliando na formação dos mais novos.',
    createdAt: '2026-01-10T10:20:00Z',
    degree: 'demolay',
    isNominata: true,
    nominataRole: 'Capelão'
  },
  {
    id: 'm6',
    name: 'Gabriel Souza',
    status: 'active',
    joinedAt: '2025-05-18',
    notes: 'Muito ativo em projetos de limpeza e organização.',
    createdAt: '2026-01-10T10:25:00Z',
    degree: 'iniciatico',
    isNominata: false
  },
  {
    id: 'm7',
    name: 'André Martins',
    status: 'active',
    joinedAt: '2024-11-12',
    notes: 'Tesoureiro da diretoria.',
    createdAt: '2026-01-10T10:30:00Z',
    degree: 'iniciatico',
    isNominata: true,
    nominataRole: 'Tesoureiro'
  },
  {
    id: 'm8',
    name: 'Felipe Rocha',
    status: 'active',
    joinedAt: '2025-02-28',
    notes: 'Ausências frequentes devido a problemas de saúde.',
    createdAt: '2026-01-10T10:35:00Z',
    degree: 'iniciatico',
    isNominata: false
  }
];

export const defaultEvents: Event[] = [
  {
    id: 'e1',
    title: 'Reunião Ritualística Regular',
    category: 'ritualistica',
    date: '2026-06-01',
    description: 'Reunião regular de abertura com instrução de graus.',
    createdAt: '2026-06-01T15:00:00Z',
    requiredFor: ['iniciatico', 'demolay', 'nominata'],
    optionalFor: []
  },
  {
    id: 'e2',
    title: 'Terça Burocrática de Planejamento',
    category: 'terca_burocratica',
    date: '2026-06-03',
    description: 'Reunião de diretoria para alinhamento de tesouraria de fim de mês.',
    createdAt: '2026-06-03T19:00:00Z',
    requiredFor: ['iniciatico', 'nominata'],
    optionalFor: ['demolay']
  },
  {
    id: 'e3',
    title: 'Filantropia Geral',
    category: 'filantropia',
    date: '2026-06-08',
    description: 'Doação de agasalhos e sopa para moradores de rua.',
    createdAt: '2026-06-08T14:00:00Z',
    requiredFor: ['iniciatico', 'demolay', 'nominata'],
    optionalFor: []
  },
  {
    id: 'e4',
    title: 'Limpeza Geral do Templo',
    category: 'limpeza',
    date: '2026-06-12',
    description: 'Mutirão de organização preventiva dos materiais rituais.',
    createdAt: '2026-06-12T09:00:00Z',
    requiredFor: ['iniciatico', 'demolay', 'nominata'],
    optionalFor: []
  },
  {
    id: 'e5',
    title: 'Ensaio Geral Ceremonial',
    category: 'ensaio_iniciacao',
    date: '2026-06-15',
    description: 'Ensaio geral para a Cerimônia de Iniciação marcada.',
    createdAt: '2026-06-15T18:00:00Z',
    requiredFor: ['iniciatico', 'demolay', 'nominata'],
    optionalFor: []
  },
  {
    id: 'e6',
    title: 'Reunião Ritualística de Instrução',
    category: 'ritualistica',
    date: '2026-06-20',
    description: 'Apresentação de trabalhos escritos pelos novos iniciantes.',
    createdAt: '2026-06-20T15:00:00Z',
    requiredFor: ['iniciatico', 'demolay', 'nominata'],
    optionalFor: []
  }
];

export const defaultAttendances: Attendance[] = [
  // Evento 1
  { id: 'a1_1', eventId: 'e1', memberId: 'm1', status: 'present', note: '' },
  { id: 'a1_2', eventId: 'e1', memberId: 'm2', status: 'present', note: '' },
  { id: 'a1_3', eventId: 'e1', memberId: 'm3', status: 'present', note: '' },
  { id: 'a1_4', eventId: 'e1', memberId: 'm4', status: 'absent', note: 'Não deu retorno' },
  { id: 'a1_5', eventId: 'e1', memberId: 'm5', status: 'present', note: '' },
  { id: 'a1_6', eventId: 'e1', memberId: 'm6', status: 'justified', note: 'Viajando com a família' },
  { id: 'a1_7', eventId: 'e1', memberId: 'm7', status: 'present', note: '' },
  { id: 'a1_8', eventId: 'e1', memberId: 'm8', status: 'present', note: '' },

  // Evento 2
  { id: 'a2_1', eventId: 'e2', memberId: 'm1', status: 'present', note: '' },
  { id: 'a2_2', eventId: 'e2', memberId: 'm2', status: 'present', note: '' },
  { id: 'a2_3', eventId: 'e2', memberId: 'm3', status: 'absent', note: 'Prova na faculdade' },
  { id: 'a2_4', eventId: 'e2', memberId: 'm4', status: 'absent', note: '' },
  { id: 'a2_5', eventId: 'e2', memberId: 'm5', status: 'present', note: '' },
  { id: 'a2_6', eventId: 'e2', memberId: 'm6', status: 'present', note: '' },
  { id: 'a2_7', eventId: 'e2', memberId: 'm7', status: 'present', note: '' },
  { id: 'a2_8', eventId: 'e2', memberId: 'm8', status: 'absent', note: '' },

  // Evento 3
  { id: 'a3_1', eventId: 'e3', memberId: 'm1', status: 'present', note: '' },
  { id: 'a3_2', eventId: 'e3', memberId: 'm2', status: 'present', note: '' },
  { id: 'a3_3', eventId: 'e3', memberId: 'm3', status: 'present', note: '' },
  { id: 'a3_4', eventId: 'e3', memberId: 'm4', status: 'present', note: '' },
  { id: 'a3_5', eventId: 'e3', memberId: 'm5', status: 'present', note: '' },
  { id: 'a3_6', eventId: 'e3', memberId: 'm6', status: 'present', note: '' },
  { id: 'a3_7', eventId: 'e3', memberId: 'm7', status: 'absent', note: 'Trabalho de última hora' },
  { id: 'a3_8', eventId: 'e3', memberId: 'm8', status: 'justified', note: 'Tratamento de fisioterapia' },

  // Evento 4
  { id: 'a4_1', eventId: 'e4', memberId: 'm1', status: 'present', note: '' },
  { id: 'a4_2', eventId: 'e4', memberId: 'm2', status: 'absent', note: 'Sem condução' },
  { id: 'a4_3', eventId: 'e4', memberId: 'm3', status: 'present', note: '' },
  { id: 'a4_4', eventId: 'e4', memberId: 'm4', status: 'absent', note: '' },
  { id: 'a4_5', eventId: 'e4', memberId: 'm5', status: 'present', note: '' },
  { id: 'a4_6', eventId: 'e4', memberId: 'm6', status: 'present', note: 'Ajudou muito' },
  { id: 'a4_7', eventId: 'e4', memberId: 'm7', status: 'absent', note: '' },
  { id: 'a4_8', eventId: 'e4', memberId: 'm8', status: 'absent', note: '' },

  // Evento 5
  { id: 'a5_1', eventId: 'e5', memberId: 'm1', status: 'present', note: '' },
  { id: 'a5_2', eventId: 'e5', memberId: 'm2', status: 'present', note: '' },
  { id: 'a5_3', eventId: 'e5', memberId: 'm3', status: 'present', note: '' },
  { id: 'a5_4', eventId: 'e5', memberId: 'm4', status: 'present', note: '' },
  { id: 'a5_5', eventId: 'e5', memberId: 'm5', status: 'justified', note: 'Compromisso profissional inadiável' },
  { id: 'a5_6', eventId: 'e5', memberId: 'm6', status: 'present', note: '' },
  { id: 'a5_7', eventId: 'e5', memberId: 'm7', status: 'present', note: '' },
  { id: 'a5_8', eventId: 'e5', memberId: 'm8', status: 'present', note: '' },

  // Evento 6
  { id: 'a6_1', eventId: 'e6', memberId: 'm1', status: 'present', note: '' },
  { id: 'a6_2', eventId: 'e6', memberId: 'm2', status: 'absent', note: '' },
  { id: 'a6_3', eventId: 'e6', memberId: 'm3', status: 'present', note: '' },
  { id: 'a6_4', eventId: 'e6', memberId: 'm4', status: 'justified', note: 'Conflito com vestibular' },
  { id: 'a6_5', eventId: 'e6', memberId: 'm5', status: 'absent', note: '' },
  { id: 'a6_6', eventId: 'e6', memberId: 'm6', status: 'present', note: '' },
  { id: 'a6_7', eventId: 'e6', memberId: 'm7', status: 'present', note: '' },
  { id: 'a6_8', eventId: 'e6', memberId: 'm8', status: 'absent', note: '' }
];

export const defaultUsers: User[] = [
  {
    id: 'u1',
    name: 'Administrador Capítulo',
    email: 'admin@demolay.com',
    password: '123456',
    role: 'admin'
  },
  {
    id: 'u_thiago',
    name: 'Thiago (Administrador)',
    email: 'thiago@capitulotx.com.br',
    password: '123mudar456',
    role: 'admin'
  },
  {
    id: 'u2',
    name: 'Diretoria Ordem',
    email: 'diretoria@demolay.com',
    password: '123456',
    role: 'diretoria'
  },
  {
    id: 'u3',
    name: 'Conselho Consultivo',
    email: 'visualizacao@demolay.com',
    password: '123456',
    role: 'visualizacao'
  }
];
