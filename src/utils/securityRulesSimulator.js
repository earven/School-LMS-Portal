/**
 * Firestore Security Rules Logic Simulator & Validator
 * 
 * Replicates the exact security logic defined in firestore.rules for
 * local unit testing, penetration test scenarios, and regression prevention.
 */

export const getRole = (auth, userDoc) => {
  if (!auth?.uid || !userDoc) return 'guest';
  return userDoc.role || 'guest';
};

export const isSignedIn = (auth) => {
  return !!auth?.uid;
};

export const isAdmin = (auth, userDoc) => {
  const role = getRole(auth, userDoc);
  return isSignedIn(auth) && (role === 'admin' || role === 'system_admin');
};

export const isTeacher = (auth, userDoc) => {
  return isSignedIn(auth) && getRole(auth, userDoc) === 'teacher';
};

export const isAuthorized = (auth, userDoc) => {
  const role = getRole(auth, userDoc);
  return isSignedIn(auth) && (role === 'teacher' || role === 'admin' || role === 'system_admin');
};

/**
 * Users / Personnel Collection Rules
 */
export const canReadUser = (auth) => {
  return isSignedIn(auth);
};

export const canCreateUser = (auth, targetUserId, newUserData) => {
  if (!isSignedIn(auth)) return false;
  if (auth.uid !== targetUserId) return false;

  // Prevent role escalation on profile creation
  if (newUserData.role && !['pending', 'teacher'].includes(newUserData.role)) {
    return false;
  }

  // Prevent self-assigning enrolment coordinator privileges
  if (newUserData.isEnrolmentCoordinator === true) {
    return false;
  }

  return true;
};

export const canUpdateUser = (auth, currentUserDoc, targetUserId, existingUserData, updatedUserData) => {
  if (!isSignedIn(auth)) return false;

  // Admin can update any profile
  if (isAdmin(auth, currentUserDoc)) return true;

  // Non-admin can only update their own profile
  if (auth.uid !== targetUserId) return false;

  // Check diff of affected keys
  const affectedKeys = Object.keys(updatedUserData).filter(
    k => updatedUserData[k] !== existingUserData[k]
  );

  // Cannot modify assignedSections or isEnrolmentCoordinator
  if (affectedKeys.includes('assignedSections') || affectedKeys.includes('isEnrolmentCoordinator')) {
    return false;
  }

  // Role modification rules: only pending -> teacher is allowed for self-updates
  if (affectedKeys.includes('role')) {
    if (existingUserData.role !== 'pending' || updatedUserData.role !== 'teacher') {
      return false;
    }
  }

  return true;
};

/**
 * Students Collection Rules
 */
export const canReadStudent = (auth, userDoc) => {
  return isAdmin(auth, userDoc) || isTeacher(auth, userDoc);
};

export const canCreateStudent = (auth, userDoc, newStudentData, sectionDoc) => {
  if (isAdmin(auth, userDoc)) return true;

  if (isTeacher(auth, userDoc)) {
    return sectionDoc?.adviserId === auth.uid;
  }

  return false;
};

export const canUpdateStudent = (auth, userDoc, existingStudentData, updatedStudentData, currentSectionDoc, newSectionDoc) => {
  if (isAdmin(auth, userDoc)) return true;

  if (isTeacher(auth, userDoc)) {
    // Must be adviser of the existing section AND the new section
    const isCurrentAdviser = currentSectionDoc?.adviserId === auth.uid;
    const isNewAdviser = newSectionDoc?.adviserId === auth.uid;
    return isCurrentAdviser && isNewAdviser;
  }

  return false;
};

export const canDeleteStudent = (auth, userDoc) => {
  return isAdmin(auth, userDoc);
};

/**
 * Attendance Collection Rules
 */
export const canCreateAttendance = (auth, userDoc, attendanceData, sectionDoc) => {
  if (isAdmin(auth, userDoc)) return true;
  if (isTeacher(auth, userDoc)) {
    return sectionDoc?.adviserId === auth.uid;
  }
  return false;
};

export const canUpdateAttendance = (auth, userDoc, existingData, updatedData, sectionDoc) => {
  if (isAdmin(auth, userDoc)) return true;
  if (isTeacher(auth, userDoc)) {
    return sectionDoc?.adviserId === auth.uid && updatedData.sectionId === existingData.sectionId;
  }
  return false;
};

/**
 * Submissions & Responses Collection Rules
 */
export const canCreateSubmission = (auth, userDoc, submissionData) => {
  if (!isAdmin(auth, userDoc)) return false;
  if (submissionData.createdBy !== auth.uid) return false;
  if (typeof submissionData.title !== 'string' || submissionData.title.length > 200) return false;
  if (typeof submissionData.description !== 'string' || submissionData.description.length > 5000) return false;
  if (typeof submissionData.deadline !== 'string') return false;
  return true;
};

export const canCreateSubmissionResponse = (auth, userDoc, responseData) => {
  if (!isTeacher(auth, userDoc)) return false;
  if (responseData.userId !== auth.uid) return false;
  if (typeof responseData.submissionId !== 'string') return false;
  if (responseData.status !== 'Submitted') return false;
  return true;
};

/**
 * Notifications Collection Rules
 */
export const canCreateNotification = (auth, notifData) => {
  if (!isSignedIn(auth)) return false;
  const validSender = notifData.senderId === auth.uid || notifData.senderId === 'system';
  if (!validSender) return false;
  if (typeof notifData.title !== 'string' || notifData.title.length > 150) return false;
  if (typeof notifData.message !== 'string' || notifData.message.length > 2000) return false;
  return true;
};

/**
 * Audit Logs Rules (Strict Immutability)
 */
export const canCreateAuditLog = (auth, userDoc, logData) => {
  if (!isAuthorized(auth, userDoc)) return false;
  if (logData.actorId !== auth.uid) return false;
  if (typeof logData.action !== 'string' || logData.action.length > 100) return false;
  if (typeof logData.category !== 'string' || logData.category.length > 100) return false;
  return true;
};

export const canMutateAuditLog = () => false; // Immutable: always false
