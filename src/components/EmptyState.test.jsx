import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';
import CardSkeleton from './CardSkeleton';

describe('UI Polish Components: EmptyState & Loading Skeletons', () => {
  describe('EmptyState Component', () => {
    it('renders with default icon, title, and description', () => {
      render(<EmptyState />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No records found')).toBeInTheDocument();
      expect(
        screen.getByText('There are no items matching the current view or filter criteria.')
      ).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('renders custom icon, title, and description', () => {
      render(
        <EmptyState
          icon="👥"
          title="No Learners Found"
          description="Try adjusting your section or grade filters."
        />
      );
      expect(screen.getByText('👥')).toBeInTheDocument();
      expect(screen.getByText('No Learners Found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your section or grade filters.')).toBeInTheDocument();
    });

    it('triggers onAction callback when primary action button is clicked', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          actionLabel="Clear Filters"
          onAction={handleAction}
        />
      );

      const actionBtn = screen.getByRole('button', { name: 'Clear Filters' });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('triggers onSecondaryAction callback when secondary button is clicked', () => {
      const handleSecondary = vi.fn();
      render(
        <EmptyState
          secondaryActionLabel="Refresh Page"
          onSecondaryAction={handleSecondary}
        />
      );

      const secBtn = screen.getByRole('button', { name: 'Refresh Page' });
      fireEvent.click(secBtn);
      expect(handleSecondary).toHaveBeenCalledTimes(1);
    });

    it('applies compact CSS class when compact prop is true', () => {
      render(<EmptyState compact />);
      const container = screen.getByTestId('empty-state');
      expect(container).toHaveClass('compact');
    });
  });

  describe('TableSkeleton Component', () => {
    it('renders correct number of rows and columns with checkbox', () => {
      const { container } = render(
        <table>
          <TableSkeleton rows={4} columns={5} hasCheckbox={true} />
        </table>
      );

      const skeletonBody = screen.getByTestId('table-skeleton');
      expect(skeletonBody).toBeInTheDocument();
      const rows = skeletonBody.querySelectorAll('tr.skeleton-row');
      expect(rows.length).toBe(4);

      // Checkbox column (1) + columns (5) = 6 cells per row
      const firstRowCells = rows[0].querySelectorAll('td');
      expect(firstRowCells.length).toBe(6);

      // Shimmer elements
      const shimmers = container.querySelectorAll('.skeleton');
      expect(shimmers.length).toBe(4 * 6);
    });

    it('renders without checkbox when hasCheckbox is false', () => {
      render(
        <table>
          <TableSkeleton rows={3} columns={4} hasCheckbox={false} />
        </table>
      );

      const rows = screen.getByTestId('table-skeleton').querySelectorAll('tr');
      expect(rows.length).toBe(3);
      expect(rows[0].querySelectorAll('td').length).toBe(4);
    });
  });

  describe('CardSkeleton Component', () => {
    it('renders specified count of card skeleton elements', () => {
      const { container } = render(<CardSkeleton count={4} />);
      const wrapper = screen.getByTestId('card-skeleton');
      expect(wrapper).toBeInTheDocument();

      const cards = wrapper.querySelectorAll('.card');
      expect(cards.length).toBe(4);

      const shimmers = container.querySelectorAll('.skeleton');
      expect(shimmers.length).toBeGreaterThanOrEqual(16);
    });
  });
});
