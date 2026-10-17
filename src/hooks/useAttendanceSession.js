import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook to encapsulate attendance roll-call tracking, dirty cell tracking,
 * status toggling/cycling, remarks handling, batch marking, and offline-compatible saving.
 * 
 * @param {Object} params
 * @param {string} params.sectionId - Active section identifier
 * @param {string} params.selectedMonth - Active month formatted as YYYY-MM
 * @param {string} params.selectedDate - Active date formatted as YYYY-MM-DD
 * @param {Array} params.students - Section students roster
 * @param {Function} params.onSaveBatch - Context or service function to persist changes
 * @param {Function} [params.onReload] - Callback to reload refreshed month data after save
 * @param {Object} [params.initialMonthlyState={}] - Initial attendance state { studentId: { date: status } }
 * @param {Object} [params.initialRemarksState={}] - Initial remarks state { studentId: { date: text } }
 * @returns {Object} Session state, dirty counts, and roll-call operations
 */
export const useAttendanceSession = ({
  sectionId,
  selectedMonth,
  selectedDate,
  students = [],
  onSaveBatch,
  onReload,
  initialMonthlyState = {},
  initialRemarksState = {}
} = {}) => {
  const [monthlyState, setMonthlyState] = useState(initialMonthlyState);
  const [remarksState, setRemarksState] = useState(initialRemarksState);
  const [dirtyCells, setDirtyCells] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if initial states are re-fetched from database
  const syncState = useCallback((newMonthly, newRemarks) => {
    setMonthlyState(newMonthly || {});
    setRemarksState(newRemarks || {});
    setDirtyCells(new Set());
  }, []);

  const getStudentStatus = useCallback((studentId, date = selectedDate) => {
    return monthlyState[studentId]?.[date] || 'Present';
  }, [monthlyState, selectedDate]);

  const getStudentRemark = useCallback((studentId, date = selectedDate) => {
    return remarksState[studentId]?.[date] || '';
  }, [remarksState, selectedDate]);

  const toggleStatus = useCallback((studentId, date, statusToSet) => {
    const targetDate = date || selectedDate;
    setMonthlyState(prev => {
      const studentData = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...studentData,
          [targetDate]: statusToSet
        }
      };
    });

    setDirtyCells(prev => {
      const next = new Set(prev);
      next.add(`${studentId}_${targetDate}`);
      return next;
    });
  }, [selectedDate]);

  const cycleStatus = useCallback((studentId, date) => {
    const targetDate = date || selectedDate;
    const current = getStudentStatus(studentId, targetDate);

    let nextStatus = 'Present';
    if (current === 'Present') nextStatus = 'Absent';
    else if (current === 'Absent') nextStatus = 'Tardy';
    else if (current === 'Tardy') nextStatus = 'Present';

    toggleStatus(studentId, targetDate, nextStatus);
  }, [getStudentStatus, toggleStatus, selectedDate]);

  const updateRemark = useCallback((studentId, date, remark) => {
    const targetDate = date || selectedDate;
    setRemarksState(prev => {
      const studentData = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...studentData,
          [targetDate]: remark
        }
      };
    });

    setDirtyCells(prev => {
      const next = new Set(prev);
      next.add(`${studentId}_${targetDate}`);
      return next;
    });
  }, [selectedDate]);

  const markAll = useCallback((statusToSet = 'Present', date = selectedDate) => {
    if (!students || students.length === 0) return;

    setMonthlyState(prev => {
      const next = { ...prev };
      students.forEach(stu => {
        if (!next[stu.id]) next[stu.id] = {};
        next[stu.id] = { ...next[stu.id], [date]: statusToSet };
      });
      return next;
    });

    setDirtyCells(prev => {
      const next = new Set(prev);
      students.forEach(stu => {
        next.add(`${stu.id}_${date}`);
      });
      return next;
    });
  }, [students, selectedDate]);

  const saveSession = useCallback(async () => {
    if (dirtyCells.size === 0 || !onSaveBatch) {
      return { success: true, count: 0 };
    }

    const payload = [];
    dirtyCells.forEach(key => {
      const [studentId, dateStr] = key.split('_');
      payload.push({
        studentId,
        date: dateStr,
        status: monthlyState[studentId]?.[dateStr] || 'Present',
        remarks: remarksState[studentId]?.[dateStr] || ''
      });
    });

    setIsSaving(true);
    try {
      const result = await onSaveBatch(sectionId, selectedMonth, payload);
      if (result?.success) {
        setDirtyCells(new Set());
        if (onReload) onReload();
      }
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [dirtyCells, monthlyState, remarksState, sectionId, selectedMonth, onSaveBatch, onReload]);

  const hasDirtyChanges = useMemo(() => dirtyCells.size > 0, [dirtyCells]);

  return {
    monthlyState,
    remarksState,
    dirtyCells,
    hasDirtyChanges,
    isSaving,
    syncState,
    getStudentStatus,
    getStudentRemark,
    toggleStatus,
    cycleStatus,
    updateRemark,
    markAll,
    saveSession,
    clearDirty: () => setDirtyCells(new Set())
  };
};

export default useAttendanceSession;
