import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { computeQuickCountMatrix } from '../utils/beefGenerator';
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

  const stats = useMemo(() => {
    return computeQuickCountMatrix(enrollees);
  }, [enrollees]);

  if (loading) {
    return <div className="enrolment-analytics-card loading">Loading Enrolment Analytics...</div>;
  }

  const malePercent = stats.grandTotal > 0 ? Math.round((stats.totalMale / stats.grandTotal) * 100) : 0;
  const femalePercent = stats.grandTotal > 0 ? Math.round((stats.totalFemale / stats.grandTotal) * 100) : 0;

  return (
    <div className="enrolment-analytics-card card">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h3>General Enrolment Analytics & Intake Progress</h3>
          <p className="analytics-subtitle">Real-time overview of incoming learners and document compliance</p>
        </div>
        <div className="analytics-total-badge">
          <span className="total-num">{stats.grandTotal}</span>
          <span className="total-lbl">Total Enrolled</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="analytics-stats-grid">
        {/* Gender Disaggregation Bar Card */}
        <div className="stat-card gender-card">
          <div className="stat-card-header">
            <span className="stat-title">Sex Disaggregation</span>
            <span className="stat-count-label">👨 {stats.totalMale} / 👩 {stats.totalFemale}</span>
          </div>
          <div className="gender-ratio-bar">
            <div className="bar-male" style={{ width: `${malePercent}%` }}>
              {malePercent > 15 && <span>{malePercent}% M</span>}
            </div>
            <div className="bar-female" style={{ width: `${femalePercent}%` }}>
              {femalePercent > 15 && <span>{femalePercent}% F</span>}
            </div>
          </div>
        </div>

        {/* Document Compliance Progress */}
        <div className="stat-card compliance-card">
          <div className="stat-card-header">
            <span className="stat-title">Requirement Compliance</span>
            <span className="stat-count-label">{stats.totalCompleteDocs} / {stats.grandTotal} Completed</span>
          </div>
          <div className="compliance-progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${stats.complianceRate}%`,
                backgroundColor: stats.complianceRate > 75 ? '#10b981' : (stats.complianceRate > 40 ? '#f59e0b' : '#ef4444')
              }}
            >
              <span>{stats.complianceRate}%</span>
            </div>
          </div>
        </div>

        {/* Key Inflow Tags */}
        <div className="stat-card special-tags-card">
          <div className="stat-card-header">
            <span className="stat-title">Demographic Highlights</span>
          </div>
          <div className="tags-flex">
            <span className="analytics-tag tag-4ps">🤝 4Ps: <strong>{stats.total4Ps}</strong></span>
            <span className="analytics-tag tag-transferee">🚚 Transferees: <strong>{stats.totalTransferees}</strong></span>
            <span className="analytics-tag tag-returnee">🔄 Balik-Aral: <strong>{stats.totalReturnees}</strong></span>
          </div>
        </div>
      </div>

      {/* Grade Level Intake Matrix Cards */}
      <div className="grade-breakdown-section">
        <span className="breakdown-title">Intake by Grade Level:</span>
        <div className="grade-pill-grid">
          {stats.rows.map((row) => (
            <div key={row.grade} className="grade-stat-pill">
              <span className="grade-name">{row.grade}</span>
              <span className="grade-val">{row.total}</span>
              <small className="grade-sub">{row.male}M / {row.female}F</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnrolmentSummaryWidget;
