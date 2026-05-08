import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-wrapper">
      <div className="not-found-content">
        <h1 className="error-code">404</h1>
        <h2>Oops! Page Not Found</h2>
        <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
        <button className="back-home-btn" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
