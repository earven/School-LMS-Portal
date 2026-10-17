import { describe, it, expect, vi } from 'vitest';
import { prepareSF7Data, exportSF7ToCSV } from './sf7Generator';

describe('sf7Generator Tests', () => {
  describe('prepareSF7Data', () => {
    it('segregates teaching and non-teaching personnel correctly', () => {
      const personnelList = [
        {
          id: 'p1',
          lastName: 'Santos',
          firstName: 'Juan',
          role: 'teacher',
          position: 'Teacher III',
          gender: 'Male',
          subjects: ['Mathematics'],
          ancillaryDuties: ['ICT Coordinator']
        },
        {
          id: 'p2',
          lastName: 'Reyes',
          firstName: 'Maria',
          role: 'admin',
          position: 'Administrative Officer II',
          gender: 'Female'
        },
        {
          id: 'p3',
          lastName: 'Cruz',
          firstName: 'Elena',
          role: 'teacher',
          position: 'Master Teacher I',
          gender: 'Female',
          subjects: ['Science']
        }
      ];

      const sections = [
        { id: 's1', name: 'Emerald', gradeLevel: 'Grade 7', adviserId: 'p1' }
      ];

      const result = prepareSF7Data(personnelList, sections);

      expect(result.totalTeaching).toBe(2);
      expect(result.totalNonTeaching).toBe(1);
      expect(result.grandTotal).toBe(3);
      expect(result.maleTeachers).toBe(1);
      expect(result.femaleTeachers).toBe(1);
      expect(result.femaleNonTeaching).toBe(1);

      // Verify advisory sections mapped
      const teacherJuan = result.teaching.find(t => t.id === 'p1');
      expect(teacherJuan.advisorySections).toBe('Grade 7 - Emerald');
      expect(teacherJuan.ancillaryDuties).toBe('ICT Coordinator');
    });
  });

  describe('exportSF7ToCSV', () => {
    it('triggers CSV download with proper structure', () => {
      const mockClick = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: mockClick,
        remove: vi.fn()
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-sf7-csv');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(vi.fn());

      const personnelList = [
        { id: 'p1', lastName: 'Dela Cruz', firstName: 'Juan', role: 'teacher' }
      ];

      const success = exportSF7ToCSV(personnelList, [], { schoolName: 'Mabini High School' });
      expect(success).toBe(true);
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
