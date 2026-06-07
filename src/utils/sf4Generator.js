/**
 * sf4Generator.js
 * Fills the official DepEd SF4 Excel template (sf4_template_final.xlsx) with live data.
 *
 * ── Header Cell Mapping ───────────────────────────────────────────────────────
 *   H3  : School ID value        (right of "School ID" label A3:G3)
 *   O3  : Region value           (right of merged region H3:M3 + O3:W3)
 *   H4  : School Name value      (right of "School Name" label A4:G4)
 *   AD3 : Division value         (merged AD3:AO3 region)
 *   AD4 : School Year value      (merged AD4:AI4 region)
 *   AU4 : Month value            (merged AJ4:AT4 / AU4:BA4)
 *
 * ── Dynamic Layout ───────────────────────────────────────────────────────────
 *   Section rows start at row 8.
 *   Template provides 13 slots (rows 8-20).
 *   If there are MORE than 13 sections, new rows are spliced into the sheet
 *   before the "SECONDARY:" header so that grade summary rows and the
 *   signature block automatically shift down and all formulas stay correct.
 *
 *   SECONDARY: label  → row (8 + numSections)
 *   Grade 7 summary   → row (8 + numSections + 1)
 *   Grade 8 summary   → row (8 + numSections + 2)
 *   Grade 9 summary   → row (8 + numSections + 3)
 *   Grade 10 summary  → row (8 + numSections + 4)
 *   TOTAL             → row (8 + numSections + 5)
 *
 * ── Column Key ────────────────────────────────────────────────────────────────
 *   J (10) Male Registered Learners
 *   K (11) Female Registered Learners
 *   M (13) Total Registered = J + K            ← formula
 *   N (14) Daily Average Attendance – Male
 *   P (16) Daily Average Attendance – Female
 *   Q (17) ADA Total = N + P                   ← formula
 *   R (18) % Attendance Male = N / J           ← formula
 *   S (19) % Attendance Female = P / K         ← formula
 *   T (20) % Attendance Total = (R+S)/2        ← formula
 */

const MONTH_NAMES_UPPER = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
];

/**
 * Extract the grade number from any grade level string.
 * Uses the same pattern as the rest of the codebase:
 *   str.replace(/\D/g, '') → strip non-digits → parseInt
 * Examples: "Grade 7" → 7, "Grade 10" → 10, "7" → 7
 */
function gradeKey(gradeStr) {
  const digits = String(gradeStr || '').replace(/\D/g, '');
  const num = parseInt(digits, 10);
  if ([7, 8, 9, 10].includes(num)) return num;
  return null;
}

/**
 * Inject all derived formulas for one section data row.
 * Always re-written because ExcelJS corrupts shared formula refs
 * from the template (shows "[object Object]").
 */
function injectSectionFormulas(sheet, r) {
  sheet.getCell(r, 13).value = { formula: `J${r}+K${r}` };               // M = J+K
  sheet.getCell(r, 17).value = { formula: `N${r}+P${r}` };               // Q = N+P
  sheet.getCell(r, 18).value = { formula: `IF(J${r}>0,N${r}/J${r},0)` }; // R = N/J
  sheet.getCell(r, 19).value = { formula: `IF(K${r}>0,P${r}/K${r},0)` }; // S = P/K
  sheet.getCell(r, 20).value = { formula: `IF(Q${r}>0,(R${r}+S${r})/2,0)` }; // T
}

/**
 * Apply number formats for a data or summary row.
 */
function applyRowFormats(sheet, r) {
  sheet.getCell(r, 10).numFmt = '#,##0';    // J – Male Registered
  sheet.getCell(r, 11).numFmt = '#,##0';    // K – Female Registered
  sheet.getCell(r, 13).numFmt = '#,##0';    // M – Total Registered
  sheet.getCell(r, 14).numFmt = '#,##0.00'; // N – Male ADA
  sheet.getCell(r, 16).numFmt = '#,##0.00'; // P – Female ADA
  sheet.getCell(r, 17).numFmt = '#,##0.00'; // Q – Total ADA
  sheet.getCell(r, 18).numFmt = '0%';       // R – % Male
  sheet.getCell(r, 19).numFmt = '0%';       // S – % Female
  sheet.getCell(r, 20).numFmt = '0%';       // T – % Total
}

