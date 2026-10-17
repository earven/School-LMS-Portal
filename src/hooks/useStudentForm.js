import { useState, useCallback, useMemo } from 'react';
import { calculateBMI, getNutritionalStatus, getHeightForAge } from '../utils/bmiCalculator';

export const defaultStudentData = {
  id: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extension: '',
  gender: 'Male',
  birthdate: '',
  psaBirthCertNo: '',
  motherTongue: 'Filipino',
  ipEthnicGroup: 'N/A',
  religion: 'Christianity',
  address: '',
  gradeLevel: 'Grade 7',
  sectionId: '',
  fatherName: '',
  motherMaidenName: '',
  guardianName: '',
  guardianRelationship: '',
  contactNumber: '',
  is4Ps: false,
  heightCm: '',
  weightKg: '',
  nutritionalStatus: 'Normal',
  heightForAge: 'Normal',
  status: 'Active'
};

/**
 * Custom hook for managing Learner registration and profile update forms,
 * with built-in LRN 12-digit validation, auto-computed BMI & nutritional status,
 * and duplicate detection.
 * 
 * @param {Object} params
 * @param {Object} [params.initialData] - Initial form state
 * @param {Array} [params.existingStudents=[]] - List of registered students to check duplicates against
 * @param {Function} [params.onSubmit] - Submission callback function
 * @returns {Object} Form state, handlers, errors, and validation utilities
 */
export const useStudentForm = ({
  initialData = defaultStudentData,
  existingStudents = [],
  onSubmit
} = {}) => {
  const [formData, setFormData] = useState({ ...defaultStudentData, ...initialData });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = useMemo(() => {
    const base = { ...defaultStudentData, ...initialData };
    return Object.keys(formData).some(key => formData[key] !== base[key]);
  }, [formData, initialData]);

  const setFieldValue = useCallback((name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-compute BMI and Height-For-Age metrics when physical dimensions change
      if (['heightCm', 'weightKg', 'gradeLevel', 'gender'].includes(name)) {
        const height = name === 'heightCm' ? value : updated.heightCm;
        const weight = name === 'weightKg' ? value : updated.weightKg;
        const grade = name === 'gradeLevel' ? value : updated.gradeLevel;
        const gender = name === 'gender' ? value : updated.gender;

        const bmi = calculateBMI(weight, height);
        updated.bmi = bmi;
        if (bmi) {
          updated.nutritionalStatus = getNutritionalStatus(bmi);
        }
        if (height) {
          updated.heightForAge = getHeightForAge(height, grade, gender);
        }
      }

      return updated;
    });

    // Clear error for field on edit
    setErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;

    // Enforce digit-only formatting for LRN up to 12 digits
    if (name === 'id' || name === 'lrn') {
      finalValue = (value || '').replace(/\D/g, '').slice(0, 12);
    }

    setFieldValue(name, finalValue);
  }, [setFieldValue]);

  const validate = useCallback((isNewRecord = false) => {
    const errs = {};
    const lrn = (formData.id || formData.lrn || '').trim();

    if (!lrn) {
      errs.id = 'LRN is required.';
    } else if (!/^\d{12}$/.test(lrn)) {
      errs.id = 'LRN must be exactly 12 numeric digits.';
    } else if (isNewRecord && existingStudents.some(s => s.id === lrn)) {
      errs.id = `LRN ${lrn} is already registered.`;
    }

    if (!formData.lastName || !formData.lastName.trim()) {
      errs.lastName = 'Last Name is required.';
    }
    if (!formData.firstName || !formData.firstName.trim()) {
      errs.firstName = 'First Name is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, existingStudents]);

  const resetForm = useCallback((newData = null) => {
    setFormData({ ...defaultStudentData, ...(newData || initialData) });
    setErrors({});
    setIsSubmitting(false);
  }, [initialData]);

  const handleSubmit = useCallback(async (e, isNewRecord = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validate(isNewRecord)) return false;

    if (!onSubmit) return true;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      return true;
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err.message }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, onSubmit]);

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    isDirty,
    handleChange,
    setFieldValue,
    validate,
    resetForm,
    handleSubmit
  };
};

export default useStudentForm;
