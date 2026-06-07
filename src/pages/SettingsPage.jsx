import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import imageCompression from 'browser-image-compression';
import './SettingsPage.css';

const DEFAULT_SETTINGS = {
  schoolName: 'Your School Name',
  schoolId: '',
  region: '',
  division: '',
  schoolLogo: '',
  motto: 'Empowering Education, Shaping Futures',
  description: 'Empowering students through digital transformation and streamlined school operations.',
  phone: '0000-000-0000',
  email: 'info@yourschool.edu',
  address: 'School Campus Address',
  facebookUrl: 'https://facebook.com',
  academicYear: '2025-2026',
  enabledModules: {
    studentManagement: true,
    personnelManagement: true,
    sections: true,
    calendar: true,
    teacherTools: true
  },
  enableFileUpload: true,
  primaryColor: '#2563eb',
  theme: 'light',
  fontSize: 'compact',
  logoPosition: 'left',
  heroBackground: '',
  heroImages: [],
  featuredGallery: [],
  registrationCode: 'SETUP-1234'
};

const COLOR_PRESETS = [
  { name: 'Classic Navy', hex: '#1e3a8a' },
  { name: 'Emerald Green', hex: '#065f46' },
  { name: 'Crimson Maroon', hex: '#991b1b' },
  { name: 'Royal Teal', hex: '#0f766e' },
  { name: 'Indigo Violet', hex: '#4338ca' },
  { name: 'Slate Charcoal', hex: '#334155' }
];

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('identity');
  const [localSettings, setLocalSettings] = useState(settings);
  const [showNotification, setShowNotification] = useState(false);
  
  // New Enhancement States
  const [isSaving, setIsSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Drag and Drop States
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [isDraggingDashboard, setIsDraggingDashboard] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;

    // Clear validation error on change
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setLocalSettings(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: inputValue
        }
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        [name]: inputValue
      }));
    }
  };

  const resizeImage = async (file, maxWidth = 1920, maxHeight = 1080) => {
    try {
      const options = {
        maxSizeMB: 0.1, // 100 KB max limit to keep Firestore documents small
        maxWidthOrHeight: Math.max(maxWidth, maxHeight),
        useWebWorker: true,
        fileType: 'image/jpeg'
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Convert the compressed Blob back to Base64 since the settings use Data URLs
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      console.error("Image compression error:", error);
      throw new Error("Failed to process image. It might not be a valid image file.");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 300, 300);
        setLocalSettings(prev => ({ ...prev, schoolLogo: resized }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const removeSchoolLogo = () => {
    setLocalSettings(prev => ({ ...prev, schoolLogo: '' }));
  };

  const handleHeroImagesUpload = async (e) => {
    try {
      const files = Array.from(e.target.files);
      const results = await Promise.all(files.map(file => resizeImage(file, 1280, 720)));
      setLocalSettings(prev => ({
        ...prev,
        heroImages: [...(prev.heroImages || []), ...results]
      }));
    } catch {
      alert("One or more images failed to load. Please make sure they are valid image files.");
    }
  };

  const removeHeroImage = (index) => {
    setLocalSettings(prev => {
      const newImages = [...(prev.heroImages || [])];
      newImages.splice(index, 1);
      return { ...prev, heroImages: newImages };
    });
  };

  const handleHeroBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 1280, 720);
        setLocalSettings(prev => ({ ...prev, heroBackground: resized }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const removeHeroBackground = () => {
    setLocalSettings(prev => ({ ...prev, heroBackground: '' }));
  };

  const handleFeaturedGalleryUpload = async (e) => {
    try {
      const files = Array.from(e.target.files);
      const results = await Promise.all(files.map(file => resizeImage(file, 600, 450)));
      setLocalSettings(prev => ({
        ...prev,
        featuredGallery: [...(prev.featuredGallery || []), ...results]
      }));
    } catch {
      alert("One or more gallery images failed to load.");
    }
  };

  const removeFeaturedGalleryImage = (index) => {
    setLocalSettings(prev => {
      const newImages = [...(prev.featuredGallery || [])];
      newImages.splice(index, 1);
      return { ...prev, featuredGallery: newImages };
    });
  };

  // Drag and Drop Helper Handlers
  const handleDragOver = (e, dragSetter) => {
    e.preventDefault();
    dragSetter(true);
  };

  const handleDragLeave = (e, dragSetter) => {
    e.preventDefault();
    dragSetter(false);
  };

  const handleLogoDrop = async (e) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const resized = await resizeImage(file, 300, 300);
        setLocalSettings(prev => ({ ...prev, schoolLogo: resized }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleHeroImagesDrop = async (e) => {
    e.preventDefault();
    setIsDraggingHero(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      try {
        const results = await Promise.all(files.map(file => resizeImage(file, 1280, 720)));
        setLocalSettings(prev => ({
          ...prev,
          heroImages: [...(prev.heroImages || []), ...results]
        }));
      } catch {
        alert("One or more images failed to load.");
      }
    }
  };

  const handleHeroBackgroundDrop = async (e) => {
    e.preventDefault();
    setIsDraggingDashboard(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const resized = await resizeImage(file, 1280, 720);
        setLocalSettings(prev => ({ ...prev, heroBackground: resized }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleFeaturedGalleryDrop = async (e) => {
    e.preventDefault();
    setIsDraggingGallery(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      try {
        const results = await Promise.all(files.map(file => resizeImage(file, 600, 450)));
        setLocalSettings(prev => ({
          ...prev,
          featuredGallery: [...(prev.featuredGallery || []), ...results]
        }));
      } catch {
        alert("One or more images failed to load.");
      }
    }
  };

  const handleSave = async () => {
    const newErrors = {};

    // Validate Email format
    if (localSettings.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(localSettings.email)) {
        newErrors.email = 'Please enter a valid email address (e.g. school@edu.com)';
      }
    }

    // Validate Phone format
    if (localSettings.phone) {
      const phoneRegex = /^[\d\s\-+()]{7,20}$/;
      if (!phoneRegex.test(localSettings.phone)) {
        newErrors.phone = 'Please enter a valid phone number (7-20 characters)';
      }
    }

    // Validate Facebook URL format
    if (localSettings.facebookUrl) {
      try {
        const url = new URL(localSettings.facebookUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          newErrors.facebookUrl = 'URL must start with http:// or https://';
        }
      } catch {
        newErrors.facebookUrl = 'Please enter a valid Facebook page URL';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setActiveTab('contact'); // Validation errors currently reside on Contact tab
      return;
    }

    setIsSaving(true);
    // Simulate database write delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const success = updateSettings(localSettings);
    setIsSaving(false);
    if (success) {
      setShowNotification(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const handleConfirmReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    updateSettings(DEFAULT_SETTINGS);
    setShowResetModal(false);
    setShowNotification(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>System Settings</h1>
        <p className="settings-subtitle">Configure your portal's school branding, modules, term periods, and aesthetics.</p>
      </header>

      {showNotification && (
        <div className="notification success">
          <span className="notification-icon">✓</span>
          <span className="notification-message">Changes saved successfully!</span>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <button
            className={`sidebar-tab ${activeTab === 'identity' ? 'active' : ''}`}
            onClick={() => setActiveTab('identity')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
            </svg>
            <span>School Identity</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>Contact Info</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>System Prefs</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>Appearance</span>
          </button>
        </aside>

        <main className="settings-main">
          <div className="tab-content">
            {activeTab === 'identity' && (
              <div className="tab-pane fade-in">
                <div className="settings-card">
                  <div className="card-header">
                    <h2>School Identity & Branding</h2>
                    <p className="card-subtitle">Manage your school's identity, official logo, and general description.</p>
                  </div>
                  <div className="card-body">
                    <div className="profile-layout-grid">
                      <div className="profile-inputs-col">
                        <div className="form-group">
                          <label htmlFor="schoolName">School Name</label>
                          <input
                            id="schoolName"
                            type="text"
                            name="schoolName"
                            value={localSettings.schoolName}
                            onChange={handleInputChange}
                            placeholder="e.g. Oakridge High School"
                          />
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="motto">School Motto / Tagline</label>
                          <input
                            id="motto"
                            type="text"
                            name="motto"
                            value={localSettings.motto}
                            onChange={handleInputChange}
                            placeholder="e.g. Excellence in Education"
                          />
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="description">School Description</label>
                          <textarea
                            id="description"
                            name="description"
                            rows="3"
                            value={localSettings.description}
                            onChange={handleInputChange}
                            placeholder="Describe your school's history, mission, or vision..."
                          />
                        </div>
                      </div>
                      
                      <div className="profile-branding-col">
                        <label className="branding-label">School Logo / Seal</label>
                        <div 
                          className={`compact-logo-container ${isDraggingLogo ? 'dragging' : ''}`}
                          onDragOver={(e) => handleDragOver(e, setIsDraggingLogo)}
                          onDragLeave={(e) => handleDragLeave(e, setIsDraggingLogo)}
                          onDrop={handleLogoDrop}
                        >
                          {localSettings.schoolLogo ? (
                            <div className="logo-preview-badge" style={{ position: 'relative' }}>
                              <img src={localSettings.schoolLogo} alt="School Logo" />
                              <button 
                                type="button"
                                onClick={removeSchoolLogo}
                                className="compact-delete-btn"
                                title="Remove Logo"
                                style={{ position: 'absolute', top: '-5px', right: '-5px' }}
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div className="logo-placeholder-display">
                              <span>No Logo Loaded</span>
                            </div>
                          )}
                          <div className="file-uploader-box compact">
                            <input 
                              type="file" 
                              id="logo-upload"
                              accept="image/*" 
                              onChange={handleLogoUpload} 
                              className="file-input-hidden"
                            />
                            <label htmlFor="logo-upload" className="file-uploader-label compact">
                              <svg className="upload-icon compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                              </svg>
                              <span className="upload-text-main">Change Logo</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="tab-pane fade-in">
                <div className="settings-card">
                  <div className="card-header">
                    <h2>Contact Information</h2>
                    <p className="card-subtitle">Manage physical addresses, email channels, phone lines, and social links.</p>
                  </div>
                  <div className="card-body">
                    <div className="form-grid">
                      <div className="contact-left-col">
                        <div className="form-group">
                          <label htmlFor="phone" className={errors.phone ? 'label-error' : ''}>Phone Number</label>
                          <input
                            id="phone"
                            type="text"
                            name="phone"
                            className={errors.phone ? 'input-error' : ''}
                            value={localSettings.phone}
                            onChange={handleInputChange}
                            placeholder="e.g. +63 912 345 6789"
                          />
                          {errors.phone && <span className="error-text">{errors.phone}</span>}
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="email" className={errors.email ? 'label-error' : ''}>Email Address</label>
                          <input
                            id="email"
                            type="email"
                            name="email"
                            className={errors.email ? 'input-error' : ''}
                            value={localSettings.email}
                            onChange={handleInputChange}
                            placeholder="e.g. contact@school.edu"
                          />
                          {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>
                      </div>
                      <div className="contact-right-col">
                        <div className="form-group">
                          <label htmlFor="facebookUrl" className={errors.facebookUrl ? 'label-error' : ''}>Facebook Page URL</label>
                          <input
                            id="facebookUrl"
                            type="url"
                            name="facebookUrl"
                            className={errors.facebookUrl ? 'input-error' : ''}
                            value={localSettings.facebookUrl}
                            onChange={handleInputChange}
                            placeholder="https://facebook.com/yourschool"
                          />
                          {errors.facebookUrl && <span className="error-text">{errors.facebookUrl}</span>}
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="address">School Address</label>
                          <textarea
                            id="address"
                            name="address"
                            rows="3"
                            value={localSettings.address}
                            onChange={handleInputChange}
                            placeholder="Complete physical street address..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="tab-pane fade-in">
                <div className="settings-card">
                  <div className="card-header">
                    <h2>System Preferences & Portal Modules</h2>
                    <p className="card-subtitle">Configure academic year terms, enable portal tools, and manage storage capabilities.</p>
                  </div>
                  <div className="card-body">
                    <div className="system-layout-grid">
                      <div className="system-config-col">
                        <div className="form-group">
                          <label htmlFor="academicYear">Active Academic Year</label>
                          <div className="select-wrapper">
                            <select
                              id="academicYear"
                              name="academicYear"
                              value={localSettings.academicYear || ''}
                              onChange={handleInputChange}
                            >
                              <option value="2024-2025">2024-2025</option>
                              <option value="2025-2026">2025-2026</option>
                              <option value="2026-2027">2026-2027</option>
                              <option value="2027-2028">2027-2028</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group margin-top-md">
                          <label htmlFor="academicYearStatus">School Year Status</label>
                          <div className="select-wrapper">
                            <select
                              id="academicYearStatus"
                              name="academicYearStatus"
                              value={localSettings.academicYearStatus || 'open'}
                              onChange={handleInputChange}
                            >
                              <option value="open">Open (Teachers can edit records)</option>
                              <option value="locked">Locked (Strictly Read-Only)</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group margin-top-lg">
                          <label>System Assets</label>
                          <div className="toggle-row compact">
                            <div className="toggle-row-info">
                              <span className="toggle-row-title">File Upload System</span>
                              <span className="toggle-row-desc">Allow students and teachers to submit attachments.</span>
                            </div>
                            <label className="switch-container">
                              <input
                                type="checkbox"
                                name="enableFileUpload"
                                checked={localSettings.enableFileUpload}
                                onChange={handleInputChange}
                              />
                              <span className="custom-switch-slider"></span>
                            </label>
                          </div>
                        </div>

                        <div className="form-group margin-top-lg" style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <label htmlFor="registrationCode" style={{ color: '#991b1b', fontWeight: 'bold' }}>
                            <span style={{ marginRight: '0.5rem' }}>🔒</span>
                            Teacher Registration Code
                          </label>
                          <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                            New users must enter this code when logging in for the first time to gain access to the system.
                          </p>
                          <input
                            id="registrationCode"
                            type="text"
                            name="registrationCode"
                            value={localSettings.registrationCode || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. OAKRIDGE-2026"
                            style={{ borderColor: '#fca5a5' }}
                          />
                        </div>
                      </div>

                      <div className="system-modules-col">
                        <label className="branding-label">Enable Portal Modules</label>
                        <div className="compact-modules-list">
                          <label className={`module-list-item ${localSettings.enabledModules.studentManagement ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              name="enabledModules.studentManagement"
                              checked={localSettings.enabledModules.studentManagement}
                              onChange={handleInputChange}
                            />
                            <span className="module-item-icon">👥</span>
                            <div className="module-item-info">
                              <span className="module-item-title">Student Management</span>
                              <span className="module-item-desc">Profiles and enrollment</span>
                            </div>
                            <span className="custom-switch"></span>
                          </label>

                          <label className={`module-list-item ${localSettings.enabledModules.personnelManagement ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              name="enabledModules.personnelManagement"
                              checked={localSettings.enabledModules.personnelManagement}
                              onChange={handleInputChange}
                            />
                            <span className="module-item-icon">👔</span>
                            <div className="module-item-info">
                              <span className="module-item-title">Personnel Management</span>
                              <span className="module-item-desc">Teacher/Staff records</span>
                            </div>
                            <span className="custom-switch"></span>
                          </label>

                          <label className={`module-list-item ${localSettings.enabledModules.teacherTools ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              name="enabledModules.teacherTools"
                              checked={localSettings.enabledModules.teacherTools}
                              onChange={handleInputChange}
                            />
                            <span className="module-item-icon">🛠️</span>
                            <div className="module-item-info">
                              <span className="module-item-title">Teacher Tools</span>
                              <span className="module-item-desc">Attendance & data tracking</span>
                            </div>
                            <span className="custom-switch"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="tab-pane fade-in">
                <div className="settings-card">
                  <div className="card-header">
                    <h2>Appearance & Branding Assets</h2>
                    <p className="card-subtitle">Customize application colors, typography, theme preferences, and marketing media.</p>
                  </div>
                  <div className="card-body">
                    <div className="appearance-layout-grid">
                      <div className="appearance-config-col">
                        <label className="branding-label">Portal Styling</label>
                        <div className="form-group">
                          <label htmlFor="theme">Theme Selector</label>
                          <div className="select-wrapper">
                            <select
                              id="theme"
                              name="theme"
                              value={localSettings.theme}
                              onChange={handleInputChange}
                            >
                              <option value="light">Light Theme</option>
                              <option value="dark">Dark Theme</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="fontSize">System Font Size</label>
                          <div className="select-wrapper">
                            <select
                              id="fontSize"
                              name="fontSize"
                              value={localSettings.fontSize || 'compact'}
                              onChange={handleInputChange}
                            >
                              <option value="standard">Standard (16px)</option>
                              <option value="medium">Medium (15px)</option>
                              <option value="compact">Compact (14px)</option>
                              <option value="extra-compact">Extra Compact (13px)</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="logoPosition">Logo Position</label>
                          <div className="select-wrapper">
                            <select
                              id="logoPosition"
                              name="logoPosition"
                              value={localSettings.logoPosition}
                              onChange={handleInputChange}
                            >
                              <option value="left">Left Aligned</option>
                              <option value="center">Center Aligned</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group margin-top-md">
                          <label htmlFor="primaryColor">Primary Theme Color</label>
                          
                          {/* Color presets panel */}
                          <div className="presets-container">
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset.hex}
                                type="button"
                                className={`preset-swatch ${localSettings.primaryColor === preset.hex ? 'active' : ''}`}
                                style={{ backgroundColor: preset.hex }}
                                title={preset.name}
                                onClick={() => setLocalSettings(prev => ({ ...prev, primaryColor: preset.hex }))}
                              />
                            ))}
                          </div>
                          
                          <div className="color-picker-row margin-top-md">
                            <div className="color-picker-input-wrapper">
                              <input
                                id="primaryColor"
                                type="color"
                                name="primaryColor"
                                value={localSettings.primaryColor}
                                onChange={handleInputChange}
                              />
                              <span className="color-preview-swatch" style={{ backgroundColor: localSettings.primaryColor }}></span>
                            </div>
                            <span className="color-hex-value">{localSettings.primaryColor}</span>
                          </div>
                        </div>
                      </div>

                      <div className="appearance-media-col">
                        <label className="branding-label">Marketing & Landing Media</label>
                        <div className="compact-media-grid">
                          
                          {/* Hero Images */}
                          <div className="media-upload-item">
                            <span className="media-item-title">Landing Hero Images</span>
                            <div 
                              className={`file-uploader-box compact ${isDraggingHero ? 'dragging' : ''}`}
                              onDragOver={(e) => handleDragOver(e, setIsDraggingHero)}
                              onDragLeave={(e) => handleDragLeave(e, setIsDraggingHero)}
                              onDrop={handleHeroImagesDrop}
                            >
                              <input 
                                type="file" 
                                id="hero-images-upload"
                                accept="image/*" 
                                multiple 
                                onChange={handleHeroImagesUpload} 
                                className="file-input-hidden"
                              />
                              <label htmlFor="hero-images-upload" className="file-uploader-label compact-media">
                                <svg className="upload-icon compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                </svg>
                                <span>Upload Images</span>
                              </label>
                            </div>
                            
                            {localSettings.heroImages && localSettings.heroImages.length > 0 && (
                              <div className="compact-media-previews">
                                {localSettings.heroImages.map((img, idx) => (
                                  <div key={idx} className="compact-preview-card">
                                    <img src={img} alt={`Hero ${idx}`} />
                                    <button 
                                      type="button"
                                      onClick={() => removeHeroImage(idx)}
                                      className="compact-delete-btn"
                                      title="Remove"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Dashboard Background */}
                          <div className="media-upload-item">
                            <span className="media-item-title">Dashboard Background</span>
                            <div 
                              className={`file-uploader-box compact ${isDraggingDashboard ? 'dragging' : ''}`}
                              onDragOver={(e) => handleDragOver(e, setIsDraggingDashboard)}
                              onDragLeave={(e) => handleDragLeave(e, setIsDraggingDashboard)}
                              onDrop={handleHeroBackgroundDrop}
                            >
                              <input 
                                type="file" 
                                id="dashboard-bg-upload"
                                accept="image/*" 
                                onChange={handleHeroBackgroundUpload} 
                                className="file-input-hidden"
                              />
                              <label htmlFor="dashboard-bg-upload" className="file-uploader-label compact-media">
                                <svg className="upload-icon compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                </svg>
                                <span>Set Background</span>
                              </label>
                            </div>
                            
                            {localSettings.heroBackground && (
                              <div className="compact-media-previews single">
                                <div className="compact-preview-card">
                                  <img src={localSettings.heroBackground} alt="Dashboard Background" />
                                  <button 
                                    type="button"
                                    onClick={removeHeroBackground}
                                    className="compact-delete-btn"
                                    title="Remove Background"
                                  >
                                    &times;
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Featured Gallery */}
                          <div className="media-upload-item">
                            <span className="media-item-title">Featured Landing Gallery</span>
                            <div 
                              className={`file-uploader-box compact ${isDraggingGallery ? 'dragging' : ''}`}
                              onDragOver={(e) => handleDragOver(e, setIsDraggingGallery)}
                              onDragLeave={(e) => handleDragLeave(e, setIsDraggingGallery)}
                              onDrop={handleFeaturedGalleryDrop}
                            >
                              <input 
                                type="file" 
                                id="gallery-images-upload"
                                accept="image/*" 
                                multiple 
                                onChange={handleFeaturedGalleryUpload} 
                                className="file-input-hidden"
                              />
                              <label htmlFor="gallery-images-upload" className="file-uploader-label compact-media">
                                <svg className="upload-icon compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                </svg>
                                <span>Upload Gallery</span>
                              </label>
                            </div>
                            
                            {localSettings.featuredGallery && localSettings.featuredGallery.length > 0 && (
                              <div className="compact-media-previews">
                                {localSettings.featuredGallery.map((img, idx) => (
                                  <div key={idx} className="compact-preview-card">
                                    <img src={img} alt={`Featured ${idx}`} />
                                    <button 
                                      type="button"
                                      onClick={() => removeFeaturedGalleryImage(idx)}
                                      className="compact-delete-btn"
                                      title="Remove"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="settings-footer">
            <button
              type="button"
              className="reset-button-secondary"
              onClick={() => setShowResetModal(true)}
            >
              Reset to Defaults
            </button>
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner"></span>
                  Saving Changes...
                </>
              ) : (
                <>
                  <svg className="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save System Settings
                </>
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-warning-header">
              <span className="modal-warning-icon">⚠️</span>
              <h3>Confirm Reset Defaults</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to restore default configurations? This action will overwrite all customization data (school name, email, addresses, modules, logo, and active backgrounds) instantly.</p>
              <p className="modal-subtext">This action cannot be undone once confirmed.</p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="modal-cancel-btn" 
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="modal-confirm-btn" 
                onClick={handleConfirmReset}
              >
                Yes, Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
