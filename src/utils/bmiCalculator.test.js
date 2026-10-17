import { describe, it, expect } from 'vitest';
import { calculateBMI, getNutritionalStatus, getHeightForAge, computeNutritionalProfile } from './bmiCalculator';

describe('bmiCalculator Tests', () => {
  describe('calculateBMI', () => {
    it('calculates BMI correctly for standard values', () => {
      // 50kg, 160cm -> 50 / (1.6 * 1.6) = 50 / 2.56 = 19.53
      expect(calculateBMI(50, 160)).toBe(19.53);
    });

    it('returns null for invalid or zero inputs', () => {
      expect(calculateBMI(0, 160)).toBeNull();
      expect(calculateBMI(50, 0)).toBeNull();
      expect(calculateBMI('abc', 'xyz')).toBeNull();
    });
  });

  describe('getNutritionalStatus', () => {
    it('classifies Severely Wasted for BMI < 16', () => {
      expect(getNutritionalStatus(15.2)).toBe('Severely Wasted');
    });

    it('classifies Wasted / Underweight for 16 <= BMI < 18.5', () => {
      expect(getNutritionalStatus(17.5)).toBe('Wasted / Underweight');
    });

    it('classifies Normal for 18.5 <= BMI < 23', () => {
      expect(getNutritionalStatus(20.4)).toBe('Normal');
    });

    it('classifies Overweight for 23 <= BMI < 28', () => {
      expect(getNutritionalStatus(25.0)).toBe('Overweight');
    });

    it('classifies Obese for BMI >= 28', () => {
      expect(getNutritionalStatus(29.8)).toBe('Obese');
    });

    it('returns Unassessed for null / invalid BMI', () => {
      expect(getNutritionalStatus(null)).toBe('Unassessed');
    });
  });

  describe('computeNutritionalProfile', () => {
    it('returns full comprehensive object', () => {
      const profile = computeNutritionalProfile(45, 155, 'Grade 8', 'Female');
      expect(profile.bmi).toBe(18.73);
      expect(profile.nutritionalStatus).toBe('Normal');
      expect(profile.heightForAge).toBe('Normal');
    });
  });
});
