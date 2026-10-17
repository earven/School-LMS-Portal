import React, { useState, useEffect } from 'react';

const HomeVisitationModal = ({
  isOpen,
  onClose,
  alert,
  activeSection,
  settings,
  user
}) => {
  const [homeVisitDate, setHomeVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [homeVisitReason, setHomeVisitReason] = useState('');
  const [homeVisitActionTaken, setHomeVisitActionTaken] = useState('');

  useEffect(() => {
    if (alert) {
      setHomeVisitDate(new Date().toISOString().split('T')[0]);
      setHomeVisitReason(`Frequent absences flagged (${alert.reason}): Total of ${alert.totalAbsences} day(s) absent with ${alert.maxConsecutive} consecutive absence(s).`);
      setHomeVisitActionTaken('Conducted home visitation to consult parent/guardian regarding attendance issues and established an attendance commitment agreement.');
    }
  }, [alert]);

  if (!isOpen || !alert) return null;

  const student = alert.student;

  const handlePrint = () => {
    document.body.classList.add('printing-home-visit');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-home-visit'), 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content home-visit-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ background: '#1e293b', color: 'white', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.15rem' }}>DepEd Home Visitation Form</h2>
          </div>
          <button type="button" className="close-btn" style={{ color: 'white' }} onClick={onClose}>&times;</button>
        </div>
        
        <div className="home-visit-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Review learner information and customize details before printing.
            </span>
            <button 
              type="button"
              className="primary-btn" 
              style={{ background: '#2563eb', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              onClick={handlePrint}
            >
              🖨️ Print Visitation Form
            </button>
          </div>

          <div className="home-visit-form-paper" id="home-visit-printable">
            <div className="home-visit-header">
              <p className="republic">Republic of the Philippines</p>
              <h3>Department of Education</h3>
              <p>{settings?.region || 'Region'} &bull; {settings?.division || 'Division'}</p>
              <p style={{ fontWeight: 600, color: '#0f172a' }}>{settings?.schoolName || 'School Name'} (ID: {settings?.schoolId || 'N/A'})</p>
              <h2 className="home-visit-title">HOME VISITATION FORM</h2>
            </div>

            <div className="home-visit-grid">
              <div className="home-visit-field">
                <label>Learner's Name</label>
                <div className="field-val">{student.lastName}, {student.firstName} {student.middleName || ''}</div>
              </div>
              <div className="home-visit-field">
                <label>LRN</label>
                <div className="field-val">{student.lrn || student.id || 'N/A'}</div>
              </div>
              <div className="home-visit-field">
                <label>Grade Level & Section</label>
                <div className="field-val">{activeSection?.gradeLevel} - {activeSection?.name}</div>
              </div>
              <div className="home-visit-field">
                <label>Class Adviser</label>
                <div className="field-val">{user?.firstName || ''} {user?.lastName || ''}</div>
              </div>
              <div className="home-visit-field">
                <label>Parent / Guardian</label>
                <div className="field-val">{student.guardianName || student.parentName || 'Parent / Guardian'}</div>
              </div>
              <div className="home-visit-field">
                <label>Contact / Address</label>
                <div className="field-val">{student.contactNumber || student.address || 'On File'}</div>
              </div>
            </div>

            <div className="home-visit-section">
              <label>Date of Visitation</label>
              <input 
                type="date" 
                value={homeVisitDate} 
                onChange={e => setHomeVisitDate(e.target.value)} 
                style={{ width: '180px' }}
              />
            </div>

            <div className="home-visit-section">
              <label>Reason / Purpose for Home Visit</label>
              <textarea 
                rows={2}
                value={homeVisitReason} 
                onChange={e => setHomeVisitReason(e.target.value)} 
              />
            </div>

            <div className="home-visit-section">
              <label>Findings, Agreements & Action Taken</label>
              <textarea 
                rows={3} 
                value={homeVisitActionTaken} 
                onChange={e => setHomeVisitActionTaken(e.target.value)} 
              />
            </div>

            <div className="home-visit-signatures">
              <div className="home-visit-sig-col">
                <div className="home-visit-sig-line">Parent / Guardian Signature over Printed Name</div>
                <div className="home-visit-sig-role">Parent / Legal Guardian</div>
              </div>
              <div className="home-visit-sig-col">
                <div className="home-visit-sig-line">{user?.firstName || ''} {user?.lastName || ''}</div>
                <div className="home-visit-sig-role">Class Adviser / Visiting Teacher</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
          <button 
            type="button"
            className="primary-btn" 
            onClick={handlePrint}
          >
            🖨️ Print Form
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeVisitationModal;
