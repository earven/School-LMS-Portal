/**
 * sf1Generator.js
 * Generates official DepEd School Form 1 (SF1) School Register
 * in sex-segregated layout with complete learner demographics,
 * summary box, and export/print utilities.
 */

import { buildFullName } from './personnelName';

/**
 * Calculates learner's age based on birthdate.
 * @param {string} birthdateStr - 'YYYY-MM-DD'
 * @returns {number|string}
 */
export const calculateAge = (birthdateStr) => {
  if (!birthdateStr) return '';
  const birthDate = new Date(birthdateStr);
  if (isNaN(birthDate.getTime())) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : '';
};

/**
 * Prepares and sex-segregates learner records for SF1.
 * Males first (alphabetical), Females second (alphabetical).
 * @param {Array<Object>} students 
 * @returns {{ males: Array<Object>, females: Array<Object>, totalMale: number, totalFemale: number, total4Ps: number, grandTotal: number }}
 */
export const prepareSF1Data = (students = []) => {
  const males = [];
  const females = [];
  let total4Ps = 0;

  for (const s of students) {
    const isMale = (s.gender || '').toLowerCase() === 'male';
    const isFemale = (s.gender || '').toLowerCase() === 'female';
    
    if (s.is4Ps) total4Ps++;

    const formattedStudent = {
      ...s,
      lrn: s.lrn || s.id || '',
      fullName: buildFullName({
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName,
        nameExtension: s.extension
      }),
      age: s.age || calculateAge(s.birthdate) || '',
      address: s.address || '',
      fatherName: s.fatherName || '',
      motherMaidenName: s.motherMaidenName || '',
      guardianName: s.guardianName || '',
      guardianRelationship: s.guardianRelationship || '',
      contactNumber: s.contactNumber || s.phone || '',
      motherTongue: s.motherTongue || 'Filipino',
      ipEthnicGroup: s.ipEthnicGroup || 'N/A',
      religion: s.religion || 'Christianity',
      remarks: s.remarks || (s.is4Ps ? '4Ps Beneficiary' : (s.status && s.status !== 'Active' ? s.status : ''))
    };

    if (isFemale) {
      females.push(formattedStudent);
    } else {
      males.push(formattedStudent);
    }
  }

  const sortAlpha = (a, b) => {
    const lastA = (a.lastName || '').toLowerCase();
    const lastB = (b.lastName || '').toLowerCase();
    if (lastA !== lastB) return lastA.localeCompare(lastB);
    return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
  };

  males.sort(sortAlpha);
  females.sort(sortAlpha);

  return {
    males,
    females,
    totalMale: males.length,
    totalFemale: females.length,
    grandTotal: males.length + females.length,
    total4Ps
  };
};

/**
 * Generates printable HTML string for DepEd SF1 School Register.
 */
