import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { Event, EventCategory, User } from '../types';
import { CATEGORY_LABELS } from '../utils/calculations';
import { getEventCategoryPreset } from '../utils/storage';
import { useNotification } from '../components/NotificationContext';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';

interface EventsPageProps {
  events: Event[];
  currentUser: User;
  onAddEvent: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onMarkAttendanceRedirect: (event: Event) => void;
}

export default function EventsPage({
  events,
  currentUser,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onMarkAttendanceRedirect
}: EventsPageProps) {
  const { showNotification } = useNotification();

  // Permission checks
  const canModify = currentUser.role === 'admin' || currentUser.role === 'diretoria';
  const canDelete = currentUser.role === 'admin' || currentUser.role === 'diretoria';

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Form states
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('ritualistica');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRequiredFor, setFormRequiredFor] = useState<Array<'iniciatico' | 'demolay' | 'nominata'>>([]);
  const [formOptionalFor, setFormOptionalFor] = useState<Array<'iniciatico' | 'demolay' | 'nominata'>>([]);
  const [formNominataType, setFormNominataType] = useState<'diretoria' | 'iniciacao' | 'elevacao' | 'none'>('diretoria');
  const [formError, setFormError] = useState('');

  // Handle opening form
  const handleOpenAdd = () => {
    if (!canModify) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    setEditingEvent(null);
    setFormTitle(CATEGORY_LABELS['ritualistica']);
    setFormCategory('ritualistica');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormNominataType('diretoria');
    
    const preset = getEventCategoryPreset('ritualistica');
    setFormRequiredFor(preset.requiredFor);
    setFormOptionalFor(preset.optionalFor);

    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (event: Event) => {
    if (!canModify) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormCategory(event.category);
    setFormDate(event.date);
    setFormDescription(event.description);
    setFormRequiredFor(event.requiredFor || []);
    setFormOptionalFor(event.optionalFor || []);
    setFormNominataType(event.nominataType || (
      event.category === 'ensaio_iniciacao' ? 'iniciacao' :
      event.category === 'ensaio_elevacao' ? 'elevacao' :
      (event.category === 'outros' ? 'none' : 'diretoria')
    ));
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('O título da atividade é obrigatório.');
      showNotification('warning', 'O título da atividade é obrigatório.');
      return;
    }
    if (!formCategory) {
      setFormError('A categoria é obrigatória.');
      showNotification('warning', 'A categoria é obrigatória.');
      return;
    }
    if (!formDate) {
      setFormError('A data é obrigatória.');
      showNotification('warning', 'A data é obrigatória.');
      return;
    }

    setFormLoading(true);

    setTimeout(() => {
      if (editingEvent) {
        onUpdateEvent({
          ...editingEvent,
          title: formTitle.trim(),
          category: formCategory,
          date: formDate,
          description: formDescription.trim(),
          requiredFor: formRequiredFor,
          optionalFor: formOptionalFor,
          nominataType: formNominataType
        });
        showNotification('success', 'Evento atualizado com sucesso.');
      } else {
        onAddEvent({
          title: formTitle.trim(),
          category: formCategory,
          date: formDate,
          description: formDescription.trim(),
          requiredFor: formRequiredFor,
          optionalFor: formOptionalFor,
          nominataType: formNominataType
        });
        showNotification('success', 'Evento salvo com sucesso.');
      }
      setFormLoading(false);
      setIsFormOpen(false);
    }, 550);
  };

  const handleDeleteTrigger = (event: Event) => {
    if (!canDelete) {
      showNotification('error', 'Ação não permitida para este perfil.');
      return;
    }
    setEventToDelete(event);
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    onDeleteEvent(eventToDelete.id);
    showNotification('success', 'Evento excluído com sucesso.');
    setEventToDelete(null);
  };

  const handleToggleRequired = (role: 'iniciatico' | 'demolay' | 'nominata') => {
    if (formRequiredFor.includes(role)) {
      setFormRequiredFor(formRequiredFor.filter(r => r !== role));
    } else {
      setFormRequiredFor([...formRequiredFor, role]);
      setFormOptionalFor(formOptionalFor.filter(r => r !== role));
    }
  };

  const handleToggleOptional = (role: 'iniciatico' | 'demolay' | 'nominata') => {
    if (formOptionalFor.includes(role)) {
      setFormOptionalFor(formOptionalFor.filter(r => r !== role));
    } else {
      setFormOptionalFor([...formOptionalFor, role]);
      setFormRequiredFor(formRequiredFor.filter(r => r !== role));
    }
  };

  // Filter list and Sort by date descending
  const filteredEvents = events
    .filter(event => {
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
      const matchesStart = !startDateFilter || event.date >= startDateFilter;
      const matchesEnd = !endDateFilter || event.date <= endDateFilter;
      return matchesCategory && matchesStart && matchesEnd;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition duration-200 animate-fade-in animate-duration-150">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4 p-1 cursor-pointer">✕</button>
        </div>
      )}
      {/* Filters and Actions Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 animate-fade-in">
        
        {/* Filters Group */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 max-w-4xl">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Filtrar Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as EventCategory | 'all')}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-55 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="all">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={e => setStartDateFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-55 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Data Final
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={e => setEndDateFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-55 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-end gap-3 self-end xl:self-center shrink-0">
          {(startDateFilter || endDateFilter || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="px-3.5 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}

          {canModify && (
            <Button
              onClick={handleOpenAdd}
              variant="primary"
            >
              <Plus className="h-4 w-4 mr-0.5" />
              Novo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Events Presentation List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Nenhuma atividade cadastrada</h3>
          <p className="mt-1 text-xs text-slate-500">Tente ajustar seus critérios de busca ou cadastre um novo evento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            // Stylize based on category
            let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-200';
            if (event.category === 'ritualistica') badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
            if (event.category === 'terca_burocratica') badgeStyle = 'bg-indigo-100 text-indigo-800 border-indigo-205';
            if (event.category === 'quinta_burocratica') badgeStyle = 'bg-violet-100 text-violet-850 border-violet-200';
            if (event.category === 'filantropia') badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            if (event.category === 'limpeza') badgeStyle = 'bg-amber-100 text-amber-805 border-amber-200';
            if (event.category === 'ensaio_iniciacao') badgeStyle = 'bg-cyan-100 text-cyan-800 border-cyan-200';
            if (event.category === 'ensaio_elevacao') badgeStyle = 'bg-sky-100 text-sky-850 border-sky-200';
            if (event.category === 'outros') badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';

            const req = event.requiredFor || [];
            const opt = event.optionalFor || [];

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-slate-200 py-5 px-5 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${badgeStyle}`}>
                      {CATEGORY_LABELS[event.category] || event.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-808 text-base font-display">
                      {event.title}
                    </h4>
                    {event.description ? (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1">
                        Sem descrição informada.
                      </p>
                    )}
                  </div>

                  {/* Applicability badging */}
                  <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 text-[11px] border border-slate-150">
                    <div className="flex items-center gap-1 border-b border-slate-205 pb-1 mb-1 font-semibold text-xs text-slate-800">
                      <span className="text-slate-600 shrink-0 font-bold">Nominata vinculada:</span>
                      <span className="text-amber-800 font-extrabold">
                        {event.nominataType === 'iniciacao' ? 'Iniciação ✨' :
                         event.nominataType === 'elevacao' ? 'Elevação ⚔️' :
                         event.nominataType === 'none' ? 'Nenhuma ✕' :
                         'Diretoria (Semestre) 🏛️'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <strong className="text-slate-600 block shrink-0 font-bold">Obrigatório para:</strong>
                      <span className="text-slate-800 truncate">
                        {req.length > 0 
                          ? req.map(r => r === 'iniciatico' ? 'Grau Iniciático' : r === 'demolay' ? 'Grau DeMolay' : 'Nominata').join(', ') 
                          : 'Ninguém'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <strong className="text-slate-600 block shrink-0 font-bold">Opcional/Plus para:</strong>
                      <span className="text-slate-800 truncate">
                        {opt.length > 0 
                          ? opt.map(r => r === 'iniciatico' ? 'Grau Iniciático' : r === 'demolay' ? 'Grau DeMolay' : 'Nominata').join(', ') 
                          : 'Ninguém'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event Cards Footer controls */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                  {currentUser.role !== 'visualizacao' ? (
                    <button
                      onClick={() => onMarkAttendanceRedirect(event)}
                      className="inline-flex items-center text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      Preencher Presenças
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Modo Leitura</span>
                  )}

                  <div className="flex items-center gap-1.5">
                    {canModify && (
                      <button
                        onClick={() => handleOpenEdit(event)}
                        title="Editar Evento"
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteTrigger(event)}
                        title="Excluir Evento"
                        className="p-1.5 text-rose-600 hover:text-rose-850 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold font-display text-base">
                {editingEvent ? 'Editar Evento' : 'Cadastrar Atividade Capítulo'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  {formError}
                </div>
              )}

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">
                  Categoria da Atividade
                </label>
                <select
                  value={formCategory}
                  onChange={e => {
                    const value = e.target.value as EventCategory;
                    setFormCategory(value);
                    if (!editingEvent) {
                      if (value !== 'outros') {
                        setFormTitle(CATEGORY_LABELS[value]);
                      } else {
                        setFormTitle('');
                      }
                      const preset = getEventCategoryPreset(value);
                      setFormRequiredFor(preset.requiredFor);
                      setFormOptionalFor(preset.optionalFor);

                      // Automatically assign corresponding Nominata
                      if (value === 'ensaio_iniciacao') {
                        setFormNominataType('iniciacao');
                      } else if (value === 'ensaio_elevacao') {
                        setFormNominataType('elevacao');
                      } else if (value === 'outros') {
                        setFormNominataType('none');
                      } else {
                        setFormNominataType('diretoria');
                      }
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título do Evento / Atividade
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={
                    formCategory === 'outros'
                      ? "Ex: Ensaio para Cerimônia, Trabalho extra..."
                      : `Título padrão: ${CATEGORY_LABELS[formCategory]}`
                  }
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Nominata Applicability Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">
                  Vincular Nominata de Trabalho
                </label>
                <select
                  value={formNominataType}
                  onChange={e => setFormNominataType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="diretoria">Nominata da Diretoria (Membros e Cargos do Semestre)</option>
                  <option value="iniciacao">Nominata de Iniciação (Membros escalados para Cerimônia & Ensaios)</option>
                  <option value="elevacao">Nominata de Elevação (Membros escalados para Cerimônia & Ensaios)</option>
                  <option value="none">Nenhuma Nominata (Não requer cargos específicos)</option>
                </select>
                <p className="text-[10px] text-slate-450 mt-1 font-medium leading-relaxed">
                  O sistema usará a nominata selecionada para gerenciar as recomendações e obrigatoriedades adaptativas de presença para esta atividade.
                </p>
              </div>

              {/* Rules Applicability config checkboxes */}
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3.5">
                {/* Required for checkboxes */}
                <div>
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Obrigatório para:
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {['iniciatico', 'demolay', 'nominata'].map(role => {
                      const isChecked = formRequiredFor.includes(role as any);
                      const name = role === 'iniciatico' ? 'Grau Iniciático' : role === 'demolay' ? 'Grau DeMolay' : 'Nominata/Diretoria';
                      return (
                        <label key={role} className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRequired(role as any)}
                            className="form-checkbox text-slate-900 h-4.5 w-4.5 rounded border-slate-300 focus:ring-slate-900 mr-1.5"
                          />
                          {name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Optional for checkboxes */}
                <div className="pt-2 border-t border-slate-205">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Opcional/Plus para:
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {['iniciatico', 'demolay', 'nominata'].map(role => {
                      const isChecked = formOptionalFor.includes(role as any);
                      const name = role === 'iniciatico' ? 'Grau Iniciático' : role === 'demolay' ? 'Grau DeMolay' : 'Nominata/Diretoria';
                      return (
                        <label key={role} className="inline-flex items-center text-xs font-semibold text-slate-705 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleOptional(role as any)}
                            className="form-checkbox text-amber-500 h-4.5 w-4.5 rounded border-slate-300 focus:ring-amber-500 mr-1.5"
                          />
                          {name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">
                  Data de Realização
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1">
                  Descrição dos objetivos (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Ex: Instrução regular ministrada pelo Mestre de Cerimônias..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={formLoading}
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={formLoading}
                  disabled={formLoading}
                >
                  {editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventToDelete && (
        <ConfirmModal
          isOpen={!!eventToDelete}
          title="Excluir Evento"
          message={`Deseja realmente apagar o evento "${eventToDelete.title}"? Esta ação não pode ser desfeita e removerá definitivamente todo o histórico de presenças associado.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={() => setEventToDelete(null)}
        />
      )}
    </div>
  );
}
