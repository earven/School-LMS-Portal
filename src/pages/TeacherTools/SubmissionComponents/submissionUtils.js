/* ── DepEd Standard Form & Task Presets ── */
export const TASK_CATEGORIES = [
  'All',
  'DepEd Form',
  'Academic',
  'Evaluation',
  'Professional Dev',
  'General'
];

export const getCategoryBadge = (category) => {
  switch (category) {
    case 'DepEd Form':
      return { label: 'DepEd Form', icon: '🏛️', className: 'cat-deped' };
    case 'Academic':
      return { label: 'Academic', icon: '📚', className: 'cat-academic' };
    case 'Evaluation':
      return { label: 'Evaluation', icon: '⭐', className: 'cat-evaluation' };
    case 'Professional Dev':
      return { label: 'Professional Dev', icon: '🎓', className: 'cat-profdev' };
    default:
      return { label: category || 'General', icon: '📌', className: 'cat-general' };
  }
};

export const DEPED_TASK_TEMPLATES = [
  {
    name: 'SF1 - School Register',
    title: 'School Form 1 (SF1) - Master School Register',
    description: 'Please generate, review, and upload your finalized School Form 1 (SF1) Masterlist of Learners with complete LRNs, birth certificate details, and guardian information.',
    recipients: 'advisers',
    linkType: 'onedrive',
    category: 'DepEd Form'
  },
  {
    name: 'SF2 - Daily Attendance',
    title: 'School Form 2 (SF2) - Monthly Attendance Summary Report',
    description: 'Submit your certified SF2 Monthly Attendance summary including computed average daily attendance (ADA) and percentage of attendance for the month.',
    recipients: 'advisers',
    linkType: 'onedrive',
    category: 'DepEd Form'
  },
  {
    name: 'SF4 - Learner Movement',
    title: 'School Form 4 (SF4) - Monthly Report on Learner Movement',
    description: 'Submit your monthly summary of transferred in/out, dropped, and promoted learners for Division Office submission and LIS consolidation.',
    recipients: 'advisers',
    linkType: 'onedrive',
    category: 'DepEd Form'
  },
  {
    name: 'SF5 - Promotion Report',
    title: 'School Form 5 (SF5) - Report on Promotion and Level of Proficiency',
    description: 'Submit your finalized SF5 Promotion Report with computed general averages, action taken, and proficiency distributions.',
    recipients: 'advisers',
    linkType: 'onedrive',
    category: 'DepEd Form'
  },
  {
    name: 'Summative Tests (ST1 & ST2)',
    title: 'Term Summative Assessment Tests 1 & 2 Questionnaires & Item Analyses',
    description: 'Submit copies of teacher-developed Summative Assessments 1 and 2 administered during the Instructional Block prior to the Term Examination (DO 009, s. 2026).',
    recipients: 'all',
    linkType: 'googledrive',
    category: 'Academic'
  },
  {
    name: 'SF9 - Form 138 (Cards)',
    title: 'School Form 9 (SF9) - Term Progress Report Cards (End-of-Term Block)',
    description: 'Upload signed Form 138 report cards completed during the End-of-Term Block (8–10 days window) prior to card distribution day (DO 009, s. 2026).',
    recipients: 'advisers',
    linkType: 'onedrive',
    category: 'DepEd Form'
  },
  {
    name: 'TOS & Exam Papers',
    title: 'Term Examination TOS & Questionnaires (Last Week of Instructional Block)',
    description: 'Submit your validated Table of Specifications (TOS), draft exam questionnaire with answer keys, and item analysis matrix administered during the last week of the Instructional Block (DO 009, s. 2026).',
    recipients: 'all',
    linkType: 'googledrive',
    category: 'Academic'
  },
  {
    name: 'COT Rating Sheet',
    title: 'Classroom Observation Tool (COT) Rating Sheet & Lesson Plan',
    description: 'Upload your observer-signed COT rating sheet along with the corresponding Detailed Lesson Plan (DLP/DLL) used during the observation cycle.',
    recipients: 'all',
    linkType: 'onedrive',
    category: 'Evaluation'
  },
  {
    name: 'INSET / LAC Outputs',
    title: 'INSET / LAC Session Attendance, Documentation & MOVs',
    description: 'Submit your individual learning log, LAC session minutes, attendance sheet, and Means of Verification (MOVs).',
    recipients: 'all',
    linkType: 'googledrive',
    category: 'Professional Dev'
  }
];

