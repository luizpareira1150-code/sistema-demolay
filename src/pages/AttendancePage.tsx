import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowLeft,
  Info,
  Check,
  ChevronRight,
  UserCheck2,
  Users,
  AlertTriangle,
  Camera,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Member, Event, Attendance, AttendanceStatus, User, EventPhoto } from '../types';
import { CATEGORY_LABELS, getMemberEligibility } from '../utils/calculations';
import { useNotification } from '../components/NotificationContext';
import { useManagementTerm } from '../contexts/ManagementTermContext';
import { canEditCurrentManagementTerm, getAllowedEventCategoriesForProfile, canManageAttendanceForEvent, validateAttendancePermission } from '../utils/permission';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import { getEventPhotos, saveEventPhotos } from '../utils/storage';
import { pushPhotoToSupabase, deletePhotoFromSupabase } from '../utils/supabaseService';

interface AttendancePageProps {
  events: Event[];
  members: Member[];
  attendances: Attendance[];
  currentUser: User;
  onSaveAttendances: (eventId: string, updated: Omit<Attendance, 'id'>[]) => void;
  selectedEvent: Event | null;
  onClearSelectedEvent: () => void;
}

export default function AttendancePage({
  events,
  members,
  attendances,
  currentUser,
  onSaveAttendances,
  selectedEvent: initialSelectedEvent,
  onClearSelectedEvent
}: AttendancePageProps) {
  const { showNotification } = useNotification();
  const { activeTerm } = useManagementTerm();
  const canEditTerm = canEditCurrentManagementTerm(currentUser, activeTerm);

  // Select active members
  const activeMembers = members.filter(m => m.status === 'active');

  const [currentEvent, setCurrentEvent] = useState<Event | null>(initialSelectedEvent);

  const isAllowedToManageThisEvent = currentEvent ? canManageAttendanceForEvent(currentUser, currentEvent) : true;
  const isReadOnly = currentUser.role === 'visualizacao' || !canEditTerm || !isAllowedToManageThisEvent;

  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [photoCompressing, setPhotoCompressing] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<EventPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // Load photos when currentEvent changes
  useEffect(() => {
    if (currentEvent) {
      const photos = getEventPhotos().filter(p => p.eventId === currentEvent.id);
      setEventPhotos(photos);
    } else {
      setEventPhotos([]);
    }
  }, [currentEvent]);

  // Client-side compress to WebP Base64 helper using HTML5 Canvas
  const compressToWebP = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Downscale to max 1000px dimensions to keep it lightweight
          const maxDimension = 1000;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Contexto 2D do Canvas indisponível'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Use WebP format and medium quality to keep sizes tiny
          const webpDataUrl = canvas.toDataURL('image/webp', 0.72);
          resolve(webpDataUrl);
        };
        img.onerror = () => reject(new Error('Falha ao carregar arquivo de imagem para conversão'));
      };
      reader.onerror = () => reject(new Error('Falha na leitura do arquivo'));
    });
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    if (isReadOnly) {
      showNotification('error', 'Apenas coordenadores podem adicionar fotos de comprovação.');
      return;
    }

    setPhotoCompressing(true);
    try {
      showNotification('info', 'Processando e compactando imagem para WebP...');
      const webpDataUrl = await compressToWebP(file);

      const newPhoto: EventPhoto = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(),
        eventId: currentEvent.id,
        photo: webpDataUrl,
        createdAt: new Date().toISOString()
      };

      // Save locally
      const allPhotos = getEventPhotos();
      saveEventPhotos([...allPhotos, newPhoto]);
      setEventPhotos(prev => [...prev, newPhoto]);

      // Push to Supabase asynchronously (so it works online, doesn't block offline)
      pushPhotoToSupabase(newPhoto);

      showNotification('success', 'Foto de comprovação WebP adicionada com sucesso!');
    } catch (err: any) {
      console.error(err);
      showNotification('error', `Erro ao converter imagem: ${err.message || err}`);
    } finally {
      setPhotoCompressing(false);
      if (e.target) e.target.value = ''; // Reset input to allow re-uploading same file name
    }
  };

  const executeDeletePhoto = async () => {
    if (!photoToDelete) return;
    const photoId = photoToDelete;
    setPhotoToDelete(null);

    if (isReadOnly) {
      showNotification('error', 'Apenas coordenadores podem remover fotos de comprovação.');
      return;
    }

    try {
      // Delete locally
      const allPhotos = getEventPhotos();
      const filteredPhotos = allPhotos.filter(p => p.id !== photoId);
      saveEventPhotos(filteredPhotos);
      setEventPhotos(prev => prev.filter(p => p.id !== photoId));

      // Async Delete from Supabase
      deletePhotoFromSupabase(photoId);

      showNotification('success', 'Imagem de comprovação excluída com sucesso.');
    } catch (err: any) {
      showNotification('error', `Erro ao excluir imagem: ${err.message || err}`);
    }
  };

  // Sync to initial selected event if changed externally
  useEffect(() => {
    setCurrentEvent(initialSelectedEvent);
  }, [initialSelectedEvent]);

  // Temporary local state for attendance mapping
  // key: memberId, value: { status, note }
  const [localAttendance, setLocalAttendance] = useState<Record<string, { status: AttendanceStatus | ''; note: string }>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing attendances when currentEvent changes
  useEffect(() => {
    if (currentEvent) {
      const existing = attendances.filter(a => a.eventId === currentEvent.id);
      const mapping: Record<string, { status: AttendanceStatus | ''; note: string }> = {};

      // Initialize all active members as '' status first
      activeMembers.forEach(m => {
        mapping[m.id] = { status: '', note: '' };
      });

      // Override with existing saved records
      existing.forEach(a => {
        mapping[a.memberId] = {
          status: a.status,
          note: a.note || ''
        };
      });

      setLocalAttendance(mapping);
      setSaveSuccess(false);
    }
  }, [currentEvent, attendances, members]);

  // Handle status selection for a single member
  const handleSelectStatus = (memberId: string, status: AttendanceStatus) => {
    if (isReadOnly) return; // Read-only guard
    setLocalAttendance(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || { note: '' }),
        status
      }
    }));
  };

  // Handle note editing for a single member
  const handleEditNote = (memberId: string, note: string) => {
    if (isReadOnly) return;
    setLocalAttendance(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || { status: '' }),
        note
      }
    }));
  };

  // Group-specific Bulk acts
  const handleMarkGroupAll = (groupMembers: Member[], status: AttendanceStatus) => {
    if (isReadOnly) return;
    const updated = { ...localAttendance };
    groupMembers.forEach(m => {
      updated[m.id] = {
        ...(updated[m.id] || { note: '' }),
        status
      };
    });
    setLocalAttendance(updated);
    showNotification('info', `Todos os ${groupMembers.length} membros foram marcados.`);
  };

  const handleClearGroupAll = (groupMembers: Member[]) => {
    if (isReadOnly) return;
    const updated = { ...localAttendance };
    groupMembers.forEach(m => {
      updated[m.id] = {
        status: '',
        note: ''
      };
    });
    setLocalAttendance(updated);
    showNotification('info', `Marcações dos ${groupMembers.length} membros foram limpas.`);
  };

  const handleSave = () => {
    if (!currentEvent || isReadOnly) return;

    setSaveLoading(true);

    // Build lists for saving
    const saveList: Omit<Attendance, 'id'>[] = activeMembers.map(m => {
      const entry = localAttendance[m.id];
      return {
        eventId: currentEvent.id,
        memberId: m.id,
        // If left empty and event saved, treat as absent
        status: entry && entry.status ? entry.status : 'absent',
        note: entry ? entry.note : ''
      };
    });

    setTimeout(() => {
      onSaveAttendances(currentEvent.id, saveList);
      setSaveSuccess(true);
      setSaveLoading(false);
      showNotification('success', 'Presenças salvas e computadas com sucesso.');
      setTimeout(() => setSaveSuccess(false), 4000);
    }, 600);
  };

  // If no event is selected, display list of events to select one
  if (!currentEvent) {
    const allowedCategories = getAllowedEventCategoriesForProfile(currentUser);
    const sortedEvents = [...events]
      .filter(ev => allowedCategories === 'all' || allowedCategories.includes(ev.category))
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
            <UserCheck2 className="h-5 w-5 text-amber-500" />
            Selecione uma Atividade para Frequência
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Selecione um evento abaixo para marcar ou editar cartões de presença para todos os membros ativos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedEvents.length === 0 ? (
            <div className="md:col-span-2 text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 animate-fade-in">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 mt-2">Nenhum evento registrado</p>
              <p className="text-xs text-slate-500 mt-1">Cadastre atividades na aba "Eventos" primeiro.</p>
            </div>
          ) : (
            sortedEvents.map(ev => {
              const count = attendances.filter(a => a.eventId === ev.id).length;
              return (
                <div
                  key={ev.id}
                  onClick={() => setCurrentEvent(ev)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition cursor-pointer flex justify-between items-center group animate-fade-in"
                >
                  <div className="space-y-2 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {CATEGORY_LABELS[ev.category] || ev.category}
                    </span>
                    <h4 className="font-extrabold text-slate-800 text-sm truncate font-display group-hover:text-amber-600">
                      {ev.title}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium font-mono">
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 pl-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      count > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-150' : 'bg-rose-50 text-rose-800 border-rose-150'
                    }`}>
                      {count > 0 ? 'Frequência Salva' : 'Pendente'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Grouping members based on eligibility
  const groupedMembers = {
    required: [] as Member[],
    optional: [] as Member[],
    notApplicable: [] as Member[]
  };

  activeMembers.forEach(m => {
    const eligibility = getMemberEligibility(m, currentEvent);
    if (eligibility === 'required') {
      groupedMembers.required.push(m);
    } else if (eligibility === 'optional') {
      groupedMembers.optional.push(m);
    } else {
      groupedMembers.notApplicable.push(m);
    }
  });

  const renderGroupSection = (
    title: string,
    description: string,
    membersList: Member[],
    accentClass: string,
    isNotApplicable = false
  ) => {
    if (membersList.length === 0) return null;

    return (
      <div className="bg-white rounded-xl border border-slate-205 overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-slate-809 text-sm font-display flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${accentClass}`} />
              {title} ({membersList.length})
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              {description}
            </span>
          </div>

          {currentUser.role !== 'visualizacao' && !isNotApplicable && (
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleMarkGroupAll(membersList, 'present')}
                className="!px-2.5 !py-1 text-[11px] h-7 font-semibold"
              >
                Presentes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleMarkGroupAll(membersList, 'absent')}
                className="!px-2.5 !py-1 text-[11px] h-7 font-semibold"
              >
                Ausentes
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClearGroupAll(membersList)}
                className="!px-2.5 !py-1 text-[11px] h-7 text-slate-500 hover:text-rose-600 font-semibold"
              >
                Limpar
              </Button>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {membersList.map(member => {
            const entry = localAttendance[member.id] || { status: '', note: '' };

            return (
              <div
                key={member.id}
                className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/20 transition first:pt-0"
              >
                {/* Visual info left */}
                <div className="flex items-center gap-3">
                  <div className="h-8.5 w-8.5 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700 shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{member.name}</h5>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      {member.degree === 'demolay' ? 'Grau DeMolay' : 'Grau Iniciático'}
                      {member.isNominata && ` • ${member.nominataRole}`}
                    </p>
                  </div>
                </div>

                {/* Status switches and note right */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:w-2/3 lg:w-1/2">
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg shrink-0 w-full sm:w-[260px]">
                    <button
                      type="button"
                      disabled={isReadOnly || isNotApplicable}
                      onClick={() => handleSelectStatus(member.id, 'present')}
                      className={`py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                        entry.status === 'present'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isNotApplicable 
                            ? 'text-slate-400 cursor-not-allowed bg-slate-105'
                            : 'text-slate-600 hover:bg-slate-200/50'
                      }`}
                    >
                      Presente
                    </button>

                    <button
                      type="button"
                      disabled={isReadOnly || isNotApplicable}
                      onClick={() => handleSelectStatus(member.id, 'absent')}
                      className={`py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                        entry.status === 'absent'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : isNotApplicable
                            ? 'text-slate-400 cursor-not-allowed bg-slate-105'
                            : 'text-slate-600 hover:bg-slate-200/50'
                      }`}
                    >
                      Ausente
                    </button>

                    <button
                      type="button"
                      disabled={isReadOnly || isNotApplicable}
                      onClick={() => handleSelectStatus(member.id, 'justified')}
                      className={`py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                        entry.status === 'justified'
                          ? 'bg-amber-400 text-slate-900 shadow-xs'
                          : isNotApplicable
                            ? 'text-slate-400 cursor-not-allowed bg-slate-105'
                            : 'text-slate-600 hover:bg-slate-200/50'
                      }`}
                    >
                      Justificado
                    </button>
                  </div>

                  <input
                    type="text"
                    disabled={isReadOnly || isNotApplicable}
                    value={isNotApplicable ? 'NÃO APLICÁVEL' : entry.note}
                    onChange={e => handleEditNote(member.id, e.target.value)}
                    placeholder={
                      isNotApplicable
                        ? 'Evento não aplicável'
                        : isReadOnly 
                          ? "Sem observações" 
                          : "Inserir justificativa/observação..."
                    }
                    className="border border-slate-200 w-full sm:flex-grow rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-105 font-medium"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Event selection header and title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClearSelectedEvent();
                setCurrentEvent(null);
              }}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 font-medium hover:bg-slate-200 rounded-lg transition"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  {CATEGORY_LABELS[currentEvent.category] || currentEvent.category}
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  {new Date(currentEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-850 font-display mt-0.5">
                {currentEvent.title}
              </h3>
            </div>
          </div>

          {/* Quick instructions / alerts */}
          {currentUser.role === 'visualizacao' ? (
            <div className="bg-yellow-50 text-yellow-800 border border-yellow-250 rounded-lg p-2 text-xs flex items-center gap-1.5 font-medium max-w-xs">
              <Info className="h-4 w-4 shrink-0" />
              Você está no perfil de visualização e não pode salvar alterações.
            </div>
          ) : !isAllowedToManageThisEvent ? (
            <div className="bg-rose-50 text-rose-800 border border-rose-200 rounded-lg p-3 text-xs flex items-center gap-1.5 font-bold max-w-md">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 animate-pulse" />
              {currentUser.role === 'diretoria' && currentUser.position === 'Mordomo' && (
                <span>O cargo Mordomo só pode confirmar presenças em eventos de Limpeza.</span>
              )}
              {currentUser.role === 'diretoria' && currentUser.position === 'Hospitaleiro' && (
                <span>O cargo Hospitaleiro só pode confirmar presenças em eventos de Filantropia e Outros.</span>
              )}
              {!(currentUser.role === 'diretoria' && (currentUser.position === 'Mordomo' || currentUser.position === 'Hospitaleiro')) && (
                <span>Ação não permitida para este cargo.</span>
              )}
            </div>
          ) : null}
        </div>

        {currentEvent.description && (
          <p className="mt-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-150 border-dashed">
            <strong>Descrição do Evento:</strong> {currentEvent.description}
          </p>
        )}
      </div>

      {/* COMPROVAÇÃO POR FOTO SECTION */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs animate-fade-in space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm font-display flex items-center gap-2">
              <Camera className="h-4.5 w-4.5 text-amber-500" />
              Fotos de Comprovação da Presença
            </h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Adicione fotos da atividade para comprovar quem realmente estava presente. Os arquivos são automaticamente convertidos para o formato WebP para otimizar espaço de armazenamento.
            </p>
          </div>
          
          {!isReadOnly && (
            <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-transparent rounded-lg text-white font-bold hover:bg-slate-800 transition text-xs select-none shadow-xs shrink-0 ${photoCompressing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
              {photoCompressing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Adicionar Foto
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAddPhoto} 
                className="hidden" 
                disabled={photoCompressing}
              />
            </label>
          )}
        </div>

        {/* Photo list representation */}
        {eventPhotos.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
            <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
            <span className="text-xs font-bold text-slate-500 block">Nenhuma foto adicionada</span>
            <span className="text-[11px] text-slate-400">Arraste ou clique em "Adicionar Foto" para anexar comprovantes</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
            {eventPhotos.map(p => (
              <div key={p.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50 shadow-inner flex items-center justify-center">
                <img 
                  src={p.photo} 
                  alt="Comprovante de presença" 
                  className="object-cover w-full h-full cursor-pointer hover:scale-105 transition duration-300"
                  onClick={() => setLightboxPhoto(p)}
                />
                
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setPhotoToDelete(p.id);
                    }}
                    className="absolute top-1.5 right-1.5 z-10 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-md transition duration-200 cursor-pointer"
                    title="Excluir foto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                
                <span className="absolute bottom-1 left-1.5 right-1.5 px-1 py-0.5 rounded bg-black/60 text-[8px] font-medium text-white truncate text-center">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control Actions bar */}
      {!isReadOnly && (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Users className="h-5 w-5 text-amber-400" />
            <span>Frequência organizada por elegibilidade dos membros.</span>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-emerald-450 text-xs font-bold flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> Alterações Gravadas!
              </span>
            )}
            <Button
              onClick={handleSave}
              variant="primary"
              loading={saveLoading}
              disabled={saveLoading}
              className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-sm shadow-md"
            >
              Salvar presenças
            </Button>
          </div>
        </div>
      )}

      {/* Structured segmented lists of members */}
      {activeMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          Não há membros ativos cadastrados no momento.
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroupSection(
            'Membros Obrigatórios',
            'Irmãos escalados obrigatoriamente para este tipo de evento. A ausência sem justificativa pesa negativamente no percentual geral.',
            groupedMembers.required,
            'bg-blue-500',
            false
          )}

          {renderGroupSection(
            'Membros Opcionais / Plus',
            'Irmãos isentos da obrigação. A presença atua como participação extra positiva para somar nas estatísticas totais. A ausência NÃO prejudica.',
            groupedMembers.optional,
            'bg-amber-400',
            false
          )}

          {renderGroupSection(
            'Membros Não Aplicáveis',
            'Atividade desvinculada destas funções/perfis por regulamento interno. Isenção total sem registros ou impacto nas notas.',
            groupedMembers.notApplicable,
            'bg-slate-300',
            true
          )}
        </div>
      )}

      {/* Bottom Save Block */}
      {!isReadOnly && activeMembers.length > 0 && (
        <div className="bg-slate-105 p-4 rounded-xl border border-slate-200 flex justify-end items-center gap-3 animate-fade-in">
          {saveSuccess && (
            <span className="text-emerald-600 text-xs font-bold"> Frequência salva com sucesso!</span>
          )}
          <Button
            onClick={handleSave}
            variant="primary"
            loading={saveLoading}
            disabled={saveLoading}
            className="px-6 py-2.5 font-bold"
          >
            Gravar Todas as Presenças
          </Button>
        </div>
      )}

      {/* LIGHTBOX OVERLAY */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            {/* Lightbox header */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="h-4.5 w-4.5 text-amber-400" />
                <span className="text-xs font-bold font-display">Comprovante de Presença</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  - Enviado em: {lightboxPhoto.createdAt ? new Date(lightboxPhoto.createdAt).toLocaleString('pt-BR') : '-'}
                </span>
              </div>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lightbox main image */}
            <div className="flex-grow flex items-center justify-center p-4 overflow-auto bg-slate-950">
              <img 
                src={lightboxPhoto.photo} 
                alt="Comprovante ampliado" 
                className="max-h-[70vh] object-contain rounded shadow-lg max-w-full"
              />
            </div>

            {/* Lightbox actions footer */}
            <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              {currentUser.role !== 'visualizacao' && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    const photoId = lightboxPhoto.id;
                    setLightboxPhoto(null);
                    setPhotoToDelete(photoId);
                  }}
                  className="!px-3 !py-1.5 text-xs bg-rose-600 hover:bg-rose-700 font-semibold"
                >
                  Excluir comprovante
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLightboxPhoto(null)}
                className="!px-4 !py-1.5 text-xs text-slate-300 hover:text-white font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PHOTO DELETE MODAL */}
      <ConfirmModal
        isOpen={!!photoToDelete}
        title="Excluir Foto de Comprovação"
        message="Tem certeza de que deseja excluir permanentemente esta imagem de comprovação de presença?"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
      />
    </div>
  );
}
