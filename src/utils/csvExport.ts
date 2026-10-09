import { Expense } from '../types';
import { CATEGORY_NAMES, PAYMENT_NAMES } from '../i18n/translations';
import { getTodayString } from './formatters';

/**
 * Escapes a string to safely place inside a CSV cell.
 * If the string contains quotes, commas, or newlines, wraps in quotes
 * and escapes double quotes by doubling them.
 */
const escapeCSVCell = (val: string | number): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Generates and downloads a CSV file containing all expenses.
 * Uses UTF-8 BOM (\uFEFF) so Excel and spreadsheet apps preserve Telugu and special characters.
 */
export const exportExpensesToCSV = (
  expenses: Expense[],
  lang: 'en' | 'te'
): { success: boolean; count: number } => {
  if (!expenses || expenses.length === 0) {
    return { success: false, count: 0 };
  }

  // Sort newest first
  const sorted = [...expenses].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));

  // CSV Headers
  const headers = [
    'Date (YYYY-MM-DD)',
    'Description',
    'Category',
    'Category (Local)',
    'Amount (INR)',
    'Payment Method',
    'Payment Method (Local)',
    'Record Type',
  ];

  const rows = sorted.map((exp) => {
    const localCat = CATEGORY_NAMES[lang][exp.category] || exp.category;
    const localPay = PAYMENT_NAMES[lang][exp.payment] || exp.payment;
    const recordType = exp.demo ? 'Sample Demo' : 'User Expense';

    return [
      escapeCSVCell(exp.date),
      escapeCSVCell(exp.desc),
      escapeCSVCell(exp.category),
      escapeCSVCell(localCat),
      escapeCSVCell(exp.amount.toFixed(2)),
      escapeCSVCell(exp.payment),
      escapeCSVCell(localPay),
      escapeCSVCell(recordType),
    ].join(',');
  });

  // UTF-8 BOM prefix
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = getTodayString();
    link.href = url;
    link.setAttribute('download', `paisapilot-india-expenses-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: sorted.length };
  } catch {
    return { success: false, count: 0 };
  }
};