export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  let date;
  if (dateInput && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    if (!date) {
      date = new Date(dateInput);
    }
  }
  
  if (isNaN(date.getTime())) return 'N/A';
  
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}-${d}-${y}`;
};

export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date = (dateInput && typeof dateInput.toDate === 'function') ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${hours}:${minutes} ${ampm}`;
  
  return `${m}-${d}-${y}, ${strTime}`;
};

export const getDeadlineCountdown = (deadlineStr) => {
  if (!deadlineStr) return { label: 'No deadline', class: 'cd-normal' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadlineStr);
  target.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `⚠️ Overdue by ${Math.abs(diffDays)}d`, class: 'cd-overdue', isOverdue: true };
  if (diffDays === 0) return { label: '🔥 Due Today', class: 'cd-today', isUrgent: true };
  if (diffDays === 1) return { label: '⏰ Due Tomorrow', class: 'cd-tomorrow', isUrgent: true };
  if (diffDays <= 3) return { label: `⏳ Due in ${diffDays} days`, class: 'cd-soon', isUrgent: true };
  if (diffDays <= 7) return { label: `📅 Due in ${diffDays} days`, class: 'cd-week' };
  return { label: `📅 Due in ${Math.ceil(diffDays / 7)}w`, class: 'cd-normal' };
};

export const detectLinkType = (url) => {
  if (!url) return 'onedrive';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('docs.google.com/forms') || lowerUrl.includes('forms.gle') || lowerUrl.includes('jotform.com') || lowerUrl.includes('cognitoforms.com') || lowerUrl.includes('form')) {
    return 'form';
  }
  if (lowerUrl.includes('survey') || lowerUrl.includes('typeform.com') || lowerUrl.includes('survey-monkey') || lowerUrl.includes('surveymonkey.com')) {
    return 'survey';
  }
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('google.com/drive')) {
    return 'googledrive';
  }
  if (lowerUrl.includes('onedrive') || lowerUrl.includes('sharepoint.com') || lowerUrl.includes('dropbox.com')) {
    return 'onedrive';
  }
  return 'general';
};

export const getLinkIndicator = (task) => {
  const type = task.linkType || detectLinkType(task.folderLink);
  switch (type) {
    case 'form':
      return { label: 'Form Link Attached', icon: '📝' };
    case 'survey':
      return { label: 'Survey Link Attached', icon: '📋' };
    case 'onedrive':
      return { label: 'Shared Folder Attached', icon: '📂' };
    case 'googledrive':
      return { label: 'Google Drive Attached', icon: '📁' };
    default:
      return { label: 'External Link Attached', icon: '🔗' };
  }
};

export const getLinkButtonProps = (task) => {
  const type = task.linkType || detectLinkType(task.folderLink);
  switch (type) {
    case 'form':
      return { label: 'Fill out Google Form', icon: '📝' };
    case 'survey':
      return { label: 'Open Survey Link', icon: '📋' };
    case 'onedrive':
      return { label: 'Open OneDrive Submission Folder', icon: '📁' };
    case 'googledrive':
      return { label: 'Open Google Drive Folder', icon: '📁' };
    default:
      return { label: 'Open External Link', icon: '🔗' };
  }
};

export const getBannerProps = (task) => {
  const type = task.linkType || detectLinkType(task.folderLink);
  switch (type) {
    case 'form':
      return {
        title: 'External Form Submission',
        text: 'Please open the form link above and fill it out, then confirm your submission details below if needed.',
        icon: '📝'
      };
    case 'survey':
      return {
        title: 'Survey Participation',
        text: 'Please click the survey link above to complete the survey, then document any details below.',
        icon: '📋'
      };
    case 'onedrive':
      return {
        title: 'OneDrive Upload',
        text: task.folderLink 
          ? "Please upload your report to the designated OneDrive folder above, then paste your file's specific sharing link below."
          : "Upload your report to OneDrive and paste the shared link below.",
        icon: '☁️'
      };
    case 'googledrive':
      return {
        title: 'Google Drive Upload',
        text: task.folderLink 
          ? "Please upload your report to the designated Google Drive folder above, then paste your file's specific sharing link below."
          : "Upload your report to Google Drive and paste the shared link below.",
        icon: '📁'
      };
    default:
      return {
        title: 'External Link Submission',
        text: 'Follow the link above to submit your report or information, then paste the submission proof or link below.',
        icon: '🔗'
      };
  }
};
