import { describe, it, expect } from 'vitest';
import {
  isSignedIn,
  isAdmin,
  isTeacher,
  isAuthorized,
  canReadUser,
  canCreateUser,
  canUpdateUser,
  canReadStudent,
  canCreateStudent,
  canUpdateStudent,
  canDeleteStudent,
  canCreateAttendance,
  canUpdateAttendance,
  canCreateSubmission,
  canCreateSubmissionResponse,
  canCreateNotification,
  canCreateAuditLog,
  canMutateAuditLog
} from './securityRulesSimulator';

describe('Firestore Security Rules Logic & Penetration Suite', () => {
  const adminAuth = { uid: 'admin_123' };
  const adminDoc = { role: 'admin' };

  const teacherAuth = { uid: 'teacher_456' };
  const teacherDoc = { role: 'teacher' };

  const unauth = null;
  const guestDoc = { role: 'guest' };

  describe('Role & Authentication Helpers', () => {
    it('correctly determines authentication status', () => {
      expect(isSignedIn(adminAuth)).toBe(true);
      expect(isSignedIn(unauth)).toBe(false);
    });

    it('correctly validates admin status', () => {
      expect(isAdmin(adminAuth, adminDoc)).toBe(true);
      expect(isAdmin(teacherAuth, teacherDoc)).toBe(false);
      expect(isAdmin(unauth, null)).toBe(false);
    });

    it('correctly validates teacher status', () => {
      expect(isTeacher(teacherAuth, teacherDoc)).toBe(true);
      expect(isTeacher(adminAuth, adminDoc)).toBe(false);
      expect(isTeacher(unauth, null)).toBe(false);
    });

    it('correctly validates authorized actors (admin + teacher)', () => {
      expect(isAuthorized(adminAuth, adminDoc)).toBe(true);
      expect(isAuthorized(teacherAuth, teacherDoc)).toBe(true);
      expect(isAuthorized({ uid: 'guest_1' }, guestDoc)).toBe(false);
    });
  });

  describe('Users Collection Security', () => {
    it('blocks unauthenticated read of user profiles', () => {
      expect(canReadUser(unauth)).toBe(false);
      expect(canReadUser(teacherAuth)).toBe(true);
    });

    it('prevents privilege escalation when creating a user document', () => {
      // Trying to create an admin document as a new user
      const maliciousData = { email: 'hacker@test.com', role: 'admin' };
      expect(canCreateUser(teacherAuth, 'teacher_456', maliciousData)).toBe(false);

      // Normal creation with pending or teacher role
      const validData = { email: 'new@test.com', role: 'pending' };
      expect(canCreateUser(teacherAuth, 'teacher_456', validData)).toBe(true);
    });

    it('prevents self-assigning enrolment coordinator privilege on user creation', () => {
      const maliciousData = { email: 'user@test.com', role: 'teacher', isEnrolmentCoordinator: true };
      expect(canCreateUser(teacherAuth, 'teacher_456', maliciousData)).toBe(false);
    });

    it('prevents user from modifying assignedSections or escalating role on update', () => {
      const existing = { role: 'teacher', assignedSections: ['sec-1'] };

      // Self modification of assignedSections
      const badUpdate = { role: 'teacher', assignedSections: ['sec-1', 'sec-2'] };
      expect(canUpdateUser(teacherAuth, teacherDoc, 'teacher_456', existing, badUpdate)).toBe(false);

      // Self promotion to admin
      const badRole = { role: 'admin', assignedSections: ['sec-1'] };
      expect(canUpdateUser(teacherAuth, teacherDoc, 'teacher_456', existing, badRole)).toBe(false);

      // Admin can update any user profile
      expect(canUpdateUser(adminAuth, adminDoc, 'teacher_456', existing, badUpdate)).toBe(true);
    });
  });

  describe('Students Collection Security', () => {
    const section1 = { id: 'sec-1', adviserId: 'teacher_456' };
    const section2 = { id: 'sec-2', adviserId: 'other_teacher' };

    it('allows only teachers and admins to read student records', () => {
      expect(canReadStudent(teacherAuth, teacherDoc)).toBe(true);
      expect(canReadStudent(adminAuth, adminDoc)).toBe(true);
      expect(canReadStudent({ uid: 'guest' }, guestDoc)).toBe(false);
    });

    it('allows teacher to create student only in their assigned section', () => {
      expect(canCreateStudent(teacherAuth, teacherDoc, { sectionId: 'sec-1' }, section1)).toBe(true);
      expect(canCreateStudent(teacherAuth, teacherDoc, { sectionId: 'sec-2' }, section2)).toBe(false);
      expect(canCreateStudent(adminAuth, adminDoc, { sectionId: 'sec-2' }, section2)).toBe(true);
    });

    it('prevents cross-adviser student hijacking on student update', () => {
      const existingStudent = { id: '123456789012', sectionId: 'sec-2' };
      const updatedStudent = { id: '123456789012', sectionId: 'sec-1' };

      // Teacher 456 tries to move a student from another teacher's section (sec-2) to sec-1
      expect(canUpdateStudent(teacherAuth, teacherDoc, existingStudent, updatedStudent, section2, section1)).toBe(false);

      // Updating within own section is allowed
      expect(canUpdateStudent(teacherAuth, teacherDoc, existingStudent, updatedStudent, section1, section1)).toBe(true);

      // Admin can update students across any section
      expect(canUpdateStudent(adminAuth, adminDoc, existingStudent, updatedStudent, section2, section1)).toBe(true);
    });

    it('restricts delete operations strictly to admins', () => {
      expect(canDeleteStudent(adminAuth, adminDoc)).toBe(true);
      expect(canDeleteStudent(teacherAuth, teacherDoc)).toBe(false);
    });
  });

  describe('Attendance Collection Security', () => {
    const section1 = { id: 'sec-1', adviserId: 'teacher_456' };
    const section2 = { id: 'sec-2', adviserId: 'other_teacher' };

    it('allows teacher to log attendance only for their advised section', () => {
      expect(canCreateAttendance(teacherAuth, teacherDoc, { sectionId: 'sec-1' }, section1)).toBe(true);
      expect(canCreateAttendance(teacherAuth, teacherDoc, { sectionId: 'sec-2' }, section2)).toBe(false);
    });

    it('prevents re-assigning attendance logs to another section on update', () => {
      const existing = { sectionId: 'sec-1', status: 'Present' };
      const badUpdate = { sectionId: 'sec-2', status: 'Present' };
      expect(canUpdateAttendance(teacherAuth, teacherDoc, existing, badUpdate, section1)).toBe(false);

      const validUpdate = { sectionId: 'sec-1', status: 'Absent' };
      expect(canUpdateAttendance(teacherAuth, teacherDoc, existing, validUpdate, section1)).toBe(true);
    });
  });

  describe('Submissions Collection & Response Security', () => {
    it('requires admin authority and size constraints for task creation', () => {
      const validTask = {
        createdBy: 'admin_123',
        title: 'SF1 Submission',
        description: 'Upload SF1 by Friday',
        deadline: '2026-10-15'
      };
      expect(canCreateSubmission(adminAuth, adminDoc, validTask)).toBe(true);
      expect(canCreateSubmission(teacherAuth, teacherDoc, validTask)).toBe(false);

      // Title exceeding max length (200 chars)
      const oversizedTask = { ...validTask, title: 'A'.repeat(201) };
      expect(canCreateSubmission(adminAuth, adminDoc, oversizedTask)).toBe(false);
    });

    it('ensures teachers can only submit responses for their own identity', () => {
      const validResponse = {
        submissionId: 'task-1',
        userId: 'teacher_456',
        status: 'Submitted'
      };
      expect(canCreateSubmissionResponse(teacherAuth, teacherDoc, validResponse)).toBe(true);

      const spoofedResponse = { ...validResponse, userId: 'other_teacher' };
      expect(canCreateSubmissionResponse(teacherAuth, teacherDoc, spoofedResponse)).toBe(false);
    });
  });

  describe('Notifications Anti-Spoofing & Payload Constraints', () => {
    it('prevents sender spoofing in notifications', () => {
      const spoofed = {
        senderId: 'admin_123',
        title: 'Urgent Alert',
        message: 'School canceled tomorrow'
      };
      // Regular teacher attempting to forge senderId as admin
      expect(canCreateNotification(teacherAuth, spoofed)).toBe(false);

      const validTeacherNotif = {
        senderId: 'teacher_456',
        title: 'Class Update',
        message: 'Reminder for homework'
      };
      expect(canCreateNotification(teacherAuth, validTeacherNotif)).toBe(true);

      const systemNotif = {
        senderId: 'system',
        title: 'System Notice',
        message: 'Automated notice'
      };
      expect(canCreateNotification(teacherAuth, systemNotif)).toBe(true);
    });

    it('enforces payload size limits on notifications', () => {
      const hugeMessage = {
        senderId: 'teacher_456',
        title: 'Valid Title',
        message: 'x'.repeat(2001)
      };
      expect(canCreateNotification(teacherAuth, hugeMessage)).toBe(false);
    });
  });

  describe('Audit Logs Immutability', () => {
    it('allows authorized users to write audit log entries within bounds', () => {
      const validLog = {
        actorId: 'teacher_456',
        action: 'ATTENDANCE_LOGGED',
        category: 'ATTENDANCE'
      };
      expect(canCreateAuditLog(teacherAuth, teacherDoc, validLog)).toBe(true);

      // Unauthenticated or spoofed
      expect(canCreateAuditLog(teacherAuth, teacherDoc, { ...validLog, actorId: 'other' })).toBe(false);
    });

    it('strictly forbids updating or deleting audit logs', () => {
      expect(canMutateAuditLog()).toBe(false);
    });
  });
});
