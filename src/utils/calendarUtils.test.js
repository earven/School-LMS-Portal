import { describe, it, expect, vi } from 'vitest';
import { isDateInEventRange, exportEventsToICS } from './calendarUtils';

describe('calendarUtils Tests', () => {
  describe('isDateInEventRange', () => {
    it('should match single day events', () => {
      const event = { date: '2026-08-22' };
      expect(isDateInEventRange('2026-08-22', event)).toBe(true);
      expect(isDateInEventRange('2026-08-23', event)).toBe(false);
    });

    it('should match multi-day date range events', () => {
      const event = { startDate: '2026-10-20', endDate: '2026-10-24' };
      expect(isDateInEventRange('2026-10-19', event)).toBe(false);
      expect(isDateInEventRange('2026-10-20', event)).toBe(true);
      expect(isDateInEventRange('2026-10-22', event)).toBe(true);
      expect(isDateInEventRange('2026-10-24', event)).toBe(true);
      expect(isDateInEventRange('2026-10-25', event)).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isDateInEventRange('', null)).toBe(false);
      expect(isDateInEventRange('2026-08-22', {})).toBe(false);
    });
  });

  describe('exportEventsToICS', () => {
    it('should return false when events list is empty', () => {
      expect(exportEventsToICS([])).toBe(false);
      expect(exportEventsToICS(null)).toBe(false);
    });

    it('should generate .ics structure and trigger download', () => {
      const mockClick = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: mockClick,
        remove: vi.fn()
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-ics');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(vi.fn());

      const sampleEvents = [
        {
          id: '1',
          title: 'Opening of Classes',
          startDate: '2026-08-26',
          endDate: '2026-08-26',
          type: 'activity',
          description: 'First Day',
          location: 'Campus'
        }
      ];

      const success = exportEventsToICS(sampleEvents, 'Test Academy');
      expect(success).toBe(true);
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
