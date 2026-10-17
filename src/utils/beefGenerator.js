/**
 * beefGenerator.js
 * Generates official DepEd Basic Education Enrolment Form (BEEF)
 * documents and computes aggregated Enrolment Quick Count Matrices.
 */

import { buildFullName } from './personnelName';

export const GRADE_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12'
];

/**
 * Computes Enrolment Quick Count Matrix by Grade Level and Gender.
 * @param {Array<Object>} enrollees 
 * @returns {Object}
 */
export const computeQuickCountMatrix = (enrollees = []) => {
  const matrix = {};
  for (const grade of GRADE_LEVELS) {
    matrix[grade] = {
      grade,
      male: 0,
      female: 0,
      total: 0,
      fourPs: 0,
      transferees: 0,
      returnees: 0,
      completeDocs: 0
    };
  }

  let totalMale = 0;
  let totalFemale = 0;
  let total4Ps = 0;
  let totalTransferees = 0;
  let totalReturnees = 0;
  let totalCompleteDocs = 0;

  for (const e of enrollees) {
    const rawGrade = e.gradeLevel || 'Grade 7';
    // Normalize to standard 'Grade X'
    const gradeKey = GRADE_LEVELS.find(g => g.toLowerCase() === rawGrade.toLowerCase()) || 'Grade 7';
    const isMale = (e.gender || '').toLowerCase() === 'male';
    const isFemale = (e.gender || '').toLowerCase() === 'female';

    if (isMale) {
      matrix[gradeKey].male++;
      totalMale++;
    } else {
      matrix[gradeKey].female++;
      totalFemale++;
    }

    matrix[gradeKey].total++;

    if (e.is4Ps) {
      matrix[gradeKey].fourPs++;
      total4Ps++;
    }

    const learnerType = (e.learnerType || '').toLowerCase();
    if (learnerType.includes('transferee') || e.prevSchool) {
      matrix[gradeKey].transferees++;
      totalTransferees++;
    }

    if (e.isOldStudent || learnerType.includes('balik') || learnerType.includes('returnee')) {
      matrix[gradeKey].returnees++;
      totalReturnees++;
    }

    const hasDocs = e.birthCert && e.form9;
    if (hasDocs) {
      matrix[gradeKey].completeDocs++;
      totalCompleteDocs++;
    }
  }

  const rows = GRADE_LEVELS.map(g => matrix[g]);
  const grandTotal = enrollees.length;

  return {
    rows,
    totalMale,
    totalFemale,
    total4Ps,
    totalTransferees,
    totalReturnees,
    totalCompleteDocs,
    grandTotal,
    complianceRate: grandTotal > 0 ? Math.round((totalCompleteDocs / grandTotal) * 100) : 0
  };
};

/**
 * Generates printable HTML for DepEd Enrolment Quick Count Matrix.
 */
