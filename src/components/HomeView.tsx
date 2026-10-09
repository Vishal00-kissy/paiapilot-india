import React from 'react';
import { Expense, Settings, Category } from '../types';
import { TRANSLATIONS, CATEGORY_NAMES, PAYMENT_NAMES } from '../i18n/translations';
import { CATEGORY_METADATA, ALL_CATEGORIES } from '../constants/categories';
import {
  formatINR,
  getTodayString,
  getMonthBounds,
  getDaysRemainingInMonth,
  formatDateReadable,
} from '../utils/formatters';
import { computeInsights } from '../utils/insights';
import {
  Wallet,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import { calculateDailyAllowanceSafe } from '../utils/financialValidation';

interface HomeViewProps {
  expenses: Expense[];
  settings: Settings;
  lang: 'en' | 'te';
  effectiveBudget: number;
  onNavigateToTab: (tab: 'expenses' | 'budget') => void;
  onOpenAddModal: () => void;
  onLoadDemoData: () => void;
  onOpenAIModal?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  expenses,
  settings,
  lang,
  effectiveBudget,
  onNavigateToTab,
  onOpenAddModal,
  onLoadDemoData,
  onOpenAIModal,
}) => {
  const t = TRANSLATIONS[lang];
  const todayStr = getTodayString();
  const { start: monthStart, end: monthEnd } = getMonthBounds(todayStr);

  // Month expenses and today expenses
  const monthExpenses = expenses.filter(
    (e) => e.date >= monthStart && e.date <= monthEnd
  );
  const todayExpenses = expenses.filter((e) => e.date === todayStr);

  const monthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todaySpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Budget calculations
  const hasBudget = effectiveBudget > 0;
  const budgetLeft = hasBudget ? effectiveBudget - monthSpent : 0;
  const budgetUsedPct = hasBudget ? Math.min(100, Math.round((monthSpent / effectiveBudget) * 100)) : 0;
  const isOverBudget = hasBudget && monthSpent > effectiveBudget;
  const isBudgetWarning = hasBudget && !isOverBudget && monthSpent / effectiveBudget >= 0.8;

  // Daily Allowance Formula:
  // daysLeft = days remaining in month INCLUDING today
  // allowance = (budget - (monthSpent - todaySpent)) / daysLeft
  // leftForToday = allowance - todaySpent
  const daysLeft = getDaysRemainingInMonth(todayStr);
  const allowanceCalc = calculateDailyAllowanceSafe({
    effectiveBudget,
    monthSpent,
    todaySpent,
    daysLeftInMonth: daysLeft,
  });
  const dailyAllowance = allowanceCalc.allowance;
  const isBudgetFinished = hasBudget && (allowanceCalc.isExhausted || budgetLeft <= 0);
  const leftForToday = dailyAllowance - todaySpent;

  // Insights
  const insights = computeInsights(expenses, settings, lang, effectiveBudget);

  // Category breakdown for this month
  const categoryTotals: Record<Category, number> = ALL_CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat]: 0 }),
    {} as Record<Category, number>
  );

  for (const exp of monthExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  // Find max category & sort active categories
  const activeCategories = ALL_CATEGORIES.filter((c) => categoryTotals[c] > 0).sort(
    (a, b) => categoryTotals[b] - categoryTotals[a]
  );
  const highestCategory = activeCategories.length > 0 ? activeCategories[0] : null;

  // 5 Recent Expenses (across all recorded dates)
  const sortedRecentExpenses = [...expenses]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, 5);

  const isEmpty = expenses.length === 0;

  // Category limits evaluation
  const categoryLimits = settings.categoryLimits || {};
  const overLimitCategories = ALL_CATEGORIES.filter((cat) => {
    const limit = categoryLimits[cat];
    return typeof limit === 'number' && limit > 0 && (categoryTotals[cat] || 0) > limit;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-10">
      {/* First-Run Welcome Card (when 0 expenses exist) */}
      {isEmpty && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
                {t.dashboard.welcomeTitle}
              </h2>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 max-w-xl leading-relaxed">
                {t.dashboard.welcomeDesc}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={onOpenAddModal}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t.actions.addExpense}</span>
              </button>
              <button
                onClick={onLoadDemoData}
                className="min-h-[48px] px-5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-slate-700 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.actions.loadDemo}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Over-Limit Category Warning Alert Banner */}
      {overLimitCategories.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {lang === 'te'
                  ? `${overLimitCategories.length} విభాగాలు ఈ నెల ఖర్చుల పరిమితిని దాటాయి!`
                  : `${overLimitCategories.length} category limit${overLimitCategories.length > 1 ? 's' : ''} exceeded this month!`}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                {overLimitCategories
                  .map((c) => `${CATEGORY_NAMES[lang][c]} (${`₹${formatINR(categoryTotals[c])}`} / ${`₹${formatINR(categoryLimits[c]!)}`})`)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('budget')}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            <span>{lang === 'te' ? 'పరిమితులు చూడండి' : 'Review Limits'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top 3 Core Metric Cards: Spent this month, Spent today, Budget Left */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Core Metrics">
        {/* Spent this Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.spentThisMonth}
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {`₹${formatINR(monthSpent)}`}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
              {formatDateReadable(monthStart, lang, false)} – {formatDateReadable(monthEnd, lang, false)}
            </span>
          </div>
        </div>

        {/* Spent Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.spentToday}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tight">
              {`₹${formatINR(todaySpent)}`}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
              {todayExpenses.length} {t.expenses.resultsCount}
            </span>
          </div>
        </div>

        {/* Budget Left */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.budgetLeft}
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {hasBudget ? (
              <>
                <div
                  className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
                    isOverBudget
                      ? 'text-rose-600 dark:text-rose-400'
                      : isBudgetWarning
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {`₹${formatINR(budgetLeft)}`}
                </div>
                {/* Progress bar */}
                <div className="mt-2 space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverBudget
                          ? 'bg-rose-500'
                          : isBudgetWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (monthSpent / effectiveBudget) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                    <span>
                      {Math.round((monthSpent / effectiveBudget) * 100)}% {t.dashboard.budgetUsed}
                    </span>
                    <span>
                      {t.dashboard.ofBudget} {`₹${formatINR(effectiveBudget)}`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {t.dashboard.noBudgetSet}
                </p>
                <button
                  onClick={() => onNavigateToTab('budget')}
                  className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {t.actions.setBudget}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI Spending Assistant Banner Card (Recommendation 2) */}
      {onOpenAIModal && (
        <section className="bg-gradient-to-r from-emerald-900/10 via-teal-900/5 to-slate-100 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.aiAssistant.title}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {lang === 'te'
                  ? 'మీ ఖర్చులను విశ్లేషించి అసాధారణ ఖర్చులు మరియు ఆచరణాత్మక పొదుపు చిట్కాలను పొందండి.'
                  : 'Detect unusual transaction spikes and get realistic savings strategies tailored for students & households.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAIModal}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shrink-0 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Bot className="w-4 h-4 text-emerald-200" />
            <span>{t.actions.askAI}</span>
          </button>
        </section>
      )}

      {/* Two Column Section: Daily Allowance & Saving Insights */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Allowance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t.dashboard.dailyAllowanceTitle}
              </h3>
            </div>
            {hasBudget && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                {daysLeft} {t.dashboard.daysLeftInMonth}
              </span>
            )}
          </div>

          {hasBudget ? (
            isBudgetFinished ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300 leading-snug">
                  {t.dashboard.allowanceExhausted}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      {t.dashboard.leftForToday}
                    </span>
                    <div
                      className={`text-2xl font-bold tabular-nums mt-0.5 ${
                        leftForToday < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {`₹${formatINR(Math.max(0, leftForToday))}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                      {t.dashboard.recommendedDaily}
                    </span>
                    <span className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {`₹${formatINR(dailyAllowance)}`}/day
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Formula: ({`₹${formatINR(effectiveBudget)}`} budget − {`₹${formatINR(monthSpent - todaySpent)}`} prior spent) ÷ {daysLeft} remaining days.
                </div>
              </div>
            )
          ) : (
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.dashboard.noBudgetSet}
              </p>
              <button
                onClick={() => onNavigateToTab('budget')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {t.actions.setBudget}
              </button>
            </div>
          )}
        </div>

        {/* Saving Insights Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t.dashboard.savingsInsightsTitle}
            </h3>
          </div>

          <div className="space-y-3">
            {insights.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border text-sm flex items-start gap-3 leading-snug ${
                  item.type === 'alert'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                    : item.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                    : item.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {item.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {item.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}
                <p className="font-medium text-xs sm:text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spending by Category (Horizontal Bars, highest marked) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {t.dashboard.spendingByCategory}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {formatDateReadable(monthStart, lang, false)} – {formatDateReadable(monthEnd, lang, false)}
          </span>
        </div>

        {activeCategories.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            {t.dashboard.noRecent}
          </p>
        ) : (
          <div className="space-y-3.5 pt-1">
            {activeCategories.map((cat) => {
              const amt = categoryTotals[cat];
              const pctOfTotal = monthSpent > 0 ? Math.round((amt / monthSpent) * 100) : 0;
              const isHighest = cat === highestCategory;
              const meta = CATEGORY_METADATA[cat];
              const catName = CATEGORY_NAMES[lang][cat];

              const limit = categoryLimits[cat];
              const hasLimit = typeof limit === 'number' && limit > 0;
              const isOver = hasLimit && amt > limit;
              const isNear = hasLimit && !isOver && (amt / limit) >= 0.8;
              const limitPct = hasLimit ? Math.round((amt / limit) * 100) : pctOfTotal;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {catName}
                      </span>
                      {isHighest && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          {t.dashboard.highestCategory} ({pctOfTotal}%)
                        </span>
                      )}
                      {isOver && (
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Exceeded by {`₹${formatINR(amt - limit)}`}</span>
                        </span>
                      )}
                      {isNear && (
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                          Near limit ({limitPct}%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {`₹${formatINR(amt)}`}
                      </span>
                      {hasLimit ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          / {`₹${formatINR(limit)}`} ({limitPct}%)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          ({pctOfTotal}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal bar */}
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
                        width: `${Math.min(100, hasLimit ? limitPct : pctOfTotal)}%`,
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

      {/* 5 Recent Expenses */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {t.dashboard.recentExpenses}
          </h3>
          <button
            onClick={() => onNavigateToTab('expenses')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>{t.dashboard.viewAll}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {sortedRecentExpenses.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
            {t.dashboard.noRecent}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedRecentExpenses.map((exp) => {
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
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatDateReadable(exp.date, lang, false)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                      {`₹${formatINR(exp.amount)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Local Storage Disclaimer Note */}
      <footer className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
        {t.dashboard.storageNote}
      </footer>
    </div>
  );
};
