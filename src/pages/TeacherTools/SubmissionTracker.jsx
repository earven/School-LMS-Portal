import React from 'react';

const SubmissionTracker = () => {
  return (
    <div className="dashboard-container">
      <h1>Submission Tracker</h1>
      <p>Module to track student and teacher submissions.</p>
      <hr />
      <div className="placeholder-content">
        <p>Status Tracking: Pending / Submitted / Late</p>
      </div>
    </div>
  );
};

export default SubmissionTracker;
