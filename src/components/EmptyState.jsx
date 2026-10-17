import React from 'react';
import './EmptyState.css';

/**
 * Reusable Empty State component with consistent visuals, icons, and call-to-actions.
 */
export const EmptyState = ({
  icon = '🔍',
  title = 'No records found',
  description = 'There are no items matching the current view or filter criteria.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  className = '',
}) => {
  return (
    <div
      data-testid="empty-state"
      className={`empty-state-container ${compact ? 'compact' : ''} ${className}`}
    >
      <div className="empty-state-icon-wrapper" aria-hidden="true">
        {icon}
      </div>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-description">{description}</p>}
      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && onAction && (
            <button
              type="button"
              className="primary-btn empty-state-action-btn"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              className="btn-header-action empty-state-action-btn"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
