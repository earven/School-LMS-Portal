import React from 'react';

const SF4SchoolReport = ({
  selectedMonth,
  manualDaysOfClasses,
  onManualDaysOfClassesChange,
  sf4Data = [],
  onDownloadSF4
}) => {
  return (
    <div className="card printable-sf4">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>School Form 4 (SF4) Report: {selectedMonth}</h2>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--gray-600)' }} className="no-print">
            <span>No. of Days of Classes: </span>
            <input 
              type="number" 
              style={{ width: '60px', textAlign: 'right', padding: '2px', border: '1px solid #ccc', borderRadius: '4px' }} 
              value={manualDaysOfClasses} 
              onChange={e => onManualDaysOfClassesChange(e.target.value)} 
            />
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="primary-btn" onClick={onDownloadSF4}>
            ⬇️ Generate SF4
          </button>
        </div>
      </div>
      
      <table className="teaching-load-table sf4-table">
        <thead>
          <tr>
            <th rowSpan="2">Grade Level & Section</th>
            <th colSpan="3">Registered Learners</th>
            <th colSpan="3">Average Daily Attendance</th>
            <th rowSpan="2">Percentage of Attendance</th>
          </tr>
          <tr>
            <th>Male</th>
            <th>Female</th>
            <th>Total</th>
            <th>Male</th>
            <th>Female</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sf4Data.map(d => (
            <tr key={d.id}>
              <td>{d.grade} - {d.name}</td>
              <td>{d.maleReg}</td>
              <td>{d.femaleReg}</td>
              <td><strong>{d.totalReg}</strong></td>
              <td>{d.maleADA}</td>
              <td>{d.femaleADA}</td>
              <td><strong>{d.totalADA}</strong></td>
              <td><strong>{d.totalPct}%</strong></td>
            </tr>
          ))}
          {sf4Data.length === 0 && (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center' }}>
                No data available for {selectedMonth}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SF4SchoolReport;
