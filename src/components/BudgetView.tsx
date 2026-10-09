import React, { useState, useMemo } from 'react';
import { Expense, Settings, Category } from '../types';
import { TRANSLATIONS, CATEGORY_NAMES } from '../i18n/translations';
import {
  ALL_CATEGORIES,
  CATEGORY_METADATA,
  isNeedCategory,
} from '../constants/categories';
import { formatINR, getTodayString, getMonthBounds } from '../utils/formatters';
import {
  Wallet,
  Home,
  CheckCircle2,
  AlertTriangle,
  Save,
  ShieldCheck,
  TrendingDown,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Sparkles,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface BudgetViewProps {
  expenses: Expense[];
  settings: Settings;
  lang: 'en' | 'te';
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  onShowToast: (text: string, type: 'success' | 'info' | 'error') => void;
}

type CategoryFilterType = 'all' | 'with-limits' | 'over-limit' | 'needs' | 'wants';

export const BudgetView: React.FC<BudgetViewProps> = ({
  expenses,
  settings,
  lang,
  onUpdateSettings,
  onShowToast,
}) => {
  const t = TRANSLATIONS[lang];
  const bT = t.budget;

  const todayStr = getTodayString();
  const { start: monthStart, end: monthEnd } = getMonthBounds(todayStr);

  // Month spending
  const monthExpenses = expenses.filter(
    (e) => e.date >= monthStart && e.date <= monthEnd
  );
  const monthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category-wise spending for current month
  const categorySpentMap = useMemo(() => {
    const map: Record<Category, number> = {
      Groceries: 0,
      Food: 0,
      Transport: 0,
      Rent: 0,
      Electricity: 0,
      Education: 0,
      Healthcare: 0,
      'Mobile Recharge': 0,
      Shopping: 0,
      Other: 0,
    };
    for (const exp of monthExpenses) {
      if (exp.category in map) {
        map[exp.category] += exp.amount;
      }
    }
    return map;
  }, [monthExpenses]);

  // Needs vs Wants breakdown for this month
  const needsSpent = monthExpenses
    .filter((e) => isNeedCategory(e.category))
    .reduce((sum, e) => sum + e.amount, 0);
  const wantsSpent = monthExpenses
    .filter((e) => !isNeedCategory(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  // Local state for regular budget input
  const [budgetInput, setBudgetInput] = useState<string>(
    settings.budget > 0 ? String(settings.budget) : ''
  );
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Local state for household mode
  const [isHouseholdOn, setIsHouseholdOn] = useState<boolean>(settings.household.on);
  const [incomeInput, setIncomeInput] = useState<string>(
    settings.household.income > 0 ? String(settings.household.income) : ''
  );
  const [savePct, setSavePct] = useState<number>(settings.household.savePct ?? 10);

  // Category Limits state
  const categoryLimits = settings.categoryLimits || {};
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [limitInputVal, setLimitInputVal] = useState<string>('');
  const [limitError, setLimitError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('all');

  // Calculations for household budget
  const parsedIncome = Math.max(0, parseFloat(incomeInput) || 0);
  const householdComputedBudget =
    isHouseholdOn && parsedIncome > 0 ? parsedIncome * (1 - savePct / 100) : 0;

  // Effective active budget
  const effectiveBudget =
    isHouseholdOn && parsedIncome > 0 ? householdComputedBudget : settings.budget;

  // Regular budget progress stats
  const hasBudget = effectiveBudget > 0;
  const budgetRemaining = effectiveBudget - monthSpent;
  const pctSpent = hasBudget ? (monthSpent / effectiveBudget) * 100 : 0;
  const isOverBudget = hasBudget && monthSpent > effectiveBudget;
  const isWarningBudget = hasBudget && !isOverBudget && pctSpent >= 80;

  // Household savings targets
  const savingsTarget = parsedIncome * (savePct / 100);
  const actualSaved = parsedIncome - monthSpent;
  const isSavingsOnTrack = actualSaved >= savingsTarget;

  // Category Limits calculations
  const totalAllocatedCeiling = useMemo(() => {
    return Object.values(categoryLimits).reduce((sum, val) => sum + (val || 0), 0);
  }, [categoryLimits]);

  const configuredCategoriesCount = useMemo(() => {
    return Object.keys(categoryLimits).filter(
      (cat) => (categoryLimits[cat as Category] || 0) > 0
    ).length;
  }, [categoryLimits]);

  const overLimitCategories = useMemo(() => {
    return ALL_CATEGORIES.filter((cat) => {
      const limit = categoryLimits[cat];
      return typeof limit === 'number' && limit > 0 && categorySpentMap[cat] > limit;
    });
  }, [categoryLimits, categorySpentMap]);

  const nearLimitCategories = useMemo(() => {
    return ALL_CATEGORIES.filter((cat) => {
      const limit = categoryLimits[cat];
      if (!limit || limit <= 0) return false;
      const spent = categorySpentMap[cat];
      return spent <= limit && (spent / limit) >= 0.8;
    });
  }, [categoryLimits, categorySpentMap]);

  // Handlers for overall budget
  const handleSaveRegularBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = budgetInput.trim();
    const val = Number(clean);
    if (!clean || isNaN(val) || !Number.isFinite(val) || val < 0 || val > 100000000) {
      setBudgetError(bT.invalidBudget);
      return;
    }
    setBudgetError(null);
    onUpdateSettings({
      budget: Math.round(val * 100) / 100,
      demoBudget: false,
    });
    onShowToast(bT.budgetSaved, 'success');
  };

  const handleToggleHousehold = (checked: boolean) => {
    setIsHouseholdOn(checked);
    onUpdateSettings({
      household: {
        on: checked,
        income: parsedIncome,
        savePct,
      },
    });
  };

  const handleSaveHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      household: {
        on: isHouseholdOn,
        income: parsedIncome,
        savePct,
      },
      demoBudget: false,
    });
    onShowToast(bT.budgetSaved, 'success');
  };

  // Handlers for category limits
  const startEditingCategory = (category: Category) => {
    setEditingCategory(category);
    const existing = categoryLimits[category];
    setLimitInputVal(existing && existing > 0 ? String(existing) : '');
    setLimitError(null);
  };

  const cancelEditingCategory = () => {
    setEditingCategory(null);
    setLimitInputVal('');
    setLimitError(null);
  };

  const handleSaveCategoryLimit = (category: Category) => {
    const clean = limitInputVal.trim();
    const val = Number(clean);
    if (!clean || isNaN(val) || !Number.isFinite(val) || val <= 0 || val > 10000000) {
      setLimitError(bT.invalidBudget);
      return;
    }

    const rounded = Math.round(val * 100) / 100;
    const nextLimits = {
      ...categoryLimits,
      [category]: rounded,
    };

    onUpdateSettings({
      categoryLimits: nextLimits,
    });

    setEditingCategory(null);
    setLimitInputVal('');
    setLimitError(null);
    onShowToast(bT.limitSaved(CATEGORY_NAMES[lang][category]), 'success');
  };

  const handleRemoveCategoryLimit = (category: Category) => {
    const nextLimits = { ...categoryLimits };
    delete nextLimits[category];

    onUpdateSettings({
      categoryLimits: nextLimits,
    });

    if (editingCategory === category) {
      cancelEditingCategory();
    }
    onShowToast(bT.limitCleared(CATEGORY_NAMES[lang][category]), 'info');
  };

  const handleApplyPresetLimits = () => {
    const sensiblePresets: Partial<Record<Category, number>> = {
      Groceries: 5000,
      Food: 4000,
      Transport: 2500,
      Rent: 12000,
      Electricity: 2000,
      Education: 3000,
      Healthcare: 2000,
      'Mobile Recharge': 600,
      Shopping: 3000,
      Other: 1500,
    };

    onUpdateSettings({
      categoryLimits: sensiblePresets,
    });
    onShowToast(
      lang === 'te'
        ? 'నమూనా విభాగాల పరిమితులు వర్తింపజేయబడ్డాయి!'
        : 'Smart recommended category limits applied!',
      'success'
    );
  };

  const handleClearAllCategoryLimits = () => {
    onUpdateSettings({
      categoryLimits: {},
    });
    setEditingCategory(null);
    onShowToast(bT.allLimitsCleared, 'info');
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return ALL_CATEGORIES.filter((cat) => {
      const limit = categoryLimits[cat];
      const hasLimit = typeof limit === 'number' && limit > 0;
      const spent = categorySpentMap[cat];
      const isOver = hasLimit && spent > limit;

      if (categoryFilter === 'with-limits') return hasLimit;
      if (categoryFilter === 'over-limit') return isOver;
      if (categoryFilter === 'needs') return isNeedCategory(cat);
      if (categoryFilter === 'wants') return !isNeedCategory(cat);
      return true; // 'all'
    });
  }, [categoryFilter, categoryLimits, categorySpentMap]);

  return (
    <div className="space-y-8 pb-24 md:pb-12">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {bT.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {bT.monthlyBudgetDesc}
        </p>
      </div>

      {/* Household Mode Switch Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {bT.householdModeTitle}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {bT.householdModeSubtitle}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="flex items-center gap-3 cursor-pointer shrink-0">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {bT.turnOnHousehold}
            </span>
            <input
              type="checkbox"
              checked={isHouseholdOn}
              onChange={(e) => handleToggleHousehold(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 relative" />
          </label>
        </div>

        {/* Household Configuration Form (Active when household is toggled) */}
        {isHouseholdOn ? (
          <form onSubmit={handleSaveHousehold} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="household-income"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  {bT.monthlyIncomeLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg select-none">
                    ₹
                  </span>
                  <input
                    id="household-income"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 50000"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white font-bold text-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label
                    htmlFor="save-pct-slider"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    {bT.savingsPctLabel}
                  </label>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300 tabular-nums">
                    {savePct}% (Target: {`₹${formatINR(savingsTarget)}`})
                  </span>
                </div>
                <input
                  id="save-pct-slider"
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={savePct}
                  onChange={(e) => setSavePct(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600 mt-3"
                />
              </div>
            </div>

            {/* Plain Sentence rule */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200">
              {bT.householdSentence(needsSpent, wantsSpent, parsedIncome)}
            </div>

            {/* Household Status: on-track or warning */}
            <div
              className={`p-4 rounded-xl border text-sm flex items-start gap-3 leading-snug ${
                isSavingsOnTrack
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              }`}
            >
              {isSavingsOnTrack ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="font-semibold">
                {isSavingsOnTrack ? bT.householdStatusOnTrack : bT.householdStatusWarning}
              </p>
            </div>
          </form>
        ) : (
          /* Manual Monthly Budget Form */
          <form onSubmit={handleSaveRegularBudget} className="space-y-5">
            <div>
              <label
                htmlFor="manual-budget-input"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                {bT.budgetInputLabel}
              </label>
              <div className="relative max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg select-none">
                  ₹
                </span>
                <input
                  id="manual-budget-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder={bT.budgetInputPlaceholder}
                  value={budgetInput}
                  onChange={(e) => {
                    setBudgetInput(e.target.value);
                    setBudgetError(null);
                  }}
                  className={`w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white font-bold text-lg tabular-nums ${
                    budgetError
                      ? 'border-rose-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {budgetError && (
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-400 font-medium">
                  {budgetError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{bT.saveBudget}</span>
            </button>
          </form>
        )}
      </div>

      {/* Live Overall Budget Utilization Card */}
      {hasBudget && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Monthly Budget Utilization
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isHouseholdOn ? 'Household Computed Budget' : 'Manual Set Budget'}
                </span>
              </div>
            </div>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
              {`₹${formatINR(effectiveBudget)}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Total Spent This Month
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                {`₹${formatINR(monthSpent)}`}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Remaining Amount
              </span>
              <span
                className={`text-2xl font-extrabold tabular-nums mt-0.5 block ${
                  isOverBudget
                    ? 'text-rose-600 dark:text-rose-400'
                    : isWarningBudget
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {`₹${formatINR(budgetRemaining)}`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
              <span>{Math.round(pctSpent)}% utilized</span>
              <span>
                {isOverBudget ? 'Exceeded 100%' : `${Math.round(100 - pctSpent)}% remaining`}
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverBudget
                    ? 'bg-rose-500'
                    : isWarningBudget
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, pctSpent)}%`,
                }}
              />
            </div>
          </div>

          {/* Status Message */}
          <div
            className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 font-medium ${
              isOverBudget
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                : isWarningBudget
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            {isOverBudget ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : isWarningBudget ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <p>
              {isOverBudget
                ? bT.budgetStatusOver
                : isWarningBudget
                ? bT.budgetStatusWarning
                : bT.budgetStatusOnTrack}
            </p>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* CATEGORY EXPENSE LIMITS SECTION (User Request 2)           */}
      {/* ========================================================= */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {bT.categoryLimitsTitle}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  {configuredCategoriesCount}/10
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {bT.categoryLimitsSubtitle}
              </p>
            </div>
          </div>

          {/* Quick presets & Clear actions */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleApplyPresetLimits}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 transition-colors cursor-pointer"
              title="Apply suggested limits for common expenses"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{bT.quickPresets}</span>
            </button>

            {configuredCategoriesCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllCategoryLimits}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title={bT.clearAllLimits}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{bT.clearAllLimits}</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Overview Cards for Category Limits */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {bT.totalAllocatedLimits}
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
              {`₹${formatINR(totalAllocatedCeiling)}`}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {bT.categoriesConfigured}
            </span>
            <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5 block">
              {configuredCategoriesCount} / 10
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {bT.categoriesOverLimitCount}
            </span>
            <span
              className={`text-lg sm:text-xl font-bold tabular-nums mt-0.5 block ${
                overLimitCategories.length > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {overLimitCategories.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {bT.categoriesNearLimitCount}
            </span>
            <span
              className={`text-lg sm:text-xl font-bold tabular-nums mt-0.5 block ${
                nearLimitCategories.length > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {nearLimitCategories.length}
            </span>
          </div>
        </div>

        {/* Over-Limit or Near-Limit Alerts */}
        {overLimitCategories.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-sm flex items-start gap-2.5 font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{bT.categoryAlertBanner(overLimitCategories.length)}</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                {overLimitCategories.map((c) => CATEGORY_NAMES[lang][c]).join(', ')}
              </p>
            </div>
          </div>
        )}

        {overLimitCategories.length === 0 && nearLimitCategories.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{bT.categoryWarningBanner(nearLimitCategories.length)}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {nearLimitCategories.map((c) => CATEGORY_NAMES[lang][c]).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {bT.filterAll} (10)
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('with-limits')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'with-limits'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {bT.filterWithLimits} ({configuredCategoriesCount})
          </button>
          {overLimitCategories.length > 0 && (
            <button
              type="button"
              onClick={() => setCategoryFilter('over-limit')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'over-limit'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              {bT.filterOverLimit} ({overLimitCategories.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setCategoryFilter('needs')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'needs'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {bT.filterNeeds}
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('wants')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'wants'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {bT.filterWants}
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {filteredCategories.map((cat) => {
            const catName = CATEGORY_NAMES[lang][cat];
            const meta = CATEGORY_METADATA[cat];
            const spent = categorySpentMap[cat];
            const limit = categoryLimits[cat];
            const hasLimit = typeof limit === 'number' && limit > 0;
            const isEditing = editingCategory === cat;
            const pct = hasLimit ? (spent / limit) * 100 : 0;
            const isOver = hasLimit && spent > limit;
            const isNear = hasLimit && !isOver && pct >= 80;
            const remaining = hasLimit ? limit - spent : 0;
            const isNeed = isNeedCategory(cat);

            return (
              <div
                key={cat}
                className={`p-4 rounded-xl border transition-all ${
                  isOver
                    ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/30 dark:bg-rose-950/15'
                    : isNear
                    ? 'border-amber-300 dark:border-amber-900/80 bg-amber-50/30 dark:bg-amber-950/15'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Card Top: Category Identity & Quick Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                      style={{
                        backgroundColor: meta.bgLight,
                        color: meta.color,
                      }}
                    >
                      {cat.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {catName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isNeed
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {isNeed ? bT.essentialNeedBadge : bT.discretionaryWantBadge}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Spent this month:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                          {`₹${formatINR(spent)}`}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions / Limit display */}
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditingCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={hasLimit ? bT.editLimit : bT.setLimit}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {hasLimit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCategoryLimit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={bT.clearLimit}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Edit Form */}
                {isEditing ? (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        {bT.limitAmount}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="50"
                          autoFocus
                          placeholder={bT.limitPlaceholder}
                          value={limitInputVal}
                          onChange={(e) => {
                            setLimitInputVal(e.target.value);
                            setLimitError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCategoryLimit(cat);
                            } else if (e.key === 'Escape') {
                              cancelEditingCategory();
                            }
                          }}
                          className={`w-full h-10 pl-8 pr-3 rounded-lg border text-sm font-bold tabular-nums bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                            limitError
                              ? 'border-rose-500'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        />
                      </div>
                      {limitError && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                          {limitError}
                        </p>
                      )}
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {bT.quickPresets}:
                      </span>
                      {[1000, 2500, 5000, 10000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setLimitInputVal(String(preset))}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {`₹${formatINR(preset)}`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={cancelEditingCategory}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {t.actions.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveCategoryLimit(cat)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{bT.saveLimit}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal Card Display (Limit Progress & Badges) */
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {hasLimit ? (
                      <>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Limit:{' '}
                            <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                              {`₹${formatINR(limit!)}`}
                            </strong>
                          </span>
                          <span
                            className={`font-bold tabular-nums ${
                              isOver
                                ? 'text-rose-600 dark:text-rose-400'
                                : isNear
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {Math.round(pct)}% {bT.utilized}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver
                                ? 'bg-rose-500'
                                : isNear
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, pct)}%`,
                            }}
                          />
                        </div>

                        {/* Bottom Status text */}
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          {isOver ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {bT.overLimit} by {`₹${formatINR(spent - limit!)}`}
                              </span>
                            </span>
                          ) : isNear ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {`₹${formatINR(remaining)}`} {bT.remainingAllowance} (Warning)
                              </span>
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {`₹${formatINR(remaining)}`} {bT.remainingAllowance}
                              </span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => startEditingCategory(cat)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2 cursor-pointer"
                          >
                            {bT.editLimit}
                          </button>
                        </div>
                      </>
                    ) : (
                      /* No Limit Set State */
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                          {bT.noLimitSet}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditingCategory(cat)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          + {bT.setLimit}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
