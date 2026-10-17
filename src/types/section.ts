/**
 * Section & Classroom Data Contracts
 */

export type GradeLevel = 
  | 'Grade 7' 
  | 'Grade 8' 
  | 'Grade 9' 
  | 'Grade 10' 
  | 'Grade 11' 
  | 'Grade 12';

export interface Section {
  id: string; // Typically `${academicYear}-${gradeLevel}-${name}`
  name: string;
  gradeLevel: GradeLevel | string;
  academicYear: string;
  room?: string;
  
  // Adviser assignment
  adviserId?: string;
  adviserName?: string;
  
  // Capacity & tracking
  track?: string; // e.g. Academic, TVL (for Senior High)
  strand?: string; // e.g. STEM, HUMSS, ABM
  maxCapacity?: number;
  studentCount?: number;
  
  createdAt?: any;
  updatedAt?: any;
}
