import * as ExcelJS from 'exceljs';

/**
 * Format date nicely for exports (e.g. Oct 24, 2026 or 2026-10-24)
 */
export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

/**
 * Generate and download an official Excel (.xlsx) Computer Laboratory Visitor Logbook.
 */
export async function generateLabLogExcel({
  logs = [],
  schoolName = 'School Name',
  schoolYear = '',
  labName = 'Computer Laboratory',
  dateRangeText = 'All Dates',
  preparedByName = 'ICT Laboratory Custodian',
  preparedByTitle = 'ICT Coordinator / Lab Custodian',
  principalName = 'School Head / Principal',
  principalTitle = 'School Principal'
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'School LMS Portal - Computer Lab Module';
  wb.lastModifiedBy = preparedByName;
  wb.created = new Date();
  wb.modified = new Date();

  const sheet = wb.addWorksheet('Visitor Logbook', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    }
  });

  // Set column widths
  sheet.columns = [
    { key: 'no', width: 6 },            // A: No.
    { key: 'date', width: 13 },          // B: Date
    { key: 'timeIn', width: 12 },        // C: Time In
    { key: 'timeOut', width: 12 },       // D: Time Out
    { key: 'duration', width: 12 },      // E: Duration
    { key: 'lrn', width: 16 },           // F: LRN
    { key: 'name', width: 28 },          // G: Learner Name
    { key: 'section', width: 18 },       // H: Grade & Section
    { key: 'station', width: 12 },       // I: PC / Station
    { key: 'purpose', width: 24 },       // J: Purpose of Visit
    { key: 'remarks', width: 16 }        // K: Signature / Remarks
  ];

  // Title Header Rows
  sheet.mergeCells('A1:K1');
  const r1 = sheet.getCell('A1');
  r1.value = 'Republic of the Philippines';
  r1.font = { name: 'Arial', size: 10, italic: true };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:K2');
  const r2 = sheet.getCell('A2');
  r2.value = 'Department of Education';
  r2.font = { name: 'Arial', size: 11, bold: true };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A3:K3');
  const r3 = sheet.getCell('A3');
  r3.value = schoolName.toUpperCase();
  r3.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A4:K4');
  const r4 = sheet.getCell('A4');
  r4.value = `${labName.toUpperCase()} — VISITOR & ATTENDANCE LOGBOOK`;
  r4.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF111827' } };
  r4.alignment = { horizontal: 'center', vertical: 'middle' };

  // Metadata block
  sheet.getCell('A6').value = 'Academic Year:';
  sheet.getCell('A6').font = { bold: true, size: 9 };
  sheet.getCell('B6').value = schoolYear || '—';
  sheet.getCell('B6').font = { size: 9 };

  sheet.getCell('D6').value = 'Date Coverage:';
  sheet.getCell('D6').font = { bold: true, size: 9 };
  sheet.getCell('E6').value = dateRangeText;
  sheet.getCell('E6').font = { size: 9 };

  sheet.getCell('H6').value = 'Total Visitors Logged:';
  sheet.getCell('H6').font = { bold: true, size: 9 };
  sheet.getCell('I6').value = logs.length;
  sheet.getCell('I6').font = { bold: true, size: 9, color: { argb: 'FF047857' } };

  sheet.getCell('J6').value = 'Generated On:';
  sheet.getCell('J6').font = { bold: true, size: 9 };
  sheet.getCell('K6').value = new Date().toLocaleDateString('en-US');
  sheet.getCell('K6').font = { size: 9 };

  // Table Column Headers
  const headerRowIdx = 8;
  const tableHeaders = [
    'NO.',
    'DATE',
    'TIME IN',
    'TIME OUT',
    'DURATION',
    'LEARNER LRN',
    'STUDENT NAME',
    'GRADE & SECTION',
    'STATION / PC',
    'PURPOSE OF VISIT',
    'SIGNATURE / REMARKS'
  ];

  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.height = 26;
  tableHeaders.forEach((text, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = text;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Deep Royal Blue
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // Data Rows
  let currentRowIdx = headerRowIdx + 1;
  logs.forEach((item, index) => {
    const row = sheet.getRow(currentRowIdx);
    row.height = 20;

    const dur = item.durationMinutes != null
      ? `${item.durationMinutes} min${item.durationMinutes === 1 ? '' : 's'}`
      : item.timeOut
        ? 'Completed'
        : 'Active In Lab';

    const rowValues = [
      index + 1,
      item.date || '—',
      item.timeIn || '—',
      item.timeOut || '—',
      dur,
      item.lrn || '—',
      item.studentName || '—',
      item.sectionName || item.gradeLevel || '—',
      item.stationNumber || 'Open',
      item.purpose || 'Class Activity',
      item.remarks || ''
    ];

    const isEven = index % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    rowValues.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };

      // Specific alignments
      if (i === 0 || i === 1 || i === 2 || i === 3 || i === 4 || i === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (i === 5) {
        // LRN
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Courier New', size: 9, bold: true };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    currentRowIdx++;
  });

  // Empty state if no records
  if (logs.length === 0) {
    const emptyRow = sheet.getRow(currentRowIdx);
    sheet.mergeCells(`A${currentRowIdx}:K${currentRowIdx}`);
    const emptyCell = emptyRow.getCell(1);
    emptyCell.value = 'No laboratory visitor records found for this selected period.';
    emptyCell.font = { italic: true, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyRow.height = 30;
    currentRowIdx++;
  }

  // Signatory Block
  currentRowIdx += 2;
  sheet.getCell(`B${currentRowIdx}`).value = 'Prepared by:';
  sheet.getCell(`B${currentRowIdx}`).font = { size: 9, bold: true };
  sheet.getCell(`H${currentRowIdx}`).value = 'Noted by:';
  sheet.getCell(`H${currentRowIdx}`).font = { size: 9, bold: true };

  currentRowIdx += 3;
  sheet.getCell(`B${currentRowIdx}`).value = (preparedByName || 'ICT LABORATORY COORDINATOR').toUpperCase();
  sheet.getCell(`B${currentRowIdx}`).font = { size: 10, bold: true, underline: true };
  sheet.getCell(`H${currentRowIdx}`).value = (principalName || 'SCHOOL HEAD / PRINCIPAL').toUpperCase();
  sheet.getCell(`H${currentRowIdx}`).font = { size: 10, bold: true, underline: true };

  currentRowIdx += 1;
  sheet.getCell(`B${currentRowIdx}`).value = preparedByTitle || 'ICT Coordinator / Lab Custodian';
  sheet.getCell(`B${currentRowIdx}`).font = { size: 9, italic: true };
  sheet.getCell(`H${currentRowIdx}`).value = principalTitle || 'School Principal';
  sheet.getCell(`H${currentRowIdx}`).font = { size: 9, italic: true };

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

/**
 * Export lab logs to standard CSV format and trigger instant browser download.
 */
export function exportLabLogsToCSV(logs, filename = 'Computer_Lab_Visitors_Logbook.csv') {
  const headers = [
    'No.',
    'Date',
    'Time In',
    'Time Out',
    'Duration (Mins)',
    'LRN',
    'Student Name',
    'Grade & Section',
    'PC Station',
    'Purpose',
    'Remarks'
  ];

  const escapeCSV = (val) => {
    if (val == null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = logs.map((item, index) => {
    const dur = item.durationMinutes != null
      ? item.durationMinutes
      : item.timeOut
        ? 'Completed'
        : 'Active In Lab';

    return [
      index + 1,
      item.date || '',
      item.timeIn || '',
      item.timeOut || '',
      dur,
      item.lrn || '',
      item.studentName || '',
      item.sectionName || item.gradeLevel || '',
      item.stationNumber || '',
      item.purpose || '',
      item.remarks || ''
    ].map(escapeCSV).join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
