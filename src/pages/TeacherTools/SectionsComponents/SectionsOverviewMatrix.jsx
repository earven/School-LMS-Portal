import React from 'react';
import { useNavigate } from 'react-router-dom';
import TableSkeleton from '../../../components/TableSkeleton';
import EmptyState from '../../../components/EmptyState';

const SectionsOverviewMatrix = ({
  sections = [],
  students = [],
  loading = false,
  onInspectSection
}) => {
  const navigate = useNavigate();
  const activeSections = sections.filter(s => (s.status || 'active') === 'active');
  const enrolledStudents = students.filter(st => st.sectionId);
  const totalEnrolled = enrolledStudents.length;
  const totalSectionsCount = activeSections.length;
  const avgClassSize = totalSectionsCount > 0 ? Math.round(totalEnrolled / totalSectionsCount) : 0;
  const assignedAdvisersCount = sections.filter(s => s.adviserId || s.adviserName).length;

  const sortedSections = [...activeSections].sort((a, b) => {
    const numA = parseInt((a.gradeLevel || '').replace(/\D/g, ''), 10) || 99;
    const numB = parseInt((b.gradeLevel || '').replace(/\D/g, ''), 10) || 99;
    if (numA !== numB) return numA - numB;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="overview-layout">
      <div className="section-utilization-card card">
        <div className="utilization-card-header">
          <div>
            <h3>🏢 School-wide Section Directory & Room Allocation</h3>
            <p className="utilization-subtitle">Class sizes, room assignments, class advisers, and gender distribution across all sections.</p>
          </div>
          <div className="utilization-kpis">
            <div className="util-kpi-pill">
              <span className="kpi-num">{totalSectionsCount}</span>
              <span className="kpi-label">Active Sections</span>
            </div>
            <div className="util-kpi-pill kpi-highlight">
              <span className="kpi-num">{totalEnrolled}</span>
              <span className="kpi-label">Total Enrolled</span>
            </div>
            <div className="util-kpi-pill">
              <span className="kpi-num">{avgClassSize}</span>
              <span className="kpi-label">Avg Class Size</span>
            </div>
            <div className="util-kpi-pill kpi-vacancy">
              <span className="kpi-num">{assignedAdvisersCount} / {totalSectionsCount}</span>
              <span className="kpi-label">Advisers Assigned</span>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="utilization-table-wrapper">
          <table className="utilization-table">
            <thead>
              <tr>
                <th>Grade Level</th>
                <th>Section Name</th>
                <th>Class Adviser</th>
                <th>Room / Building</th>
                <th>Track / Strand</th>
                <th>Enrolled Class Size</th>
                <th>Gender Balance</th>
                <th>Action</th>
              </tr>
            </thead>
        {loading ? (
          <TableSkeleton rows={6} columns={8} />
        ) : (
          <tbody>
            {sortedSections.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state-table-cell">
                  <EmptyState
                    icon="🏫"
                    title="No Active Sections"
                    description="No classroom sections have been created or activated for this school year yet."
                    compact
                  />
                </td>
              </tr>
            ) : null}
            {sortedSections.map((sec) => {
                const secStudents = students.filter(st => st.sectionId === sec.id);
                const count = secStudents.length;
                const maleCount = secStudents.filter(st => st.gender === 'Male').length;
                const femaleCount = secStudents.filter(st => st.gender === 'Female').length;
                const isShs = ['Grade 11', 'Grade 12'].includes(sec.gradeLevel);

                return (
                  <tr key={sec.id} className="util-row">
                    <td>
                      <span className={`grade-tag ${isShs ? 'tag-shs' : 'tag-jhs'}`}>
                        {sec.gradeLevel}
                      </span>
                    </td>
                    <td>
                      <strong 
                        className="sec-name-link" 
                        onClick={() => onInspectSection(sec, isShs, 'details')}
                        title="Click to view and edit section info"
                      >
                        {sec.name}
                      </strong>
                    </td>
                    <td>{sec.adviserName || sec.adviser || <em className="unassigned-text">Unassigned</em>}</td>
                    <td>{sec.room || '—'}</td>
                    <td>{sec.trackStrand || sec.strand || (isShs ? 'General Academic' : 'Standard')}</td>
                    <td>
                      <span className="class-size-badge">
                        👥 {count} Learners
                      </span>
                    </td>
                    <td>
                      <div className="util-gender-pill">
                        <span className="m-text">👦 {maleCount}</span>
                        <span className="divider">•</span>
                        <span className="f-text">👧 {femaleCount}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button 
                          type="button" 
                          className="btn-util-inspect"
                          onClick={() => onInspectSection(sec, isShs, 'details')}
                          title="View and edit section info, adviser, and room"
                        >
                          ⚙️ Edit Info
                        </button>
                        <button 
                          type="button" 
                          className="btn-util-inspect"
                          onClick={() => onInspectSection(sec, isShs, 'students')}
                          title="Manage Roster & Intake in drawer"
                        >
                          👥 Roster
                        </button>
                        <button
                          type="button"
                          className="btn-util-masterlist"
                          onClick={() => navigate(`/students?sectionId=${sec.id}`)}
                          title="Open full Learner Masterlist"
                        >
                          📋 Masterlist
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default SectionsOverviewMatrix;
