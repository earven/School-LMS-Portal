// src/pages/LoginPage.test.jsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';

// Mock Firebase auth and firestore functions
let onAuthStateChangeMockCallback = null; // Declare here so it's accessible

vi.mock('firebase/auth', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    signInWithEmailAndPassword: vi.fn(),
    onAuthStateChanged: vi.fn((authInstance, callback) => {
      onAuthStateChangeMockCallback = callback; // Store the callback
      // Call it once immediately to simulate initial state
      callback(null); // No setTimeout
      return vi.fn(); // Unsubscribe
    }),
    signOut: vi.fn(), // Also mock signOut
  };
});

vi.mock('firebase/firestore', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    doc: vi.fn(),
    getDoc: vi.fn(),
  };
});

// Helper function to render components with necessary providers
const renderWithProviders = (ui) => {
  let rendered;
  act(() => { // Wrap render in act
    rendered = render(
      <Router>
        <SettingsProvider>
          <AuthProvider>{ui}</AuthProvider>
        </SettingsProvider>
      </Router>
    );
  });
  return rendered;
};

describe('LoginPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Mock window.location.pathname for navigation tests
    Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
    });
    // Ensure onAuthStateChangeMockCallback is reset for each test
    onAuthStateChangeMockCallback = null;
    
    // Mock getDoc to return null for user roles initially
    firestore.getDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined,
    });
  });

  it('renders login form with email and password fields', async () => {
    renderWithProviders(<LoginPage />);
    // Wait for the loading indicator to disappear, or for a specific element of LoginPage to appear
    await screen.findByRole('button', { name: /sign in to portal/i }); 

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to portal/i })).toBeInTheDocument();
  });

  it('shows error message on failed login', async () => {
    const firebaseErrorMessagePart = 'auth/invalid-credential'; // Part of the message
    firebaseAuth.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential', message: `Firebase: Error (${firebaseErrorMessagePart}).` });

    renderWithProviders(<LoginPage />);
    await screen.findByLabelText(/email/i); // Wait for form to be rendered

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    await act(async () => { // Wrap click that triggers async state update
      fireEvent.click(screen.getByRole('button', { name: /sign in to portal/i }));
    });

    await screen.findByText(/Firebase: Error/i); // More generic matcher
    // Also assert that the error message is visible using a more flexible query
    const errorMessageElement = screen.getByText(new RegExp(firebaseErrorMessagePart, 'i'));
    expect(errorMessageElement).toBeInTheDocument();
    
    expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'wrongpassword'
    );
  });

  it('redirects to dashboard on successful login', async () => {
    const mockUser = { uid: 'test-uid', email: 'test@example.com' };
    const mockUserData = { role: 'admin', fullName: 'Test Admin' };

    firebaseAuth.signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });
    
    renderWithProviders(<LoginPage />);
    await screen.findByLabelText(/email/i); // Wait for form to be rendered

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    // Simulate the login button click and wait for the signInWithEmailAndPassword promise to resolve
    await act(async () => { 
      fireEvent.click(screen.getByRole('button', { name: /sign in to portal/i }));
      // Wait for signInWithEmailAndPassword to resolve
      await Promise.resolve(); // Simulate microtask queue
      // Manually trigger the AuthStateChanged callback after login resolves
      if (onAuthStateChangeMockCallback) { // Use the globally accessible mock callback
        onAuthStateChangeMockCallback(mockUser);
      }
    });
    

    await waitFor(() => {
        // Assert on the expected pathname change
        expect(window.location.pathname).toBe('/dashboard');
    }, { timeout: 2000 }); // Increased timeout for async operations
  });

  it('disables form fields and shows spinner during login', async () => {
    // Mock a signInWithEmailAndPassword that never resolves to keep it in loading state
    firebaseAuth.signInWithEmailAndPassword.mockImplementation(() => new Promise(() => {}));
  
    renderWithProviders(<LoginPage />);
    await screen.findByLabelText(/email/i); // Wait for form to be rendered
  
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    await act(async () => { // Wrap click that triggers async state update
      fireEvent.click(screen.getByRole('button', { name: /sign in to portal/i }));
    });
  
    await waitFor(() => {
      // Check that the button is disabled and contains the spinner element
      const signInButton = screen.getByRole('button', { name: /sign in to portal/i });
      expect(signInButton).toBeDisabled();
      // The button text is conditionally rendered. If spinner is shown, text is empty.
      expect(signInButton).not.toHaveTextContent(/sign in to portal/i);
      expect(signInButton.querySelector('.spinner')).toBeInTheDocument(); 

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
    });
  });
});
