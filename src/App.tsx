import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Member, Event, Attendance, User } from './types';
import { validateEventCategoryPermission, validateAttendancePermission } from './utils/permission';
import {
  getMembers,
  saveMembers,
  getEvents,
  saveEvents,
  getAttendances,
  saveAttendances,
  getUsers,
  saveUsers,
  getCurrentUser,
  saveCurrentUser
} from './utils/storage';

// Import Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import EventsPage from './pages/EventsPage';
import AttendancePage from './pages/AttendancePage';
import RankingPage from './pages/RankingPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import NominataPage from './pages/NominataPage';
import PublicRankingPage from './pages/PublicRankingPage';
import DatabaseSyncPage from './pages/DatabaseSyncPage';
import ManagementTermsPage from './pages/ManagementTermsPage';
import SelectManagementTermPage from './pages/SelectManagementTermPage';
import AuditPage from './pages/AuditPage';
import { ManagementTermProvider, useManagementTerm } from './contexts/ManagementTermContext';

// Import Supabase Integration triggers and sync helpers
import { checkSupabaseConnection, supabase } from './utils/supabaseClient';
import { 
  downloadSupabaseToLocal,
  pushMemberToSupabase, 
  deleteMemberFromSupabase,
  pushEventToSupabase,
  deleteEventFromSupabase,
  deleteAttendancesByEventId,
  deleteAttendancesByMemberId,
  pushAttendancesToSupabase,
  pushUserToSupabase,
  deleteUserFromSupabase,
  logAuditAction
} from './utils/supabaseService';

