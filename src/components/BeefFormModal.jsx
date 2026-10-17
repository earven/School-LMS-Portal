import React from 'react';
import { buildFullName } from '../utils/personnelName';
import './BeefFormModal.css';

const BeefFormModal = ({ student, settings = {}, onClose }) => {
  if (!student) return null;

  const schoolName = settings?.schoolName || 'School LMS Portal';
  const schoolId = settings?.schoolId || '123456';
  const division = settings?.division || 'Schools Division Office';
  const region = settings?.region || 'Region';
  const academicYear = settings?.academicYear || '2025-2026';

  const fullName = buildFullName({
    lastName: student.lastName,
    firstName: student.firstName,
    middleName: student.middleName,
    nameExtension: student.extName || student.extension
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="beef-modal-overlay" onClick={onClose}>
      <div className="beef-modal-content" onClick={e => e.stopPropagation()}>
        <div className="beef-modal-header no-print">
          <div>
            <h2>DepEd Basic Education Enrolment Form (BEEF)</h2>
            <p className="beef-subtitle">Official enrolment application sheet for <strong>{fullName}</strong></p>
          </div>
          <div className="beef-header-actions">
            <button className="primary-btn btn-print-beef" onClick={handlePrint}>
              🖨️ Print BEEF Form
            </button>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="beef-form-print-area">
          <div className="beef-sheet">
            {/* Header */}
            <div className="beef-deped-header">
              <div className="deped-logo-col">
                <span className="logo-placeholder">🏫</span>
              </div>
              <div className="deped-text-col">
                <div className="republic-text">Republic of the Philippines • Department of Education</div>
                <div className="beef-main-title">BASIC EDUCATION ENROLMENT FORM (BEEF)</div>
                <div className="beef-subtext">School Year {academicYear}</div>
              </div>
              <div className="deped-logo-col">
                <span className="logo-placeholder">🇵🇭</span>
              </div>
            </div>

            {/* School Info Box */}
            <div className="beef-meta-box">
              <div><strong>School ID:</strong> {schoolId}</div>
              <div><strong>Region:</strong> {region}</div>
              <div><strong>Division:</strong> {division}</div>
              <div style={{ gridColumn: 'span 2' }}><strong>School Name:</strong> {schoolName}</div>
              <div><strong>Grade Level Enrolled:</strong> {student.gradeLevel || 'Grade 7'}</div>
            </div>

            {/* Section A: Learner Demographic Information */}
            <div className="beef-section-title">A. LEARNER DEMOGRAPHIC INFORMATION</div>
            
            <div className="beef-grid-row">
              <div className="beef-field span-2">
                <span className="field-label">12-Digit Learner Reference Number (LRN):</span>
                <span className="field-val field-lrn">{student.lrn || student.id || 'Not Assigned / Balik-Aral'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">PSA Birth Certificate No.:</span>
                <span className="field-val">{student.psaBirthCertNo || 'N/A'}</span>
              </div>
            </div>

            <div className="beef-grid-row">
              <div className="beef-field span-3">
                <span className="field-label">Learner's Full Name (Last, First, Middle, Extension):</span>
                <span className="field-val field-name-val">{fullName}</span>
              </div>
            </div>

            <div className="beef-grid-row">
              <div className="beef-field">
                <span className="field-label">Sex:</span>
                <span className="field-val">{student.gender || 'Male'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Birth Date:</span>
                <span className="field-val">{student.birthdate || 'Not Provided'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Mother Tongue:</span>
                <span className="field-val">{student.motherTongue || 'Filipino'}</span>
              </div>
            </div>

            <div className="beef-grid-row">
              <div className="beef-field">
                <span className="field-label">IP (Ethnic Community):</span>
                <span className="field-val">{student.ipEthnicGroup || 'N/A'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Religion:</span>
                <span className="field-val">{student.religion || 'Christianity'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">4Ps CCT Beneficiary:</span>
                <span className="field-val">{student.is4Ps ? 'Yes (4Ps Recipient)' : 'No'}</span>
              </div>
            </div>

            <div className="beef-grid-row">
              <div className="beef-field span-3">
                <span className="field-label">Complete Residential Address:</span>
                <span className="field-val">{student.address || 'Address on file'}</span>
              </div>
            </div>

            {/* Section B: Academic Details & History */}
            <div className="beef-section-title">B. ENROLLMENT & SCHOOL HISTORY DETAILS</div>

            <div className="beef-grid-row">
              <div className="beef-field">
                <span className="field-label">Learner Classification:</span>
                <span className="field-val">{student.learnerType || (student.isOldStudent ? 'Continuing / Old Student' : 'New Entrant / Transferee')}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Preferred Learning Modality:</span>
                <span className="field-val">{student.preferredModality || 'Face-to-Face'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Special Needs / SPED:</span>
                <span className="field-val">{student.specialNeeds || 'None'}</span>
              </div>
            </div>

            {student.gradeLevel && (student.gradeLevel.includes('11') || student.gradeLevel.includes('12')) && (
              <div className="beef-grid-row">
                <div className="beef-field span-3">
                  <span className="field-label">SHS Track & Strand:</span>
                  <span className="field-val field-track-val">{student.trackStrand || 'Academic Track - STEM / ABM / HUMSS / GAS'}</span>
                </div>
              </div>
            )}

            <div className="beef-grid-row">
              <div className="beef-field span-2">
                <span className="field-label">Previous School Attended:</span>
                <span className="field-val">{student.prevSchool || 'N/A (Same School)'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">General Average:</span>
                <span className="field-val">{student.genAverage ? `${student.genAverage}%` : 'N/A'}</span>
              </div>
            </div>

            {/* Section C: Parent & Guardian Contacts */}
            <div className="beef-section-title">C. PARENT / GUARDIAN CONTACT INFORMATION</div>

            <div className="beef-grid-row">
              <div className="beef-field">
                <span className="field-label">Father's Name:</span>
                <span className="field-val">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Mother's Maiden Name:</span>
                <span className="field-val">{student.motherMaidenName || 'N/A'}</span>
              </div>
              <div className="beef-field">
                <span className="field-label">Emergency Contact Number:</span>
                <span className="field-val">{student.contactNumber || student.phone || 'N/A'}</span>
              </div>
            </div>

            {/* Section D: Document Checklist */}
            <div className="beef-section-title">D. ENROLMENT REQUIREMENTS CHECKLIST</div>

            <div className="beef-check-grid">
              <div className="check-item">
                <span className="box-check">{student.birthCert ? '☑' : '☐'}</span>
                <span>PSA Birth Certificate</span>
              </div>
              <div className="check-item">
                <span className="box-check">{student.form9 ? '☑' : '☐'}</span>
                <span>SF9 / Form 138 (Report Card)</span>
              </div>
              <div className="check-item">
                <span className="box-check">{student.goodMoral ? '☑' : '☐'}</span>
                <span>Good Moral Certificate</span>
              </div>
              <div className="check-item">
                <span className="box-check">{student.photos ? '☑' : '☐'}</span>
                <span>2x2 ID Photos</span>
              </div>
              <div className="check-item">
                <span className="box-check">{student.is4Ps ? '☑' : '☐'}</span>
                <span>4Ps Household Card Copy</span>
              </div>
            </div>

            {/* Certification & Signatures */}
            <div className="beef-cert-text">
              I hereby certify that the above information given is true and correct to the best of my knowledge and I allow the Department of Education to use my child's details for educational and registration purposes pursuant to the Data Privacy Act of 2012.
            </div>

            <div className="beef-signatures-row">
              <div className="sig-block-beef">
                <div className="sig-underline"></div>
                <span>Signature Over Printed Name of Parent / Guardian</span>
                <small>Date: ________________________</small>
              </div>

              <div className="sig-block-beef">
                <div className="sig-underline"></div>
                <span>Enrolment Verifier / Class Adviser</span>
                <small>Application Status: <strong>{student.status || 'Verified & Approved'}</strong></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeefFormModal;
