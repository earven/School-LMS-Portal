import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page loader while authentication state is loading', () => {
    AuthContext.useAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <MemoryRouter initialEntries={['/guarded']}>
        <Routes>
          <Route
            path="/guarded"
            element={
              <ProtectedRoute>
                <div>Guarded Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    expect(screen.queryByText('Guarded Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user (user=null) to /login', () => {
    AuthContext.useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/guarded']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/guarded"
            element={
              <ProtectedRoute>
                <div>Guarded Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Guarded Content')).not.toBeInTheDocument();
  });

  it('redirects user without a role to /login and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u1', email: 'norole@test.com' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/guarded']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/guarded"
            element={
              <ProtectedRoute>
                <div>Guarded Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("missing a 'role'")
    );
    warnSpy.mockRestore();
  });

  it('redirects user with "pending" role to /join', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u2', email: 'pending@test.com', role: 'pending' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/guarded']}>
        <Routes>
          <Route path="/join" element={<div>Join School Page</div>} />
          <Route
            path="/guarded"
            element={
              <ProtectedRoute>
                <div>Guarded Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Join School Page')).toBeInTheDocument();
    expect(screen.queryByText('Guarded Content')).not.toBeInTheDocument();
  });

  it('redirects user to /dashboard if role is not in allowedRoles', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u3', email: 'teacher@test.com', role: 'teacher' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route
            path="/admin-only"
            element={
              <ProtectedRoute allowedRoles={['admin', 'system_admin']}>
                <div>Admin Secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument();
  });

  it('allows access when user role is in allowedRoles (admin)', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u4', email: 'admin@test.com', role: 'admin' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <ProtectedRoute allowedRoles={['admin', 'system_admin']}>
                <div>Admin Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Secret Content')).toBeInTheDocument();
  });

  it('allows access when user role is in allowedRoles (system_admin)', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u5', email: 'sysadmin@test.com', role: 'system_admin' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <ProtectedRoute allowedRoles={['admin', 'system_admin']}>
                <div>System Admin Secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('System Admin Secret')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u6', email: 'teacher@test.com', role: 'teacher' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/content']}>
        <Routes>
          <Route
            path="/content"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <span data-testid="child-span">Children Passed</span>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child-span')).toHaveTextContent('Children Passed');
  });

  it('renders element prop when children is omitted', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u7', email: 'teacher@test.com', role: 'teacher' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/element']}>
        <Routes>
          <Route
            path="/element"
            element={
              <ProtectedRoute
                allowedRoles={['teacher']}
                element={<div data-testid="element-div">Element Prop Content</div>}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('element-div')).toHaveTextContent('Element Prop Content');
  });

  it('renders nested Outlet when used as a layout route wrapper', () => {
    AuthContext.useAuth.mockReturnValue({
      user: { uid: 'u8', email: 'teacher@test.com', role: 'teacher' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/parent/child']}>
        <Routes>
          <Route
            path="/parent"
            element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}
          >
            <Route path="child" element={<div>Nested Child via Outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Nested Child via Outlet')).toBeInTheDocument();
  });
});
