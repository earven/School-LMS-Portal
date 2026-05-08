import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('identity');
  const [localSettings, setLocalSettings] = useState(settings);
  const [showNotification, setShowNotification] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings(prev => ({ ...prev, schoolLogo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div className="settings-container">
      <h1>System Settings</h1>
      
      {showNotification && (
        <div className="notification success">
          Changes saved successfully!
        </div>
      )}

      <div className="tabs">
        <button 
          className={activeTab === 'identity' ? 'active' : ''} 
          onClick={() => setActiveTab('identity')}
        >School Identity</button>
        <button 
          className={activeTab === 'contact' ? 'active' : ''} 
          onClick={() => setActiveTab('contact')}
        >Contact Information</button>
        <button 
          className={activeTab === 'system' ? 'active' : ''} 
          onClick={() => setActiveTab('system')}
        >System Preferences</button>
        <button 
          className={activeTab === 'appearance' ? 'active' : ''} 
          onClick={() => setActiveTab('appearance')}
        >Appearance Settings</button>
      </div>

      <div className="tab-content">
        {activeTab === 'identity' && (
          <div className="tab-pane">
            <div className="form-group">
              <label>School Name</label>
              <input 
                type="text" 
                name="schoolName" 
                value={localSettings.schoolName} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>School Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
              {localSettings.schoolLogo && (
                <div className="logo-preview">
                  <img src={localSettings.schoolLogo} alt="Preview" />
                </div>
              )}
            </div>
            <div className="form-group">
              <label>School Motto / Tagline</label>
              <input 
                type="text" 
                name="motto" 
                value={localSettings.motto} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>School Description</label>
              <textarea 
                name="description" 
                value={localSettings.description} 
                onChange={handleInputChange} 
              />
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="tab-pane">
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                value={localSettings.phone} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={localSettings.email} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>School Address</label>
              <textarea 
                name="address" 
                value={localSettings.address} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Facebook Page URL</label>
              <input 
                type="text" 
                name="facebookUrl" 
                value={localSettings.facebookUrl} 
                onChange={handleInputChange} 
              />
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="tab-pane fade-in">
            <div className="form-group">
              <label htmlFor="academicYear">Academic Year</label>
              <div className="select-wrapper">
                <select 
                  id="academicYear"
                  name="academicYear" 
                  value={localSettings.academicYear} 
                  onChange={handleInputChange}
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <h3>Enable Modules</h3>
              <p className="section-desc">Toggle specialized modules for your school portal.</p>
              
              <div className="toggle-grid">
                <label className="toggle-card">
                  <input 
                    type="checkbox" 
                    name="enabledModules.studentManagement" 
                    checked={localSettings.enabledModules.studentManagement} 
                    onChange={handleInputChange} 
                  />
                  <div className="toggle-content">
                    <span className="toggle-icon">👥</span>
                    <div className="toggle-info">
                      <span className="toggle-label">Student Management</span>
                      <span className="toggle-desc">Manage student profiles, records, and enrollment.</span>
                    </div>
                  </div>
                  <span className="slider"></span>
                </label>

                <label className="toggle-card">
                  <input 
                    type="checkbox" 
                    name="enabledModules.personnelManagement" 
                    checked={localSettings.enabledModules.personnelManagement} 
                    onChange={handleInputChange} 
                  />
                  <div className="toggle-content">
                    <span className="toggle-icon">👔</span>
                    <div className="toggle-info">
                      <span className="toggle-label">Personnel Management</span>
                      <span className="toggle-desc">Track teacher records and administrative staff.</span>
                    </div>
                  </div>
                  <span className="slider"></span>
                </label>

                <label className="toggle-card">
                  <input 
                    type="checkbox" 
                    name="enabledModules.teacherTools" 
                    checked={localSettings.enabledModules.teacherTools} 
                    onChange={handleInputChange} 
                  />
                  <div className="toggle-content">
                    <span className="toggle-icon">🛠️</span>
                    <div className="toggle-info">
                      <span className="toggle-label">Teacher Tools</span>
                      <span className="toggle-desc">Attendance, submission tracking, and data tools.</span>
                    </div>
                  </div>
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>System Capabilities</h3>
              <div className="toggle-list">
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    name="enableFileUpload" 
                    checked={localSettings.enableFileUpload} 
                    onChange={handleInputChange} 
                  />
                  <span className="slider"></span> Enable File Upload System
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="tab-pane">
            <div className="form-group">
              <label>Primary Color</label>
              <input 
                type="color" 
                name="primaryColor" 
                value={localSettings.primaryColor} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Theme Selector</label>
              <select 
                name="theme" 
                value={localSettings.theme} 
                onChange={handleInputChange}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="form-group">
              <label>Logo Position</label>
              <select 
                name="logoPosition" 
                value={localSettings.logoPosition} 
                onChange={handleInputChange}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>
        )}

        <button className="save-button" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
};

export default SettingsPage;
