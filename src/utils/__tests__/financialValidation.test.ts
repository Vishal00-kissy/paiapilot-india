/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  isValidCalendarDate,
  validateExpenseAmount,
  calculateDailyAllowanceSafe,
} from '../financialValidation';

/**
 * Automated test suite for financial calculations, date validations, and edge cases.
 * Can be run in node/tsx or imported.
 */
export function runFinancialValidationTests(): {
  total: number;
  passed: number;
  failures: string[];
} {
  const failures: string[] = [];
  let testCount = 0;

  function assert(condition: boolean, testName: string) {
    testCount++;
    if (!condition) {
      failures.push(testName);
    }
  }

  // 1. Calendar Date Validation Tests
  assert(isValidCalendarDate('2024-02-29') === true, 'Leap year Feb 29 (2024) should be valid');
  assert(isValidCalendarDate('2020-02-29') === true, 'Leap year Feb 29 (2020) should be valid');
  assert(isValidCalendarDate('2000-02-29') === true, 'Century leap year Feb 29 (2000) should be valid');
  assert(isValidCalendarDate('2025-02-29') === false, 'Non-leap year Feb 29 (2025) must be rejected');
  assert(isValidCalendarDate('2026-02-29') === false, 'Non-leap year Feb 29 (2026) must be rejected');
  assert(isValidCalendarDate('2026-02-30') === false, 'Impossible Feb 30 must be rejected');
  assert(isValidCalendarDate('2026-02-31') === false, 'Impossible Feb 31 must be rejected');
  assert(isValidCalendarDate('2026-04-31') === false, 'April 31 (month has 30 days) must be rejected');
  assert(isValidCalendarDate('2026-06-31') === false, 'June 31 must be rejected');
  assert(isValidCalendarDate('2026-09-31') === false, 'September 31 must be rejected');
  assert(isValidCalendarDate('2026-11-31') === false, 'November 31 must be rejected');
  assert(isValidCalendarDate('2026-12-31') === true, 'December 31 must be valid');
  assert(isValidCalendarDate('2026-01-31') === true, 'January 31 must be valid');
  assert(isValidCalendarDate('2026-13-01') === false, 'Month 13 must be rejected');
  assert(isValidCalendarDate('2026-00-10') === false, 'Month 00 must be rejected');
  assert(isValidCalendarDate('random-string') === false, 'Invalid format must be rejected');
  assert(isValidCalendarDate('') === false, 'Empty date must be rejected');

  // 2. Amount Validation Tests
  assert(validateExpenseAmount('100').isValid === true, 'Integer amount 100 should be valid');
  assert(validateExpenseAmount('100.50').isValid === true, 'Two decimals 100.50 should be valid');
  assert(validateExpenseAmount('0.75').isValid === true, 'Fractional 0.75 should be valid');
  assert(validateExpenseAmount('0').isValid === false, 'Zero amount must be rejected');
  assert(validateExpenseAmount('-50').isValid === false, 'Negative amount must be rejected');
  assert(validateExpenseAmount('NaN').isValid === false, 'NaN must be rejected');
  assert(validateExpenseAmount('Infinity').isValid === false, 'Infinity must be rejected');
  assert(validateExpenseAmount('100.555').isValid === false, 'More than 2 decimals must be rejected');
  assert(validateExpenseAmount('').isValid === false, 'Empty amount must be rejected');
  assert(validateExpenseAmount('abc').isValid === false, 'Non-numeric string must be rejected');

  // 3. Daily Allowance & Over-budget Scenarios
  const normalAllowance = calculateDailyAllowanceSafe({
    effectiveBudget: 15000,
    monthSpent: 5000,
    todaySpent: 500,
    daysLeftInMonth: 10,
  });
  // Spent before today: 4500. Remaining: 15000 - 4500 = 10500. Over 10 days = 1050.
  assert(normalAllowance.allowance === 1050, 'Daily allowance should be 1050');
  assert(normalAllowance.isExhausted === false, 'Should not be exhausted');

  // Over-budget scenario:
  const overBudget = calculateDailyAllowanceSafe({
    effectiveBudget: 10000,
    monthSpent: 12000,
    todaySpent: 0,
    daysLeftInMonth: 5,
  });
  assert(overBudget.allowance === 0, 'Exhausted allowance should be 0');
  assert(overBudget.isExhausted === true, 'Should be flagged as exhausted');
  assert(overBudget.overAmount === 2000, 'Over amount should be 2000');

  // Month-end scenario (1 day left):
  const monthEnd = calculateDailyAllowanceSafe({
    effectiveBudget: 10000,
    monthSpent: 9000,
    todaySpent: 0,
    daysLeftInMonth: 1,
  });
  assert(monthEnd.allowance === 1000, 'Last day allowance should be 1000');

  return {
    total: testCount,
    passed: testCount - failures.length,
    failures,
  };
}

// Self-run when executed directly via tsx
const result = runFinancialValidationTests();
console.log(`Financial Validation Tests: ${result.passed}/${result.total} passed`);
if (result.failures.length > 0) {
  console.error('Failures:', result.failures);
  process.exit(1);
} else {
  console.log('All edge cases, leap years, impossible dates & financial calculations verified successfully!');
}
