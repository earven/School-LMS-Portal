/**
 * sf7Generator.js
 * Generates official DepEd School Form 7 (SF7)
 * School Personnel Assignment List and Basic Profile.
 */

import { buildFullName } from './personnelName';

/**
 * Prepares and categorizes personnel records for SF7.
 * @param {Array<Object>} personnelList 
 * @param {Array<Object>} sections 
 * @returns {Object}
 */
export const prepareSF7Data = (personnelList = [], sections = []) => {
  const teaching = [];
  const nonTeaching = [];

  for (const p of personnelList) {
    const role = (p.role || '').toLowerCase();
    const isTeacher = role === 'teacher' || role === 'faculty' || (p.position || '').toLowerCase().includes('teacher');
    
    // Find advisory sections
    const advisorySections = sections
      .filter(s => s.adviserId === p.id)
      .map(s => `${s.gradeLevel} - ${s.name}`)
      .join(', ');

    // Subjects taught
    const subjectsStr = Array.isArray(p.subjects) 
      ? p.subjects.join(', ')
      : (p.subjects || p.subjectSpecialization || 'General / None');

    // Ancillary duties
    const ancillaryStr = Array.isArray(p.ancillaryDuties)
      ? p.ancillaryDuties.join(', ')
      : (p.ancillaryDuties || 'None');

    const formatted = {
      id: p.id,
      employeeNumber: p.employeeNumber || p.id || 'N/A',
      fullName: buildFullName({
        lastName: p.lastName,
        firstName: p.firstName,
        middleName: p.middleName,
        nameExtension: p.nameExtension
      }),
      sex: (p.gender || p.sex || 'Female').charAt(0).toUpperCase(),
      fundSource: p.fundSource || 'Nationally-Funded (DepEd)',
      position: p.position || 'Teacher I',
      plantillaItemNo: p.plantillaItemNo || 'N/A',
      highestDegree: p.highestDegree || p.educationalAttainment || "Bachelor's Degree",
      major: p.major || p.specialization || 'N/A',
      advisorySections: advisorySections || 'None',
      subjects: subjectsStr,
      ancillaryDuties: ancillaryStr,
      remarks: p.remarks || (p.status || 'Active')
    };

    if (isTeacher) {
      teaching.push(formatted);
    } else {
      nonTeaching.push(formatted);
    }
  }

  const sortAlpha = (a, b) => (a.fullName || '').localeCompare(b.fullName || '');
  teaching.sort(sortAlpha);
  nonTeaching.sort(sortAlpha);

  const maleTeachers = teaching.filter(t => t.sex === 'M').length;
  const femaleTeachers = teaching.filter(t => t.sex === 'F').length;
  const maleNonTeaching = nonTeaching.filter(nt => nt.sex === 'M').length;
  const femaleNonTeaching = nonTeaching.filter(nt => nt.sex === 'F').length;

  return {
    teaching,
    nonTeaching,
    totalTeaching: teaching.length,
    totalNonTeaching: nonTeaching.length,
    maleTeachers,
    femaleTeachers,
    maleNonTeaching,
    femaleNonTeaching,
    grandTotal: teaching.length + nonTeaching.length
  };
};

/**
 * Generates printable HTML string for DepEd SF7.
 */