// Import Components
import Layout from './components/Layout';
import MemberProfileModal from './components/MemberProfileModal';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTerm, setActiveTerm } = useManagementTerm();
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

  // Redirect guard: if user is logged in, has not selected an active management term yet,
  // is trying to navigate to an administrative sub-route, and is NOT on the selection page.
  useEffect(() => {
    if (
      currentUser &&
      !activeTerm &&
      location.pathname.startsWith('/admin') &&
      location.pathname !== '/admin/selecionar-gestao' &&
      location.pathname !== '/admin'
    ) {
      navigate('/admin/selecionar-gestao', { replace: true });
    }
  }, [currentUser, activeTerm, location.pathname, navigate]);

  // Shared application states
  const [members, setMembers] = useState<Member[]>(() => {
    // If we have cached members, load them immediately (0s delay).
    // Otherwise, return an empty array [] to prevent the mock database from flickering for fresh visitors ("o povo").
    const cached = localStorage.getItem('demolay_members');
    return cached ? getMembers() : [];
  });
  const [events, setEvents] = useState<Event[]>(() => {
    const cached = localStorage.getItem('demolay_events');
    return cached ? getEvents() : [];
  });
  const [attendances, setAttendances] = useState<Attendance[]>(() => {
    const cached = localStorage.getItem('demolay_attendance');
    return cached ? getAttendances() : [];
  });
  const [users, setUsers] = useState<User[]>(() => {
    const cached = localStorage.getItem('demolay_users');
    return cached ? getUsers() : [];
  });

  const [initialSyncLoading, setInitialSyncLoading] = useState(() => {
    const cached = localStorage.getItem('demolay_members');
    return !cached;
  });

  // Navigation overrides or modal selections
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<Event | null>(null);
  const [selectedMemberModal, setSelectedMemberModal] = useState<Member | null>(null);

  // 1. Initial Load from localStorage with background online Supabase check/sync
  useEffect(() => {
    // Cleanly establish the official system migration version
    if (!localStorage.getItem('demolay_migration_version')) {
      localStorage.setItem('demolay_migration_version', '1.0');
    }

    // Try downloading the latest from Supabase if connected
    const tryDownloadSupabase = async () => {
      setInitialSyncLoading(true);
      try {
        const res = await downloadSupabaseToLocal();
        if (res.success && res.data) {
          setMembers(res.data.members);
          setEvents(res.data.events);
          setAttendances(res.data.attendances);
          
          // Ensure Thiago is present and synced online as well
          const hasThiago = res.data.users.some(u => u.email === 'thiago@capitulotx.com.br');
          let finalUsers = res.data.users;
          if (!hasThiago) {
            const thiagoUser: User = {
              id: 'u_thiago',
              name: 'Thiago (Administrador)',
              email: 'thiago@capitulotx.com.br',
              password: '123mudar456',
              role: 'admin'
            };
            finalUsers = [...res.data.users, thiagoUser];
            saveUsers(finalUsers);
            await pushUserToSupabase(thiagoUser);
          }
          setUsers(finalUsers);
          console.log('Dados do Supabase baixados e sincronizados com sucesso na inicialização!');
          localStorage.setItem('demolay_has_synced', 'true');
        } else {
          // If Supabase fetch was not successful (e.g. config issue) and we have no cache, load defaults
          const cached = localStorage.getItem('demolay_members');
          if (!cached) {
            setMembers(getMembers());
            setEvents(getEvents());
            setAttendances(getAttendances());
            setUsers(getUsers());
          }
        }
      } catch (err) {
        console.warn('Falha na sincronização em background com o Supabase:', err);
        const cached = localStorage.getItem('demolay_members');
        if (!cached) {
          setMembers(getMembers());
          setEvents(getEvents());
          setAttendances(getAttendances());
          setUsers(getUsers());
        }
      } finally {
        setInitialSyncLoading(false);
      }
    };

    tryDownloadSupabase();
  }, []);

  // Realtime Debug Subscription for diagnostic testing
  useEffect(() => {
    console.log('Iniciando diagnóstico técnico de canais Realtime do Supabase...');

    const tablesToSubscribe = [
      'demolay_members',
      'demolay_events',
      'demolay_attendance',
      'profiles',
      'management_terms',
      'audit_logs'
    ];

    const channels = tablesToSubscribe.map(tableName => {
      const channel = supabase
        .channel(`realtime-debug-${tableName}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            console.log(`[DEBUG REALTIME] Evento recebido na tabela "${tableName}":`, payload);
          }
        )
        .subscribe((status) => {
          console.log(`[DEBUG REALTIME] Status da inscrição na tabela "${tableName}":`, status);
        });
      return channel;
    });

    return () => {
      console.log('Removendo canais de diagnóstico Realtime...');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  // 2. Auth handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    navigate('/admin/selecionar-gestao', { replace: true });
  };

  const handleLogout = () => {
    saveCurrentUser(null);
    setCurrentUser(null);
    setActiveTerm(null);
    navigate('/admin', { replace: true });
  };

  // 3. Member CRUD triggers with Supabase Sync
  const handleAddMember = (newMember: Omit<Member, 'id' | 'createdAt'>) => {
    const created: Member = {
      ...newMember,
      id: 'm_' + Date.now(),
      createdAt: new Date().toISOString(),
      managementTermId: activeTerm?.id || undefined
    };
    const updated = [...members, created];
    setMembers(updated);
    saveMembers(updated);
    pushMemberToSupabase(created); // Background cloud push

    if (currentUser) {
      logAuditAction({
        managementTermId: created.managementTermId || null,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'created',
        entityType: 'member',
        entityId: created.id,
        entityName: created.name,
        description: `${currentUser.name || currentUser.email} criou o membro ${created.name}`,
        newData: created
      });
    }
  };

  const handleUpdateMember = (updatedMember: Member) => {
    const created: Member = {
      ...updatedMember,
      managementTermId: updatedMember.managementTermId || activeTerm?.id || undefined
    };
    const oldMember = members.find(m => m.id === created.id);
    const updated = members.map(m => (m.id === created.id ? created : m));
    setMembers(updated);
    saveMembers(updated);
    pushMemberToSupabase(created); // Background cloud push

    if (currentUser) {
      logAuditAction({
        managementTermId: created.managementTermId || null,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'updated',
        entityType: 'member',
        entityId: created.id,
        entityName: created.name,
        description: `${currentUser.name || currentUser.email} atualizou o membro ${created.name}`,
        oldData: oldMember || null,
        newData: created
      });
    }
  };

  const handleDeleteMember = (id: string) => {
    const target = members.find(m => m.id === id);
    const memberName = target ? target.name : 'Membro';
    const memberTermId = target?.managementTermId || activeTerm?.id || null;

    // 1. Remove member
    const updatedMembers = members.filter(m => m.id !== id);
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
    deleteMemberFromSupabase(id); // Background cloud delete

    // 2. Cascade delete member attendances
    const updatedAttendances = attendances.filter(a => a.memberId !== id);
    setAttendances(updatedAttendances);
    saveAttendances(updatedAttendances);
    deleteAttendancesByMemberId(id); // Background cascade delete

    if (currentUser) {
      logAuditAction({
        managementTermId: memberTermId,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'deleted',
        entityType: 'member',
        entityId: id,
        entityName: memberName,
        description: `${currentUser.name || currentUser.email} excluiu o membro ${memberName}`,
        oldData: target || null
      });
    }
  };

  // 4. Event CRUD triggers with Supabase Sync
  const handleAddEvent = (newEvent: Omit<Event, 'id' | 'createdAt'>) => {
    validateEventCategoryPermission(currentUser, newEvent.category);

    const created: Event = {
      ...newEvent,
      id: 'e_' + Date.now(),
      createdAt: new Date().toISOString(),
      managementTermId: activeTerm?.id || undefined
    };
    const updated = [...events, created];
    setEvents(updated);
    saveEvents(updated);
    pushEventToSupabase(created); // Background cloud push

    if (currentUser) {
      logAuditAction({
        managementTermId: created.managementTermId || null,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'created',
        entityType: 'event',
        entityId: created.id,
        entityName: created.title,
        description: `${currentUser.name || currentUser.email} criou o evento ${created.title}`,
        newData: created
      });
    }
  };

  const handleUpdateEvent = (updatedEvent: Event) => {
    validateEventCategoryPermission(currentUser, updatedEvent.category);

    const created: Event = {
      ...updatedEvent,
      managementTermId: updatedEvent.managementTermId || activeTerm?.id || undefined
    };
    const oldEvent = events.find(e => e.id === created.id);
    const updated = events.map(e => (e.id === created.id ? created : e));
    setEvents(updated);
    saveEvents(updated);
    pushEventToSupabase(created); // Background cloud push

    if (currentUser) {
      logAuditAction({
        managementTermId: created.managementTermId || null,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'updated',
        entityType: 'event',
        entityId: created.id,
        entityName: created.title,
        description: `${currentUser.name || currentUser.email} atualizou o evento ${created.title}`,
        oldData: oldEvent || null,
        newData: created
      });
    }
  };

  const handleDeleteEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    const eventTitle = target ? target.title : 'Evento';
    const eventTermId = target?.managementTermId || activeTerm?.id || null;

    // 1. Remove event
    const updatedEvents = events.filter(e => e.id !== id);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    deleteEventFromSupabase(id); // Background cloud delete

    // 2. Cascade delete event attendances
    const updatedAttendances = attendances.filter(a => a.eventId !== id);
    setAttendances(updatedAttendances);
    saveAttendances(updatedAttendances);
    deleteAttendancesByEventId(id); // Background cascade delete

    if (currentUser) {
      logAuditAction({
        managementTermId: eventTermId,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'deleted',
        entityType: 'event',
        entityId: id,
        entityName: eventTitle,
        description: `${currentUser.name || currentUser.email} excluiu o evento ${eventTitle}`,
        oldData: target || null
      });
    }
  };

  // 5. Save Event attendance marks with Supabase Sync
  const handleSaveAttendances = (eventId: string, updatedList: Omit<Attendance, 'id'>[]) => {
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) {
      throw new Error("Evento não encontrado.");
    }
    validateAttendancePermission(currentUser, targetEvent);

    // Purge existing attendances matching eventId
    const baseList = attendances.filter(a => a.eventId !== eventId);

    // Map new list with ids and managementTermId
    const appendList: Attendance[] = updatedList.map((item, idx) => ({
      ...item,
      id: `a_${eventId}_${idx}_${Date.now()}`,
      managementTermId: activeTerm?.id || undefined
    }));

    const final = [...baseList, ...appendList];
    setAttendances(final);
    saveAttendances(final);
    
    // Clear and insert latest in Supabase
    deleteAttendancesByEventId(eventId).then(() => {
      if (appendList.length > 0) {
        pushAttendancesToSupabase(appendList);
      }
    });

    if (currentUser) {
      const targetEvent = events.find(e => e.id === eventId);
      const eventTitle = targetEvent ? targetEvent.title : 'Evento';
      const eventTermId = targetEvent?.managementTermId || activeTerm?.id || null;

      const countPresent = updatedList.filter(a => a.status === 'present').length;
      const countAbsent = updatedList.filter(a => a.status === 'absent').length;
      const countJustified = updatedList.filter(a => a.status === 'justified').length;
      const countExtras = updatedList.filter(a => a.eligibility === 'optional' && a.status === 'present').length;
      const countNotApplicable = updatedList.filter(a => a.status === 'not_applicable').length;
      const totalCount = updatedList.length;

      logAuditAction({
        managementTermId: eventTermId,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        action: 'attendance_saved',
        entityType: 'attendance',
        entityId: eventId,
        entityName: eventTitle,
        description: `${currentUser.name || currentUser.email} salvou presenças do evento ${eventTitle}`,
        metadata: {
          present: countPresent,
          absent: countAbsent,
          justified: countJustified,
          extras: countExtras,
          not_applicable: countNotApplicable,
          total: totalCount
        }
      });
    }
  };

  // 6. User CRUD triggers (Admin only) with Supabase Sync
  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    if (!currentUser) return;

    let finalRole = newUser.role;
    let finalManagementTermId = newUser.managementTermId;

    if (currentUser.role === 'admin') {
      if (finalRole === 'diretoria_admin' && !finalManagementTermId) {
        alert('Selecione uma gestão para esta conta de Diretoria Admin.');
        return;
      }
      if (finalRole === 'diretoria' && !finalManagementTermId) {
        alert('Selecione uma gestão para esta conta de Diretoria.');
        return;
      }
    } else if (currentUser.role === 'diretoria_admin') {
      if (!currentUser.managementTermId) {
        throw new Error('Sua conta Diretoria Admin não está vinculada a uma gestão. Procure um administrador.');
      }
      if (finalRole !== 'diretoria') {
        alert('Diretoria Admin só pode criar contas Diretoria.');
        return;
      }
      const allowedPositions = [
        "1º Conselheiro",
        "2º Conselheiro",
        "Secretário",
        "Mordomo",
        "Hospitaleiro",
      ];
      const selectedPosition = newUser.position;
      if (!selectedPosition) {
        throw new Error('Selecione o cargo/função deste usuário.');
      }
      if (!allowedPositions.includes(selectedPosition)) {
        throw new Error('Cargo/função inválido.');
      }
      finalRole = 'diretoria';
      finalManagementTermId = currentUser.managementTermId;
    } else if (currentUser.role === 'diretoria') {
      alert('Diretoria não pode criar usuários.');
      return;
    } else if (currentUser.role === 'visualizacao') {
      alert('Visualização não pode criar usuários.');
      return;
    }

    if ((finalRole === 'diretoria' || finalRole === 'diretoria_admin') && !finalManagementTermId) {
      alert('Selecione uma gestão para esta conta.');
      return;
    }

    const created: User = {
      ...newUser,
      role: finalRole,
      managementTermId: finalManagementTermId,
      createdBy: currentUser.id,
      id: 'u_' + Date.now()
    };
    const updated = [...users, created];
    setUsers(updated);
    saveUsers(updated);
    pushUserToSupabase(created); // Background cloud push

    logAuditAction({
      managementTermId: created.managementTermId || null,
      userId: currentUser.id,
      userName: currentUser.name || currentUser.email,
      userRole: currentUser.role,
      action: 'user_created',
      entityType: 'user',
      entityId: created.id,
      entityName: created.name,
      description: `${currentUser.name || currentUser.email} criou usuário ${created.name}`,
      newData: created
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    if (!currentUser) return;

    const target = users.find(u => u.id === updatedUser.id);
    if (!target) return;

    let finalRole = updatedUser.role;
    let finalManagementTermId = updatedUser.managementTermId;

    if (currentUser.role === 'admin') {
      if (finalRole === 'diretoria_admin' && !finalManagementTermId) {
        alert('Selecione uma gestão para esta conta de Diretoria Admin.');
        return;
      }
      if (finalRole === 'diretoria' && !finalManagementTermId) {
        alert('Selecione uma gestão para esta conta de Diretoria.');
        return;
      }
    } else if (currentUser.role === 'diretoria_admin') {
      if (target.role !== 'diretoria' || target.managementTermId !== currentUser.managementTermId) {
        alert('Você não pode editar usuários de outra gestão.');
        return;
      }
      if (finalRole !== target.role || finalManagementTermId !== target.managementTermId) {
        alert('Você não pode alterar o perfil ou a gestão vinculada deste usuário.');
        return;
      }
      const allowedPositions = [
        "1º Conselheiro",
        "2º Conselheiro",
        "Secretário",
        "Mordomo",
        "Hospitaleiro",
      ];
      const selectedPosition = updatedUser.position;
      if (!selectedPosition) {
        throw new Error('Selecione o cargo/função deste usuário.');
      }
      if (!allowedPositions.includes(selectedPosition)) {
        throw new Error('Cargo/função inválido.');
      }
      finalRole = target.role;
      finalManagementTermId = target.managementTermId;
    } else if (currentUser.role === 'diretoria') {
      alert('Ação não permitida para este perfil.');
      return;
    } else if (currentUser.role === 'visualizacao') {
      alert('Ação não permitida para este perfil.');
      return;
    }

    if ((finalRole === 'diretoria' || finalRole === 'diretoria_admin') && !finalManagementTermId) {
      alert('Selecione uma gestão para esta conta.');
      return;
    }

    const boundUser: User = {
      ...updatedUser,
      name: currentUser.role === 'diretoria_admin' ? target.name : updatedUser.name,
      email: currentUser.role === 'diretoria_admin' ? target.email : updatedUser.email,
      password: currentUser.role === 'diretoria_admin' ? target.password : updatedUser.password,
      role: finalRole,
      managementTermId: finalManagementTermId
    };

    const updated = users.map(u => (u.id === boundUser.id ? boundUser : u));
    setUsers(updated);
    saveUsers(updated);

    if (currentUser.id === boundUser.id) {
      setCurrentUser(boundUser);
      saveCurrentUser(boundUser);
    }

    pushUserToSupabase(boundUser); // Background cloud push

    logAuditAction({
      managementTermId: boundUser.managementTermId || null,
      userId: currentUser.id,
      userName: currentUser.name || currentUser.email,
      userRole: currentUser.role,
      action: 'user_updated',
      entityType: 'user',
      entityId: boundUser.id,
      entityName: boundUser.name,
      description: `${currentUser.name || currentUser.email} atualizou usuário ${boundUser.name}`,
      oldData: target || null,
      newData: boundUser
    });
  };

  const handleDeleteUser = (id: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'visualizacao') {
      alert('Ação não permitida para este perfil.');
      return;
    }
    const target = users.find(u => u.id === id);
    if (!target) return;

    if (currentUser.role === 'diretoria' || currentUser.role === 'diretoria_admin') {
      if (target.role === 'admin') {
        alert('A Diretoria/Diretoria Admin não tem permissão para remover administradores do sistema.');
        return;
      }
      if (currentUser.role === 'diretoria') {
        if (target.managementTermId !== currentUser.managementTermId) {
          alert('A Diretoria não tem permissão para remover usuários de outras gestões.');
          return;
        }
      } else if (currentUser.role === 'diretoria_admin') {
        if (target.managementTermId !== currentUser.managementTermId) {
          alert('O Diretoria Admin não tem permissão para remover usuários de outras gestões.');
          return;
        }
      }
    }

    // Block deleting themselves is handled at page, but let's safeguard too
    if (currentUser.id === id) return;

    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
    deleteUserFromSupabase(id); // Background cloud delete

    logAuditAction({
      managementTermId: target.managementTermId || null,
      userId: currentUser.id,
      userName: currentUser.name || currentUser.email,
      userRole: currentUser.role,
      action: 'user_deleted',
      entityType: 'user',
      entityId: id,
      entityName: target.name,
      description: `${currentUser.name || currentUser.email} excluiu usuário ${target.name}`,
      oldData: target
    });
  };

  // Support direct redirect for marking attendance
  const handleMarkAttendanceRedirect = (event: Event) => {
    setSelectedEventForAttendance(event);
    navigate('/admin/presencas');
  };

  // Filtered lists according to the active/selected management term
  const filteredMembers = activeTerm 
    ? members.filter(m => m.managementTermId === activeTerm.id)
    : members;

  const filteredEvents = activeTerm
    ? events.filter(e => e.managementTermId === activeTerm.id)
    : events;

  const filteredAttendances = activeTerm
    ? attendances.filter(a => a.managementTermId === activeTerm.id)
    : attendances;

  return (
    <>
      <Routes>
        {/* Public Ranking Route */}
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <PublicRankingPage
                members={members}
                events={events}
                attendances={attendances}
                isLoadingInitial={initialSyncLoading}
              />
            )
          }
        />

        {/* Admin Login Route */}
        <Route
          path="/admin"
          element={
            currentUser ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Dashboard Component */}
        <Route
          path="/admin/dashboard"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="dashboard"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <DashboardPage
                  members={filteredMembers}
                  events={filteredEvents}
                  attendances={filteredAttendances}
                  onNavigateToTab={(tab) => navigate(`/admin/${tab}`)}
                  onViewMember={(member) => setSelectedMemberModal(member)}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Members Management */}
        <Route
          path="/admin/membros"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="membros"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <MembersPage
                  members={filteredMembers}
                  currentUser={currentUser}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  onDeleteMember={handleDeleteMember}
                  onViewMember={(member) => setSelectedMemberModal(member)}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Nominata/Officers Management */}
        <Route
          path="/admin/nominata"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="nominata"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <NominataPage
                  members={filteredMembers}
                  currentUser={currentUser}
                  onUpdateMembers={(updatedMembersList) => {
                    // Update full list but merge changes gracefully
                    const updatedFullMembers = members.map(m => {
                      const match = updatedMembersList.find(um => um.id === m.id);
                      return match ? match : m;
                    });
                    setMembers(updatedFullMembers);
                    saveMembers(updatedFullMembers);
                    // Push updated members to Supabase background sync
                    updatedMembersList.forEach(m => {
                      pushMemberToSupabase(m);
                    });
                  }}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Events Management */}
        <Route
          path="/admin/eventos"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="eventos"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <EventsPage
                  events={filteredEvents}
                  currentUser={currentUser}
                  onAddEvent={handleAddEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onDeleteEvent={handleDeleteEvent}
                  onMarkAttendanceRedirect={handleMarkAttendanceRedirect}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Attendance Marks */}
        <Route
          path="/admin/presencas"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="presencas"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <AttendancePage
                  events={filteredEvents}
                  members={filteredMembers}
                  attendances={filteredAttendances}
                  currentUser={currentUser}
                  onSaveAttendances={handleSaveAttendances}
                  selectedEvent={selectedEventForAttendance}
                  onClearSelectedEvent={() => setSelectedEventForAttendance(null)}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Administrative Classification Tab */}
        <Route
          path="/admin/classificacao"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="classificacao"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <RankingPage
                  members={members}
                  events={events}
                  attendances={attendances}
                  onViewMember={(member) => setSelectedMemberModal(member)}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Reports Section */}
        <Route
          path="/admin/relatorios"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="relatorios"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <ReportsPage
                  members={members}
                  events={events}
                  attendances={attendances}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Audit Log Route */}
        <Route
          path="/admin/auditoria"
          element={
            currentUser ? (
              currentUser.role === 'admin' || currentUser.role === 'diretoria_admin' ? (
                <Layout
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  activeTab="auditoria"
                  setActiveTab={(tab) => navigate(`/admin/${tab}`)}
                >
                  <AuditPage currentUser={currentUser} />
                </Layout>
              ) : (
                <Layout
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  activeTab="auditoria"
                  setActiveTab={(tab) => navigate(`/admin/${tab}`)}
                >
                  <div className="p-8 bg-white border border-slate-200 rounded-xl max-w-lg mx-auto text-center shadow-xs">
                    <h2 className="text-rose-650 font-extrabold text-base mb-2">Acesso não permitido</h2>
                    <p className="text-slate-600 text-sm">Ação não permitida para este perfil.</p>
                    <button 
                      onClick={() => navigate('/admin/dashboard')} 
                      className="mt-6 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-lg transition cursor-pointer"
                    >
                      Voltar ao Dashboard
                    </button>
                  </div>
                </Layout>
              )
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Database Sync Control - Admin Only */}
        <Route
          path="/admin/database"
          element={
            currentUser ? (
              currentUser.role === 'admin' ? (
                <Layout
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  activeTab="database"
                  setActiveTab={(tab) => navigate(`/admin/${tab}`)}
                >
                  <DatabaseSyncPage
                    onSyncComplete={() => {
                      // Trigger state refreshed
                      setMembers(getMembers());
                      setEvents(getEvents());
                      setAttendances(getAttendances());
                      setUsers(getUsers());
                    }}
                  />
                </Layout>
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Users Control - Admin/Diretoria Authorization Restrict */}
        <Route
          path="/admin/usuarios"
          element={
            currentUser ? (
              <Layout
                currentUser={currentUser}
                onLogout={handleLogout}
                activeTab="usuarios"
                setActiveTab={(tab) => navigate(`/admin/${tab}`)}
              >
                <UsersPage
                  users={users}
                  currentUser={currentUser}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              </Layout>
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Management Selection Route */}
        <Route
          path="/admin/selecionar-gestao"
          element={
            currentUser ? (
              <SelectManagementTermPage currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Gestões Semester Management Route */}
        <Route
          path="/admin/gestoes"
          element={
            currentUser ? (
              currentUser.role === 'admin' ? (
                <Layout
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  activeTab="gestoes"
                  setActiveTab={(tab) => navigate(`/admin/${tab}`)}
                >
                  <ManagementTermsPage
                    currentUser={currentUser}
                    onRefreshData={() => {
                      setUsers(getUsers());
                    }}
                  />
                </Layout>
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Catch-all fallback redirectional match */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Member Profile Detail Modal */}
      {selectedMemberModal && (
        <MemberProfileModal
          member={selectedMemberModal}
          events={filteredEvents}
          attendances={filteredAttendances}
          onClose={() => setSelectedMemberModal(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ManagementTermProvider>
        <AppContent />
      </ManagementTermProvider>
    </BrowserRouter>
  );
}