export const generateQuickCountHtml = (enrollees, schoolInfo) => {
  const stats = computeQuickCountMatrix(enrollees);
  const schoolName = schoolInfo?.schoolName || 'School LMS Portal';
  const schoolId = schoolInfo?.schoolId || '123456';
  const division = schoolInfo?.division || 'Schools Division Office';
  const academicYear = schoolInfo?.academicYear || '2025-2026';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Enrolment Quick Count Summary - ${schoolName}</title>
      <style>
        @page { size: portrait; margin: 12mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 15px; color: #000; }
        .qc-header { text-align: center; margin-bottom: 15px; }
        .qc-title { font-size: 16px; font-weight: bold; margin: 3px 0; }
        .qc-subtitle { font-size: 12px; font-style: italic; margin-bottom: 10px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 11px; font-weight: bold; margin-bottom: 12px; border: 1px solid #000; padding: 8px; }
        table.qc-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.qc-table th, table.qc-table td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; text-align: center; }
        table.qc-table th { background-color: #f1f5f9; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #e2e8f0; }
        .summary-notes { margin-top: 15px; font-size: 11px; line-height: 1.5; border: 1px dashed #64748b; padding: 8px; }
        .signatories { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 35px; }
        .sig-block { text-align: center; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="qc-header">
        <div style="font-weight:bold; font-size:12px;">Republic of the Philippines • Department of Education</div>
        <div class="qc-title">General Enrolment Quick Count Matrix</div>
        <div class="qc-subtitle">Official Learner Intake & Enrollment Progress Summary</div>
      </div>

      <div class="meta-grid">
        <div>School ID: <u>${schoolId}</u></div>
        <div>Division: <u>${division}</u></div>
        <div>School Name: <u>${schoolName}</u></div>
        <div>Academic Year: <u>${academicYear}</u></div>
      </div>

      <table class="qc-table">
        <thead>
          <tr>
            <th>Grade Level</th>
            <th>Male</th>
            <th>Female</th>
            <th>Total Enrollees</th>
            <th>4Ps</th>
            <th>Transferees</th>
            <th>Returnees</th>
            <th>Complete Docs</th>
          </tr>
        </thead>
        <tbody>
          ${stats.rows.map(r => `
            <tr>
              <td style="text-align:left; font-weight:bold;">${r.grade}</td>
              <td>${r.male}</td>
              <td>${r.female}</td>
              <td style="font-weight:bold;">${r.total}</td>
              <td>${r.fourPs}</td>
              <td>${r.transferees}</td>
              <td>${r.returnees}</td>
              <td>${r.completeDocs}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td style="text-align:left;">GRAND TOTAL</td>
            <td>${stats.totalMale}</td>
            <td>${stats.totalFemale}</td>
            <td>${stats.grandTotal}</td>
            <td>${stats.total4Ps}</td>
            <td>${stats.totalTransferees}</td>
            <td>${stats.totalReturnees}</td>
            <td>${stats.totalCompleteDocs}</td>
          </tr>
        </tbody>
      </table>

      <div class="summary-notes">
        <strong>Enrolment Intake Metrics:</strong><br>
        • Total Verified Intake: <strong>${stats.grandTotal}</strong> learners<br>
        • Overall Document Compliance Rate: <strong>${stats.complianceRate}%</strong><br>
        • Total 4Ps Beneficiary Inflow: <strong>${stats.total4Ps}</strong> learners
      </div>

      <div class="signatories">
        <div>
          <br><br>
          <div class="sig-block">
            ENROLMENT FOCAL PERSON / COORDINATOR<br>
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
 * Triggers print window for Quick Count Matrix.
 */
export const printQuickCountReport = (enrollees, schoolInfo) => {
  const html = generateQuickCountHtml(enrollees, schoolInfo);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the Enrolment Quick Count report.');
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
 * Exports Quick Count Matrix to CSV.
 */
export const exportQuickCountToCSV = (enrollees, schoolInfo) => {
  const stats = computeQuickCountMatrix(enrollees);

  const headers = [
    'Grade Level',
    'Male Enrollees',
    'Female Enrollees',
    'Total Enrollees',
    '4Ps Beneficiaries',
    'Transferees',
    'Returnees',
    'Complete Documents'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [headers.join(',')];

  for (const r of stats.rows) {
    csvRows.push([
      escapeCSV(r.grade),
      escapeCSV(r.male),
      escapeCSV(r.female),
      escapeCSV(r.total),
      escapeCSV(r.fourPs),
      escapeCSV(r.transferees),
      escapeCSV(r.returnees),
      escapeCSV(r.completeDocs)
    ].join(','));
  }

  // Grand Total Row
  csvRows.push([
    escapeCSV('GRAND TOTAL'),
    escapeCSV(stats.totalMale),
    escapeCSV(stats.totalFemale),
    escapeCSV(stats.grandTotal),
    escapeCSV(stats.total4Ps),
    escapeCSV(stats.totalTransferees),
    escapeCSV(stats.totalReturnees),
    escapeCSV(stats.totalCompleteDocs)
  ].join(','));

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `Enrolment_Quick_Count_${(schoolInfo?.schoolName || 'Portal').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return true;
};
