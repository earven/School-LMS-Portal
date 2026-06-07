import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import './JoinSchoolPage.css';

const JoinSchoolPage = () => {
  const { user, updateUserProfile, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not logged in, go to login
    if (!user) {
      navigate('/login');
    }
    // If already a teacher/admin, go to dashboard
    else if (user.role && user.role !== 'pending') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the registration code.');
      return;
    }

    setLoading(true);
    setError('');

    // Verify against settings (or default if settings failed to load)
    const validCode = settings.registrationCode || 'SETUP-1234';

    if (code.trim() === validCode) {
      // Code matches! Grant teacher access
      const result = await updateUserProfile({ role: 'teacher' });
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError('Failed to update account. Please try again.');
        setLoading(false);
      }
    } else {
      setError('Invalid registration code. Please contact your school administrator.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!user || (user.role && user.role !== 'pending')) return null;

  return (
    <div className="join-wrapper">
      <div className="join-card fade-in">
        <div className="join-header">
          <div className="join-logo-placeholder">
            {settings.schoolLogo ? (
              <img src={settings.schoolLogo} alt="School Logo" />
            ) : (
              <span>🎓</span>
            )}
          </div>
          <h2>Join {settings.schoolName || 'School'}</h2>
          <p>You have successfully authenticated with Google, but your account is not yet linked to the school.</p>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          <div className="input-group">
            <label htmlFor="regCode">Teacher Registration Code</label>
            <input
              type="text"
              id="regCode"
              placeholder="Enter the secure access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              autoFocus
            />
            {error && <p className="error-message">{error}</p>}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Verify Code & Join'}
          </button>
        </form>

        <div className="join-footer">
          <p>Don't have the code? Contact your school's IT administrator.</p>
          <button type="button" className="text-link-btn" onClick={handleLogout}>
            Sign out of this account
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinSchoolPage;
