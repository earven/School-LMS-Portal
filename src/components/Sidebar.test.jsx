import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import * as AuthContext from '../context/AuthContext';
import * as SettingsContext from '../context/SettingsContext';
import * as MessagingContext from '../context/MessagingContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/SettingsContext', () => ({
  useSettings: vi.fn(),
}));

vi.mock('../context/MessagingContext', () => ({
  useMessaging: vi.fn(),
}));

describe('Sidebar Component Role-Based Navigation', () => {
  const defaultSettings = {
    schoolName: 'Vinapor National High School',
    enabledModules: {
      calendar: true,
      studentManagement: true,
      personnelManagement: true,
      sections: true,
      teacherTools: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    SettingsContext.useSettings.mockReturnValue({ settings: defaultSettings });
    MessagingContext.useMessaging.mockReturnValue({ totalUnreadCount: 0 });
  });

  it('renders Admin Portal tag and Settings nav link for admin users', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'admin-1', role: 'admin' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} toggleSidebar={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
  });

  it('renders Admin Portal tag and Settings nav link for system_admin users', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'sysadmin-1', role: 'system_admin' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} toggleSidebar={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
  });

  it('renders Teacher Portal tag and HIDES Settings nav link for teacher users', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'teacher-1', role: 'teacher' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} toggleSidebar={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Teacher Portal')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument();
  });

  it('displays unread messages badge when totalUnreadCount > 0', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'teacher-1', role: 'teacher' },
      logout: vi.fn(),
    });
    MessagingContext.useMessaging.mockReturnValue({ totalUnreadCount: 5 });

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} toggleSidebar={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('hides disabled modules based on settings.enabledModules', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'teacher-1', role: 'teacher' },
      logout: vi.fn(),
    });
    SettingsContext.useSettings.mockReturnValue({
      settings: {
        ...defaultSettings,
        enabledModules: {
          calendar: false,
          studentManagement: true,
          personnelManagement: true,
          sections: true,
          teacherTools: false,
        },
      },
    });

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} toggleSidebar={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /Calendar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Teacher Tools/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Students/i })).toBeInTheDocument();
  });

  it('calls toggleSidebar when toggle button is clicked', () => {
    const toggleSpy = vi.fn();
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'teacher-1', role: 'teacher' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} toggleSidebar={toggleSpy} isMobileOpen={false} />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /Collapse sidebar/i });
    fireEvent.click(toggleBtn);
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });
});