/**
 * Copy the visual style (fill, border, font, alignment) of one row into
 * another. Used when splicing extra rows to match the template's appearance.
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

export async function generateSF4Excel({
  templateBuffer,
  ExcelJS,
  schoolId    = '',
  schoolName  = '',
  schoolYear  = '',
  region      = '',
  division    = '',
  selectedMonth,
  sf4Data     = []
}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);
  const sheet = wb.worksheets[0];

  const [year, monthNum] = selectedMonth.split('-');
  const monthLabel = MONTH_NAMES_UPPER[parseInt(monthNum, 10) - 1];

  // ── Header Metadata ──────────────────────────────────────────────────────
  sheet.getCell('H3').value  = schoolId;
  sheet.getCell('O3').value  = region;
  sheet.getCell('H4').value  = (schoolName || '').toUpperCase();
  sheet.getCell('AD3').value = division;
  sheet.getCell('AD4').value = schoolYear;
  sheet.getCell('AU4').value = `${monthLabel} ${year}`;

  // ── Sort sections: grade ascending, then section name ascending ──────────
  const sorted = [...sf4Data].sort((a, b) => {
    const ga = gradeKey(a.grade) || 99;
    const gb = gradeKey(b.grade) || 99;
    return ga !== gb ? ga - gb : String(a.name).localeCompare(String(b.name));
  });

  // ── Dynamic Row Layout ───────────────────────────────────────────────────
  const SECTION_ROW_START  = 8;
  const TEMPLATE_SLOTS     = 13;    // rows 8-20 in the original template
  const TEMPLATE_SEC_HDR   = 21;    // row where "SECONDARY:" lives in template
  const numSections        = sorted.length;

  // If there are more sections than the template has slots, splice extra rows
  // BEFORE the "SECONDARY:" header so all rows below shift down naturally.
  const extraRows = Math.max(0, numSections - TEMPLATE_SLOTS);
  if (extraRows > 0) {
    // Insert `extraRows` new rows starting just before the SECONDARY header.
    // spliceRows(pos, deleteCount, ...rowsToInsert) — we insert empty rows
    // then style them to match row 8 (the section row style).
    sheet.spliceRows(TEMPLATE_SEC_HDR, 0, ...Array(extraRows).fill([]));

    // Apply section-row styling to the newly inserted rows
    for (let i = 0; i < extraRows; i++) {
      const newRow = TEMPLATE_SEC_HDR + i;
      copyRowStyle(sheet, SECTION_ROW_START, newRow);

      // Recreate the same merged-cell pattern that rows 8-20 have.
      // Template merges per section row (from the scan):
      //   A:B, C:E, F:I, K:L, N:O, U:V, W:X, AB:AC, AI:AJ, AO:AP, AQ:AR
      const mergeGroups = [
        [1,2], [3,5], [6,9], [11,12], [14,15], [21,22], [23,24],
        [28,29], [35,36], [41,42], [43,44]
      ];
      mergeGroups.forEach(([s, e]) => {
        try { sheet.mergeCells(newRow, s, newRow, e); } catch { /* already merged */ }
      });
    }
  }

  // After any splice, compute exact row positions.
  // The SECONDARY: header lives at TEMPLATE_SEC_HDR (21) in the template.
  // Splicing extraRows rows before it shifts it down by exactly extraRows.
  //
  // ⚠️  DO NOT use (SECTION_ROW_START + numSections) — that formula is only
  //     coincidentally correct at numSections==13 and >13 (after splicing).
  //     For numSections < 13 it gives the wrong answer (e.g. 18 for 10 sections).
  const lastSectionRow = SECTION_ROW_START + numSections - 1;
  const secHeaderRow   = TEMPLATE_SEC_HDR + extraRows;   // always 21 + extraRows
  const grade7Row      = secHeaderRow + 1;
  const grade8Row      = secHeaderRow + 2;
  const grade9Row      = secHeaderRow + 3;
  const grade10Row     = secHeaderRow + 4;
  const totalRow       = secHeaderRow + 5;

  // ── Write Section Data Rows ──────────────────────────────────────────────
  // Track which sheet rows belong to each grade
  const gradeRowMap = { 7: [], 8: [], 9: [], 10: [] };

  sorted.forEach((sec, index) => {
    const rowNum = SECTION_ROW_START + index;
    const gk     = gradeKey(sec.grade);
    if (gk && gradeRowMap[gk]) gradeRowMap[gk].push(rowNum);

    const maleReg   = Number(sec.maleReg)      || 0;
    const femaleReg = Number(sec.femaleReg)     || 0;
    const maleADA   = parseFloat(sec.maleADA)   || 0;
    const femaleADA = parseFloat(sec.femaleADA) || 0;

    // Identifier labels
    sheet.getCell(rowNum, 1).value  = sec.grade;           // A – Grade Level
    sheet.getCell(rowNum, 3).value  = sec.name;            // C – Section Name
    sheet.getCell(rowNum, 6).value  = sec.adviserName || ''; // F – Adviser

    // Raw numeric data (template/generated formulas handle M, Q, R, S, T)
    sheet.getCell(rowNum, 10).value = maleReg;    // J
    sheet.getCell(rowNum, 11).value = femaleReg;  // K
    sheet.getCell(rowNum, 14).value = maleADA;    // N
    sheet.getCell(rowNum, 16).value = femaleADA;  // P

    // Always re-inject derived formulas (fixes ExcelJS shared-formula bug)
    injectSectionFormulas(sheet, rowNum);
    applyRowFormats(sheet, rowNum);
  });

  // Clear unused template section slots (rows between last written section
  // and row 20, the template's last section slot).
  // This removes stale data/formulas from previous exports.
  const TEMPLATE_LAST_SLOT = SECTION_ROW_START + TEMPLATE_SLOTS - 1; // row 20
  for (let r = lastSectionRow + 1; r <= TEMPLATE_LAST_SLOT; r++) {
    sheet.getCell(r, 1).value  = null;
    sheet.getCell(r, 3).value  = null;
    sheet.getCell(r, 6).value  = null;
    for (let c = 10; c <= 20; c++) sheet.getCell(r, c).value = null;
  }

  // ── Grade Summary Rows ───────────────────────────────────────────────────
  const gradeDefs = [
    { grade: 7,  row: grade7Row,  label: 'Grade 7 (Year I)'   },
    { grade: 8,  row: grade8Row,  label: 'Grade 8 (Year II)'  },
    { grade: 9,  row: grade9Row,  label: 'Grade 9 (Year III)' },
    { grade: 10, row: grade10Row, label: 'Grade 10 (Year IV)' },
  ];

  gradeDefs.forEach(({ grade, row: r, label }) => {
    // Ensure the grade label is written (might have shifted after splice)
    sheet.getCell(r, 1).value = label;

    const rows = gradeRowMap[grade];

    if (rows.length === 0) {
      // No sections for this grade – zero everything out
      [10, 11, 13, 14, 16, 17, 18, 19, 20].forEach(c => {
        sheet.getCell(r, c).value = 0;
      });
      applyRowFormats(sheet, r);
      return;
    }

    // Build additive formula strings for each raw-data column
    const sumJ = rows.map(rn => `J${rn}`).join('+');
    const sumK = rows.map(rn => `K${rn}`).join('+');
    const sumN = rows.map(rn => `N${rn}`).join('+');
    const sumP = rows.map(rn => `P${rn}`).join('+');

    // Raw sums (J, K, N, P)
    sheet.getCell(r, 10).value = { formula: sumJ };               // J
    sheet.getCell(r, 11).value = { formula: sumK };               // K
    sheet.getCell(r, 14).value = { formula: sumN };               // N
    sheet.getCell(r, 16).value = { formula: sumP };               // P

    // Derived totals (M, Q) — sum from raw so they update correctly
    sheet.getCell(r, 13).value = { formula: `J${r}+K${r}` };     // M = J+K
    sheet.getCell(r, 17).value = { formula: `N${r}+P${r}` };     // Q = N+P

    // Weighted-average percentages (proper DepEd methodology: ADA / Registered)
    sheet.getCell(r, 18).value = { formula: `IF(J${r}>0,N${r}/J${r},0)` };       // R
    sheet.getCell(r, 19).value = { formula: `IF(K${r}>0,P${r}/K${r},0)` };       // S
    sheet.getCell(r, 20).value = { formula: `IF(M${r}>0,(R${r}+S${r})/2,0)` };   // T

    applyRowFormats(sheet, r);
  });

  // ── TOTAL Row ────────────────────────────────────────────────────────────
  // Write the "TOTAL" label (in case the row shifted after splice)
  sheet.getCell(totalRow, 1).value = 'TOTAL';

  // Sum each grade's summary row
  const gradeRows = [grade7Row, grade8Row, grade9Row, grade10Row];
  const g = gradeRows.map(r => r);

  sheet.getCell(totalRow, 10).value = { formula: g.map(r => `J${r}`).join('+') }; // J
  sheet.getCell(totalRow, 11).value = { formula: g.map(r => `K${r}`).join('+') }; // K
  sheet.getCell(totalRow, 13).value = { formula: g.map(r => `M${r}`).join('+') }; // M
  sheet.getCell(totalRow, 14).value = { formula: g.map(r => `N${r}`).join('+') }; // N
  sheet.getCell(totalRow, 16).value = { formula: g.map(r => `P${r}`).join('+') }; // P
  sheet.getCell(totalRow, 17).value = { formula: g.map(r => `Q${r}`).join('+') }; // Q

  // Overall % = average of 4 grade percentages (4 grades, matching original template)
  sheet.getCell(totalRow, 18).value = {
    formula: `(${g.map(r => `R${r}`).join('+')})/4`
  }; // R
  sheet.getCell(totalRow, 19).value = {
    formula: `(${g.map(r => `S${r}`).join('+')})/4`
  }; // S
  sheet.getCell(totalRow, 20).value = {
    formula: `(${g.map(r => `T${r}`).join('+')})/4`
  }; // T

  applyRowFormats(sheet, totalRow);

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
