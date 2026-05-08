import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { settings } = useSettings();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
    setIsLoggingIn(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-visual-panel">
        <div className="visual-content">
          <div className="visual-logo-box">VN</div>
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
                <a href="#" className="forgot-link">Forgot?</a>
              </div>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="submit-btn" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <span className="spinner"></span>
              ) : (
                'Sign In to Portal'
              )}
            </button>
          </form>

          <div className="form-footer">
            <p>© {new Date().getFullYear()} Vinapor NHS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
