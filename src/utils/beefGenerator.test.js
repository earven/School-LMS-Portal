import { describe, it, expect, vi } from 'vitest';
import { computeQuickCountMatrix, exportQuickCountToCSV } from './beefGenerator';

describe('beefGenerator Tests', () => {
  describe('computeQuickCountMatrix', () => {
    it('aggregates enrollees accurately by grade and gender', () => {
      const enrollees = [
        { id: '1', gradeLevel: 'Grade 7', gender: 'Male', is4Ps: true, birthCert: true, form9: true },
        { id: '2', gradeLevel: 'Grade 7', gender: 'Female', is4Ps: false, birthCert: true, form9: false },
        { id: '3', gradeLevel: 'Grade 8', gender: 'Male', isOldStudent: true, birthCert: true, form9: true },
        { id: '4', gradeLevel: 'Grade 10', gender: 'Female', prevSchool: 'St. Jude Academy', birthCert: false, form9: false }
      ];

      const result = computeQuickCountMatrix(enrollees);

      expect(result.grandTotal).toBe(4);
      expect(result.totalMale).toBe(2);
      expect(result.totalFemale).toBe(2);
      expect(result.total4Ps).toBe(1);
      expect(result.totalReturnees).toBe(1);
      expect(result.totalTransferees).toBe(1);
      expect(result.totalCompleteDocs).toBe(2);
      expect(result.complianceRate).toBe(50);

      // Verify Grade 7 breakdown
      const g7 = result.rows.find(r => r.grade === 'Grade 7');
      expect(g7.male).toBe(1);
      expect(g7.female).toBe(1);
      expect(g7.total).toBe(2);
      expect(g7.fourPs).toBe(1);
    });
  });

  describe('exportQuickCountToCSV', () => {
    it('generates and downloads quick count CSV', () => {
      const mockClick = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: mockClick,
        remove: vi.fn()
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-qc-csv');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(vi.fn());

      const enrollees = [
        { id: '1', gradeLevel: 'Grade 7', gender: 'Male' }
      ];

      const success = exportQuickCountToCSV(enrollees, { schoolName: 'Test High School' });
      expect(success).toBe(true);
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
