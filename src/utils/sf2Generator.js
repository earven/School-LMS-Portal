/**
 * sf2Generator.js
 * Fills the official DepEd SF2 Excel template with live attendance data.
 *
 * Verified template cell map (sf2_template.xlsx, Sheet: "School Form 2 (SF2)"):
 *
 * HEADER:
 *   R6 C3(C)   = School ID (placeholder)
 *   R6 C11(K)  = School Year (e.g. "2025-2026")
 *   R6 C24(X)  = Month (e.g. "MAY")
 *   R8 C4(D)   = School Name
 *   R8 C24(X)  = Grade Level
 *   R8 C29(AC) = Section Name
 *
 * DAY HEADERS (school days only, max 25 columns):
 *   R10 C4..C28 = day numbers (1,2,3...)
 *   R12 C4..C28 = day-of-week letter (M/T/W/TH/F)
 *
 * STUDENT ROWS:
 *   Male rows:   R13–R33 (21 slots)
 *   Female rows: R35–R59 (25 slots)
 *   Per row: C1=name, C4..C28=attendance (A/T/blank), C29(AC)=absent total, C30(AD)=tardy total, C36(AJ)=remarks
 *
 * TOTALS:
 *   R34 = MALE TOTAL PER DAY
 *   R60 = FEMALE TOTAL PER DAY
 *   R61 = Combined TOTAL PER DAY
 *
 * SUMMARY (right panel):
 *   R63 C29(AC)  = Month label
 *   R63 C32(AF)  = No. of Days of Classes value
 *   R65 C34..C36 = Enrollment row (M/F/Total)
 *   R67 C34..C36 = Late Enrollment (M/F/Total)
 *   R69 C34..C36 = Registered learners (M/F/Total)
 *   R71 C34..C36 = % Enrollment
 *   R73 C34..C36 = ADA values
 *   R75 C34..C36 = % Attendance values
 *   R77 C34..C36 = Absent 5+ consecutive days
 *   R79 C34..C36 = Drop out
 *   R81 C34..C36 = Transferred out
 *   R83 C34..C36 = Transferred in
 *
 * SIGNATURES:
 *   R87 C29(AC)  = Adviser name
 */

import * as ExcelJS from 'exceljs';

const MONTH_NAMES_UPPER = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
];

const DOW_MAP = { 1:'M', 2:'T', 3:'W', 4:'TH', 5:'F' };

/**
 * Build vertical text for a merged holiday/suspension column.
 * e.g. "· · · H O L I D A Y" going top-to-bottom.
 */
function getVerticalText(type, numRows) {
  const word = type === 'suspension' ? 'SUSPENDED' : 'HOLIDAY';
  const dotsCount = Math.max(1, numRows - (word.length + 2));
  const lines = [];
  for (let i = 0; i < dotsCount; i++) lines.push('·');
  for (let i = 0; i < word.length; i++) lines.push(word[i]);
  return lines.join('\n');
}

/**
 * Build ordered list of all weekday school days (Mon–Fri) for the month,
 * including suspended/holiday days (flagged). Returns max 25 entries.
 */
function buildSchoolDays(yearMonthStr, suspendedDates = []) {
  const [year, month] = yearMonthStr.split('-');
  const numDays = new Date(parseInt(year), parseInt(month), 0).getDate();
  const result = [];
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
    const dow = new Date(parseInt(year), parseInt(month) - 1, d).getDay();
    if (dow === 0 || dow === 6) continue; // weekend

    const suspension = suspendedDates.find(sd => sd.date === dateStr);
    result.push({
      dateStr,
      dayNum: d,
      dow,
      isSuspended: !!suspension,
      suspensionReason: suspension?.reason,
      suspensionType: suspension?.type || 'holiday',
    });
  }
  return result.slice(0, 25); // max 25 columns in template
}

/**
 * Copy cell styles and row height from source row to destination row.
 */
function copyRowStyle(sheet, srcRowNum, destRowNum) {
  const src  = sheet.getRow(srcRowNum);
  const dest = sheet.getRow(destRowNum);
  src.eachCell({ includeEmpty: true }, (srcCell, colNumber) => {
    const destCell = dest.getCell(colNumber);
    if (srcCell.style) {
      destCell.style = JSON.parse(JSON.stringify(srcCell.style));
    }
  });
  if (src.height) dest.height = src.height;
}

