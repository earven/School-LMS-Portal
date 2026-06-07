import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import './EnrolmentSummaryWidget.css';

const EnrolmentSummaryWidget = () => {
  const [enrollees, setEnrollees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const colRef = collection(db, 'enrolment_students');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setEnrollees(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="enrolment-summary-widget loading">Loading Enrolment Data...</div>;
  }

  const total = enrollees.length;
  const males = enrollees.filter(e => e.gender === 'Male').length;
  const females = enrollees.filter(e => e.gender === 'Female').length;
  const returnees = enrollees.filter(e => e.isOldStudent).length;
  const fourPs = enrollees.filter(e => e.is4Ps).length;

  return (
    <div className="enrolment-summary-widget card">
      <div className="summary-header">
        <h3>Enrolment Overview</h3>
        <span className="summary-total">{total} Total Enrollees</span>
      </div>
      <div className="summary-stats-grid">
        <div className="summary-stat-box">
          <span className="stat-icon male-icon">👨</span>
          <div className="stat-info">
            <span className="stat-value">{males}</span>
            <span className="stat-label">Male</span>
          </div>
        </div>
        <div className="summary-stat-box">
          <span className="stat-icon female-icon">👩</span>
          <div className="stat-info">
            <span className="stat-value">{females}</span>
            <span className="stat-label">Female</span>
          </div>
        </div>
        <div className="summary-stat-box">
          <span className="stat-icon returnee-icon">🔄</span>
          <div className="stat-info">
            <span className="stat-value">{returnees}</span>
            <span className="stat-label">Returnees</span>
          </div>
        </div>
        <div className="summary-stat-box">
          <span className="stat-icon fourps-icon">🤝</span>
          <div className="stat-info">
            <span className="stat-value">{fourPs}</span>
            <span className="stat-label">4Ps Beneficiaries</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrolmentSummaryWidget;
