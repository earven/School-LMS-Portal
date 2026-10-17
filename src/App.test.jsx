import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { AppRoutes } from './App';
import * as AuthContext from './context/AuthContext';

// Mock AuthContext
vi.mock('./context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => <>{children}</>,
}));

// Mock Layout to pass through Outlet
vi.mock('./components/Layout', () => ({
  default: () => (
    <div data-testid="app-layout">
      <Outlet />
    </div>
  ),
}));

// Mock child providers used inside routes
vi.mock('./context/SubmissionContext', () => ({
  SubmissionProvider: ({ children }) => <>{children}</>,
}));
vi.mock('./context/TeachingLoadContext', () => ({
  TeachingLoadProvider: ({ children }) => <>{children}</>,
}));
vi.mock('./context/InventoryContext', () => ({
  InventoryProvider: ({ children }) => <>{children}</>,
}));

// Mock Lazy Pages with deterministic testids
vi.mock('./pages/LoginPage', () => ({
  default: () => <div data-testid="page-login">Login Page</div>,
}));
vi.mock('./pages/LandingPage', () => ({
  default: () => <div data-testid="page-landing">Landing Page</div>,
}));
vi.mock('./pages/JoinSchoolPage', () => ({
  default: () => <div data-testid="page-join">Join School Page</div>,
}));
vi.mock('./pages/PrivacyPolicyPage', () => ({
  default: () => <div data-testid="page-privacy">Privacy Policy Page</div>,
}));
vi.mock('./pages/NotFoundPage', () => ({
  default: () => <div data-testid="page-not-found">Not Found Page</div>,
}));
vi.mock('./pages/DashboardPage', () => ({
  default: () => <div data-testid="page-dashboard">Dashboard Page</div>,
}));
vi.mock('./pages/SettingsPage', () => ({
  default: () => <div data-testid="page-settings">Settings Page</div>,
}));
vi.mock('./pages/StudentsPage', () => ({
  default: () => <div data-testid="page-students">Students Page</div>,
}));
vi.mock('./pages/PersonnelPage', () => ({
  default: () => <div data-testid="page-personnel">Personnel Page</div>,
}));
vi.mock('./pages/PersonnelDetailPage', () => ({
  default: ({ mode }) => <div data-testid={`page-personnel-detail-${mode}`}>Personnel Detail {mode}</div>,
}));
vi.mock('./pages/PersonnelFieldsConfigPage', () => ({
  default: () => <div data-testid="page-personnel-fields-config">Personnel Fields Config Page</div>,
}));
vi.mock('./pages/TeacherTools/TeachingLoadGeneratorPage', () => ({
  default: () => <div data-testid="page-load-generator">Load Generator Page</div>,
}));
vi.mock('./pages/TeacherTools/AcademicRecordTracker', () => ({
  default: () => <div data-testid="page-academic-record-tracker">Academic Record Tracker Page</div>,
}));

function renderWithRouter(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Suspense fallback={<div>Loading test chunk...</div>}>
        <AppRoutes />
      </Suspense>
    </MemoryRouter>
  );
}