/**
 * Main export: fills the template and returns an ArrayBuffer ready for download.
 *
 * @param {object} opts
 *   templateBuffer   - ArrayBuffer of the sf2_template.xlsx file
 *   sectionName      - string
 *   gradeLevel       - string
 *   schoolName       - string
 *   schoolYear       - string (e.g. "2025-2026")
 *   selectedMonth    - string "YYYY-MM"
 *   suspendedDates   - [{ date: 'YYYY-MM-DD', reason: string, type?: 'holiday'|'suspension' }]
 *   classesStartDate - string "YYYY-MM-DD" (days before this are skipped)
 *   boys             - sorted student array
 *   girls            - sorted student array
 *   monthlyState     - { [studentId]: { [dateStr]: 'Present'|'Absent'|'Tardy' } }
 *   daysOfClasses    - number
 *   sf2Summary       - computed summary object from component
 *   adviserName      - string
 */
export async function generateSF2Excel({
  templateBuffer,
  sectionName,
  gradeLevel,
  schoolName,
  schoolYear,
  selectedMonth,
  suspendedDates = [],
  classesStartDate,
  boys = [],
  girls = [],
  monthlyState = {},
  daysOfClasses,
  sf2Summary,
  adviserName = '',
}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);
  const sheet = wb.worksheets[0];

  const [, monthNum] = selectedMonth.split('-');
  const monthLabel = MONTH_NAMES_UPPER[parseInt(monthNum, 10) - 1];
  const schoolDays = buildSchoolDays(selectedMonth, suspendedDates);
  const startDay = classesStartDate ? new Date(classesStartDate).getDate() : 1;

  // ── 1. EXTRACT ORIGINAL MERGES TO PREVENT CORRUPTION BY SPLICER ────────────
  const originalMerges = [];
  const mergesList = sheet.model.merges || [];
  mergesList.forEach(rangeStr => {
    const match = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (match) {
      const [, colStartStr, rowStartStr, colEndStr, rowEndStr] = match;
      originalMerges.push({
        colStartStr,
        rStart: parseInt(rowStartStr, 10),
        colEndStr,
        rEnd: parseInt(rowEndStr, 10),
      });
    }
  });

  // Clear all merges from sheet model
  sheet.model.merges = [];
  sheet._merges = {};

  // ── HEADER ────────────────────────────────────────────────────────────────
  sheet.getCell('K6').value = schoolYear;
  sheet.getCell('X6').value = monthLabel;
  sheet.getCell('D8').value = schoolName.toUpperCase();
  sheet.getCell('X8').value = gradeLevel.toUpperCase();
  sheet.getCell('AC8').value = sectionName.toUpperCase();

  // ── DAY HEADERS (rows 10 & 12) ────────────────────────────────────────────
  for (let c = 4; c <= 28; c++) {
    sheet.getCell(10, c).value = null;
    sheet.getCell(12, c).value = null;
  }
  schoolDays.forEach(({ dayNum, dow }, idx) => {
    const col = 4 + idx;
    sheet.getCell(10, col).value = dayNum;
    sheet.getCell(12, col).value = DOW_MAP[dow] || '';
  });

  // ── STUDENT ROW WRITER ────────────────────────────────────────────────────
  const writeStudentRow = (rowNum, stu, displayIdx) => {
    sheet.getCell(rowNum, 1).value = displayIdx + 1;
    sheet.getCell(rowNum, 2).value = `${stu.lastName}, ${stu.firstName}`;

    for (let c = 4; c <= 36; c++) sheet.getCell(rowNum, c).value = null;

    const stuData = monthlyState[stu.id] || {};
    let absentCount = 0, tardyCount = 0;

    schoolDays.forEach(({ dateStr, dayNum, isSuspended }, idx) => {
      const col = 4 + idx;
      if (dayNum < startDay) return; // Skip days before classes start
      if (isSuspended) return;       // Skip suspended days (will be merged later)

      const status = (stuData[dateStr] || 'Present').toLowerCase();
      if (status === 'absent') {
        sheet.getCell(rowNum, col).value = 'A';
        absentCount++;
      } else if (status === 'tardy') {
        sheet.getCell(rowNum, col).value = 'T';
        tardyCount++;
      }
      // Present = leave blank (per DepEd SF2 convention)
    });

    // Totals: AC=29 (absent), AD=30 (tardy)
    sheet.getCell(rowNum, 29).value = absentCount;
    sheet.getCell(rowNum, 30).value = tardyCount;

    // Remarks: AJ=36 — student movement status
    if (stu.status && stu.status !== 'Active') {
      sheet.getCell(rowNum, 36).value = stu.status;
    }
  };

  // ── DYNAMIC ROW ADJUSTMENT ────────────────────────────────────────────────
  const extraBoys = Math.max(0, boys.length - 21);
  if (extraBoys > 0) {
    sheet.spliceRows(34, 0, ...Array(extraBoys).fill([]));
    for (let i = 0; i < extraBoys; i++) {
      copyRowStyle(sheet, 13, 34 + i);
    }
  }

  const maleTotalsRow = 34 + extraBoys;
  const femaleStartRow = 35 + extraBoys;

  const extraGirls = Math.max(0, girls.length - 25);
  if (extraGirls > 0) {
    sheet.spliceRows(60 + extraBoys, 0, ...Array(extraGirls).fill([]));
    for (let i = 0; i < extraGirls; i++) {
      copyRowStyle(sheet, femaleStartRow, 60 + extraBoys + i);
    }
  }

  const femaleTotalsRow = 60 + extraBoys + extraGirls;
  const combinedTotalsRow = 61 + extraBoys + extraGirls;
  const summaryOffset = extraBoys + extraGirls;

  // ── RE-APPLY SHIFTED MERGES ───────────────────────────────────────────────
  originalMerges.forEach(m => {
    let newStart = m.rStart;
    let newEnd = m.rEnd;

    if (newStart >= 34) newStart += extraBoys;
    if (newStart >= 60 + extraBoys) newStart += extraGirls;
    if (newEnd >= 34) newEnd += extraBoys;
    if (newEnd >= 60 + extraBoys) newEnd += extraGirls;

    const newRange = `${m.colStartStr}${newStart}:${m.colEndStr}${newEnd}`;
    try { sheet.mergeCells(newRange); } catch (_) { /* ignore */ }
  });

  // Re-apply merges for newly spliced student rows (B:C and AE:AJ)
  for (let i = 0; i < extraBoys; i++) {
    const newRow = 34 + i;
    try { sheet.mergeCells(newRow, 2, newRow, 3); } catch { /* ignore */ }
    try { sheet.mergeCells(newRow, 31, newRow, 36); } catch { /* ignore */ }
  }
  for (let i = 0; i < extraGirls; i++) {
    const newRow = 60 + extraBoys + i;
    try { sheet.mergeCells(newRow, 2, newRow, 3); } catch { /* ignore */ }
    try { sheet.mergeCells(newRow, 31, newRow, 36); } catch { /* ignore */ }
  }

  // ── MALE ROWS (R13–R33, 21 slots default) ────────────────────────────────
  const totalMaleRows = 21 + extraBoys;
  for (let r = 13; r < 13 + totalMaleRows; r++) {
    sheet.getCell(r, 1).value = null;
    sheet.getCell(r, 2).value = null;
    for (let c = 4; c <= 36; c++) sheet.getCell(r, c).value = null;
  }
  const boyList = boys;
  boyList.forEach((stu, i) => writeStudentRow(13 + i, stu, i));

  // ── FEMALE ROWS (R35–R59, 25 slots default) ──────────────────────────────
  const totalFemaleRows = 25 + extraGirls;
  for (let r = femaleStartRow; r < femaleStartRow + totalFemaleRows; r++) {
    sheet.getCell(r, 1).value = null;
    sheet.getCell(r, 2).value = null;
    for (let c = 4; c <= 36; c++) sheet.getCell(r, c).value = null;
  }
  const girlList = girls;
  girlList.forEach((stu, i) => writeStudentRow(femaleStartRow + i, stu, i));

  // ── MERGE HOLIDAY / SUSPENSION COLUMNS ───────────────────────────────────
  schoolDays.forEach(({ isSuspended, suspensionType }, idx) => {
    if (!isSuspended) return;
    const col = 4 + idx;
    const type = suspensionType || 'holiday';

    // Merge Boys Section
    const boyStart = 13;
    const boyEnd = maleTotalsRow - 1;
    if (boyEnd >= boyStart) {
      try {
        sheet.mergeCells(boyStart, col, boyEnd, col);
        const cell = sheet.getCell(boyStart, col);
        cell.value = getVerticalText(type, boyEnd - boyStart + 1);
        cell.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true };
        cell.font = { name: 'Arial Narrow', size: 9, bold: true };
      } catch { /* ignore merge issues */ }
    }

    // Merge Girls Section
    const girlStart = femaleStartRow;
    const girlEnd = femaleTotalsRow - 1;
    if (girlEnd >= girlStart) {
      try {
        sheet.mergeCells(girlStart, col, girlEnd, col);
        const cell = sheet.getCell(girlStart, col);
        cell.value = getVerticalText(type, girlEnd - girlStart + 1);
        cell.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true };
        cell.font = { name: 'Arial Narrow', size: 9, bold: true };
      } catch { /* ignore merge issues */ }
    }
  });

  // ── DAILY & MONTHLY TOTALS (maleTotalsRow, femaleTotalsRow, combinedTotalsRow) ──
  for (let c = 4; c <= 30; c++) {
    sheet.getCell(maleTotalsRow, c).value = null;
    sheet.getCell(femaleTotalsRow, c).value = null;
    sheet.getCell(combinedTotalsRow, c).value = null;
  }

  let totalMaleAbsences = 0;
  let totalMaleTardies = 0;
  let totalFemaleAbsences = 0;
  let totalFemaleTardies = 0;

  schoolDays.forEach(({ dateStr, dayNum, isSuspended }, idx) => {
    const col = 4 + idx;
    if (dayNum < startDay || isSuspended) {
      sheet.getCell(maleTotalsRow, col).value = null;
      sheet.getCell(femaleTotalsRow, col).value = null;
      sheet.getCell(combinedTotalsRow, col).value = null;
      return;
    }

    let malePresent = 0;
    boyList.forEach(stu => {
      const status = (monthlyState[stu.id]?.[dateStr] || 'Present').toLowerCase();
      if (status !== 'absent') malePresent++;
    });

    let femalePresent = 0;
    girlList.forEach(stu => {
      const status = (monthlyState[stu.id]?.[dateStr] || 'Present').toLowerCase();
      if (status !== 'absent') femalePresent++;
    });

    sheet.getCell(maleTotalsRow, col).value = malePresent;
    sheet.getCell(femaleTotalsRow, col).value = femalePresent;
    sheet.getCell(combinedTotalsRow, col).value = malePresent + femalePresent;
  });

  // Monthly absent/tardy totals
  boyList.forEach(stu => {
    const stuData = monthlyState[stu.id] || {};
    schoolDays.forEach(({ dateStr, dayNum, isSuspended }) => {
      if (dayNum < startDay || isSuspended) return;
      const status = (stuData[dateStr] || 'Present').toLowerCase();
      if (status === 'absent') totalMaleAbsences++;
      else if (status === 'tardy') totalMaleTardies++;
    });
  });

  girlList.forEach(stu => {
    const stuData = monthlyState[stu.id] || {};
    schoolDays.forEach(({ dateStr, dayNum, isSuspended }) => {
      if (dayNum < startDay || isSuspended) return;
      const status = (stuData[dateStr] || 'Present').toLowerCase();
      if (status === 'absent') totalFemaleAbsences++;
      else if (status === 'tardy') totalFemaleTardies++;
    });
  });

  const cellsToSet = [
    { cell: sheet.getCell(maleTotalsRow, 29), val: totalMaleAbsences },
    { cell: sheet.getCell(maleTotalsRow, 30), val: totalMaleTardies },
    { cell: sheet.getCell(femaleTotalsRow, 29), val: totalFemaleAbsences },
    { cell: sheet.getCell(femaleTotalsRow, 30), val: totalFemaleTardies },
    { cell: sheet.getCell(combinedTotalsRow, 29), val: totalMaleAbsences + totalFemaleAbsences },
    { cell: sheet.getCell(combinedTotalsRow, 30), val: totalMaleTardies + totalFemaleTardies },
  ];
  cellsToSet.forEach(({ cell, val }) => {
    cell.value = val;
    cell.numFmt = '0';
  });

  // ── SUMMARY SECTION ────────────────────────────────────────────────────────
  sheet.getCell(63 + summaryOffset, 29).value = monthLabel;
  sheet.getCell(63 + summaryOffset, 32).value = daysOfClasses;

  // R65: Enrolment as of 1st Friday of June
  sheet.getCell(65 + summaryOffset, 34).value = sf2Summary.enrolledFridayMale;
  sheet.getCell(65 + summaryOffset, 35).value = sf2Summary.enrolledFridayFemale;
  sheet.getCell(65 + summaryOffset, 36).value = sf2Summary.enrolledFridayTotal;

  // R67: Late Enrollment
  sheet.getCell(67 + summaryOffset, 34).value = 0;
  sheet.getCell(67 + summaryOffset, 35).value = 0;
  sheet.getCell(67 + summaryOffset, 36).value = 0;

  // R69: Registered Learners as of end of the month
  sheet.getCell(69 + summaryOffset, 34).value = sf2Summary.maleRegistered;
  sheet.getCell(69 + summaryOffset, 35).value = sf2Summary.femaleRegistered;
  sheet.getCell(69 + summaryOffset, 36).value = sf2Summary.totalRegistered;

  // R71: Percentage of Enrolment
  const r71Cols = [34, 35, 36];
  r71Cols.forEach(col => {
    const cell = sheet.getCell(71 + summaryOffset, col);
    cell.value = parseFloat(sf2Summary.pctEnrolled) / 100;
    cell.numFmt = '0.0%';
    cell.style = { ...cell.style, numFmt: '0.0%' };
  });

  // R73: Average Daily Attendance
  sheet.getCell(73 + summaryOffset, 34).value = parseFloat(sf2Summary.maleADA);
  sheet.getCell(73 + summaryOffset, 35).value = parseFloat(sf2Summary.femaleADA);
  sheet.getCell(73 + summaryOffset, 36).value = parseFloat(sf2Summary.totalADA);
  for (let col = 34; col <= 36; col++) {
    sheet.getCell(73 + summaryOffset, col).numFmt = '0.00';
  }

  // R75: % Attendance
  const r75Cols = [
    { cell: sheet.getCell(75 + summaryOffset, 34), val: sf2Summary.malePct },
    { cell: sheet.getCell(75 + summaryOffset, 35), val: sf2Summary.femalePct },
    { cell: sheet.getCell(75 + summaryOffset, 36), val: sf2Summary.totalPct },
  ];
  r75Cols.forEach(({ cell, val }) => {
    cell.value = parseFloat(val) / 100;
    cell.numFmt = '0.0%';
    cell.style = { ...cell.style, numFmt: '0.0%' };
  });

  // R77: No. absent 5+ consecutive days
  const countConsecutiveAbsences = (studentList) => {
    let count = 0;
    const validDates = schoolDays
      .filter(d => d.dayNum >= startDay && !d.isSuspended)
      .map(d => d.dateStr);
    studentList.forEach(stu => {
      const stuData = monthlyState[stu.id] || {};
      let maxConsecutive = 0, currentConsecutive = 0;
      validDates.forEach(dateStr => {
        if ((stuData[dateStr] || 'Present').toLowerCase() === 'absent') {
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
        } else {
          currentConsecutive = 0;
        }
      });
      if (maxConsecutive >= 5) count++;
    });
    return count;
  };

  const maleConsecutive5 = countConsecutiveAbsences(boyList);
  const femaleConsecutive5 = countConsecutiveAbsences(girlList);

  sheet.getCell(77 + summaryOffset, 34).value = maleConsecutive5;
  sheet.getCell(77 + summaryOffset, 34).numFmt = '0';
  sheet.getCell(77 + summaryOffset, 35).value = femaleConsecutive5;
  sheet.getCell(77 + summaryOffset, 35).numFmt = '0';
  sheet.getCell(77 + summaryOffset, 36).value = maleConsecutive5 + femaleConsecutive5;
  sheet.getCell(77 + summaryOffset, 36).numFmt = '0';

  // R79: Dropped out
  [34, 35, 36].forEach(col => {
    const cell = sheet.getCell(79 + summaryOffset, col);
    cell.value = sf2Summary.droppedOut;
    cell.numFmt = '0';
  });

  // R81: Transferred out
  [34, 35, 36].forEach(col => {
    const cell = sheet.getCell(81 + summaryOffset, col);
    cell.value = sf2Summary.transferredOut;
    cell.numFmt = '0';
  });

  // R83: Transferred in
  [34, 35, 36].forEach(col => {
    const cell = sheet.getCell(83 + summaryOffset, col);
    cell.value = sf2Summary.transferredIn;
    cell.numFmt = '0';
  });

  // ── ADVISER SIGNATURE ─────────────────────────────────────────────────────
  sheet.getCell(87 + summaryOffset, 29).value = adviserName;

  // ── RETURN BUFFER ─────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
