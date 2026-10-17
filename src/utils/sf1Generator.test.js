import { describe, it, expect, vi } from 'vitest';
import { calculateAge, prepareSF1Data, exportSF1ToCSV } from './sf1Generator';

describe('sf1Generator Tests', () => {
  describe('calculateAge', () => {
    it('calculates correct age from birthdate string', () => {
      const birthdate = '2010-05-15';
      const age = calculateAge(birthdate);
      expect(typeof age).toBe('number');
      expect(age).toBeGreaterThan(10);
    });

    it('returns empty string for missing or invalid dates', () => {
      expect(calculateAge('')).toBe('');
      expect(calculateAge('invalid-date')).toBe('');
    });
  });

  describe('prepareSF1Data', () => {
    it('segregates males and females and sorts alphabetically', () => {
      const students = [
        { id: '1', lastName: 'Santos', firstName: 'Maria', gender: 'Female', is4Ps: true },
        { id: '2', lastName: 'Aquino', firstName: 'Juan', gender: 'Male', is4Ps: false },
        { id: '3', lastName: 'Cruz', firstName: 'Pedro', gender: 'Male', is4Ps: true },
        { id: '4', lastName: 'Bautista', firstName: 'Ana', gender: 'Female', is4Ps: false }
      ];

      const result = prepareSF1Data(students);

      expect(result.totalMale).toBe(2);
      expect(result.totalFemale).toBe(2);
      expect(result.grandTotal).toBe(4);
      expect(result.total4Ps).toBe(2);

      // Check sorting
      expect(result.males[0].lastName).toBe('Aquino');
      expect(result.males[1].lastName).toBe('Cruz');
      expect(result.females[0].lastName).toBe('Bautista');
      expect(result.females[1].lastName).toBe('Santos');
    });
  });

  describe('exportSF1ToCSV', () => {
    it('triggers CSV download with headers and data', () => {
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

      const students = [
        { id: '1001', lastName: 'Dela Cruz', firstName: 'Juan', gender: 'Male' }
      ];

      const success = exportSF1ToCSV(students, { schoolName: 'Test School' }, { name: 'Section A' });
      expect(success).toBe(true);
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
