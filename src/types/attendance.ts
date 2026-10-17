/**
 * Attendance & Home Visitation Contracts
 */

export type AttendanceStatus = 'Present' | 'Absent' | 'Tardy' | 'Excused' | '';

export interface AttendanceRecord {
  id?: string;
  sectionId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  yearMonth: string; // YYYY-MM
  status: AttendanceStatus;
  remarks?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface HomeVisitationRecord {
  id?: string;
  studentId: string;
  studentName?: string;
  sectionId: string;
  sectionName?: string;
  date: string;
  reason: string;
  actionTaken: string;
  parentGuardianName?: string;
  parentSignature?: boolean;
  status: 'Pending' | 'Completed' | 'Follow-up Required';
  adviserId: string;
  adviserName?: string;
  createdAt?: any;
}

export interface OfflineAttendanceBatch {
  sectionId: string;
  yearMonth: string;
  records: Array<{
    studentId: string;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
  type: 'student' | 'teacher';
  queuedAt?: number;
}
