import React from 'react';

/**
 * Renders realistic shimmer cards for grid card loading states.
 */
export const CardSkeleton = ({ count = 3, className = '' }) => {
  return (
    <div data-testid="card-skeleton" className={`card-skeleton-grid ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`card-skel-${idx}`}
          className="card"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            minHeight: '160px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton" style={{ height: '18px', width: '60%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '22px', width: '65px', borderRadius: '12px' }} />
          </div>
          <div className="skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '14px', width: '75%', borderRadius: '4px' }} />
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.5rem',
            }}
          >
            <div className="skeleton" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '28px', width: '80px', borderRadius: '6px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardSkeleton;
