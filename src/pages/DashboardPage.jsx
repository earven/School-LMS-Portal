import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useStudents } from '../context/StudentContext';
import { usePersonnel } from '../context/PersonnelContext';
import './DashboardPage.css';

// Modern SVG Icons
const Icons = {
  Admin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Teacher: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Automation: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  Paper: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  Secure: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  Fast: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  Accuracy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  Anywhere: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  )
};

const DashboardPage = () => {
  const { settings } = useSettings();
  const { students } = useStudents();
  const { personnel } = usePersonnel();
  const [activeTab, setActiveTab] = useState('about');

  const stats = [
    { label: 'Enrolled Students', value: students.length, color: '#4e73df', icon: '👨‍🎓' },
    { label: 'Active Personnel', value: personnel.length, color: '#1cc88a', icon: '👩‍🏫' },
    { label: 'Modules Active', value: Object.values(settings.enabledModules).filter(v => v).length, color: '#f6c23e', icon: '⚙️' },
    { label: 'System Status', value: 'Live', color: '#e74a3b', icon: '✅' }
  ];

  const workflowSteps = [
    {
      icon: <Icons.Admin />,
      title: 'Admin Management',
      description: 'Centralized control for student lists, personnel records, and school-wide configurations.'
    },
    {
      icon: <Icons.Teacher />,
      title: 'Teacher Empowerment',
      description: 'Specialized tools for attendance, academic tracking, and digital submission management.'
    },
    {
      icon: <Icons.Automation />,
      title: 'Smart Automation',
      description: 'Automatically organizes data for instant retrieval and error-free institutional reporting.'
    }
  ];

  const benefits = [
    { icon: <Icons.Paper />, title: 'Paperless Workflow', text: 'Eliminate physical filing and reduce environmental impact.' },
    { icon: <Icons.Secure />, title: 'Unified Security', text: 'All institutional data stored in one highly secure location.' },
    { icon: <Icons.Fast />, title: 'Instant Reporting', text: 'Generate complex reports and summaries with just a single click.' },
    { icon: <Icons.Accuracy />, title: 'High Precision', text: 'Advanced validation to minimize human error in data management.' },
    { icon: <Icons.Anywhere />, title: 'Universal Access', text: 'Securely access your records from any authorized device, anywhere.' }
  ];

  return (
    <div className="dashboard-wrapper">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to {settings.schoolName}</h1>
          <p className="hero-motto">{settings.motto}</p>
          <div className="hero-badge">Productivity Portal</div>
        </div>
      </section>

      <div className="dashboard-nav">
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`} 
            onClick={() => setActiveTab('about')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'how-it-works' ? 'active' : ''}`} 
            onClick={() => setActiveTab('how-it-works')}
          >
            System Workflow
          </button>
          <button 
            className={`tab-btn ${activeTab === 'benefits' ? 'active' : ''}`} 
            onClick={() => setActiveTab('benefits')}
          >
            Key Benefits
          </button>
        </div>
      </div>

      <main className="tab-container">
        {activeTab === 'about' && (
          <div className="fade-in">
            <div className="stats-grid">
              {stats.map((stat, idx) => (
                <div key={idx} className="stat-card-mini" style={{ '--accent': stat.color }}>
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-info">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="dashboard-main-grid">
              <div className="info-card primary">
                <h2>About Our Mission</h2>
                <p>{settings.description}</p>
              </div>
              <div className="info-card secondary">
                <h3>The Portal Initiative</h3>
                <p>
                  The <strong>Vinapor NHS Productivity Portal</strong> is a strategic digital transformation project designed to elevate educational operations. 
                  By centralizing administrative tasks and academic records, we empower educators to focus more on teaching and less on paperwork.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'how-it-works' && (
          <div className="fade-in">
            <h2 className="section-label">Operational Framework</h2>
            <div className="workflow-container">
              {workflowSteps.map((step, index) => (
                <div key={index} className="modern-card workflow-card">
                  <div className="icon-wrapper">{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="fade-in">
            <h2 className="section-label">Why Choose Digital?</h2>
            <div className="benefits-container">
              {benefits.map((benefit, index) => (
                <div key={index} className="modern-card benefit-card">
                  <div className="icon-wrapper small">{benefit.icon}</div>
                  <div className="card-info">
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
