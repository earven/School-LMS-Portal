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
 *   R63 C32(AF)  = No. of Days of Classes value (value cell for "No. of Days:")
 *   R64 C34(AH)  = "M" header
 *   R64 C35(AI)  = "F" header
 *   R64 C36(AJ)  = "TOTAL" header
 *   R65 C34..C36 = Enrollment row (M/F/Total)
 *   R67 C34..C36 = % Enrollment
 *   R69 C34..C36 = ADA label row (values go in)
 *   R73 C34..C36 = ADA values
 *   R75 C34..C36 = % Attendance values
 *   R77 C34..C36 = Absent 5+ consecutive days
 *   R79 C34..C36 = Drop out
 *   R81 C34..C36 = Transferred out
 *   R83 C34..C36 = Transferred in
 *
 * SIGNATURES:
 *   R89 C29(AC)  = Adviser name (above signature line)
 *   R93 C32(AF)  = School Head signature area
 */

const MONTH_NAMES_UPPER = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
];

const DOW_MAP = { 1:'M', 2:'T', 3:'W', 4:'TH', 5:'F' };

/**
 * Build ordered list of valid school days (Mon–Fri, not suspended) for the month.
 * Returns max 25 entries (template column limit D→AB).
 */
function buildSchoolDays(yearMonthStr, suspendedDates = []) {
  const [year, month] = yearMonthStr.split('-');
  const numDays = new Date(parseInt(year), parseInt(month), 0).getDate();
  const result = [];
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
    const dow = new Date(parseInt(year), parseInt(month) - 1, d).getDay();
    if (dow === 0 || dow === 6) continue; // weekend
    if (suspendedDates.some(sd => sd.date === dateStr)) continue; // suspended
    result.push({ dateStr, dayNum: d, dow });
  }
  return result.slice(0, 25); // max 25 columns in template
}

/**
 * Main export: fills the template and returns an ArrayBuffer ready for download.
 *
 * @param {object} opts
 *   templateBuffer  - ArrayBuffer of the sf2_template.xlsx file
 *   ExcelJS         - the ExcelJS library reference (passed in to avoid bundling issues)
 *   sectionName     - string
 *   gradeLevel      - string
 *   schoolName      - string
 *   schoolYear      - string (e.g. "2025-2026")
 *   selectedMonth   - string "YYYY-MM"
 *   suspendedDates  - [{ date: 'YYYY-MM-DD', reason }]
 *   boys            - sorted student array
 *   girls           - sorted student array
 *   monthlyState    - { [studentId]: { [dateStr]: 'Present'|'Absent'|'Tardy' } }
 *   daysOfClasses   - number
 *   sf2Summary      - computed summary object from component
 *   consecutive5Days- number
 *   adviserName     - string
 */
