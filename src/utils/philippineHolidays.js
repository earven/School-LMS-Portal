/**
 * philippineHolidays.js
 * Comprehensive and offline-first Philippine National Holidays & Observances
 * for accurate academic school calendar rendering and school days calculation.
 */

/**
 * Calculates Easter Sunday for any Gregorian year using the Anonymous Gregorian algorithm.
 * @param {number} year 
 * @returns {Date}
 */
export const getEasterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const formatDateStr = (year, month, day) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Calculates the last Monday of August (National Heroes Day).
 */
const getLastMondayOfAugust = (year) => {
  const aug31 = new Date(year, 7, 31);
  const dayOfWeek = aug31.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const offset = (dayOfWeek + 6) % 7;
  const lastMon = 31 - offset;
  return formatDateStr(year, 8, lastMon);
};

/**
 * Generates all Philippine Regular and Special Non-Working Holidays for a given year.
 * @param {number} year
 * @returns {Array<Object>} List of standardized holiday events
 */
export const getPhilippineHolidaysForYear = (year) => {
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 1900 || y > 2100) return [];

  const easter = getEasterSunday(y);

  // Holy Week calculations
  const maundyThursdayDate = new Date(easter);
  maundyThursdayDate.setDate(easter.getDate() - 3);
  const maundyThursday = formatDateStr(y, maundyThursdayDate.getMonth() + 1, maundyThursdayDate.getDate());

  const goodFridayDate = new Date(easter);
  goodFridayDate.setDate(easter.getDate() - 2);
  const goodFriday = formatDateStr(y, goodFridayDate.getMonth() + 1, goodFridayDate.getDate());

  const blackSaturdayDate = new Date(easter);
  blackSaturdayDate.setDate(easter.getDate() - 1);
  const blackSaturday = formatDateStr(y, blackSaturdayDate.getMonth() + 1, blackSaturdayDate.getDate());

  const lastMondayAug = getLastMondayOfAugust(y);

  // Movable Islamic National Regular Holidays (declared by Presidential Proclamation)
  let islamicHolidays = [];
  if (y === 2026) {
    islamicHolidays = [
      { date: '2026-03-20', name: 'Eid al-Fitr (Feast of Ramadhan)', localName: 'Wakas ng Ramadan', category: 'Regular Holiday' },
      { date: '2026-05-27', name: 'Eid al-Adha (Feast of Sacrifice)', localName: 'Araw ng Pagpapasakit', category: 'Regular Holiday' }
    ];
  } else if (y === 2027) {
    islamicHolidays = [
      { date: '2027-03-10', name: 'Eid al-Fitr (Feast of Ramadhan)', localName: 'Wakas ng Ramadan', category: 'Regular Holiday' },
      { date: '2027-05-17', name: 'Eid al-Adha (Feast of Sacrifice)', localName: 'Araw ng Pagpapasakit', category: 'Regular Holiday' }
    ];
  }

  const holidays = [
    {
      date: formatDateStr(y, 1, 1),
      name: "New Year's Day",
      localName: 'Bagong Taon',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 2, 25),
      name: 'EDSA People Power Revolution Anniversary',
      localName: 'Anibersaryo ng Rebolusyong EDSA',
      category: 'Special Non-Working'
    },
    ...islamicHolidays,
    {
      date: maundyThursday,
      name: 'Maundy Thursday',
      localName: 'Huwebes Santo',
      category: 'Regular Holiday'
    },
    {
      date: goodFriday,
      name: 'Good Friday',
      localName: 'Biyernes Santo',
      category: 'Regular Holiday'
    },
    {
      date: blackSaturday,
      name: 'Black Saturday',
      localName: 'Sabado de Gloria',
      category: 'Special Non-Working'
    },
    {
      date: formatDateStr(y, 4, 9),
      name: 'Araw ng Kagitingan (Day of Valor)',
      localName: 'Araw ng Kagitingan',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 5, 1),
      name: 'Labor Day',
      localName: 'Araw ng Manggagawa',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 6, 12),
      name: 'Independence Day',
      localName: 'Araw ng Kalayaan',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 8, 21),
      name: 'Ninoy Aquino Day',
      localName: 'Araw ng Kabayanihan ni Ninoy Aquino',
      category: 'Special Non-Working'
    },
    {
      date: lastMondayAug,
      name: 'National Heroes Day',
      localName: 'Araw ng mga Bayani',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 11, 1),
      name: "All Saints' Day (Undas)",
      localName: 'Araw ng mga Santo',
      category: 'Special Non-Working'
    },
    {
      date: formatDateStr(y, 11, 2),
      name: "All Souls' Day",
      localName: 'Araw ng mga Kaluluwa',
      category: 'Special Non-Working'
    },
    {
      date: formatDateStr(y, 11, 30),
      name: 'Bonifacio Day',
      localName: 'Araw ni Bonifacio',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 12, 8),
      name: 'Feast of the Immaculate Conception',
      localName: 'Pista ng Inmaculada Concepcion',
      category: 'Special Non-Working'
    },
    {
      date: formatDateStr(y, 12, 24),
      name: 'Christmas Eve',
      localName: 'Bisperas ng Pasko',
      category: 'Special Non-Working'
    },
    {
      date: formatDateStr(y, 12, 25),
      name: 'Christmas Day',
      localName: 'Araw ng Pasko',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 12, 30),
      name: 'Rizal Day',
      localName: 'Araw ng Kabayanihan ni Rizal',
      category: 'Regular Holiday'
    },
    {
      date: formatDateStr(y, 12, 31),
      name: "Last Day of the Year (New Year's Eve)",
      localName: 'Bisperas ng Bagong Taon',
      category: 'Special Non-Working'
    }
  ];

  return holidays.map(h => ({
    id: `ph-holiday-${h.date}-${h.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
    title: `🇵🇭 ${h.name}`,
    localName: h.localName,
    date: h.date,
    startDate: h.date,
    endDate: h.date,
    type: 'holiday',
    description: `Official Philippine ${h.category} (${h.localName})`,
    isPrivate: false,
    isExternal: true,
    category: h.category
  }));
};
