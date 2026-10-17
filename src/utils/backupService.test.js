import { describe, it, expect } from 'vitest';
import { validateBackupFile, scanDataIntegrity } from './backupService';

describe('Backup & Data Integrity Service Tests', () => {
  describe('validateBackupFile', () => {
    it('should reject invalid JSON string or non-object', () => {
      expect(validateBackupFile('not json').valid).toBe(false);
      expect(validateBackupFile(null).valid).toBe(false);
      expect(validateBackupFile(123).valid).toBe(false);
    });

    it('should reject backup missing schemaVersion', () => {
      const payload = {
        data: { students: [] }
      };
      const result = validateBackupFile(payload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('schemaVersion');
    });

    it('should reject backup missing data collections', () => {
      const payload = {
        schemaVersion: '1.0',
        data: {}
      };
      const result = validateBackupFile(payload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no recognizable data collections');
    });

    it('should correctly validate a well-formed backup payload', () => {
      const validPayload = {
        schemaVersion: '1.0',
        system: 'School LMS Portal',
        exportDate: '2026-08-22T08:00:00.000Z',
        school: { name: 'Test Academy', id: 'SCH-1001' },
        data: {
          students: [
            { id: '101', firstName: 'Juan', lastName: 'Dela Cruz' },
            { id: '102', firstName: 'Maria', lastName: 'Clara' }
          ],
          sections: [
            { id: 'sec-1', name: 'Emerald', gradeLevel: '7' }
          ]
        }
      };

      const result = validateBackupFile(validPayload);
      expect(result.valid).toBe(true);
      expect(result.recordCounts.students).toBe(2);
      expect(result.recordCounts.sections).toBe(1);
      expect(result.metadata.totalRecords).toBe(3);
    });
  });

  describe('scanDataIntegrity', () => {
    it('should detect orphaned students with missing section references', async () => {
      const students = [
        { id: 's1', firstName: 'Juan', lastName: 'Cruz', sectionId: 'non-existent-section', lrn: '111111' },
        { id: 's2', firstName: 'Maria', lastName: 'Santos', sectionId: 'sec-valid', lrn: '222222' }
      ];
      const sections = [
        { id: 'sec-valid', name: 'Diamond', gradeLevel: '8', adviserId: 'u1' }
      ];
      const personnel = [
        { uid: 'u1', firstName: 'Teacher', lastName: 'One' }
      ];

      const report = await scanDataIntegrity({ students, sections, personnel });
      expect(report.healthy).toBe(false);
      expect(report.summary.totalIssuesFound).toBe(1);
      expect(report.issues[0].type).toBe('ORPHANED_STUDENT');
      expect(report.issues[0].entityId).toBe('s1');
    });

    it('should detect sections with non-existent advisers', async () => {
      const students = [];
      const sections = [
        { id: 'sec-1', name: 'Ruby', gradeLevel: '9', adviserId: 'deleted-teacher-uid' }
      ];
      const personnel = [];

      const report = await scanDataIntegrity({ students, sections, personnel });
      expect(report.healthy).toBe(false);
      expect(report.issues[0].type).toBe('INVALID_ADVISER');
    });

    it('should detect duplicate LRNs in same academic year', async () => {
      const students = [
        { id: 's1', firstName: 'Pedro', lastName: 'Penduko', academicYear: '2025-2026', lrn: '123456789012' },
        { id: 's2', firstName: 'Juan', lastName: 'Tamad', academicYear: '2025-2026', lrn: '123456789012' }
      ];
      const sections = [];
      const personnel = [];

      const report = await scanDataIntegrity({ students, sections, personnel });
      expect(report.healthy).toBe(false);
      expect(report.issues.some(i => i.type === 'DUPLICATE_LRN')).toBe(true);
    });

    it('should report healthy when all references are consistent', async () => {
      const students = [
        { id: 's1', firstName: 'Juan', lastName: 'Cruz', sectionId: 'sec-1', lrn: '111', academicYear: '2025-2026' }
      ];
      const sections = [
        { id: 'sec-1', name: 'Emerald', gradeLevel: '7', adviserId: 'u1' }
      ];
      const personnel = [
        { uid: 'u1', firstName: 'Ana', lastName: 'Reyes' }
      ];

      const report = await scanDataIntegrity({ students, sections, personnel });
      expect(report.healthy).toBe(true);
      expect(report.issues.length).toBe(0);
    });
  });
});
