import { describe, it, expect, vi } from 'vitest';
import { AUDIT_CATEGORIES, AUDIT_SEVERITY, exportAuditLogsToCSV } from './auditLogger';

describe('Audit Logger Utility Tests', () => {
  it('should define all core audit categories', () => {
    expect(AUDIT_CATEGORIES.STUDENTS).toBe('STUDENTS');
    expect(AUDIT_CATEGORIES.PERSONNEL).toBe('PERSONNEL');
    expect(AUDIT_CATEGORIES.SECTIONS).toBe('SECTIONS');
    expect(AUDIT_CATEGORIES.SETTINGS).toBe('SETTINGS');
    expect(AUDIT_CATEGORIES.BACKUP_RESTORE).toBe('BACKUP_RESTORE');
    expect(AUDIT_CATEGORIES.AUTH).toBe('AUTH');
    expect(AUDIT_CATEGORIES.SYSTEM).toBe('SYSTEM');
  });

  it('should define all severity levels', () => {
    expect(AUDIT_SEVERITY.INFO).toBe('info');
    expect(AUDIT_SEVERITY.WARNING).toBe('warning');
    expect(AUDIT_SEVERITY.CRITICAL).toBe('critical');
  });

  it('should return false when exporting empty logs', () => {
    expect(exportAuditLogsToCSV([])).toBe(false);
    expect(exportAuditLogsToCSV(null)).toBe(false);
  });

  it('should generate and trigger CSV download for valid logs', () => {
    // Mock DOM elements
    const mockClick = vi.fn();
    const mockAppend = vi.fn();
    const mockRemove = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue({
      setAttribute: vi.fn(),
      click: mockClick,
      remove: mockRemove
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppend);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemove);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(vi.fn());

    const sampleLogs = [
      {
        timestamp: new Date('2026-08-22T10:00:00Z'),
        severity: 'info',
        category: 'STUDENTS',
        action: 'STUDENT_CREATED',
        details: 'Enrolled student "Dela Cruz, Juan"',
        actorName: 'Admin User',
        actorEmail: 'admin@school.edu',
        actorRole: 'admin',
        targetId: '12345'
      }
    ];

    const result = exportAuditLogsToCSV(sampleLogs, 'test_export.csv');
    expect(result).toBe(true);
    expect(mockClick).toHaveBeenCalled();
  });
});
