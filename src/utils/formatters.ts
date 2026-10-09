/**
 * Formats a number string with Indian digit grouping (e.g. 1,23,456 or 1,23,456.50)
 */
export const formatNumber = (amount: number, showDecimalsIfZero = false): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }

  const absAmount = Math.abs(amount);
  const isWhole = Math.abs(absAmount - Math.round(absAmount)) < 0.001;
  return absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimalsIfZero ? 2 : isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formatted currency number string with Indian digit grouping
 */
export const formatINR = (amount: number, showDecimalsIfZero = false): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }

  const isNegative = amount < 0;
  const formattedNumber = formatNumber(amount, showDecimalsIfZero);
  return isNegative ? `-${formattedNumber}` : formattedNumber;
};

/**
 * Get today's date formatted as YYYY-MM-DD in local time
 */
export const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date string (YYYY-MM-DD) into readable text
 */
export const formatDateReadable = (
  dateStr: string,
  lang: 'en' | 'te',
  includeYear = true
): string => {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return dateStr;

  const enMonthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const teMonthsShort = [
    'జన', 'ఫిబ్ర', 'మార్చి', 'ఏప్రి', 'మే', 'జూన్',
    'జూలై', 'ఆగ', 'సెప్టెం', 'అక్టో', 'నవం', 'డిసెం',
  ];

  const monthName =
    lang === 'te' ? teMonthsShort[month] : enMonthsShort[month];

  if (!includeYear) {
    return `${day} ${monthName}`;
  }
  return `${day} ${monthName} ${year}`;
};

/**
 * Get days remaining in the month INCLUDING today
 */
export const getDaysRemainingInMonth = (anchorDateStr: string = getTodayString()): number => {
  const [yearStr, monthStr, dayStr] = anchorDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const day = parseInt(dayStr, 10);

  // Total days in month
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = totalDaysInMonth - day + 1; // Including today
  return Math.max(1, daysLeft);
};

/**
 * Get start and end dates of the calendar month for a date
 */
export const getMonthBounds = (dateStr: string): { start: string; end: string; year: number; month: number; daysCount: number } => {
  const [yearStr, monthStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const daysCount = new Date(year, month, 0).getDate();

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;
  return { start, end, year, month, daysCount };
};

/**
 * Get start and end of week (Monday to Sunday) for a date
 */
export const getWeekBounds = (dateStr: string): { start: string; end: string; days: string[] } => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const yr = current.getFullYear();
    const mo = String(current.getMonth() + 1).padStart(2, '0');
    const da = String(current.getDate()).padStart(2, '0');
    days.push(`${yr}-${mo}-${da}`);
  }

  return {
    start: days[0],
    end: days[6],
    days,
  };
};

/**
 * Add or subtract days
 */
export const shiftDateByDays = (dateStr: string, daysOffset: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysOffset);
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const da = String(date.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

/**
 * Shift month by offset
 */
export const shiftDateByMonths = (dateStr: string, monthsOffset: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1 + monthsOffset, 1);
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const maxDays = new Date(yr, date.getMonth() + 1, 0).getDate();
  const da = String(Math.min(d, maxDays)).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

export { isValidCalendarDate, validateExpenseAmount } from './financialValidation';
