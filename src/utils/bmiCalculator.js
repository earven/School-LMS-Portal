/**
 * bmiCalculator.js
 * Computes Body Mass Index (BMI) and classifies Nutritional Status
 * and Height-for-Age (HFA) according to DepEd Health & Nutrition Bureau
 * and WHO Standards for Philippine Learners.
 */

/**
 * Calculates BMI value given weight in kilograms and height in centimeters.
 * @param {number|string} weightKg 
 * @param {number|string} heightCm 
 * @returns {number|null} BMI rounded to 2 decimal places, or null if invalid
 */
export const calculateBMI = (weightKg, heightCm) => {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);

  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    return null;
  }

  const heightMeters = h / 100;
  const bmi = w / (heightMeters * heightMeters);
  return Math.round(bmi * 100) / 100;
};

/**
 * Classifies BMI into DepEd Nutritional Status category.
 * @param {number|null} bmi 
 * @returns {string} 'Normal' | 'Wasted / Underweight' | 'Severely Wasted' | 'Overweight' | 'Obese' | 'Unassessed'
 */
export const getNutritionalStatus = (bmi) => {
  if (bmi === null || bmi === undefined || isNaN(bmi)) {
    return 'Unassessed';
  }

  if (bmi < 16.0) {
    return 'Severely Wasted';
  } else if (bmi < 18.5) {
    return 'Wasted / Underweight';
  } else if (bmi < 23.0) {
    return 'Normal';
  } else if (bmi < 28.0) {
    return 'Overweight';
  } else {
    return 'Obese';
  }
};

/**
 * Evaluates Height-for-Age (HFA) relative to typical grade level / age expectations.
 * @param {number|string} heightCm 
 * @param {string} gradeLevel - e.g. 'Grade 7', 'Grade 10'
 * @param {string} gender - 'Male' | 'Female'
 * @returns {string} 'Severely Stunted' | 'Stunted' | 'Normal' | 'Tall' | 'Unassessed'
 */
export const getHeightForAge = (heightCm, gradeLevel = 'Grade 7', gender = 'Male') => {
  const h = parseFloat(heightCm);
  if (isNaN(h) || h <= 0) return 'Unassessed';

  // Standard benchmark heights (in cm) for Philippine junior/senior high schoolers
  const benchmarks = {
    'Grade 7': { min: 140, max: 165 },
    'Grade 8': { min: 145, max: 170 },
    'Grade 9': { min: 150, max: 175 },
    'Grade 10': { min: 152, max: 178 },
    'Grade 11': { min: 155, max: 180 },
    'Grade 12': { min: 155, max: 182 }
  };

  const range = benchmarks[gradeLevel] || { min: 140, max: 175 };

  if (h < range.min - 15) {
    return 'Severely Stunted';
  } else if (h < range.min) {
    return 'Stunted';
  } else if (h <= range.max) {
    return 'Normal';
  } else {
    return 'Tall';
  }
};

/**
 * Convenience helper returning full nutritional profile object.
 */
export const computeNutritionalProfile = (weightKg, heightCm, gradeLevel = 'Grade 7', gender = 'Male') => {
  const bmi = calculateBMI(weightKg, heightCm);
  const nutritionalStatus = getNutritionalStatus(bmi);
  const heightForAge = getHeightForAge(heightCm, gradeLevel, gender);

  return {
    weightKg: parseFloat(weightKg) || null,
    heightCm: parseFloat(heightCm) || null,
    bmi,
    nutritionalStatus,
    heightForAge
  };
};
