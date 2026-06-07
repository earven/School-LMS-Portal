import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
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
import { InventoryProvider } from './context/InventoryContext.jsx';
import './App.css';
import SessionTimeout from './components/SessionTimeout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const PersonnelPage = lazy(() => import('./pages/PersonnelPage'));
const PersonnelDetailPage = lazy(() => import('./pages/PersonnelDetailPage'));
const PersonnelFieldsConfigPage = lazy(() => import('./pages/PersonnelFieldsConfigPage'));
const TeacherToolsHub = lazy(() => import('./pages/TeacherTools/TeacherToolsHub'));
const SubmissionTracker = lazy(() => import('./pages/TeacherTools/SubmissionTracker'));
const EFilers = lazy(() => import('./pages/TeacherTools/EFilers'));
const AttendanceTracker = lazy(() => import('./pages/TeacherTools/AttendanceTracker'));
const TeacherAttendance = lazy(() => import('./pages/TeacherTools/TeacherAttendance'));
const AcademicRecords = lazy(() => import('./pages/TeacherTools/AcademicRecords'));
const EnrolmentLister = lazy(() => import('./pages/TeacherTools/EnrolmentLister'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SectionsPage = lazy(() => import('./pages/TeacherTools/SectionsPage'));
const TeachingLoadPage = lazy(() => import('./pages/TeacherTools/TeachingLoadPage'));
const TeachingLoadGeneratorPage = lazy(() => import('./pages/TeacherTools/TeachingLoadGeneratorPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage.jsx'));
const InventoryPage = lazy(() => import('./pages/TeacherTools/InventoryPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const JoinSchoolPage = lazy(() => import('./pages/JoinSchoolPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#09f', animation: 'spin 1s linear infinite' }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user || !user.role) {
    if (user) console.warn("User is authenticated but missing a 'role' in Firestore.");
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'pending') {
    return <Navigate to="/join" replace />;
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
                <InventoryProvider>
                  <Router>
                    <SessionTimeout timeoutMinutes={15}>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/" element={<LandingPage />} />
                          <Route path="/join" element={<JoinSchoolPage />} />
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
                            <Route path="load-generator" element={<ProtectedRoute element={<TeachingLoadGeneratorPage />} allowedRoles={['admin', 'system_admin']} />} />
                            <Route path="e-filers" element={<EFilers />} />
                            <Route path="attendance" element={<AttendanceTracker />} />
                            <Route path="teacher-attendance" element={<TeacherAttendance />} />
                            <Route path="data" element={<AcademicRecords />} />
                            <Route path="inventory" element={<InventoryPage />} />
                            <Route path="enrolment-lister" element={<EnrolmentLister />} />
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
                          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </SessionTimeout>
                  </Router>
                </InventoryProvider>
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
