import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import heroImage from '../assets/hero-bg.png';
import './LandingPage.css';

const LandingPage = () => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroImages = settings.heroImages && settings.heroImages.length > 0
    ? settings.heroImages
    : [heroImage];

  useEffect(() => {
    if (heroImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="admin-portal-landing">
      {/* Background Slideshow with Cinematic Blur Overlay */}
      <div className="landing-bg-container">
        {heroImages.map((img, idx) => (
          <div
            key={idx}
            className={`landing-bg-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="landing-bg-overlay" />
        <div className="landing-bg-vignette" />
      </div>

      {/* Top Header Bar */}
      <header className="admin-topbar">
        <div className="topbar-left">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="School Seal" className="topbar-logo" />
          ) : (
            <div className="topbar-logo-icon">🏛️</div>
          )}
          <div className="topbar-brand">
            <span className="topbar-school-name">{settings.schoolName || 'Vinapor National High School'}</span>
            <span className="topbar-deped-tag">
              {settings.division ? `DepEd Division of ${settings.division}` : 'Department of Education'}
              {settings.schoolId && ` • School ID: ${settings.schoolId}`}
            </span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-badge">
            <span className="live-status-indicator"></span>
            <span>SY {settings.academicYear || '2025–2026'}</span>
          </div>
          <Link to={user ? "/dashboard" : "/login"} className="topbar-action-btn">
            {user ? "Go to Dashboard" : "Sign In"}
          </Link>
        </div>
      </header>

      {/* Main Single-Page Central Card */}
      <main className="admin-main-viewport">
        <div className="portal-gateway-card animate-card-appear">
          {/* Card Header Badge */}
          <div className="portal-gateway-header">
            <div className="gateway-seal-wrapper">
              {settings.schoolLogo ? (
                <img src={settings.schoolLogo} alt="Logo" className="gateway-seal" />
              ) : (
                <div className="gateway-seal-icon">🎓</div>
              )}
            </div>
            <div className="gateway-header-text">
              <span className="gateway-eyebrow">School Management & Information Portal</span>
              <h1 className="gateway-title">{settings.schoolName || 'Vinapor National High School'}</h1>
            </div>
          </div>

          <p className="gateway-description">
            {settings.description || 'Secure administrative workspace for faculty operations, electronic grading (DO 15, s. 2026), automated DepEd School Forms (SF1, SF2, SF9), student masterlists, and personnel records.'}
          </p>

          {/* Quick System Metrics Row */}
          <div className="gateway-meta-strip">
            <div className="meta-pill">
              <span className="meta-pill-label">Academic Year</span>
              <span className="meta-pill-val">{settings.academicYear || '2025–2026'}</span>
            </div>
            <div className="meta-pill">
              <span className="meta-pill-label">Term Encoding</span>
              <span className="meta-pill-val active">{settings.activeTerm || settings.activeQuarter || 'T1'} Active</span>
            </div>
            <div className="meta-pill">
              <span className="meta-pill-label">Form Engine</span>
              <span className="meta-pill-val">SF1 • SF2 • SF9</span>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="gateway-actions">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="gateway-primary-btn"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>{user ? "Open Admin Dashboard" : "Sign In to Admin Portal"}</span>
            </button>

            {!user && (
              <Link to="/join" className="gateway-secondary-btn">
                <span>Join School as Faculty</span>
                <span className="secondary-arrow">→</span>
              </Link>
            )}
          </div>

          {/* Institutional Signatory Line */}
          {settings.principalName && (
            <div className="gateway-signatory">
              <span className="signatory-title">{settings.principalTitle || 'School Principal'}</span>
              <span className="signatory-name">{settings.principalName}</span>
            </div>
          )}
        </div>

        {/* Slide navigation if multiple hero images */}
        {heroImages.length > 1 && (
          <div className="hero-slide-nav">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Switch to slide ${idx + 1}`}
                className={`slide-nav-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Compact Single-Page Footer */}
      <footer className="admin-bottom-bar">
        <div className="bottom-bar-left">
          <span>© {new Date().getFullYear()} {settings.schoolName || 'Vinapor National High School'}. All rights reserved.</span>
        </div>
        <div className="bottom-bar-center">
          <span>🔒 Compliant with Republic Act 10173 (Data Privacy Act of 2012)</span>
        </div>
        <div className="bottom-bar-right">
          <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
          {settings.email && (
            <>
              <span className="footer-sep">•</span>
              <a href={`mailto:${settings.email}`} className="footer-link">Contact Support</a>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
