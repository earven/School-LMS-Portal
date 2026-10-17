import React from 'react';

/**
 * Renders realistic shimmer rows for table loading states.
 */
export const TableSkeleton = ({
  rows = 5,
  columns = 6,
  hasCheckbox = false,
  className = '',
}) => {
  const widths = ['75%', '50%', '90%', '60%', '80%', '40%', '70%'];

  return (
    <tbody data-testid="table-skeleton" className={`table-skeleton-body ${className}`}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`} className="skeleton-row">
          {hasCheckbox && (
            <td style={{ width: '40px' }}>
              <div
                className="skeleton"
                style={{ width: '18px', height: '18px', borderRadius: '4px' }}
              />
            </td>
          )}
          {Array.from({ length: columns }).map((_, cIdx) => {
            const width = widths[(rIdx + cIdx) % widths.length];
            return (
              <td key={`skeleton-col-${cIdx}`}>
                <div
                  className="skeleton"
                  style={{
                    height: '14px',
                    width: width,
                    borderRadius: '4px',
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
};

export default TableSkeleton;
