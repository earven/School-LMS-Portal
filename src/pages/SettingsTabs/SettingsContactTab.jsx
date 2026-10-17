import React from 'react';

const SettingsContactTab = ({
  localSettings,
  handleInputChange,
  errors = {},
}) => {
  return (
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
  );
};

export default SettingsContactTab;
