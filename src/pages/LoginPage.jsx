import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { login, loginWithGoogle, resetPassword, user, loading } = useAuth();
  const { settings } = useSettings();
  const hasSchoolLogo = Boolean(settings.schoolLogo);
  const hasHeroBg = Boolean(settings.heroBackground);
  const heroBgStyle = hasHeroBg 
    ? { backgroundImage: `url(${settings.heroBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
    : {};

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Please enter both email and password.');

    setIsLoggingIn(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    if (!email) {
      setError('Enter your email first, then click Forgot Password.');
      return;
    }

    setIsResetting(true);
    setError('');
    setSuccessMessage('');
    const result = await resetPassword(email);
    if (result.success) {
      setSuccessMessage('Password reset link sent. Check your email inbox.');
    } else {
      setError(result.error || 'Unable to send password reset email.');
    }
    setIsResetting(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Google Login failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred during Google Login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-visual-panel" style={heroBgStyle}>
        <div className="visual-content">
          <div className="visual-logo-box" aria-label="School logo">
            {hasSchoolLogo ? (
              <img src={settings.schoolLogo} alt={`${settings.schoolName} logo`} className="logo-image" />
            ) : (
              <span className="logo-fallback-icon" aria-hidden="true">🎓</span>
            )}
          </div>
          <h1>{settings.schoolName}</h1>
          <p className="visual-motto">{settings.motto}</p>
          <div className="visual-features">
            <div className="v-feature">
              <span className="v-icon">✓</span>
              <span>Secure Academic Records</span>
            </div>
            <div className="v-feature">
              <span className="v-icon">✓</span>
              <span>Efficient Personnel Management</span>
            </div>
            <div className="v-feature">
              <span className="v-icon">✓</span>
              <span>Advanced Teacher Toolsets</span>
            </div>
          </div>
        </div>
        <div className="visual-overlay"></div>
      </div>

      <div className="login-form-panel">
        <div className="form-card fade-in">
          <div className="mobile-brand-header">
            <div className="mobile-logo" aria-label="School logo">
              {hasSchoolLogo ? (
                <img src={settings.schoolLogo} alt={`${settings.schoolName} logo`} className="logo-image" />
              ) : (
                <span className="logo-fallback-icon" aria-hidden="true">🎓</span>
              )}
            </div>
            <div className="mobile-brand-text">
              <strong>{settings.schoolName}</strong>
              <span>{settings.motto}</span>
            </div>
          </div>

          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Please enter your credentials to access the portal.</p>
          </div>

          <form onSubmit={handleLogin} className="modern-login-form">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="input-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <button type="button" className="forgot-link" onClick={handlePasswordReset} disabled={isResetting || isLoggingIn}>
                  {isResetting ? 'Sending...' : 'Forgot Password?'}
                </button>
              </div>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoggingIn}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoggingIn}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            <button type="submit" className="submit-btn" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <span className="spinner"></span>
              ) : (
                'Sign In to Portal'
              )}
            </button>

            <div className="login-divider">
              <span>Or continue with</span>
            </div>

            <button 
              type="button" 
              className="google-btn" 
              onClick={handleGoogleLogin} 
              disabled={isLoggingIn}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </form>

          <div className="form-footer">
            <p>© {new Date().getFullYear()} {settings.schoolName || 'School Portal'}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
