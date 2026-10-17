/**
 * Student & Learner Data Contracts
 */

export type StudentGender = 'Male' | 'Female';

export type StudentStatus = 
  | 'Active' 
  | 'Transferred In' 
  | 'Transferred Out' 
  | 'Dropped' 
  | 'Graduated' 
  | 'Promoted' 
  | 'Retained';

export type NutritionalStatus = 
  | 'Severely Wasted' 
  | 'Wasted' 
  | 'Normal' 
  | 'Overweight' 
  | 'Obese';

export type HeightForAgeStatus = 
  | 'Severely Stunted' 
  | 'Stunted' 
  | 'Normal' 
  | 'Tall';

export interface GuidanceNote {
  id: string;
  date: string;
  type: 'Anecdotal' | 'Counseling' | 'Incident' | 'Commendation';
  notes: string;
  loggedBy: string;
  loggedByName?: string;
  createdAt?: any;
}

export interface Student {
  id: string; // 12-digit LRN
  lrn?: string;
  docId?: string;
  academicYear?: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  extension?: string; // Jr., III, etc.
  gender: StudentGender;
  birthdate?: string;
  psaBirthCertNo?: string;
  motherTongue?: string;
  ipEthnicGroup?: string;
  religion?: string;
  address?: string;
  gradeLevel: string;
  sectionId?: string;
  sectionName?: string;
  
  // Guardian & Family
  fatherName?: string;
  motherMaidenName?: string;
  guardianName?: string;
  guardianRelationship?: string;
  contactNumber?: string;
  is4Ps?: boolean;

  // Physical Dimensions & Nutrition
  heightCm?: number | string;
  weightKg?: number | string;
  bmi?: number | string;
  nutritionalStatus?: NutritionalStatus | string;
  heightForAge?: HeightForAgeStatus | string;

  // Enrollment Status
  status: StudentStatus | string;
  remarks?: string;

  // Guidance & Logs
  guidanceNotes?: GuidanceNote[];

  // DepEd Form tracking metadata
  enrolmentDate?: string;
  schoolId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface StudentFilterOptions {
  searchQuery?: string;
  gradeLevel?: string;
  sectionId?: string;
  gender?: string;
  status?: string;
  nutritionalStatus?: string;
  is4Ps?: boolean | 'all';
}
