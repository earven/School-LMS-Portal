import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAttendanceSession } from './useAttendanceSession';

describe('useAttendanceSession hook', () => {
  const mockStudents = [
    { id: 'stu-1', firstName: 'Juan', lastName: 'Cruz' },
    { id: 'stu-2', firstName: 'Maria', lastName: 'Santos' }
  ];

  it('initializes and reads default student status', () => {
    const { result } = renderHook(() => 
      useAttendanceSession({
        sectionId: 'sec-1',
        selectedMonth: '2026-10',
        selectedDate: '2026-10-09',
        students: mockStudents
      })
    );

    expect(result.current.getStudentStatus('stu-1')).toBe('Present');
    expect(result.current.hasDirtyChanges).toBe(false);
  });

  it('toggles attendance status and marks cell as dirty', () => {
    const { result } = renderHook(() => 
      useAttendanceSession({
        sectionId: 'sec-1',
        selectedMonth: '2026-10',
        selectedDate: '2026-10-09',
        students: mockStudents
      })
    );

    act(() => {
      result.current.toggleStatus('stu-1', '2026-10-09', 'Absent');
    });

    expect(result.current.getStudentStatus('stu-1')).toBe('Absent');
    expect(result.current.hasDirtyChanges).toBe(true);
    expect(result.current.dirtyCells.has('stu-1_2026-10-09')).toBe(true);
  });

  it('cycles status Present -> Absent -> Tardy -> Present', () => {
    const { result } = renderHook(() => 
      useAttendanceSession({
        sectionId: 'sec-1',
        selectedMonth: '2026-10',
        selectedDate: '2026-10-09',
        students: mockStudents
      })
    );

    expect(result.current.getStudentStatus('stu-1')).toBe('Present');

    act(() => {
      result.current.cycleStatus('stu-1', '2026-10-09');
    });
    expect(result.current.getStudentStatus('stu-1')).toBe('Absent');

    act(() => {
      result.current.cycleStatus('stu-1', '2026-10-09');
    });
    expect(result.current.getStudentStatus('stu-1')).toBe('Tardy');

    act(() => {
      result.current.cycleStatus('stu-1', '2026-10-09');
    });
    expect(result.current.getStudentStatus('stu-1')).toBe('Present');
  });

  it('batch marks all students present or absent', () => {
    const { result } = renderHook(() => 
      useAttendanceSession({
        sectionId: 'sec-1',
        selectedMonth: '2026-10',
        selectedDate: '2026-10-09',
        students: mockStudents
      })
    );

    act(() => {
      result.current.markAll('Absent');
    });

    expect(result.current.getStudentStatus('stu-1')).toBe('Absent');
    expect(result.current.getStudentStatus('stu-2')).toBe('Absent');
    expect(result.current.dirtyCells.size).toBe(2);
  });

  it('calls onSaveBatch and clears dirty cells on successful save', async () => {
    const onSaveBatch = vi.fn().mockResolvedValueOnce({ success: true });
    const onReload = vi.fn();

    const { result } = renderHook(() => 
      useAttendanceSession({
        sectionId: 'sec-1',
        selectedMonth: '2026-10',
        selectedDate: '2026-10-09',
        students: mockStudents,
        onSaveBatch,
        onReload
      })
    );

    act(() => {
      result.current.toggleStatus('stu-1', '2026-10-09', 'Absent');
    });

    expect(result.current.hasDirtyChanges).toBe(true);

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveSession();
    });

    expect(saveResult.success).toBe(true);
    expect(onSaveBatch).toHaveBeenCalledWith(
      'sec-1',
      '2026-10',
      expect.arrayContaining([
        expect.objectContaining({ studentId: 'stu-1', date: '2026-10-09', status: 'Absent' })
      ])
    );
    expect(onReload).toHaveBeenCalled();
    expect(result.current.hasDirtyChanges).toBe(false);
  });
});
