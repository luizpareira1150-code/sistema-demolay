import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Member, Event, Attendance, User } from './types';
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

// Import Supabase Integration triggers and sync helpers
import { checkSupabaseConnection } from './utils/supabaseClient';
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
  deleteUserFromSupabase
} from './utils/supabaseService';

// Import Components
import Layout from './components/Layout';
import MemberProfileModal from './components/MemberProfileModal';

function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

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

  const [initialSyncLoading, setInitialSyncLoading] = useState(false);

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
      }
    };

    tryDownloadSupabase();
  }, []);

  // 2. Auth handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    navigate('/admin/dashboard', { replace: true });
  };

  const handleLogout = () => {
    saveCurrentUser(null);
    setCurrentUser(null);
    navigate('/admin', { replace: true });
  };

  // 3. Member CRUD triggers with Supabase Sync
  const handleAddMember = (newMember: Omit<Member, 'id' | 'createdAt'>) => {
    const created: Member = {
      ...newMember,
      id: 'm_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    const updated = [...members, created];
    setMembers(updated);
    saveMembers(updated);
    pushMemberToSupabase(created); // Background cloud push
  };

  const handleUpdateMember = (updatedMember: Member) => {
    const updated = members.map(m => (m.id === updatedMember.id ? updatedMember : m));
    setMembers(updated);
    saveMembers(updated);
    pushMemberToSupabase(updatedMember); // Background cloud push
  };

  const handleDeleteMember = (id: string) => {
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
  };

  // 4. Event CRUD triggers with Supabase Sync
  const handleAddEvent = (newEvent: Omit<Event, 'id' | 'createdAt'>) => {
    const created: Event = {
      ...newEvent,
      id: 'e_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    const updated = [...events, created];
    setEvents(updated);
    saveEvents(updated);
    pushEventToSupabase(created); // Background cloud push
  };

  const handleUpdateEvent = (updatedEvent: Event) => {
    const updated = events.map(e => (e.id === updatedEvent.id ? updatedEvent : e));
    setEvents(updated);
    saveEvents(updated);
    pushEventToSupabase(updatedEvent); // Background cloud push
  };

  const handleDeleteEvent = (id: string) => {
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
  };

  // 5. Save Event attendance marks with Supabase Sync
  const handleSaveAttendances = (eventId: string, updatedList: Omit<Attendance, 'id'>[]) => {
    // Purge existing attendances matching eventId
    const baseList = attendances.filter(a => a.eventId !== eventId);

    // Map new list with ids
    const appendList: Attendance[] = updatedList.map((item, idx) => ({
      ...item,
      id: `a_${eventId}_${idx}_${Date.now()}`
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
  };

  // 6. User CRUD triggers (Admin only) with Supabase Sync
  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    const created: User = {
      ...newUser,
      id: 'u_' + Date.now()
    };
    const updated = [...users, created];
    setUsers(updated);
    saveUsers(updated);
    pushUserToSupabase(created); // Background cloud push
  };

  const handleUpdateUser = (updatedUser: User) => {
    const updated = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updated);
    saveUsers(updated);
    pushUserToSupabase(updatedUser); // Background cloud push
  };

  const handleDeleteUser = (id: string) => {
    // Block deleting themselves is handled at page, but let's safeguard too
    if (currentUser && currentUser.id === id) return;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
    deleteUserFromSupabase(id); // Background cloud delete
  };

  // Support direct redirect for marking attendance
  const handleMarkAttendanceRedirect = (event: Event) => {
    setSelectedEventForAttendance(event);
    navigate('/admin/presencas');
  };

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
                  members={members}
                  events={events}
                  attendances={attendances}
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
                  members={members}
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
                  members={members}
                  currentUser={currentUser}
                  onUpdateMembers={(updatedMembersList) => {
                    setMembers(updatedMembersList);
                    saveMembers(updatedMembersList);
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
                  events={events}
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
                  events={events}
                  members={members}
                  attendances={attendances}
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
              (currentUser.role === 'admin' || currentUser.role === 'diretoria') ? (
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
          events={events}
          attendances={attendances}
          onClose={() => setSelectedMemberModal(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
