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
  const [scrolled, setScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroImages = settings.heroImages && settings.heroImages.length > 0
    ? settings.heroImages
    : [heroImage];

  useEffect(() => {
    if (heroImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          <div className="nav-logo">
            {settings.schoolLogo ? (
              <img src={settings.schoolLogo} alt="Logo" className="nav-logo-img" />
            ) : (
              <span className="nav-logo-icon">🎓</span>
            )}
            <span className="nav-school-name">{settings.schoolName || 'School Portal'}</span>
          </div>
          <div className="nav-actions">
            <Link to={user ? "/dashboard" : "/login"} className="login-btn">
              {user ? "Dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        {heroImages.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt="School Hero Background"
            className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
          />
        ))}
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title animate-up delay-1">
            Welcome to <span className="highlight">{settings.schoolName}</span>
          </h1>
          <p className="hero-description animate-up delay-2">
            {settings.description || 'Access the unified portal for students, teachers, and administrators.'}
          </p>
          <div className="hero-buttons animate-up delay-3">
            <button onClick={() => navigate(user ? '/dashboard' : '/login')} className="cta-primary">
              {user ? "Go to Dashboard" : "Enter Portal"}
            </button>
          </div>
        </div>
        {heroImages.length > 1 && (
          <div className="slide-indicators">
            {heroImages.map((_, idx) => (
              <span
                key={idx}
                className={`indicator ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>
        )}
      </header>

      {/* Featured Gallery Section */}
      {settings.featuredGallery && settings.featuredGallery.length > 0 && (
        <section className="featured-gallery-section" style={{ padding: '4rem 2rem', background: 'var(--gray-50)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--gray-900)' }}>Featured Highlights</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '2rem' }}>Glimpses of our vibrant school community.</p>
          <div className="gallery-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {settings.featuredGallery.map((img, idx) => (
              <div key={idx} className="gallery-item" style={{
                overflow: 'hidden',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                aspectRatio: '4/3'
              }}>
                <img src={img} alt={`Featured ${idx + 1}`} style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease'
                }} 
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>{settings.schoolName}</h3>
            <p>{settings.motto}</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Platform</h4>
              <Link to={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Login"}</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <a href="mailto:support@school.edu">Contact Us</a>
              <a href="#">Help Center</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {settings.schoolName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