export const generateSF1Html = (students, schoolInfo, sectionInfo) => {
  const data = prepareSF1Data(students);
  const schoolName = schoolInfo?.schoolName || 'School LMS Portal';
  const schoolId = schoolInfo?.schoolId || 'N/A';
  const region = schoolInfo?.region || 'Region';
  const division = schoolInfo?.division || 'Division';
  const gradeLevel = sectionInfo?.gradeLevel || 'Grade';
  const sectionName = sectionInfo?.name || 'Section';
  const academicYear = schoolInfo?.academicYear || '2025-2026';
  const adviserName = sectionInfo?.adviserName || 'Adviser';

  const renderRow = (s, idx) => `
    <tr>
      <td style="text-align:center;">${idx}</td>
      <td style="text-align:center; font-family:monospace; font-weight:bold;">${s.lrn}</td>
      <td style="font-weight:600; text-align:left;">${s.fullName}</td>
      <td style="text-align:center;">${s.gender ? s.gender.charAt(0).toUpperCase() : 'M'}</td>
      <td style="text-align:center;">${s.birthdate || ''}</td>
      <td style="text-align:center;">${s.age || ''}</td>
      <td style="text-align:center;">${s.motherTongue}</td>
      <td style="text-align:center;">${s.ipEthnicGroup}</td>
      <td style="text-align:center;">${s.religion}</td>
      <td style="text-align:left; font-size:10px;">${s.address}</td>
      <td style="text-align:left; font-size:10px;">${s.fatherName}</td>
      <td style="text-align:left; font-size:10px;">${s.motherMaidenName}</td>
      <td style="text-align:left; font-size:10px;">${s.guardianName ? `${s.guardianName} (${s.guardianRelationship || 'Guardian'})` : ''}</td>
      <td style="text-align:center; font-size:10px;">${s.contactNumber}</td>
      <td style="text-align:left; font-size:10px; font-weight:bold;">${s.remarks}</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>School Form 1 (SF1) - ${gradeLevel} ${sectionName}</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #000; }
        .sf1-header { text-align: center; margin-bottom: 12px; }
        .sf1-title { font-size: 16px; font-weight: bold; margin: 2px 0; }
        .sf1-subtitle { font-size: 12px; font-style: italic; margin-bottom: 8px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 11px; font-weight: bold; margin-bottom: 10px; border: 1px solid #000; padding: 6px; }
        table.sf1-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.sf1-table th, table.sf1-table td { border: 1px solid #000; padding: 4px 3px; font-size: 10px; }
        table.sf1-table th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
        .section-separator { background-color: #e2e8f0; font-weight: bold; text-align: left; padding: 4px 8px; }
        .summary-box { display: flex; justify-content: space-between; border: 1px solid #000; padding: 8px; font-size: 11px; margin-top: 10px; }
        .signatories { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
        .sig-block { text-align: center; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="sf1-header">
        <div style="font-weight:bold; font-size:12px;">Republic of the Philippines • Department of Education</div>
        <div class="sf1-title">School Form 1 (SF1) School Register</div>
        <div class="sf1-subtitle">(Masterlist of Enrolled Learners by Section)</div>
      </div>

      <div class="meta-grid">
        <div>School ID: <u>${schoolId}</u></div>
        <div>Region: <u>${region}</u></div>
        <div>Division: <u>${division}</u></div>
        <div>School Year: <u>${academicYear}</u></div>
        <div>School Name: <u>${schoolName}</u></div>
        <div>Grade Level: <u>${gradeLevel}</u></div>
        <div>Section: <u>${sectionName}</u></div>
        <div>Class Adviser: <u>${adviserName}</u></div>
      </div>

      <table class="sf1-table">
        <thead>
          <tr>
            <th style="width:25px;">#</th>
            <th style="width:90px;">LRN</th>
            <th style="width:180px;">Learner's Name<br><small>(Last, First, Middle, Ext)</small></th>
            <th style="width:30px;">Sex</th>
            <th style="width:70px;">Birth Date<br><small>(YYYY-MM-DD)</small></th>
            <th style="width:30px;">Age</th>
            <th style="width:70px;">Mother Tongue</th>
            <th style="width:70px;">IP (Ethnic Group)</th>
            <th style="width:70px;">Religion</th>
            <th>Complete Address</th>
            <th>Father's Name</th>
            <th>Mother's Maiden Name</th>
            <th>Guardian's Name</th>
            <th style="width:80px;">Contact No.</th>
            <th style="width:90px;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="15" class="section-separator">MALE (${data.totalMale} Learners)</td>
          </tr>
          ${data.males.map((s, i) => renderRow(s, i + 1)).join('')}
          <tr>
            <td colspan="15" class="section-separator">FEMALE (${data.totalFemale} Learners)</td>
          </tr>
          ${data.females.map((s, i) => renderRow(s, i + 1)).join('')}
        </tbody>
      </table>

      <div class="summary-box">
        <div><strong>Total Male:</strong> ${data.totalMale}</div>
        <div><strong>Total Female:</strong> ${data.totalFemale}</div>
        <div><strong>Combined Total:</strong> ${data.grandTotal}</div>
        <div><strong>4Ps Beneficiaries:</strong> ${data.total4Ps}</div>
      </div>

      <div class="signatories">
        <div>
          <br><br>
          <div class="sig-block">
            ${adviserName.toUpperCase()}<br>
            <span style="font-weight:normal; font-size:10px;">Class Adviser</span>
          </div>
        </div>
        <div>
          <br><br>
          <div class="sig-block">
            SCHOOL HEAD / PRINCIPAL<br>
            <span style="font-weight:normal; font-size:10px;">School Head</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Triggers opening of formatted SF1 print register in a new window.
 */
export const printSF1Register = (students, schoolInfo, sectionInfo) => {
  const html = generateSF1Html(students, schoolInfo, sectionInfo);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the SF1 School Register.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

/**
 * Exports SF1 data to standard CSV format.
 */
export const exportSF1ToCSV = (students, schoolInfo, sectionInfo) => {
  const data = prepareSF1Data(students);
  const allRows = [...data.males, ...data.females];

  const headers = [
    'LRN',
    'Last Name',
    'First Name',
    'Middle Name',
    'Extension',
    'Sex',
    'Birthdate',
    'Age',
    'Grade Level',
    'Section',
    'Mother Tongue',
    'IP Ethnic Group',
    'Religion',
    'Complete Address',
    'Father Name',
    'Mother Maiden Name',
    'Guardian Name',
    'Guardian Relationship',
    'Contact Number',
    '4Ps Beneficiary',
    'Nutritional Status',
    'Height (cm)',
    'Weight (kg)',
    'BMI',
    'Remarks'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [headers.join(',')];

  for (const s of allRows) {
    csvRows.push([
      escapeCSV(s.lrn),
      escapeCSV(s.lastName),
      escapeCSV(s.firstName),
      escapeCSV(s.middleName),
      escapeCSV(s.extension),
      escapeCSV(s.gender),
      escapeCSV(s.birthdate),
      escapeCSV(s.age),
      escapeCSV(s.gradeLevel),
      escapeCSV(sectionInfo?.name || s.sectionId),
      escapeCSV(s.motherTongue),
      escapeCSV(s.ipEthnicGroup),
      escapeCSV(s.religion),
      escapeCSV(s.address),
      escapeCSV(s.fatherName),
      escapeCSV(s.motherMaidenName),
      escapeCSV(s.guardianName),
      escapeCSV(s.guardianRelationship),
      escapeCSV(s.contactNumber),
      escapeCSV(s.is4Ps ? 'Yes' : 'No'),
      escapeCSV(s.nutritionalStatus || 'Normal'),
      escapeCSV(s.heightCm || ''),
      escapeCSV(s.weightKg || ''),
      escapeCSV(s.bmi || ''),
      escapeCSV(s.remarks)
    ].join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `SF1_School_Register_${(sectionInfo?.name || 'Masterlist').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return true;
};
