import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { MessagingProvider } from './context/MessagingContext.jsx';
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
const AcademicRecordTracker = lazy(() => import('./pages/TeacherTools/AcademicRecordTracker'));
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
const LearningResourcesPage = lazy(() => import('./pages/TeacherTools/LearningResourcesPage'));
const MemoStocker = lazy(() => import('./pages/TeacherTools/MemoStocker'));
const ComputerLabLogPage = lazy(() => import('./pages/TeacherTools/ComputerLabLogPage'));
const MessagingPage = lazy(() => import('./pages/MessagingPage'));

import ProtectedRoute, { PageLoader } from './components/ProtectedRoute';
import ReloadPrompt from './components/ReloadPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/join" element={<JoinSchoolPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

      {/* Authenticated Routes sharing a single persistent Layout */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'system_admin', 'teacher']}><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/personnel">
          <Route index element={<PersonnelPage />} />
          <Route path="configure-fields" element={<ProtectedRoute allowedRoles={['admin', 'system_admin']}><PersonnelFieldsConfigPage /></ProtectedRoute>} />
          <Route path="new" element={<ProtectedRoute allowedRoles={['admin', 'system_admin']}><PersonnelDetailPage mode="edit" /></ProtectedRoute>} />
          <Route path=":personnelId" element={<PersonnelDetailPage mode="view" />} />
          <Route path=":personnelId/edit" element={<PersonnelDetailPage mode="edit" />} />
        </Route>
        <Route path="/teacher-tools">
          <Route index element={<TeacherToolsHub />} />
          <Route path="submissions" element={<SubmissionProvider><SubmissionTracker /></SubmissionProvider>} />
          <Route path="teaching-load" element={<TeachingLoadProvider><TeachingLoadPage /></TeachingLoadProvider>} />
          <Route path="load-generator" element={<ProtectedRoute allowedRoles={['admin', 'system_admin']}><TeachingLoadGeneratorPage /></ProtectedRoute>} />
          <Route path="e-filers" element={<EFilers />} />
          <Route path="attendance" element={<AttendanceTracker />} />
          <Route path="teacher-attendance" element={<TeacherAttendance />} />
          <Route path="academic-record-tracker" element={<ProtectedRoute allowedRoles={['admin', 'system_admin']}><AcademicRecordTracker /></ProtectedRoute>} />
          <Route path="inventory" element={<InventoryProvider><InventoryPage /></InventoryProvider>} />
          <Route path="enrolment-lister" element={<EnrolmentLister />} />
          <Route path="learning-resources" element={<LearningResourcesPage />} />
          <Route path="memo-stocker" element={<MemoStocker />} />
          <Route path="computer-lab-log" element={<ComputerLabLogPage />} />
        </Route>
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'system_admin']}><SettingsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/sections" element={<SectionsPage />} />
        <Route path="/messages" element={<MessagingPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <NotificationProvider>
          <PersonnelProvider>
            <StudentProvider>
              <SectionProvider>
                <AttendanceProvider>
                <CalendarProvider>
                <MessagingProvider>
                  <Router>
                    <OfflineIndicator />
                    <ReloadPrompt />
                    <SessionTimeout timeoutMinutes={15}>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <AppRoutes />
                        </Suspense>
                      </ErrorBoundary>
                    </SessionTimeout>
                  </Router>
                </MessagingProvider>
                </CalendarProvider>
                </AttendanceProvider>
              </SectionProvider>
            </StudentProvider>
          </PersonnelProvider>
        </NotificationProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
