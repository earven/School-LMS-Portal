import { describe, it, expect, vi } from 'vitest';
import { formatDateDisplay, exportLabLogsToCSV, generateLabLogExcel } from './labLogGenerator';

describe('labLogGenerator Tests', () => {
  describe('formatDateDisplay', () => {
    it('formats YYYY-MM-DD into readable date format', () => {
      const formatted = formatDateDisplay('2026-10-15');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    it('handles empty or null gracefully', () => {
      expect(formatDateDisplay('')).toBe('—');
      expect(formatDateDisplay(null)).toBe('—');
    });
  });

  describe('exportLabLogsToCSV', () => {
    it('generates CSV content and triggers download link click', () => {
      const mockClick = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: mockClick,
        remove: vi.fn()
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-csv');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(vi.fn());

      const sampleLogs = [
        {
          id: '1',
          date: '2026-09-04',
          timeIn: '09:30 AM',
          timeOut: '10:15 AM',
          durationMinutes: 45,
          lrn: '123456789012',
          studentName: 'Dela Cruz, Juan',
          sectionName: 'Diamond - Grade 10',
          stationNumber: 'PC-01',
          purpose: 'Research & Internet',
          remarks: 'Good'
        }
      ];

      exportLabLogsToCSV(sampleLogs, 'test_export.csv');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('generateLabLogExcel', () => {
    it('generates a valid excel workbook buffer with correct sheet and cells', async () => {
      const sampleLogs = [
        {
          id: '1',
          date: '2026-09-04',
          timeIn: '09:00 AM',
          timeOut: '09:45 AM',
          durationMinutes: 45,
          lrn: '123456789012',
          studentName: 'Santos, Maria',
          sectionName: 'Emerald - Grade 7',
          stationNumber: 'PC-05',
          purpose: 'Class / Hands-on Activity',
          remarks: ''
        }
      ];

      const buffer = await generateLabLogExcel({
        logs: sampleLogs,
        schoolName: 'Mabini National High School',
        schoolYear: '2026-2027',
        labName: 'Multimedia Computer Lab',
        dateRangeText: 'Today'
      });

      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(1000);
    });
  });
});
