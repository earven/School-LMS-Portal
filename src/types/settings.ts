/**
 * School Settings & DepEd Governance Contracts
 */

export interface EnabledModules {
  studentManagement: boolean;
  personnelManagement: boolean;
  sections: boolean;
  calendar: boolean;
  teacherTools: boolean;
  [key: string]: boolean;
}

export interface TeacherToolVisibilities {
  'submission-tracker': boolean;
  'teacher-attendance': boolean;
  'teaching-load': boolean;
  'e-filers': boolean;
  'attendance-tracker': boolean;
  'academic-records': boolean;
  'inventory-tracker': boolean;
  'enrolment-lister': boolean;
  'learning-resources': boolean;
  'computer-lab-log'?: boolean;
  'memo-stocker'?: boolean;
  [key: string]: boolean | undefined;
}

export interface GradingWeights {
  writtenWork: number;
  performanceTask: number;
  quarterlyExam: number;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  active?: boolean;
}

export interface SchoolSettings {
  // School Identity
  schoolName: string;
  schoolId: string;
  region: string;
  division: string;
  district?: string;
  schoolLogo: string;
  motto?: string;
  description?: string;

  // Contact Information
  phone?: string;
  email?: string;
  address?: string;
  facebookUrl?: string;

  // System Preferences
  academicYear: string;
  academicYearStatus: 'open' | 'closed' | string;
  enabledModules: EnabledModules;
  teacherToolVisibilities: TeacherToolVisibilities;
  enableFileUpload?: boolean;

  // Appearance Settings
  primaryColor: string;
  theme: 'light' | 'dark' | 'system' | string;
  fontSize: 'standard' | 'medium' | 'compact' | 'extra-compact' | string;
  logoPosition: 'left' | 'center' | 'right' | string;

  // Landing Page Hero & Gallery
  heroBackground?: string;
  heroSlides?: HeroSlide[];

  // DepEd Signatories & Authorities
  principalName?: string;
  principalTitle?: string;
  assistantPrincipal?: string;
  assistantPrincipalTitle?: string;
  registrarName?: string;
  registrarTitle?: string;
  divisionSuperintendent?: string;
  divisionSuperintendentTitle?: string;
  districtSupervisor?: string;

  // DepEd Grading Policies (DO 15, s. 2026 & DO 009, s. 2026)
  activeTerm: 'T1' | 'T2' | 'T3' | string;
  gradingEncodingOpen?: {
    t1: boolean;
    t2: boolean;
    t3: boolean;
  };
  passingGrade?: number;
  totalSchoolDays?: number;
  gradingWeights?: Record<string, GradingWeights>;
}
