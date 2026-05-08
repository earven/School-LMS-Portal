import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import StudentsPage from './pages/StudentsPage';
import PersonnelPage from './pages/PersonnelPage';
import TeacherToolsHub from './pages/TeacherTools/TeacherToolsHub';
import SubmissionTracker from './pages/TeacherTools/SubmissionTracker';
import EFilers from './pages/TeacherTools/EFilers';
import AttendanceTracker from './pages/TeacherTools/AttendanceTracker';
import AcademicRecords from './pages/TeacherTools/AcademicRecords';
import NotFoundPage from './pages/NotFoundPage';
import SectionsPage from './pages/TeacherTools/SectionsPage'; // <--- ADD THIS LINE
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { StudentProvider } from './context/StudentContext.jsx';
import { PersonnelProvider } from './context/PersonnelContext.jsx';
import { SectionProvider } from './context/SectionContext.jsx'; // <--- ADD THIS LINE
import './App.css';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner component
  }

  if (!user || !user.role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return element;
};

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <PersonnelProvider>
          <StudentProvider>
            <SectionProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'teacher']} />}>
                    <Route index element={<DashboardPage />} />
                  </Route>
                  <Route path="/students" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'teacher']} />}>
                    <Route index element={<StudentsPage />} />
                  </Route>
                  <Route path="/personnel" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'teacher']} />}>
                    <Route index element={<PersonnelPage />} />
                  </Route>
                  <Route path="/teacher-tools" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin', 'teacher']} />}>
                    <Route index element={<TeacherToolsHub />} />
                    <Route path="submissions" element={<SubmissionTracker />} />
                    <Route path="e-filers" element={<EFilers />} />
                    <Route path="attendance" element={<AttendanceTracker />} />
                    <Route path="data" element={<AcademicRecords />} />
                  </Route>
                  <Route path="/settings" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin']} />}>
                    <Route index element={<SettingsPage />} />
                  </Route>
                  <Route path="/sections" element={<ProtectedRoute element={<Layout />} allowedRoles={['admin']} />}>
                    <Route index element={<SectionsPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Router>
            </SectionProvider>
          </StudentProvider>
        </PersonnelProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
