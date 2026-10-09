import { Expense, Settings, Category } from '../types';
import { CATEGORY_NAMES, TRANSLATIONS } from '../i18n/translations';
import { formatINR, getTodayString, getMonthBounds } from './formatters';

export interface InsightItem {
  id: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  text: string;
}

export const computeInsights = (
  expenses: Expense[],
  settings: Settings,
  lang: 'en' | 'te',
  effectiveBudget: number
): InsightItem[] => {
  const t = TRANSLATIONS[lang].insights;
  const todayStr = getTodayString();
  const [currYearStr, currMonthStr, currDayStr] = todayStr.split('-');
  const currYear = parseInt(currYearStr, 10);
  const currMonth = parseInt(currMonthStr, 10);
  const currDay = parseInt(currDayStr, 10);

  // 1. Get this month's expenses
  const { start: thisMonthStart, end: thisMonthEnd } = getMonthBounds(todayStr);
  const thisMonthExpenses = expenses.filter(
    (e) => e.date >= thisMonthStart && e.date <= thisMonthEnd
  );

  const thisMonthCount = thisMonthExpenses.length;
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Rule: If fewer than 3 expenses this month, ONLY show the prompt to add at least 3 expenses
  if (thisMonthCount < 3) {
    return [
      {
        id: 'fewer-than-3',
        type: 'info',
        text: t.needMoreExpenses(thisMonthCount),
      },
    ];
  }

  const items: InsightItem[] = [];

  // 2. Top category insight
  const categoryTotals: Partial<Record<Category, number>> = {};
  for (const exp of thisMonthExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  let topCategory: Category | null = null;
  let topAmount = 0;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt && amt > topAmount) {
      topAmount = amt;
      topCategory = cat as Category;
    }
  }

  if (topCategory && thisMonthTotal > 0) {
    const topPct = Math.round((topAmount / thisMonthTotal) * 100);
    const catDisplayName = CATEGORY_NAMES[lang][topCategory];
    items.push({
      id: 'top-category',
      type: 'info',
      text: t.topCategory(catDisplayName, `₹${formatINR(topAmount)}`, topPct),
    });
  }

  // 3. Budget status insight
  if (effectiveBudget > 0) {
    const pctUsed = Math.round((thisMonthTotal / effectiveBudget) * 100);
    if (thisMonthTotal > effectiveBudget) {
      const overAmount = thisMonthTotal - effectiveBudget;
      items.push({
        id: 'budget-status-over',
        type: 'alert',
        text: t.budgetOver(`₹${formatINR(overAmount)}`),
      });
    } else if (pctUsed >= 80) {
      items.push({
        id: 'budget-status-warning',
        type: 'warning',
        text: t.budgetWarning(pctUsed),
      });
    } else {
      items.push({
        id: 'budget-status-ok',
        type: 'success',
        text: t.budgetOnTrack(pctUsed),
      });
    }
  } else {
    items.push({
      id: 'budget-prompt',
      type: 'info',
      text: t.promptSetBudget,
    });
  }

  // 4. Compare this month so far with the SAME number of days of last month
  // Show ONLY if last month has >= 3 expenses in that range AND change is >= 10%
  const lastMonthYear = currMonth === 1 ? currYear - 1 : currYear;
  const lastMonth = currMonth === 1 ? 12 : currMonth - 1;
  const lastMonthDaysMax = new Date(lastMonthYear, lastMonth, 0).getDate();
  const compareDay = Math.min(currDay, lastMonthDaysMax);

  const lastMonthStartStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
  const lastMonthCompareEndStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(compareDay).padStart(2, '0')}`;

  const lastMonthSamePeriodExpenses = expenses.filter(
    (e) => e.date >= lastMonthStartStr && e.date <= lastMonthCompareEndStr
  );

  if (lastMonthSamePeriodExpenses.length >= 3) {
    const lastMonthPeriodTotal = lastMonthSamePeriodExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    // Current month up to same day
    const thisMonthCompareEndStr = `${currYear}-${String(currMonth).padStart(2, '0')}-${String(currDay).padStart(2, '0')}`;
    const thisMonthSamePeriodExpenses = expenses.filter(
      (e) => e.date >= thisMonthStart && e.date <= thisMonthCompareEndStr
    );
    const thisMonthPeriodTotal = thisMonthSamePeriodExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    if (lastMonthPeriodTotal > 0) {
      const diffPct = Math.round(
        ((thisMonthPeriodTotal - lastMonthPeriodTotal) / lastMonthPeriodTotal) * 100
      );

      if (Math.abs(diffPct) >= 10) {
        if (diffPct > 0) {
          items.push({
            id: 'mom-compare',
            type: 'warning',
            text: t.monthComparisonHigher(diffPct),
          });
        } else {
          items.push({
            id: 'mom-compare',
            type: 'success',
            text: t.monthComparisonLower(Math.abs(diffPct)),
          });
        }
      }
    }
  }

  // 5. Saving tip
  // If one of Food, Shopping, Other, Transport, Groceries has >= ₹100 spent,
  // say a 10% cut would save about ₹X this month. Never suggest cutting Rent or Electricity.
  const eligibleCategories: Category[] = [
    'Food',
    'Shopping',
    'Other',
    'Transport',
    'Groceries',
  ];

  let bestTipCategory: Category | null = null;
  let bestTipAmount = 0;

  for (const cat of eligibleCategories) {
    const amt = categoryTotals[cat] || 0;
    if (amt >= 100 && amt > bestTipAmount) {
      bestTipAmount = amt;
      bestTipCategory = cat;
    }
  }

  if (bestTipCategory && bestTipAmount >= 100) {
    const savings10Pct = Math.round(bestTipAmount * 0.1);
    const catName = CATEGORY_NAMES[lang][bestTipCategory];
    items.push({
      id: 'saving-tip',
      type: 'info',
      text: t.savingTip(catName, `₹${formatINR(savings10Pct)}`),
    });
  }

  return items;
};