export const generateSF7Html = (personnelList, sections, schoolInfo) => {
  const data = prepareSF7Data(personnelList, sections);
  const schoolName = schoolInfo?.schoolName || 'School LMS Portal';
  const schoolId = schoolInfo?.schoolId || '123456';
  const region = schoolInfo?.region || 'Region';
  const division = schoolInfo?.division || 'Division';
  const academicYear = schoolInfo?.academicYear || '2025-2026';

  const renderRow = (p, idx) => `
    <tr>
      <td style="text-align:center;">${idx}</td>
      <td style="text-align:center; font-family:monospace; font-weight:bold;">${p.employeeNumber}</td>
      <td style="font-weight:600; text-align:left;">${p.fullName}</td>
      <td style="text-align:center;">${p.sex}</td>
      <td style="text-align:left; font-size:10px;">${p.fundSource}</td>
      <td style="text-align:left; font-weight:600; font-size:10px;">${p.position}</td>
      <td style="text-align:center; font-size:9.5px; font-family:monospace;">${p.plantillaItemNo}</td>
      <td style="text-align:left; font-size:9.5px;">${p.highestDegree} (${p.major})</td>
      <td style="text-align:left; font-size:9.5px;">${p.advisorySections}</td>
      <td style="text-align:left; font-size:9.5px;">${p.subjects}</td>
      <td style="text-align:left; font-size:9.5px;">${p.ancillaryDuties}</td>
      <td style="text-align:center; font-size:9.5px;">${p.remarks}</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>School Form 7 (SF7) - ${schoolName}</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #000; }
        .sf7-header { text-align: center; margin-bottom: 12px; }
        .sf7-title { font-size: 15px; font-weight: bold; margin: 2px 0; }
        .sf7-subtitle { font-size: 11px; font-style: italic; margin-bottom: 8px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 10.5px; font-weight: bold; margin-bottom: 10px; border: 1px solid #000; padding: 6px; }
        table.sf7-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.sf7-table th, table.sf7-table td { border: 1px solid #000; padding: 4px 3px; font-size: 9.5px; }
        table.sf7-table th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
        .category-separator { background-color: #e2e8f0; font-weight: bold; text-align: left; padding: 4px 8px; font-size: 10px; }
        .summary-box { display: flex; justify-content: space-between; border: 1px solid #000; padding: 8px; font-size: 10.5px; margin-top: 10px; }
        .signatories { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 25px; }
        .sig-block { text-align: center; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="sf7-header">
        <div style="font-weight:bold; font-size:11px;">Republic of the Philippines • Department of Education</div>
        <div class="sf7-title">School Form 7 (SF7) School Personnel Assignment List and Basic Profile</div>
        <div class="sf7-subtitle">(Teaching and Non-Teaching Personnel Masterlist)</div>
      </div>

      <div class="meta-grid">
        <div>School ID: <u>${schoolId}</u></div>
        <div>Region: <u>${region}</u></div>
        <div>Division: <u>${division}</u></div>
        <div>School Year: <u>${academicYear}</u></div>
        <div style="grid-column: span 2;">School Name: <u>${schoolName}</u></div>
        <div>Total Teaching: <u>${data.totalTeaching}</u></div>
        <div>Total Non-Teaching: <u>${data.totalNonTeaching}</u></div>
      </div>

      <table class="sf7-table">
        <thead>
          <tr>
            <th style="width:25px;">#</th>
            <th style="width:75px;">Emp. No.</th>
            <th style="width:160px;">Full Name<br><small>(Last, First, Middle, Ext)</small></th>
            <th style="width:25px;">Sex</th>
            <th style="width:85px;">Funding Source</th>
            <th style="width:95px;">Position / Title</th>
            <th style="width:80px;">Plantilla Item</th>
            <th style="width:130px;">Educational Attainment</th>
            <th style="width:110px;">Advisory Section(s)</th>
            <th style="width:110px;">Subjects Taught</th>
            <th>Ancillary Duties / Designations</th>
            <th style="width:65px;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="12" class="category-separator">I. TEACHING PERSONNEL (${data.totalTeaching} Personnel: ${data.maleTeachers} Male, ${data.femaleTeachers} Female)</td>
          </tr>
          ${data.teaching.map((p, i) => renderRow(p, i + 1)).join('')}
          <tr>
            <td colspan="12" class="category-separator">II. NON-TEACHING & ADMINISTRATIVE PERSONNEL (${data.totalNonTeaching} Personnel: ${data.maleNonTeaching} Male, ${data.femaleNonTeaching} Female)</td>
          </tr>
          ${data.nonTeaching.map((p, i) => renderRow(p, i + 1)).join('')}
        </tbody>
      </table>

      <div class="summary-box">
        <div><strong>Teaching Staff:</strong> ${data.totalTeaching} (M: ${data.maleTeachers}, F: ${data.femaleTeachers})</div>
        <div><strong>Non-Teaching Staff:</strong> ${data.totalNonTeaching} (M: ${data.maleNonTeaching}, F: ${data.femaleNonTeaching})</div>
        <div><strong>Total Faculty & Personnel:</strong> ${data.grandTotal}</div>
      </div>

      <div class="signatories">
        <div>
          <br><br>
          <div class="sig-block">
            ADMINISTRATIVE OFFICER / HR<br>
            <span style="font-weight:normal; font-size:10px;">Prepared by</span>
          </div>
        </div>
        <div>
          <br><br>
          <div class="sig-block">
            SCHOOL HEAD / PRINCIPAL<br>
            <span style="font-weight:normal; font-size:10px;">Certified Correct</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Opens SF7 print preview in a new window.
 */
export const printSF7Register = (personnelList, sections, schoolInfo) => {
  const html = generateSF7Html(personnelList, sections, schoolInfo);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the SF7 School Personnel Register.');
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
 * Exports SF7 data to CSV.
 */
export const exportSF7ToCSV = (personnelList, sections, schoolInfo) => {
  const data = prepareSF7Data(personnelList, sections);
  const allRows = [...data.teaching, ...data.nonTeaching];

  const headers = [
    'Employee Number',
    'Full Name',
    'Sex',
    'Category',
    'Funding Source',
    'Position / Title',
    'Plantilla Item No',
    'Highest Degree',
    'Major / Specialization',
    'Advisory Section(s)',
    'Subjects Taught',
    'Ancillary Duties',
    'Remarks'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [headers.join(',')];

  for (const p of allRows) {
    const isTeacher = data.teaching.some(t => t.id === p.id);
    csvRows.push([
      escapeCSV(p.employeeNumber),
      escapeCSV(p.fullName),
      escapeCSV(p.sex),
      escapeCSV(isTeacher ? 'Teaching' : 'Non-Teaching'),
      escapeCSV(p.fundSource),
      escapeCSV(p.position),
      escapeCSV(p.plantillaItemNo),
      escapeCSV(p.highestDegree),
      escapeCSV(p.major),
      escapeCSV(p.advisorySections),
      escapeCSV(p.subjects),
      escapeCSV(p.ancillaryDuties),
      escapeCSV(p.remarks)
    ].join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `SF7_School_Personnel_Assignment_${(schoolInfo?.schoolName || 'Portal').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return true;
};