describe('App Route Protection & Role-Based Navigation Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public Unauthenticated Routes', () => {
    it('renders LandingPage at root "/"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/');
      await waitFor(() => {
        expect(screen.getByTestId('page-landing')).toBeInTheDocument();
      });
    });

    it('renders LoginPage at "/login"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/login');
      await waitFor(() => {
        expect(screen.getByTestId('page-login')).toBeInTheDocument();
      });
    });

    it('renders JoinSchoolPage at "/join"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/join');
      await waitFor(() => {
        expect(screen.getByTestId('page-join')).toBeInTheDocument();
      });
    });

    it('renders PrivacyPolicyPage at "/privacy-policy"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/privacy-policy');
      await waitFor(() => {
        expect(screen.getByTestId('page-privacy')).toBeInTheDocument();
      });
    });

    it('renders NotFoundPage for unknown wildcard routes', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/some/arbitrary/unknown/path');
      await waitFor(() => {
        expect(screen.getByTestId('page-not-found')).toBeInTheDocument();
      });
    });
  });

  describe('Unauthenticated Redirection for Protected Routes', () => {
    it('redirects unauthenticated user from "/dashboard" to "/login"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/dashboard');
      await waitFor(() => {
        expect(screen.getByTestId('page-login')).toBeInTheDocument();
        expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
      });
    });

    it('redirects unauthenticated user from "/settings" to "/login"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/settings');
      await waitFor(() => {
        expect(screen.getByTestId('page-login')).toBeInTheDocument();
        expect(screen.queryByTestId('page-settings')).not.toBeInTheDocument();
      });
    });

    it('redirects unauthenticated user from "/students" to "/login"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null, loading: false });
      renderWithRouter('/students');
      await waitFor(() => {
        expect(screen.getByTestId('page-login')).toBeInTheDocument();
        expect(screen.queryByTestId('page-students')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pending Role Redirection', () => {
    it('redirects user with "pending" role to "/join" when accessing protected routes', async () => {
      AuthContext.useAuth.mockReturnValue({
        user: { uid: 'pending-1', email: 'pending@school.edu', role: 'pending' },
        loading: false,
      });
      renderWithRouter('/dashboard');
      await waitFor(() => {
        expect(screen.getByTestId('page-join')).toBeInTheDocument();
        expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Teacher Role-Based Access Enforcement', () => {
    const teacherUser = {
      uid: 'teacher-101',
      email: 'teacher@school.edu',
      role: 'teacher',
    };

    it('allows teacher to access authorized route "/dashboard"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/dashboard');
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
      });
    });

    it('allows teacher to access authorized route "/students"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/students');
      await waitFor(() => {
        expect(screen.getByTestId('page-students')).toBeInTheDocument();
      });
    });

    it('redirects teacher from admin-only "/settings" to "/dashboard"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/settings');
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('page-settings')).not.toBeInTheDocument();
      });
    });

    it('redirects teacher from admin-only "/teacher-tools/load-generator" to "/dashboard"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/teacher-tools/load-generator');
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('page-load-generator')).not.toBeInTheDocument();
      });
    });

    it('redirects teacher from admin-only "/teacher-tools/academic-record-tracker" to "/dashboard"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/teacher-tools/academic-record-tracker');
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('page-academic-record-tracker')).not.toBeInTheDocument();
      });
    });

    it('redirects teacher from admin-only "/personnel/configure-fields" to "/dashboard"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/personnel/configure-fields');
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('page-personnel-fields-config')).not.toBeInTheDocument();
      });
    });

    it('redirects teacher from admin-only "/personnel/new" to "/dashboard"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: teacherUser, loading: false });
      renderWithRouter('/personnel/new');
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('page-personnel-detail-edit')).not.toBeInTheDocument();
      });
    });
  });

  describe('Admin and System Admin Role-Based Access Enforcement', () => {
    const adminUser = {
      uid: 'admin-201',
      email: 'admin@school.edu',
      role: 'admin',
    };

    const sysAdminUser = {
      uid: 'sysadmin-301',
      email: 'sysadmin@school.edu',
      role: 'system_admin',
    };

    it('allows admin to access "/settings"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: adminUser, loading: false });
      renderWithRouter('/settings');
      await waitFor(() => {
        expect(screen.getByTestId('page-settings')).toBeInTheDocument();
      });
    });

    it('allows system_admin to access "/settings"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: sysAdminUser, loading: false });
      renderWithRouter('/settings');
      await waitFor(() => {
        expect(screen.getByTestId('page-settings')).toBeInTheDocument();
      });
    });

    it('allows admin to access "/teacher-tools/load-generator"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: adminUser, loading: false });
      renderWithRouter('/teacher-tools/load-generator');
      await waitFor(() => {
        expect(screen.getByTestId('page-load-generator')).toBeInTheDocument();
      });
    });

    it('allows admin to access "/teacher-tools/academic-record-tracker"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: adminUser, loading: false });
      renderWithRouter('/teacher-tools/academic-record-tracker');
      await waitFor(() => {
        expect(screen.getByTestId('page-academic-record-tracker')).toBeInTheDocument();
      });
    });

    it('allows admin to access "/personnel/configure-fields"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: adminUser, loading: false });
      renderWithRouter('/personnel/configure-fields');
      await waitFor(() => {
        expect(screen.getByTestId('page-personnel-fields-config')).toBeInTheDocument();
      });
    });

    it('allows admin to access "/personnel/new"', async () => {
      AuthContext.useAuth.mockReturnValue({ user: adminUser, loading: false });
      renderWithRouter('/personnel/new');
      await waitFor(() => {
        expect(screen.getByTestId('page-personnel-detail-edit')).toBeInTheDocument();
      });
    });
  });
});
