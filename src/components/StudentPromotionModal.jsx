import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './StudentPromotionModal.css';

const StudentPromotionModal = ({ isOpen, onClose, onConfirm, selectedStudentsCount }) => {
  const [targetAcademicYear, setTargetAcademicYear] = useState('');
  const [targetGradeLevel, setTargetGradeLevel] = useState('Grade 8');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [availableSections, setAvailableSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Initialize with the next academic year based on current date or just a default
  useEffect(() => {
    if (isOpen) {
      const currentYear = new Date().getFullYear();
      setTargetAcademicYear(`${currentYear}-${currentYear + 1}`);
      setTargetGradeLevel('Grade 8');
      setTargetSectionId('');
      setAvailableSections([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (targetAcademicYear && targetGradeLevel) {
      const fetchSections = async () => {
        setLoadingSections(true);
        try {
          const q = query(
            collection(db, 'sections'), 
            where('academicYear', '==', targetAcademicYear),
            where('gradeLevel', '==', targetGradeLevel)
          );
          const snapshot = await getDocs(q);
          const sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAvailableSections(sectionsData);
        } catch (error) {
          console.error("Failed to fetch target sections:", error);
        } finally {
          setLoadingSections(false);
        }
      };
      fetchSections();
    }
  }, [targetAcademicYear, targetGradeLevel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!targetAcademicYear) {
      alert('Please enter a target academic year.');
      return;
    }
    onConfirm(targetAcademicYear, targetGradeLevel, targetSectionId);
  };

  return (
    <div className="promotion-modal-overlay">
      <div className="promotion-modal">
        <div className="promotion-modal-header">
          <h2>Batch Promote Learners</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="promotion-modal-body">
          <div className="promotion-alert info">
            <p>You are about to promote/migrate <strong>{selectedStudentsCount}</strong> selected learner(s).</p>
            <p className="promotion-subtext">This action will move their records to the target academic year and save their current grade and section in their history profile.</p>
          </div>

          <div className="form-group">
            <label>Target Academic Year (e.g. 2025-2026)</label>
            <select value={targetAcademicYear} onChange={e => setTargetAcademicYear(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => {
                const start = 2024 + i;
                const sy = `${start}-${start + 1}`;
                return <option key={sy} value={sy}>SY {sy}</option>;
              })}
            </select>
          </div>

          <div className="form-group">
            <label>Target Grade Level</label>
            <select value={targetGradeLevel} onChange={e => setTargetGradeLevel(e.target.value)}>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target Section (Optional)</label>
            <select 
              value={targetSectionId} 
              onChange={e => setTargetSectionId(e.target.value)}
              disabled={loadingSections}
            >
              <option value="">-- No Section Assigned Yet --</option>
              {availableSections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
            {loadingSections && <span className="loading-text">Loading sections...</span>}
          </div>
        </div>

        <div className="promotion-modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="confirm-btn" onClick={handleConfirm}>Confirm Promotion</button>
        </div>
      </div>
    </div>
  );
};

export default StudentPromotionModal;
