import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import StudentsPage from './pages/StudentsPage';
import PersonnelPage from './pages/PersonnelPage';
import PersonnelDetailPage from './pages/PersonnelDetailPage';
import PersonnelFieldsConfigPage from './pages/PersonnelFieldsConfigPage';
import TeacherToolsHub from './pages/TeacherTools/TeacherToolsHub';
import SubmissionTracker from './pages/TeacherTools/SubmissionTracker';
import EFilers from './pages/TeacherTools/EFilers';
import AttendanceTracker from './pages/TeacherTools/AttendanceTracker';
import AcademicRecords from './pages/TeacherTools/AcademicRecords';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import SectionsPage from './pages/TeacherTools/SectionsPage';
import TeachingLoadPage from './pages/TeacherTools/TeachingLoadPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { StudentProvider } from './context/StudentContext.jsx';
import { PersonnelProvider } from './context/PersonnelContext.jsx';
import { SectionProvider } from './context/SectionContext.jsx';
import { SubmissionProvider } from './context/SubmissionContext.jsx';
import { TeachingLoadProvider } from './context/TeachingLoadContext.jsx';
import { AttendanceProvider } from './context/AttendanceContext.jsx';
import { CalendarProvider } from './context/CalendarContext.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import './App.css';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner component
  }

  if (!user || !user.role) {
    if (user) console.warn("User is authenticated but missing a 'role' in Firestore.");
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return element;
};

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <NotificationProvider>
          <PersonnelProvider>
            <StudentProvider>
              <SectionProvider>
                <SubmissionProvider>
                <TeachingLoadProvider>
                <AttendanceProvider>
                <CalendarProvider>
                  <Router>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/dashboard" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<DashboardPage />} />
                      </Route>
                      <Route path="/announcements" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<AnnouncementsPage />} />
                      </Route>
                      <Route path="/calendar" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<CalendarPage />} />
                      </Route>
                      <Route path="/personnel" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<PersonnelPage />} />
                        <Route path="configure-fields" element={<PersonnelFieldsConfigPage />} />
                        <Route path="new" element={<PersonnelDetailPage mode="edit" />} />
                        <Route path=":personnelId" element={<PersonnelDetailPage mode="view" />} />
                        <Route path=":personnelId/edit" element={<PersonnelDetailPage mode="edit" />} />
                      </Route>
                      <Route path="/teacher-tools" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<TeacherToolsHub />} />
                        <Route path="submissions" element={<SubmissionTracker />} />
                        <Route path="teaching-load" element={<TeachingLoadPage />} />
                        <Route path="e-filers" element={<EFilers />} />
                        <Route path="attendance" element={<AttendanceTracker />} />
                        <Route path="data" element={<AcademicRecords />} />
                      </Route>
                      <Route path="/students" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<StudentsPage />} />
                      </Route>
                      <Route path="/settings" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin']} />}>
                        <Route index element={<SettingsPage />} />
                      </Route>
                      <Route path="/profile" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<ProfilePage />} />
                      </Route>
                      <Route path="/sections" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'system_admin', 'teacher']} />}>
                        <Route index element={<SectionsPage />} />
                      </Route>
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Router>
                </CalendarProvider>
                </AttendanceProvider>
                </TeachingLoadProvider>
              </SubmissionProvider>
              </SectionProvider>
            </StudentProvider>
          </PersonnelProvider>
        </NotificationProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
