import React from 'react';

const SettingsAppearanceTab = ({
  localSettings,
  handleInputChange,
  colorPresets,
  setLocalSettings,
  isDraggingHero,
  setIsDraggingHero,
  handleHeroImagesDrop,
  handleHeroImagesUpload,
  removeHeroImage,
  isDraggingDashboard,
  setIsDraggingDashboard,
  handleHeroBackgroundDrop,
  handleHeroBackgroundUpload,
  removeHeroBackground,
  isDraggingGallery,
  setIsDraggingGallery,
  handleFeaturedGalleryDrop,
  handleFeaturedGalleryUpload,
  removeFeaturedGalleryImage,
  handleDragOver,
  handleDragLeave,
}) => {
  return (
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
                  {colorPresets.map((preset) => (
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
  );
};

export default SettingsAppearanceTab;
