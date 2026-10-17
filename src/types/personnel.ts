/**
 * Personnel & User Data Contracts
 */

export type UserRole = 
  | 'admin' 
  | 'system_admin' 
  | 'teacher' 
  | 'pending' 
  | 'guest';

export interface PersonnelFieldOption {
  value: string;
  label: string;
}

export interface PersonnelFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number' | 'email';
  required?: boolean;
  options?: string[] | PersonnelFieldOption[];
}

export interface Personnel {
  id: string; // Firebase Auth UID or Firestore doc ID
  uid?: string;
  email: string;
  role: UserRole;
  
  // Names
  displayName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nameExtension?: string;
  prefix?: string; // Mr., Ms., Dr., etc.

  // Academic & Advisory Assignments
  assignedSections?: string[];
  advisorySectionId?: string;
  department?: string;
  position?: string;
  employeeId?: string;

  // Contact & Personal
  contactNumber?: string;
  birthDate?: string;
  dateHired?: string;
  highestDegree?: string;
  specialization?: string;
  address?: string;
  photoURL?: string;

  // DepEd Administrative Flags
  isEnrolmentCoordinator?: boolean;
  status?: 'Active' | 'On Leave' | 'Inactive' | string;

  // Custom Fields (dynamic key-values configured by admin)
  customFields?: Record<string, any>;

  createdAt?: any;
  updatedAt?: any;
}
