import React, { useState } from 'react';
import { buildFullName } from '../utils/personnelName';
import './StudentIdCardModal.css';

const CARDS_PER_SHEET = 8; // 2 columns x 4 rows per A4/Letter sheet
const ROWS_PER_SHEET = 4;

const StudentIdCardModal = ({ students = [], sections = [], settings = {}, onClose }) => {
  // 'duplex' (Mode B: Page 1 Fronts, Page 2 Mirrored Backs)
  // 'fold' (Side-by-side with fold line)
  // 'front-only' (All Fronts)
  // 'back-only' (All Mirrored Backs)
  const [printMode, setPrintMode] = useState('duplex');

  const schoolName = settings?.schoolName || 'School LMS Portal';
  const schoolId = settings?.schoolId || '123456';
  const division = settings?.division || 'Schools Division Office';
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolLogo = settings?.schoolLogo || '';

  const getSectionName = (sectionId) => {
    const sec = sections.find(s => s.id === sectionId);
    return sec ? sec.name : sectionId || 'Unassigned';
  };

  const getAdviserName = (sectionId) => {
    const sec = sections.find(s => s.id === sectionId);
    return sec ? (sec.adviserName || 'Class Adviser') : 'Class Adviser';
  };

  const handlePrint = () => {
    window.print();
  };

  // Split students into sheets of 8
  const sheets = [];
  for (let i = 0; i < students.length; i += CARDS_PER_SHEET) {
    sheets.push(students.slice(i, i + CARDS_PER_SHEET));
  }

  // Render a Single Front ID Card
  const renderFrontCard = (student, key) => {
    if (!student) {
      return <div key={key} className="id-card id-card-placeholder" aria-hidden="true" />;
    }

    const lrn = student.lrn || student.id || '000000000000';
    const fullName = buildFullName({
      lastName: student.lastName,
      firstName: student.firstName,
      middleName: student.middleName,
      nameExtension: student.extension
    });
    const sectionName = getSectionName(student.sectionId);
    const adviserName = getAdviserName(student.sectionId);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(lrn)}`;

    return (
      <div key={key || `front-${student.id}`} className="id-card id-card-front">
        <div className="id-header">
          <div className="id-header-logos">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" className="id-school-logo" />
            ) : (
              <div className="id-logo-placeholder">🏫</div>
            )}
            <div className="id-header-text">
              <div className="id-republic">Republic of the Philippines</div>
              <div className="id-deped">Department of Education</div>
              <div className="id-division">{division}</div>
              <div className="id-school-name">{schoolName}</div>
            </div>
          </div>
          <div className="id-school-meta">
            <span>School ID: {schoolId}</span>
            <span>SY: {academicYear}</span>
          </div>
        </div>

        <div className="id-front-body">
          <div className="id-photo-wrapper">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={fullName} className="id-student-photo" />
            ) : (
              <div className="id-photo-placeholder">
                <span className="id-avatar-icon">👤</span>
              </div>
            )}
          </div>

          <div className="id-student-info">
            <div className="id-student-name" title={fullName}>{fullName}</div>
            <div className="id-info-line">
              <span className="id-label">LRN:</span>
              <span className="id-value id-lrn-val">{lrn}</span>
            </div>
            <div className="id-info-line">
              <span className="id-label">GRADE & SEC:</span>
              <span className="id-value">{student.gradeLevel || 'Grade 7'} - {sectionName}</span>
            </div>
            <div className="id-info-line">
              <span className="id-label">ADVISER:</span>
              <span className="id-value">{adviserName}</span>
            </div>
          </div>

          <div className="id-qr-box">
            <img 
              src={qrUrl} 
              alt={`QR for ${lrn}`} 
              className="id-qr-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="id-barcode-text">SCAN FOR ATTENDANCE</div>
          </div>
        </div>

        <div className="id-footer-stripe">
          <span>STUDENT IDENTIFICATION CARD</span>
        </div>
      </div>
    );
  };

  // Render a Single Back ID Card
  const renderBackCard = (student, key) => {
    if (!student) {
      return <div key={key} className="id-card id-card-placeholder" aria-hidden="true" />;
    }

    return (
      <div key={key || `back-${student.id}`} className="id-card id-card-back">
        <div className="id-back-header">
          <span>EMERGENCY INFORMATION</span>
        </div>

        <div className="id-back-body">
          <div className="id-back-info-row">
            <strong>Parent / Guardian:</strong>
            <span>{student.guardianName || student.fatherName || student.motherMaidenName || 'Authorized Guardian'}</span>
          </div>
          <div className="id-back-info-row">
            <strong>Emergency Contact:</strong>
            <span>{student.contactNumber || student.phone || 'N/A'}</span>
          </div>
          <div className="id-back-info-row">
            <strong>Residential Address:</strong>
            <span className="id-address-text">{student.address || 'Address on file'}</span>
          </div>

          <div className="id-terms">
            <p>1. This card certifies that the bearer is a bonafide student of {schoolName}.</p>
            <p>2. In case of emergency or if found, please notify the school or contact number above.</p>
            <p>3. This card is non-transferable and must be worn within the campus premises.</p>
          </div>

          <div className="id-signatures">
            <div className="id-sig-col">
              <div className="id-sig-line"></div>
              <span>Learner's Signature</span>
            </div>
            <div className="id-sig-col">
              <div className="id-sig-line"></div>
              <span>School Principal</span>
            </div>
          </div>
        </div>

        <div className="id-back-footer">
          <span>PROPERTY OF {schoolName.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  // Render a Fold & Laminate Pair (Side-by-Side with Fold Line)
  const renderFoldPair = (student) => (
    <div key={`fold-pair-${student.id}`} className="id-fold-pair">
      <div className="id-fold-half">{renderFrontCard(student, `fold-front-${student.id}`)}</div>
      <div className="id-fold-crease" title="Fold here">
        <span className="id-fold-crease-icon">✂️ ⋯ ⋯</span>
      </div>
      <div className="id-fold-half">{renderBackCard(student, `fold-back-${student.id}`)}</div>
    </div>
  );

  return (
    <div className="id-card-modal-overlay" onClick={onClose}>
      <div className="id-card-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* HEADER CONTROLS (Screen Only) */}
        <div className="id-card-modal-header no-print">
          <div>
            <h2>Learner ID Badges ({students.length} {students.length === 1 ? 'Card' : 'Cards'})</h2>
            <p className="id-modal-subtitle">
              Official DepEd format with QR code scanner support for attendance.
            </p>
          </div>
          
          <div className="id-modal-header-actions">
            {/* PRINT MODE SELECTOR */}
            <div className="id-mode-selector" title="Choose printing layout">
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

            <button className="primary-btn btn-print-ids" onClick={handlePrint}>
              🖨️ Print ID Badges
            </button>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
          </div>
        </div>

        {/* INSTRUCTIONAL TIP (Screen Only) */}
        <div className="id-print-guidance-banner no-print">
          {printMode === 'duplex' && (
            <div className="guidance-content">
              <span className="guidance-icon">💡</span>
              <div>
                <strong>Mode B: Duplex Back-to-Back Printing</strong>
                <p>
                  Page 1 prints 8 Fronts $\rightarrow$ Page 2 prints 8 Backs with <strong>horizontally mirrored columns</strong>.
                  In your printer dialogue, enable <strong>"Two-Sided / Print on both sides"</strong> and choose <strong>"Flip on long edge"</strong> with Scale at <strong>100% (Actual size)</strong>.
                </p>
              </div>
            </div>
          )}

          {printMode === 'fold' && (
            <div className="guidance-content">
              <span className="guidance-icon">✂️</span>
              <div>
                <strong>Mode A: Fold & Laminate Printing (1-Sided Paper)</strong>
                <p>
                  Front and Back are printed side-by-side with a center fold line. Print on standard photo paper, cut around the outline, fold in half, and insert into an ID pouch.
                </p>
              </div>
            </div>
          )}

          {printMode === 'front-only' && (
            <div className="guidance-content">
              <span className="guidance-icon">📄</span>
              <div>
                <strong>Manual Feed Pass 1: Fronts Only</strong>
                <p>
                  Print all Front pages first. After printing, place the paper stack back into the tray and switch to <strong>"Backs Only"</strong> for the reverse pass.
                </p>
              </div>
            </div>
          )}

          {printMode === 'back-only' && (
            <div className="guidance-content">
              <span className="guidance-icon">📄</span>
              <div>
                <strong>Manual Feed Pass 2: Backs Only (Mirrored)</strong>
                <p>
                  Back cards are column-mirrored so each reverse side lines up with the student's front side on the reinserted paper stack.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PRINT CONTAINER */}
        <div className="id-cards-print-container">
          {students.length === 0 ? (
            <div className="id-empty-state no-print">
              <p>No learners selected to generate ID cards.</p>
            </div>
          ) : (
            <>
              {/* DUPLEX MODE (MODE B): Interleaved Front & Mirrored Back Sheets */}
              {printMode === 'duplex' && (
                sheets.map((sheetStudents, sheetIndex) => (
                  <React.Fragment key={`duplex-sheet-${sheetIndex}`}>
                    {/* SHEET FRONT PAGE (8 CARDS: 2 COLS X 4 ROWS) */}
                    <div className="id-sheet-page-wrapper">
                      <div className="id-sheet-header-label no-print">
                        📄 Sheet {sheetIndex + 1} — Front Page (Learners {sheetIndex * CARDS_PER_SHEET + 1}–{Math.min((sheetIndex + 1) * CARDS_PER_SHEET, students.length)})
                      </div>
                      <div className="id-print-page id-duplex-front-page">
                        {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                          const studentLeft = sheetStudents[rowIndex * 2];
                          const studentRight = sheetStudents[rowIndex * 2 + 1];
                          return (
                            <React.Fragment key={`front-row-${sheetIndex}-${rowIndex}`}>
                              {renderFrontCard(studentLeft, `f-left-${sheetIndex}-${rowIndex}`)}
                              {renderFrontCard(studentRight, `f-right-${sheetIndex}-${rowIndex}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* SHEET BACK PAGE (8 CARDS: COLUMNS MIRRORED FOR HORIZONTAL FLIP) */}
                    <div className="id-sheet-page-wrapper">
                      <div className="id-sheet-header-label no-print">
                        🔄 Sheet {sheetIndex + 1} — Reverse Back Page (Mirrored for Long-Edge Duplex Flip)
                      </div>
                      <div className="id-print-page id-duplex-back-page">
                        {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                          const studentLeftOnFront = sheetStudents[rowIndex * 2];
                          const studentRightOnFront = sheetStudents[rowIndex * 2 + 1];
                          // MIRRORED: Left on Front goes to Right on Back; Right on Front goes to Left on Back!
                          return (
                            <React.Fragment key={`back-row-${sheetIndex}-${rowIndex}`}>
                              {renderBackCard(studentRightOnFront, `b-left-${sheetIndex}-${rowIndex}`)}
                              {renderBackCard(studentLeftOnFront, `b-right-${sheetIndex}-${rowIndex}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                ))
              )}

              {/* FOLD & LAMINATE MODE (MODE A): Side-by-side with fold guide */}
              {printMode === 'fold' && (
                <div className="id-fold-grid">
                  {students.map((student) => renderFoldPair(student))}
                </div>
              )}

              {/* FRONTS ONLY MODE: Standard Front Sheets */}
              {printMode === 'front-only' && (
                sheets.map((sheetStudents, sheetIndex) => (
                  <div key={`front-sheet-${sheetIndex}`} className="id-sheet-page-wrapper">
                    <div className="id-sheet-header-label no-print">
                      📄 Sheet {sheetIndex + 1} — Front Page (Learners {sheetIndex * CARDS_PER_SHEET + 1}–{Math.min((sheetIndex + 1) * CARDS_PER_SHEET, students.length)})
                    </div>
                    <div className="id-print-page id-duplex-front-page">
                      {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                        const studentLeft = sheetStudents[rowIndex * 2];
                        const studentRight = sheetStudents[rowIndex * 2 + 1];
                        return (
                          <React.Fragment key={`front-only-row-${sheetIndex}-${rowIndex}`}>
                            {renderFrontCard(studentLeft, `fo-left-${sheetIndex}-${rowIndex}`)}
                            {renderFrontCard(studentRight, `fo-right-${sheetIndex}-${rowIndex}`)}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* BACKS ONLY MODE: Mirrored Back Sheets for Tray Reload */}
              {printMode === 'back-only' && (
                sheets.map((sheetStudents, sheetIndex) => (
                  <div key={`back-sheet-${sheetIndex}`} className="id-sheet-page-wrapper">
                    <div className="id-sheet-header-label no-print">
                      🔄 Sheet {sheetIndex + 1} — Back Page (Mirrored for Reinserted Tray Stack)
                    </div>
                    <div className="id-print-page id-duplex-back-page">
                      {Array.from({ length: ROWS_PER_SHEET }).map((_, rowIndex) => {
                        const studentLeftOnFront = sheetStudents[rowIndex * 2];
                        const studentRightOnFront = sheetStudents[rowIndex * 2 + 1];
                        return (
                          <React.Fragment key={`back-only-row-${sheetIndex}-${rowIndex}`}>
                            {renderBackCard(studentRightOnFront, `bo-left-${sheetIndex}-${rowIndex}`)}
                            {renderBackCard(studentLeftOnFront, `bo-right-${sheetIndex}-${rowIndex}`)}
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

export default StudentIdCardModal;
