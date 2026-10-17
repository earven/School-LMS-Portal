import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentForm } from './useStudentForm';

describe('useStudentForm hook', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useStudentForm());

    expect(result.current.formData.gender).toBe('Male');
    expect(result.current.formData.gradeLevel).toBe('Grade 7');
    expect(result.current.isDirty).toBe(false);
  });

  it('restricts LRN input to numeric digits only and truncates at 12', () => {
    const { result } = renderHook(() => useStudentForm());

    act(() => {
      result.current.handleChange({
        target: { name: 'id', value: '1234abcd5678901234' }
      });
    });

    expect(result.current.formData.id).toBe('123456789012');
  });

  it('auto-computes BMI and nutritional status on height and weight changes', () => {
    const { result } = renderHook(() => useStudentForm());

    act(() => {
      result.current.handleChange({ target: { name: 'heightCm', value: '160' } });
      result.current.handleChange({ target: { name: 'weightKg', value: '50' } });
    });

    // 50 / (1.6 * 1.6) = 19.53 -> Normal
    expect(result.current.formData.bmi).toBeCloseTo(19.53, 1);
    expect(result.current.formData.nutritionalStatus).toBe('Normal');
  });

  it('validates 12-digit LRN and required fields', () => {
    const { result } = renderHook(() => useStudentForm());

    let isValid;
    act(() => {
      isValid = result.current.validate(true);
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.id).toBeDefined();
    expect(result.current.errors.lastName).toBeDefined();
    expect(result.current.errors.firstName).toBeDefined();
  });

  it('detects duplicate LRN when registering a new learner', () => {
    const existing = [{ id: '123456789012', lastName: 'Cruz', firstName: 'Juan' }];
    const { result } = renderHook(() => useStudentForm({ existingStudents: existing }));

    act(() => {
      result.current.handleChange({ target: { name: 'id', value: '123456789012' } });
      result.current.handleChange({ target: { name: 'lastName', value: 'Santos' } });
      result.current.handleChange({ target: { name: 'firstName', value: 'Pedro' } });
    });

    let isValid;
    act(() => {
      isValid = result.current.validate(true);
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.id).toContain('already registered');
  });

  it('calls onSubmit on successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce();
    const { result } = renderHook(() => useStudentForm({ onSubmit }));

    act(() => {
      result.current.handleChange({ target: { name: 'id', value: '123456789012' } });
      result.current.handleChange({ target: { name: 'lastName', value: 'Dela Cruz' } });
      result.current.handleChange({ target: { name: 'firstName', value: 'Juan' } });
    });

    let success;
    await act(async () => {
      success = await result.current.handleSubmit(null, true);
    });

    expect(success).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id: '123456789012',
      lastName: 'Dela Cruz',
      firstName: 'Juan'
    }));
  });
});