export async function generateSF2Excel({
  templateBuffer,
  ExcelJS,
  sectionName,
  gradeLevel,
  schoolName,
  schoolYear,
  selectedMonth,
  suspendedDates = [],
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

  // ── HEADER ────────────────────────────────────────────────────────────────
  sheet.getCell('K6').value = schoolYear;
  sheet.getCell('X6').value = monthLabel;
  sheet.getCell('D8').value = schoolName.toUpperCase();
  sheet.getCell('X8').value = gradeLevel.toUpperCase();
  sheet.getCell('AC8').value = sectionName.toUpperCase();

  // ── DAY HEADERS (rows 10 & 12) ────────────────────────────────────────────
  // Clear all 25 potential day columns first
  for (let c = 4; c <= 28; c++) {
    sheet.getCell(10, c).value = null;
    sheet.getCell(12, c).value = null;
  }
  schoolDays.forEach(({ dayNum, dow }, idx) => {
    const col = 4 + idx; // D=4, E=5, ...
    sheet.getCell(10, col).value = dayNum;
    sheet.getCell(12, col).value = DOW_MAP[dow] || '';
  });

  // ── STUDENT ROW WRITER ────────────────────────────────────────────────────
  const writeStudentRow = (rowNum, stu, displayIdx) => {
    // Col A (1) = row number, Col B (2) = student name
    sheet.getCell(rowNum, 1).value = displayIdx + 1;
    sheet.getCell(rowNum, 2).value = `${stu.lastName}, ${stu.firstName}`;

    // Clear all day + total + remarks cells
    for (let c = 4; c <= 36; c++) sheet.getCell(rowNum, c).value = null;

    const stuData = monthlyState[stu.id] || {};
    let absentCount = 0, tardyCount = 0;

    schoolDays.forEach(({ dateStr }, idx) => {
      const col = 4 + idx;
      const status = stuData[dateStr] || 'Present';
      if (status === 'Absent') {
        sheet.getCell(rowNum, col).value = 'A';
        absentCount++;
      } else if (status === 'Tardy') {
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

  // ── MALE ROWS (R13–R33, 21 slots) ──────────────────────────────────────────────
  for (let r = 13; r <= 33; r++) {
    sheet.getCell(r, 1).value = null;
    sheet.getCell(r, 2).value = null;
    for (let c = 4; c <= 36; c++) sheet.getCell(r, c).value = null;
  }
  const boyList = boys.slice(0, 21);
  boyList.forEach((stu, i) => writeStudentRow(13 + i, stu, i));

  // ── FEMALE ROWS (R35–R59, 25 slots) ────────────────────────────────────────────
  for (let r = 35; r <= 59; r++) {
    sheet.getCell(r, 1).value = null;
    sheet.getCell(r, 2).value = null;
    for (let c = 4; c <= 36; c++) sheet.getCell(r, c).value = null;
  }
  const girlList = girls.slice(0, 25);
  girlList.forEach((stu, i) => writeStudentRow(35 + i, stu, i));

  // ── DAILY & MONTHLY TOTALS (R34, R60, R61) ────────────────────────────────────
  for (let c = 4; c <= 30; c++) {
    sheet.getCell(34, c).value = null;
    sheet.getCell(60, c).value = null;
    sheet.getCell(61, c).value = null;
  }

  let totalMaleAbsences = 0;
  let totalMaleTardies = 0;
  let totalFemaleAbsences = 0;
  let totalFemaleTardies = 0;

  schoolDays.forEach(({ dateStr }, idx) => {
    const col = 4 + idx;

    let malePresent = 0;
    boyList.forEach(stu => {
      const stuData = monthlyState[stu.id] || {};
      const status = stuData[dateStr] || 'Present';
      if (status !== 'Absent') {
        malePresent++;
      }
    });

    let femalePresent = 0;
    girlList.forEach(stu => {
      const stuData = monthlyState[stu.id] || {};
      const status = stuData[dateStr] || 'Present';
      if (status !== 'Absent') {
        femalePresent++;
      }
    });

    sheet.getCell(34, col).value = malePresent;
    sheet.getCell(60, col).value = femalePresent;
    sheet.getCell(61, col).value = malePresent + femalePresent;
  });

  // Calculate monthly totals for absent and tardy per gender group and overall
  boyList.forEach(stu => {
    const stuData = monthlyState[stu.id] || {};
    schoolDays.forEach(({ dateStr }) => {
      const status = stuData[dateStr] || 'Present';
      if (status === 'Absent') totalMaleAbsences++;
      else if (status === 'Tardy') totalMaleTardies++;
    });
  });

  girlList.forEach(stu => {
    const stuData = monthlyState[stu.id] || {};
    schoolDays.forEach(({ dateStr }) => {
      const status = stuData[dateStr] || 'Present';
      if (status === 'Absent') totalFemaleAbsences++;
      else if (status === 'Tardy') totalFemaleTardies++;
    });
  });

  const cellsToSet = [
    { cell: sheet.getCell(34, 29), val: totalMaleAbsences },
    { cell: sheet.getCell(34, 30), val: totalMaleTardies },
    { cell: sheet.getCell(60, 29), val: totalFemaleAbsences },
    { cell: sheet.getCell(60, 30), val: totalFemaleTardies },
    { cell: sheet.getCell(61, 29), val: totalMaleAbsences + totalFemaleAbsences },
    { cell: sheet.getCell(61, 30), val: totalMaleTardies + totalFemaleTardies }
  ];

  cellsToSet.forEach(({ cell, val }) => {
    cell.value = val;
    cell.numFmt = '0';
  });

  // ── SUMMARY SECTION ────────────────────────────────────────────────────────
  // R63: Month label and days of classes
  sheet.getCell('AC63').value = monthLabel;  // C29
  sheet.getCell('AF63').value = daysOfClasses; // C32 — value for "No. of Days of Classes:"

  // R65: Enrolment as of 1st Friday of June (M / F / Total) — right panel AH/AI/AJ
  sheet.getCell('AH65').value = sf2Summary.enrolledFridayMale;
  sheet.getCell('AI65').value = sf2Summary.enrolledFridayFemale;
  sheet.getCell('AJ65').value = sf2Summary.enrolledFridayTotal;

  // R67: Late Enrollment (M / F / Total)
  sheet.getCell('AH67').value = 0;
  sheet.getCell('AI67').value = 0;
  sheet.getCell('AJ67').value = 0;

  // R69: Registered Learners as of end of the month (M / F / Total)
  sheet.getCell('AH69').value = sf2Summary.maleRegistered;
  sheet.getCell('AI69').value = sf2Summary.femaleRegistered;
  sheet.getCell('AJ69').value = sf2Summary.totalRegistered;

  // R71: Percentage of Enrolment as of end of the month
  const r71Cols = ['AH71', 'AI71', 'AJ71'];
  r71Cols.forEach(cellRef => {
    const cell = sheet.getCell(cellRef);
    cell.value = parseFloat(sf2Summary.pctEnrolled) / 100;
    cell.numFmt = '0%';
    cell.style = { ...cell.style, numFmt: '0%' };
  });

  // R73: Average Daily Attendance (M / F / Total)
  sheet.getCell('AH73').value = parseFloat(sf2Summary.maleADA);
  sheet.getCell('AI73').value = parseFloat(sf2Summary.femaleADA);
  sheet.getCell('AJ73').value = parseFloat(sf2Summary.totalADA);

  // R75: % Attendance (M / F / Total)
  const r75Cols = [
    { cell: sheet.getCell('AH75'), val: sf2Summary.malePct },
    { cell: sheet.getCell('AI75'), val: sf2Summary.femalePct },
    { cell: sheet.getCell('AJ75'), val: sf2Summary.totalPct }
  ];
  r75Cols.forEach(({ cell, val }) => {
    cell.value = parseFloat(val) / 100;
    cell.numFmt = '0.0%';
    cell.style = { ...cell.style, numFmt: '0.0%' };
  });

  // R77: No. absent 5+ consecutive days
  const countConsecutiveAbsences = (studentList) => {
    let count = 0;
    const validDates = schoolDays.map(d => d.dateStr);
    studentList.forEach(stu => {
      const stuData = monthlyState[stu.id] || {};
      let maxConsecutive = 0, currentConsecutive = 0;
      validDates.forEach(dateStr => {
        if (stuData[dateStr] === 'Absent') {
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
        } else {
          currentConsecutive = 0;
        }
      });
      if (maxConsecutive >= 5) {
        count++;
      }
    });
    return count;
  };

  const maleConsecutive5 = countConsecutiveAbsences(boyList);
  const femaleConsecutive5 = countConsecutiveAbsences(girlList);

  sheet.getCell('AH77').value = maleConsecutive5;
  sheet.getCell('AH77').numFmt = '0';

  sheet.getCell('AI77').value = femaleConsecutive5;
  sheet.getCell('AI77').numFmt = '0';

  sheet.getCell('AJ77').value = maleConsecutive5 + femaleConsecutive5;
  sheet.getCell('AJ77').numFmt = '0';

  // R79: Dropped out
  const r79Cells = ['AH79', 'AI79', 'AJ79'];
  r79Cells.forEach(cellRef => {
    const cell = sheet.getCell(cellRef);
    cell.value = sf2Summary.droppedOut;
    cell.numFmt = '0';
  });

  // R81: Transferred out
  const r81Cells = ['AH81', 'AI81', 'AJ81'];
  r81Cells.forEach(cellRef => {
    const cell = sheet.getCell(cellRef);
    cell.value = sf2Summary.transferredOut;
    cell.numFmt = '0';
  });

  // R83: Transferred in
  const r83Cells = ['AH83', 'AI83', 'AJ83'];
  r83Cells.forEach(cellRef => {
    const cell = sheet.getCell(cellRef);
    cell.value = sf2Summary.transferredIn;
    cell.numFmt = '0';
  });

  // ── ADVISER SIGNATURE ─────────────────────────────────────────────────────
  // R89 C29(AC) — above the "(Signature of Adviser...)" text
  // Insert adviser name 2 rows above the signature line placeholder at R89
  sheet.getCell('AC87').value = adviserName;

  // ── RETURN BUFFER ─────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
