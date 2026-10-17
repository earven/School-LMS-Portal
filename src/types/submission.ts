/**
 * Submission Tracker & DepEd Compliance Task Contracts
 */

export type SubmissionRecipientType = 'all' | 'advisers' | 'jhs' | 'shs' | string;
export type SubmissionLinkType = 'onedrive' | 'googledrive' | 'file' | 'link' | string;
export type SubmissionCategory = 'DepEd Form' | 'Academic' | 'Administrative' | 'Inventory' | string;
export type ResponseStatus = 'Submitted' | 'Approved' | 'Revision Requested' | 'Pending' | string;

export interface SubmissionTask {
  id?: string;
  title: string;
  description: string;
  deadline: string; // ISO or date string
  recipients: SubmissionRecipientType | string[];
  category?: SubmissionCategory;
  linkType?: SubmissionLinkType;
  targetLink?: string;
  allowFileAttachment?: boolean;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SubmissionResponse {
  id?: string;
  submissionId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  status: ResponseStatus;
  submittedAt?: any;
  fileUrl?: string;
  driveLink?: string;
  remarks?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  feedback?: string;
}
