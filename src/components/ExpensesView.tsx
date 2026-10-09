import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../types';
import { TRANSLATIONS, CATEGORY_NAMES, PAYMENT_NAMES } from '../i18n/translations';
import { CATEGORY_METADATA, ALL_CATEGORIES } from '../constants/categories';
import {
  formatINR,
  getTodayString,
  getMonthBounds,
  getWeekBounds,
  formatDateReadable,
} from '../utils/formatters';
import {
  Search,
  Calendar,
  Filter,
  Edit3,
  Trash2,
  X,
  Receipt,
  Plus,
  Repeat,
  Landmark,
} from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  lang: 'en' | 'te';
  onEditExpense: (expense: Expense) => void;
  onRequestDeleteExpense: (expense: Expense) => void;
  onOpenAddModal: () => void;
  onOpenLoadStatementModal?: () => void;
  categoryLimits?: Partial<Record<Category, number>>;
}

type QuickFilter = 'all' | 'today' | 'week' | 'month';

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  lang,
  onEditExpense,
  onRequestDeleteExpense,
  onOpenAddModal,
  onOpenLoadStatementModal,
  categoryLimits,
}) => {
  const t = TRANSLATIONS[lang];
  const expT = t.expenses;
  const formT = t.form;

  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const todayStr = getTodayString();
  const { start: monthStart, end: monthEnd } = getMonthBounds(todayStr);
  const { start: weekStart, end: weekEnd } = getWeekBounds(todayStr);

  // Current month spending by category for limit status
  const monthCategoryTotals = useMemo(() => {
    const totals: Partial<Record<Category, number>> = {};
    expenses.forEach((e) => {
      if (e.date >= monthStart && e.date <= monthEnd) {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      }
    });
    return totals;
  }, [expenses, monthStart, monthEnd]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Search filter: description or category name in EN or TE
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const descMatch = exp.desc.toLowerCase().includes(query);
        const catEnMatch = exp.category.toLowerCase().includes(query);
        const catTeMatch = CATEGORY_NAMES.te[exp.category].toLowerCase().includes(query);
        const paymentMatch = exp.payment.toLowerCase().includes(query);

        if (!descMatch && !catEnMatch && !catTeMatch && !paymentMatch) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }

      // 3. Custom date range (if both or either is filled)
      if (fromDate && exp.date < fromDate) {
        return false;
      }
      if (toDate && exp.date > toDate) {
        return false;
      }

      // 4. Quick filter (only applies if no custom fromDate/toDate is active)
      if (!fromDate && !toDate) {
        if (quickFilter === 'today' && exp.date !== todayStr) {
          return false;
        }
        if (quickFilter === 'week' && (exp.date < weekStart || exp.date > weekEnd)) {
          return false;
        }
        if (quickFilter === 'month' && (exp.date < monthStart || exp.date > monthEnd)) {
          return false;
        }
      }

      return true;
    });
  }, [
    expenses,
    searchQuery,
    selectedCategory,
    fromDate,
    toDate,
    quickFilter,
    todayStr,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
  ]);

  // Sort newest first
  const sortedFilteredExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      if (a.date === b.date) {
        return 0;
      }
      return a.date < b.date ? 1 : -1;
    });
  }, [filteredExpenses]);

  // Aggregate sum & count
  const filteredTotal = useMemo(() => {
    return sortedFilteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [sortedFilteredExpenses]);

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    fromDate ||
    toDate ||
    quickFilter !== 'month';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFromDate('');
    setToDate('');
    setQuickFilter('month');
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Top Header with Add CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {expT.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {expenses.length} {expT.resultsCount}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenLoadStatementModal && (
            <button
              onClick={onOpenLoadStatementModal}
              className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              title="Load Monthly Bank Statement"
            >
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.actions.loadStatement}</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.actions.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Search input */}
        <div className="relative">
          <label htmlFor="expense-search" className="sr-only">
            {expT.searchPlaceholder}
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="expense-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={expT.searchPlaceholder}
            className="w-full min-h-[48px] pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-base placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setQuickFilter('today');
              setFromDate('');
              setToDate('');
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              quickFilter === 'today' && !fromDate && !toDate
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {expT.today}
          </button>
          <button
            onClick={() => {
              setQuickFilter('week');
              setFromDate('');
              setToDate('');
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              quickFilter === 'week' && !fromDate && !toDate
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {expT.thisWeek}
          </button>
          <button
            onClick={() => {
              setQuickFilter('month');
              setFromDate('');
              setToDate('');
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              quickFilter === 'month' && !fromDate && !toDate
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {expT.thisMonth}
          </button>
          <button
            onClick={() => {
              setQuickFilter('all');
              setFromDate('');
              setToDate('');
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              quickFilter === 'all' && !fromDate && !toDate
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {expT.allTime}
          </button>
        </div>

        {/* Detailed Filters: Category and Custom Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="filter-category"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              {expT.category}
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category | 'all')}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-medium cursor-pointer"
            >
              <option value="all">{expT.allCategories}</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_NAMES[lang][cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-from-date"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              {expT.fromDate}
            </label>
            <input
              id="filter-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm tabular-nums cursor-pointer"
            />
          </div>

          <div>
            <label
              htmlFor="filter-to-date"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              {expT.toDate}
            </label>
            <input
              id="filter-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm tabular-nums cursor-pointer"
            />
          </div>
        </div>

        {/* Reset button if filter is active */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleResetFilters}
              className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              {t.actions.reset}
            </button>
          </div>
        )}
      </div>

      {/* Aggregate Banner: Count & Total Amount */}
      <div className="bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
          <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            {sortedFilteredExpenses.length} {expT.resultsCount}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {expT.totalAmount}:
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {`₹${formatINR(filteredTotal)}`}
          </span>
        </div>
      </div>

      {/* Expense List */}
      {sortedFilteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Receipt className="w-7 h-7" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {expenses.length === 0 ? expT.noExpensesEver : expT.noResults}
          </p>
          {expenses.length === 0 && (
            <button
              onClick={onOpenAddModal}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t.actions.addExpense}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
          {sortedFilteredExpenses.map((exp) => {
            const meta = CATEGORY_METADATA[exp.category];
            const catName = CATEGORY_NAMES[lang][exp.category];
            const payName = PAYMENT_NAMES[lang][exp.payment];

            return (
              <div
                key={exp.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Left: Category Icon, Description, Metadata */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 mt-0.5 shadow-xs"
                    style={{ backgroundColor: meta.color }}
                  >
                    {exp.category.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base text-slate-900 dark:text-white break-words">
                        {exp.desc}
                      </p>
                      {exp.demo && (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-md">
                          {expT.demoItemTag}
                        </span>
                      )}
                      {exp.recurring?.isRecurring && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md">
                          <Repeat className="w-3 h-3" />
                          <span>
                            {exp.recurring.frequency === 'daily'
                              ? formT.recurringBadgeDaily
                              : formT.recurringBadgeMonthly}
                          </span>
                        </span>
                      )}
                    </div>
                    {/* Unboxed metadata separated by typographic dots */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {catName}
                      </span>
                      {(() => {
                        const limit = categoryLimits?.[exp.category];
                        if (limit && limit > 0) {
                          const catSpent = monthCategoryTotals[exp.category] || 0;
                          const isOver = catSpent > limit;
                          const isNear = !isOver && catSpent >= limit * 0.85;
                          if (isOver) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.5 rounded">
                                {lang === 'te' ? 'పరిమితి దాటింది' : 'Limit Exceeded'}
                              </span>
                            );
                          } else if (isNear) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-1.5 py-0.5 rounded">
                                {lang === 'te' ? 'పరిమితి సమీపంలో' : 'Near Limit'}
                              </span>
                            );
                          }
                        }
                        return null;
                      })()}
                      <span aria-hidden="true">·</span>
                      <span>{payName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateReadable(exp.date, lang)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions (Edit, Delete) */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {`₹${formatINR(exp.amount)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditExpense(exp)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label={`${t.actions.edit} ${exp.desc}`}
                      title={t.actions.edit}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRequestDeleteExpense(exp)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      aria-label={`${t.actions.delete} ${exp.desc}`}
                      title={t.actions.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
