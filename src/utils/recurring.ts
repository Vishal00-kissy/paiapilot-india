/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Expense } from '../types';
import { getTodayString } from './formatters';

/**
 * Returns number of days in a given year and month (1-indexed month)
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Adds days to a YYYY-MM-DD date string safely
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * Checks all recurring expense templates and automatically populates
 * missing instances up to today.
 */
export function populateRecurringExpenses(expenses: Expense[]): {
  updatedExpenses: Expense[];
  generatedCount: number;
} {
  const today = getTodayString();
  const newGenerated: Expense[] = [];

  // Existing keys to avoid duplicating: "parentId|date" or "id|date"
  const existingSet = new Set<string>();
  for (const exp of expenses) {
    if (exp.recurring?.parentId) {
      existingSet.add(`${exp.recurring.parentId}|${exp.date}`);
    } else if (exp.recurring?.isRecurring) {
      existingSet.add(`${exp.id}|${exp.date}`);
    }
  }

  // Find all root recurring definitions
  const rootRecurringExpenses = expenses.filter(
    (e) => e.recurring?.isRecurring && !e.recurring.parentId
  );

  for (const root of rootRecurringExpenses) {
    const freq = root.recurring?.frequency || 'monthly';
    const [startYear, startMonth, startDay] = root.date.split('-').map(Number);

    if (freq === 'daily') {
      // Generate daily instances from start date + 1 up to today (max 60 days to prevent large spikes)
      let currentCheckDate = addDays(root.date, 1);
      let safetyCounter = 0;

      while (currentCheckDate <= today && safetyCounter < 60) {
        safetyCounter++;
        const key = `${root.id}|${currentCheckDate}`;
        if (!existingSet.has(key)) {
          existingSet.add(key);
          newGenerated.push({
            id: `rec-${root.id}-${currentCheckDate}`,
            amount: root.amount,
            desc: root.desc,
            category: root.category,
            payment: root.payment,
            date: currentCheckDate,
            demo: root.demo,
            recurring: {
              isRecurring: true,
              frequency: 'daily',
              parentId: root.id,
            },
          });
        }
        currentCheckDate = addDays(currentCheckDate, 1);
      }
    } else if (freq === 'monthly') {
      // Monthly recurrence: for each subsequent month up to today's month
      const [todayYear, todayMonth] = today.split('-').map(Number);
      let iterYear = startYear;
      let iterMonth = startMonth + 1; // start from next month

      if (iterMonth > 12) {
        iterYear += 1;
        iterMonth = 1;
      }

      let safetyMonths = 0;
      while (
        (iterYear < todayYear || (iterYear === todayYear && iterMonth <= todayMonth)) &&
        safetyMonths < 36
      ) {
        safetyMonths++;
        const maxDays = getDaysInMonth(iterYear, iterMonth);
        const dayToUse = Math.min(startDay, maxDays);
        const targetDate = `${iterYear}-${String(iterMonth).padStart(2, '0')}-${String(dayToUse).padStart(2, '0')}`;

        if (targetDate <= today) {
          const key = `${root.id}|${targetDate}`;
          if (!existingSet.has(key)) {
            existingSet.add(key);
            newGenerated.push({
              id: `rec-${root.id}-${targetDate}`,
              amount: root.amount,
              desc: root.desc,
              category: root.category,
              payment: root.payment,
              date: targetDate,
              demo: root.demo,
              recurring: {
                isRecurring: true,
                frequency: 'monthly',
                parentId: root.id,
              },
            });
          }
        }

        iterMonth += 1;
        if (iterMonth > 12) {
          iterYear += 1;
          iterMonth = 1;
        }
      }
    }
  }

  if (newGenerated.length === 0) {
    return { updatedExpenses: expenses, generatedCount: 0 };
  }

  // Combine and sort descending by date (newest first)
  const combined = [...newGenerated, ...expenses].sort((a, b) => {
    return b.date.localeCompare(a.date);
  });

  return {
    updatedExpenses: combined,
    generatedCount: newGenerated.length,
  };
}
