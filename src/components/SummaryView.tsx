import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../types';
import { TRANSLATIONS, CATEGORY_NAMES, PAYMENT_NAMES } from '../i18n/translations';
import { CATEGORY_METADATA, ALL_CATEGORIES } from '../constants/categories';
import {
  formatINR,
  getTodayString,
  getMonthBounds,
  getWeekBounds,
  shiftDateByDays,
  shiftDateByMonths,
  formatDateReadable,
} from '../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart2,
  TrendingUp,
  Receipt,
} from 'lucide-react';

interface SummaryViewProps {
  expenses: Expense[];
  lang: 'en' | 'te';
  categoryLimits?: Partial<Record<Category, number>>;
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

export const SummaryView: React.FC<SummaryViewProps> = ({
  expenses,
  lang,
  categoryLimits,
}) => {
  const t = TRANSLATIONS[lang];
  const sumT = t.summary;

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [anchorDate, setAnchorDate] = useState<string>(getTodayString());

  const todayStr = getTodayString();

  // Navigation handlers
  const handlePrev = () => {
    if (periodType === 'daily') {
      setAnchorDate(shiftDateByDays(anchorDate, -1));
    } else if (periodType === 'weekly') {
      setAnchorDate(shiftDateByDays(anchorDate, -7));
    } else {
      setAnchorDate(shiftDateByMonths(anchorDate, -1));
    }
  };

  const handleNext = () => {
    if (periodType === 'daily') {
      setAnchorDate(shiftDateByDays(anchorDate, 1));
    } else if (periodType === 'weekly') {
      setAnchorDate(shiftDateByDays(anchorDate, 7));
    } else {
      setAnchorDate(shiftDateByMonths(anchorDate, 1));
    }
  };

  const handleGoToDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setAnchorDate(e.target.value);
    }
  };

  // Compute boundaries & days in period
  const { periodLabel, periodExpenses, dayDataList, elapsedDaysCount } = useMemo(() => {
    if (periodType === 'daily') {
      const dayExpenses = expenses.filter((e) => e.date === anchorDate);
      const isPastOrToday = anchorDate <= todayStr;
      return {
        periodLabel: formatDateReadable(anchorDate, lang),
        periodExpenses: dayExpenses,
        dayDataList: [{ date: anchorDate, amount: dayExpenses.reduce((s, e) => s + e.amount, 0), dayLabel: anchorDate.slice(8) }],
        elapsedDaysCount: isPastOrToday ? 1 : 0,
      };
    }

    if (periodType === 'weekly') {
      const { start, end, days } = getWeekBounds(anchorDate);
      const weekExpenses = expenses.filter((e) => e.date >= start && e.date <= end);

      const daysOfWeekEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const daysOfWeekTe = ['సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని', 'ఆది'];

      const dayList = days.map((dateStr, idx) => {
        const amt = weekExpenses
          .filter((e) => e.date === dateStr)
          .reduce((s, e) => s + e.amount, 0);
        const dayName = lang === 'te' ? daysOfWeekTe[idx] : daysOfWeekEn[idx];
        const dayNumber = dateStr.slice(8);
        return {
          date: dateStr,
          amount: amt,
          dayLabel: `${dayName} ${dayNumber}`,
        };
      });

      // Calculate elapsed days so far
      let elapsed = 0;
      for (const d of days) {
        if (d <= todayStr) elapsed++;
      }

      const label = `${formatDateReadable(start, lang, false)} – ${formatDateReadable(end, lang)}`;
      return {
        periodLabel: label,
        periodExpenses: weekExpenses,
        dayDataList: dayList,
        elapsedDaysCount: elapsed,
      };
    }

    // Monthly view
    const { start, end, daysCount, year, month } = getMonthBounds(anchorDate);
    const monthExpenses = expenses.filter((e) => e.date >= start && e.date <= end);

    const dayList = [];
    for (let dayNum = 1; dayNum <= daysCount; dayNum++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const amt = monthExpenses
        .filter((e) => e.date === dStr)
        .reduce((s, e) => s + e.amount, 0);
      dayList.push({
        date: dStr,
        amount: amt,
        dayLabel: String(dayNum),
      });
    }

    // Elapsed days calculation for month
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    let elapsed = 0;
    if (year < tY || (year === tY && month < tM)) {
      elapsed = daysCount;
    } else if (year === tY && month === tM) {
      elapsed = Math.min(daysCount, tD);
    } else {
      elapsed = 0;
    }

    const monthName = formatDateReadable(`${year}-${String(month).padStart(2, '0')}-01`, lang, true);
    // Remove day '1 ' from string if present
    const cleanMonthLabel = monthName.replace(/^\d+\s*/, '');

    return {
      periodLabel: cleanMonthLabel || `${month}/${year}`,
      periodExpenses: monthExpenses,
      dayDataList: dayList,
      elapsedDaysCount: elapsed,
    };
  }, [periodType, anchorDate, expenses, lang, todayStr]);

  // Aggregate stats
  const totalSpent = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [periodExpenses]);

  const expenseCount = periodExpenses.length;

  const averagePerDay = elapsedDaysCount > 0 ? totalSpent / elapsedDaysCount : 0;

  // Category distribution
  const categoryTotals = useMemo(() => {
    const totals: Record<Category, number> = ALL_CATEGORIES.reduce(
      (acc, c) => ({ ...acc, [c]: 0 }),
      {} as Record<Category, number>
    );
    for (const exp of periodExpenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    }
    return totals;
  }, [periodExpenses]);

  const activeCategories = ALL_CATEGORIES.filter((c) => categoryTotals[c] > 0).sort(
    (a, b) => categoryTotals[b] - categoryTotals[a]
  );

  // SVG Chart Dimensions & Computations
  const maxDayAmount = Math.max(...dayDataList.map((d) => d.amount), 1);
  const chartHeight = 160;
  const chartWidth = 600;
  const barGap = periodType === 'weekly' ? 16 : 4;
  const totalBars = dayDataList.length;
  const barWidth = Math.max(
    6,
    (chartWidth - (totalBars - 1) * barGap - 20) / totalBars
  );

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Top Controls: Period Toggle & Navigation Stepper */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Segmented Period Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setPeriodType('daily')}
              className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                periodType === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sumT.daily}
            </button>
            <button
              onClick={() => setPeriodType('weekly')}
              className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                periodType === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sumT.weekly}
            </button>
            <button
              onClick={() => setPeriodType('monthly')}
              className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                periodType === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sumT.monthly}
            </button>
          </div>

          {/* Stepper & Date Picker */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={sumT.previous}
                title={sumT.previous}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={sumT.next}
                title={sumT.next}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="summary-go-to-date" className="sr-only">
                {sumT.goToDate}
              </label>
              <input
                id="summary-go-to-date"
                type="date"
                value={anchorDate}
                onChange={handleGoToDate}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs tabular-nums cursor-pointer"
                title={sumT.goToDate}
              />
            </div>
          </div>
        </div>

        {/* Current Active Period Headline */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {periodLabel}
            </h3>
          </div>
          {anchorDate === todayStr && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
              {sumT.current}
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Stats Cards: Total, Expenses Count, Average Per Day */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Period Totals">
        {/* Total Spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            {sumT.totalSpent}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {`₹${formatINR(totalSpent)}`}
          </div>
        </div>

        {/* Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            {sumT.expenseCount}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {expenseCount}
          </div>
        </div>

        {/* Average Per Day */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            {sumT.dailyAverage}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {`₹${formatINR(averagePerDay)}`}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            {sumT.elapsedDaysNote} ({elapsedDaysCount} {elapsedDaysCount === 1 ? 'day' : 'days'})
          </span>
        </div>
      </section>

      {/* Day-Wise Column Chart (Inline SVG for weekly and monthly views) */}
      {periodType !== 'daily' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {sumT.dayWiseTrend}
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              Peak: {`₹${formatINR(maxDayAmount)}`}
            </span>
          </div>

          {/* Inline SVG Chart */}
          <div className="w-full overflow-hidden pt-2 pb-1">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
              className="w-full h-auto max-h-52 select-none"
            >
              {/* Baseline divider */}
              <line
                x1="0"
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="1.5"
              />

              {dayDataList.map((day, i) => {
                const height =
                  day.amount > 0
                    ? Math.max(4, (day.amount / maxDayAmount) * (chartHeight - 20))
                    : 0;
                const x = 10 + i * (barWidth + barGap);
                const y = chartHeight - height;
                const isToday = day.date === todayStr;

                return (
                  <g key={day.date} className="group cursor-pointer">
                    {/* Background hover hit target */}
                    <rect
                      x={x - 2}
                      y="0"
                      width={barWidth + 4}
                      height={chartHeight}
                      fill="transparent"
                      className="hover:fill-slate-100/50 dark:hover:fill-slate-800/40"
                    />

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx={barWidth > 10 ? '4' : '2'}
                      fill={isToday ? '#059669' : day.amount > 0 ? '#10b981' : '#e2e8f0'}
                      className={day.amount > 0 ? 'transition-all' : 'dark:fill-slate-800'}
                    />

                    {/* Amount tooltip above bar when active */}
                    {day.amount > 0 && periodType === 'weekly' && (
                      <text
                        x={x + barWidth / 2}
                        y={Math.max(14, y - 6)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="currentColor"
                        className="text-slate-700 dark:text-slate-300 font-mono"
                      >
                        ₹{Math.round(day.amount)}
                      </text>
                    )}

                    {/* Day label below */}
                    {(periodType === 'weekly' || (periodType === 'monthly' && (i === 0 || (i + 1) % 5 === 0 || i === dayDataList.length - 1))) && (
                      <text
                        x={x + barWidth / 2}
                        y={chartHeight + 20}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isToday ? '700' : '500'}
                        fill={isToday ? '#059669' : 'currentColor'}
                        className="text-slate-500 dark:text-slate-400"
                      >
                        {day.dayLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </section>
      )}

      {/* Category Breakdown Bars */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {sumT.categoryBreakdown}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {activeCategories.length} {sumT.categoryBreakdown.toLowerCase()}
          </span>
        </div>

        {activeCategories.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
            {sumT.noExpensesInPeriod}
          </p>
        ) : (
          <div className="space-y-3.5 pt-1">
            {activeCategories.map((cat) => {
              const amt = categoryTotals[cat];
              const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
              const meta = CATEGORY_METADATA[cat];
              const catName = CATEGORY_NAMES[lang][cat];

              const limit = periodType === 'monthly' ? categoryLimits?.[cat] : undefined;
              const hasLimit = typeof limit === 'number' && limit > 0;
              const isOver = hasLimit && amt > limit;
              const isNear = hasLimit && !isOver && (amt / limit) >= 0.8;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {catName}
                      </span>
                      {isOver && (
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md">
                          Exceeded limit
                        </span>
                      )}
                      {isNear && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                          Near limit
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {`₹${formatINR(amt)}`}
                      </span>
                      {hasLimit ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          / {`₹${formatINR(limit)}`} ({pct}%)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          ({pct}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? 'bg-rose-500'
                          : isNear
                          ? 'bg-amber-500'
                          : ''
                      }`}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isOver || isNear ? undefined : meta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* For Daily View: List of expenses on that day */}
      {periodType === 'daily' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {sumT.todayExpenses}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {periodExpenses.length} records
            </span>
          </div>

          {periodExpenses.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {sumT.noExpensesInPeriod}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {periodExpenses.map((exp) => {
                const meta = CATEGORY_METADATA[exp.category];
                return (
                  <div
                    key={exp.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: meta.color }}
                      >
                        {exp.category.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {exp.desc}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{CATEGORY_NAMES[lang][exp.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{PAYMENT_NAMES[lang][exp.payment]}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                      {`₹${formatINR(exp.amount)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
