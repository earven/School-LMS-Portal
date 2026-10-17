import React, { useState } from 'react';
import { buildFullName } from '../utils/personnelName';
import './FacultyIdCardModal.css';

const CARDS_PER_SHEET = 8;
const ROWS_PER_SHEET = 4;

const FacultyIdCardModal = ({ personnelList = [], settings = {}, onClose }) => {
  const [printMode, setPrintMode] = useState('duplex');

  const schoolName = settings?.schoolName || 'School LMS Portal';
  const schoolId = settings?.schoolId || '123456';
  const division = settings?.division || 'Schools Division Office';
  const schoolLogo = settings?.schoolLogo || '';

  const handlePrint = () => {
    window.print();
  };

  // Split personnel into sheets of 8
  const sheets = [];
  for (let i = 0; i < personnelList.length; i += CARDS_PER_SHEET) {
    sheets.push(personnelList.slice(i, i + CARDS_PER_SHEET));
  }

  const renderFrontCard = (person, key) => {
    if (!person) {
      return <div key={key} className="faculty-card faculty-card-placeholder" aria-hidden="true" />;
    }

    const empNo = person.employeeNumber || person.id || '0000000';
    const fullName = buildFullName({
      lastName: person.lastName,
      firstName: person.firstName,
      middleName: person.middleName,
      nameExtension: person.nameExtension
    });
    const position = person.position || 'Teacher I';
    const email = person.email || 'N/A';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(empNo)}`;

    return (
      <div key={key || `faculty-front-${person.id}`} className="faculty-card faculty-card-front">
        <div className="faculty-id-header">
          <div className="faculty-id-logos">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" className="faculty-logo" />
            ) : (
              <div className="faculty-logo-placeholder">🏫</div>
            )}
            <div className="faculty-header-text">
              <div className="faculty-republic">Republic of the Philippines</div>
              <div className="faculty-deped">Department of Education</div>
              <div className="faculty-division">{division}</div>
              <div className="faculty-school">{schoolName}</div>
            </div>
          </div>
          <div className="faculty-id-submeta">
            <span>School ID: {schoolId}</span>
            <span>FACULTY & STAFF</span>
          </div>
        </div>

        <div className="faculty-front-body">
          <div className="faculty-photo-wrapper">
            {person.photoUrl ? (
              <img src={person.photoUrl} alt={fullName} className="faculty-photo" />
            ) : (
              <div className="faculty-photo-placeholder">
                <span className="faculty-avatar-icon">👨‍🏫</span>
              </div>
            )}
          </div>

          <div className="faculty-info">
            <div className="faculty-name" title={fullName}>{fullName}</div>
            <div className="faculty-position-tag">{position}</div>
            <div className="faculty-meta-row">
              <span className="meta-label">EMP NO:</span>
              <span className="meta-val meta-emp">{empNo}</span>
            </div>
            <div className="faculty-meta-row">
              <span className="meta-label">EMAIL:</span>
              <span className="meta-val meta-email">{email}</span>
            </div>
          </div>

          <div className="faculty-qr-wrapper">
            <img 
              src={qrUrl} 
              alt={`QR for ${empNo}`} 
              className="faculty-qr-img" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="faculty-qr-caption">DTR ATTENDANCE</div>
          </div>
        </div>

        <div className="faculty-footer-bar">
          <span>OFFICIAL PERSONNEL IDENTIFICATION</span>
        </div>
      </div>
    );
  };

  const renderBackCard = (person, key) => {
    if (!person) {
      return <div key={key} className="faculty-card faculty-card-placeholder" aria-hidden="true" />;
    }

    const phone = person.contactNumber || person.phone || person.customFields?.contactNumber || 'N/A';
    const address = person.address || person.customFields?.address || 'Residential address on file';

    return (
      <div key={key || `faculty-back-${person.id}`} className="faculty-card faculty-card-back">
        <div className="faculty-back-header">
          <span>FACULTY & PERSONNEL INFORMATION</span>
        </div>

        <div className="faculty-back-body">
          <div className="faculty-back-row">
            <strong>Contact Number:</strong>
            <span>{phone}</span>
          </div>
          <div className="faculty-back-row">
            <strong>Residential Address:</strong>
            <span className="faculty-address-text">{address}</span>
          </div>
          <div className="faculty-back-row">
            <strong>Plantilla Item No:</strong>
            <span>{person.plantillaItemNo || 'N/A'}</span>
          </div>

          <div className="faculty-terms">
            <p>1. This card certifies that the bearer is a bonafide personnel of {schoolName}.</p>
            <p>2. In case of emergency or loss, please return to the School Administration Office.</p>
          </div>

          <div className="faculty-signatures">
            <div className="faculty-sig-block">
              <div className="faculty-sig-line"></div>
              <span>Employee Signature</span>
            </div>
            <div className="faculty-sig-block">
              <div className="faculty-sig-line"></div>
              <span>School Principal</span>
            </div>
          </div>
        </div>

        <div className="faculty-back-footer">
          <span>PROPERTY OF {schoolName.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  const renderFoldPair = (person) => (
    <div key={`faculty-fold-${person.id}`} className="faculty-fold-pair">
      <div className="faculty-fold-half">{renderFrontCard(person, `ff-front-${person.id}`)}</div>
      <div className="faculty-fold-crease">
        <span>✂️ ⋯ ⋯</span>
      </div>
      <div className="faculty-fold-half">{renderBackCard(person, `ff-back-${person.id}`)}</div>
    </div>
  );

  return (
    <div className="faculty-id-modal-overlay" onClick={onClose}>
      <div className="faculty-id-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* HEADER CONTROLS */}
        <div className="faculty-id-modal-header no-print">
          <div>
            <h2>Faculty & Staff ID Badges ({personnelList.length} {personnelList.length === 1 ? 'Card' : 'Cards'})</h2>
            <p className="id-modal-subtitle">Official DepEd School Personnel identification format with attendance QR code.</p>
          </div>
          
          <div className="faculty-id-modal-actions">
            <div className="id-mode-selector">
              <button 
                type="button"
                className={`btn-mode-toggle ${printMode === 'duplex' ? 'active' : ''}`}
                onClick={() => setPrintMode('duplex')}
              >
                🗂️ Duplex (Back-to-Back)
              </button>
              <button 
                type="button"
                className={`btn-mode-toggle ${printMode === 'fold' ? 'active' : ''}`}
                onClick={() => setPrintMode('fold')}
              >
                ✂️ Fold & Laminate
              </button>
              <button 
                type="button"
                className={`btn-mode-toggle ${printMode === 'front-only' ? 'active' : ''}`}
                onClick={() => setPrintMode('front-only')}
              >
                📄 Fronts Only
              </button>
              <button 
                type="button"
                className={`btn-mode-toggle ${printMode === 'back-only' ? 'active' : ''}`}
                onClick={() => setPrintMode('back-only')}
              >
                📄 Backs Only
              </button>
            </div>

            <button className="primary-btn btn-print-faculty-ids" onClick={handlePrint}>
              🖨️ Print Faculty Badges
            </button>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
          </div>
        </div>

        {/* GUIDANCE BANNER */}
        <div className="id-print-guidance-banner no-print">
          {printMode === 'duplex' && (
            <div className="guidance-content">
              <span className="guidance-icon">💡</span>
              <div>
                <strong>Mode B: Duplex Back-to-Back Printing</strong>
                <p>
                  Page 1 prints 8 Fronts $\rightarrow$ Page 2 prints 8 Backs with <strong>horizontally mirrored columns</strong>.
                  Enable <strong>"Print on both sides"</strong> and choose <strong>"Flip on long edge"</strong> with Scale at <strong>100% (Actual size)</strong>.
                </p>
              </div>
            </div>
          )}
          {printMode === 'fold' && (
            <div className="guidance-content">
              <span className="guidance-icon">✂️</span>
              <div>
                <strong>Mode A: Fold & Laminate (1-Sided Paper)</strong>
                <p>Front and Back are printed side-by-side with a center fold line.</p>
              </div>
            </div>
          )}
          {printMode === 'front-only' && (
            <div className="guidance-content">
              <span className="guidance-icon">📄</span>
              <div><strong>Pass 1: Fronts Only</strong> — After printing, re-feed the sheet stack into your tray and switch to "Backs Only".</div>
            </div>
          )}
          {printMode === 'back-only' && (
            <div className="guidance-content">
              <span className="guidance-icon">📄</span>
              <div><strong>Pass 2: Backs Only (Mirrored)</strong> — Reverse sides match up with the front sides of reinserted sheets.</div>
            </div>
          )}
        </div>

        {/* CONTAINER */}
        <div className="faculty-id-print-container">
          {personnelList.length === 0 ? (
            <div className="id-empty-state no-print">
              <p>No faculty or staff selected to generate ID cards.</p>
            </div>
          ) : (
            <>
              {printMode === 'duplex' && (
                sheets.map((sheetPersonnel, sheetIndex) => (
                  <React.Fragment key={`faculty-duplex-sheet-${sheetIndex}`}>
                    <div className="faculty-sheet-page-wrapper">
                      <div className="faculty-sheet-header-label no-print">
                        📄 Sheet {sheetIndex + 1} — Front Page (Personnel {sheetIndex * CARDS_PER_SHEET + 1}–{Math.min((sheetIndex + 1) * CARDS_PER_SHEET, personnelList.length)})
                      </div>
                      <div className="faculty-print-page">
                        {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                          const personLeft = sheetPersonnel[rowIndex * 2];
                          const personRight = sheetPersonnel[rowIndex * 2 + 1];
                          return (
                            <React.Fragment key={`fac-f-row-${sheetIndex}-${rowIndex}`}>
                              {renderFrontCard(personLeft, `ff-left-${sheetIndex}-${rowIndex}`)}
                              {renderFrontCard(personRight, `ff-right-${sheetIndex}-${rowIndex}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    <div className="faculty-sheet-page-wrapper">
                      <div className="faculty-sheet-header-label no-print">
                        🔄 Sheet {sheetIndex + 1} — Reverse Back Page (Mirrored for Long-Edge Duplex Flip)
                      </div>
                      <div className="faculty-print-page">
                        {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                          const personLeftOnFront = sheetPersonnel[rowIndex * 2];
                          const personRightOnFront = sheetPersonnel[rowIndex * 2 + 1];
                          return (
                            <React.Fragment key={`fac-b-row-${sheetIndex}-${rowIndex}`}>
                              {renderBackCard(personRightOnFront, `fb-left-${sheetIndex}-${rowIndex}`)}
                              {renderBackCard(personLeftOnFront, `fb-right-${sheetIndex}-${rowIndex}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                ))
              )}

              {printMode === 'fold' && (
                <div className="faculty-fold-grid">
                  {personnelList.map((person) => renderFoldPair(person))}
                </div>
              )}

              {printMode === 'front-only' && (
                sheets.map((sheetPersonnel, sheetIndex) => (
                  <div key={`fac-fo-sheet-${sheetIndex}`} className="faculty-sheet-page-wrapper">
                    <div className="faculty-sheet-header-label no-print">
                      📄 Sheet {sheetIndex + 1} — Front Page
                    </div>
                    <div className="faculty-print-page">
                      {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                        const personLeft = sheetPersonnel[rowIndex * 2];
                        const personRight = sheetPersonnel[rowIndex * 2 + 1];
                        return (
                          <React.Fragment key={`fac-fo-row-${sheetIndex}-${rowIndex}`}>
                            {renderFrontCard(personLeft, `ffo-left-${sheetIndex}-${rowIndex}`)}
                            {renderFrontCard(personRight, `ffo-right-${sheetIndex}-${rowIndex}`)}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {printMode === 'back-only' && (
                sheets.map((sheetPersonnel, sheetIndex) => (
                  <div key={`fac-bo-sheet-${sheetIndex}`} className="faculty-sheet-page-wrapper">
                    <div className="faculty-sheet-header-label no-print">
                      🔄 Sheet {sheetIndex + 1} — Back Page (Mirrored)
                    </div>
                    <div className="faculty-print-page">
                      {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                        const personLeftOnFront = sheetPersonnel[rowIndex * 2];
                        const personRightOnFront = sheetPersonnel[rowIndex * 2 + 1];
                        return (
                          <React.Fragment key={`fac-bo-row-${sheetIndex}-${rowIndex}`}>
                            {renderBackCard(personRightOnFront, `fbo-left-${sheetIndex}-${rowIndex}`)}
                            {renderBackCard(personLeftOnFront, `fbo-right-${sheetIndex}-${rowIndex}`)}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyIdCardModal;
