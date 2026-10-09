/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validates that a string is a real calendar date in YYYY-MM-DD format.
 * Accurately rejects impossible dates such as:
 * - Feb 29 on non-leap years (e.g. 2025-02-29, 2026-02-29)
 * - Feb 30 or Feb 31
 * - April 31, June 31, September 31, November 31
 * - Month < 1 or Month > 12
 * - Day < 1 or Day > 31
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Reasonable year range
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  // Check leap year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  // Maximum days per month
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const maxDays = daysInMonth[month - 1];
  if (day < 1 || day > maxDays) return false;

  // Date object roundtrip verification
  const testDate = new Date(year, month - 1, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month - 1 &&
    testDate.getDate() === day
  );
}

export interface AmountValidationResult {
  isValid: boolean;
  parsedAmount: number;
  errorKey?: 'required' | 'invalidFormat' | 'notPositive' | 'tooLarge' | 'tooManyDecimals';
}

/**
 * Validates expense amounts:
 * - Must be a finite positive number
 * - Must not exceed ₹1,00,00,000 (1 crore)
 * - Up to 2 decimal places maximum
 * - No NaN, Infinity, negative values or scientific notation
 */
export function validateExpenseAmount(amountStr: string): AmountValidationResult {
  if (!amountStr || !amountStr.trim()) {
    return { isValid: false, parsedAmount: 0, errorKey: 'required' };
  }

  const clean = amountStr.trim();

  // Strict number format: digits with optional decimal point followed by 1 or 2 digits
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) {
    if (/^\d+\.\d{3,}$/.test(clean)) {
      return { isValid: false, parsedAmount: 0, errorKey: 'tooManyDecimals' };
    }
    return { isValid: false, parsedAmount: 0, errorKey: 'invalidFormat' };
  }

  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || isNaN(parsed)) {
    return { isValid: false, parsedAmount: 0, errorKey: 'invalidFormat' };
  }

  if (parsed <= 0) {
    return { isValid: false, parsedAmount: 0, errorKey: 'notPositive' };
  }

  if (parsed > 100000000) {
    return { isValid: false, parsedAmount: 0, errorKey: 'tooLarge' };
  }

  return {
    isValid: true,
    parsedAmount: Math.round(parsed * 100) / 100,
  };
}

/**
 * Computes daily allowance with robust handling of over-budget and edge scenarios:
 * Formula: allowance = (effectiveBudget - (monthSpent - todaySpent)) / daysLeftInMonth
 * When budget is exhausted, returns 0 and an overspent amount.
 */
export function calculateDailyAllowanceSafe(params: {
  effectiveBudget: number;
  monthSpent: number;
  todaySpent: number;
  daysLeftInMonth: number;
}): {
  allowance: number;
  isExhausted: boolean;
  overAmount: number;
  leftForMonth: number;
} {
  const { effectiveBudget, monthSpent, todaySpent, daysLeftInMonth } = params;

  if (effectiveBudget <= 0) {
    return {
      allowance: 0,
      isExhausted: false,
      overAmount: 0,
      leftForMonth: 0,
    };
  }

  const daysLeft = Math.max(1, daysLeftInMonth);
  const spentBeforeToday = Math.max(0, monthSpent - todaySpent);
  const remainingForMonth = effectiveBudget - spentBeforeToday;

  if (remainingForMonth <= 0) {
    return {
      allowance: 0,
      isExhausted: true,
      overAmount: Math.abs(remainingForMonth),
      leftForMonth: 0,
    };
  }

  const rawAllowance = remainingForMonth / daysLeft;
  const safeAllowance = Math.max(0, Math.round(rawAllowance * 100) / 100);

  return {
    allowance: safeAllowance,
    isExhausted: false,
    overAmount: 0,
    leftForMonth: remainingForMonth,
  };
}
