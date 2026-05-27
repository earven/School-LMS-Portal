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

  const resizeImage = (file, maxWidth = 1920, maxHeight = 1080) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => {
          reject(new Error("Failed to load image. It might not be a valid image file."));
        };
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 400, 400);
        setLocalSettings(prev => ({ ...prev, schoolLogo: resized }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleHeroImagesUpload = async (e) => {
    try {
      const files = Array.from(e.target.files);
      const results = await Promise.all(files.map(file => resizeImage(file, 1920, 1080)));
      setLocalSettings(prev => ({
        ...prev,
        heroImages: [...(prev.heroImages || []), ...results]
      }));
    } catch (err) {
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
        const resized = await resizeImage(file, 1920, 1080);
        setLocalSettings(prev => ({ ...prev, heroBackground: resized }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleFeaturedGalleryUpload = async (e) => {
    try {
      const files = Array.from(e.target.files);
      const results = await Promise.all(files.map(file => resizeImage(file, 800, 600))); // Smaller size for gallery
      setLocalSettings(prev => ({
        ...prev,
        featuredGallery: [...(prev.featuredGallery || []), ...results]
      }));
    } catch (err) {
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

  const handleSave = () => {
    const success = updateSettings(localSettings);
    if (success) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
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
              <label>Landing Page Background Image(s)</label>
              <input type="file" accept="image/*" multiple onChange={handleHeroImagesUpload} />
              {localSettings.heroImages && localSettings.heroImages.length > 0 && (
                <div className="logo-preview" style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {localSettings.heroImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                       <img src={img} alt={`Hero ${idx}`} style={{ maxHeight: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                       <button 
                         onClick={() => removeHeroImage(idx)}
                         style={{ position: 'absolute', top: 5, right: 5, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
                         title="Remove image"
                       >
                         &times;
                       </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Dashboard Background Image</label>
              <input type="file" accept="image/*" onChange={handleHeroBackgroundUpload} />
              {localSettings.heroBackground && (
                <div className="logo-preview">
                  <img src={localSettings.heroBackground} alt="Dashboard Background Preview" style={{ maxHeight: '150px', objectFit: 'cover', borderRadius: '8px', marginTop: '10px' }} />
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label>Featured Landing Page Gallery</label>
              <input type="file" accept="image/*" multiple onChange={handleFeaturedGalleryUpload} />
              <p className="help-text" style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>These images will be displayed in a dedicated gallery section on the landing page.</p>
              {localSettings.featuredGallery && localSettings.featuredGallery.length > 0 && (
                <div className="logo-preview" style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {localSettings.featuredGallery.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                       <img src={img} alt={`Featured ${idx}`} style={{ maxHeight: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                       <button 
                         onClick={() => removeFeaturedGalleryImage(idx)}
                         style={{ position: 'absolute', top: 5, right: 5, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
                         title="Remove image"
                       >
                         &times;
                       </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <label>System Font Size</label>
              <select
                name="fontSize"
                value={localSettings.fontSize || 'compact'}
                onChange={handleInputChange}
              >
                <option value="standard">Standard (100% / 16px)</option>
                <option value="medium">Medium (93.75% / 15px)</option>
                <option value="compact">Compact (87.5% / 14px)</option>
                <option value="extra-compact">Extra Compact (81.25% / 13px)</option>
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
