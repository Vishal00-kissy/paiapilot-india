import React, { useState, useEffect, useRef } from 'react';
import { Expense, Category, PaymentMethod } from '../types';
import { ALL_CATEGORIES, ALL_PAYMENT_METHODS } from '../constants/categories';
import { CATEGORY_NAMES, PAYMENT_NAMES, TRANSLATIONS } from '../i18n/translations';
import { getTodayString, getMonthBounds, formatINR } from '../utils/formatters';
import { isValidCalendarDate, validateExpenseAmount } from '../utils/financialValidation';
import { X, Check, Repeat, AlertTriangle, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<Expense, 'id' | 'demo'>) => void;
  initialExpense?: Expense | null;
  lang: 'en' | 'te';
  categoryLimits?: Partial<Record<Category, number>>;
  existingExpenses?: Expense[];
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExpense,
  lang,
  categoryLimits,
  existingExpenses = [],
}) => {
  const t = TRANSLATIONS[lang];
  const formT = t.form;

  const [amountStr, setAmountStr] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [category, setCategory] = useState<Category>('Food');
  const [payment, setPayment] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState<string>(getTodayString());
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFreq, setRecurringFreq] = useState<'daily' | 'monthly'>('monthly');

  const [errors, setErrors] = useState<{
    amount?: string;
    desc?: string;
    date?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialExpense) {
        setAmountStr(String(initialExpense.amount));
        setDesc(initialExpense.desc);
        setCategory(initialExpense.category);
        setPayment(initialExpense.payment);
        setDate(initialExpense.date);
        setIsRecurring(Boolean(initialExpense.recurring?.isRecurring));
        setRecurringFreq(initialExpense.recurring?.frequency || 'monthly');
      } else {
        setAmountStr('');
        setDesc('');
        setCategory('Food');
        setPayment('UPI');
        setDate(getTodayString());
        setIsRecurring(false);
        setRecurringFreq('monthly');
      }
      setErrors({});
      setIsSubmitting(false);

      // Auto-focus amount field
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialExpense]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: {
      amount?: string;
      desc?: string;
      date?: string;
    } = {};

    const amountResult = validateExpenseAmount(amountStr);
    if (!amountResult.isValid) {
      if (amountResult.errorKey === 'tooManyDecimals' || amountResult.errorKey === 'invalidFormat') {
        newErrors.amount = formT.errors.amountInvalidFormat;
      } else {
        newErrors.amount = formT.errors.amountRequired;
      }
    }

    const trimmedDesc = desc.trim();
    if (!trimmedDesc) {
      newErrors.desc = formT.errors.descRequired;
    } else if (trimmedDesc.length > 100) {
      newErrors.desc = formT.errors.descTooLong;
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      newErrors.date = formT.errors.dateInvalid;
    } else if (!isValidCalendarDate(date)) {
      newErrors.date = formT.errors.dateCalendarInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    const amountResult = validateExpenseAmount(amountStr);
    if (!amountResult.isValid) return;

    setIsSubmitting(true);

    onSave({
      amount: amountResult.parsedAmount,
      desc: desc.trim(),
      category,
      payment,
      date,
      recurring: isRecurring
        ? {
            isRecurring: true,
            frequency: recurringFreq,
            parentId: initialExpense?.recurring?.parentId,
          }
        : undefined,
    });
  };

  const title = initialExpense ? formT.editTitle : formT.addTitle;
  const submitLabel = initialExpense ? t.actions.update : t.actions.save;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="expense-modal-title"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Amount Field */}
          <div>
            <label
              htmlFor="expense-amount"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
            >
              {formT.amountLabel}{' '}
              <span className="text-rose-500" aria-hidden="true">
                *
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold text-lg select-none">
                ₹
              </span>
              <input
                ref={amountInputRef}
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={formT.amountPlaceholder}
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
                className={`w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 font-semibold text-lg tabular-nums transition-colors ${
                  errors.amount
                    ? 'border-rose-500 focus-visible:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
                required
              />
            </div>
            {errors.amount && (
              <p
                id="expense-amount-error"
                className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400"
              >
                {errors.amount}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="expense-desc"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                {formT.descLabel}{' '}
                <span className="text-rose-500" aria-hidden="true">
                  *
                </span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {desc.length}/100
              </span>
            </div>
            <input
              id="expense-desc"
              type="text"
              maxLength={100}
              placeholder={formT.descPlaceholder}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (errors.desc) setErrors((prev) => ({ ...prev, desc: undefined }));
              }}
              aria-invalid={Boolean(errors.desc)}
              aria-describedby={errors.desc ? 'expense-desc-error' : undefined}
              className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-slate-800/80 text-base transition-colors ${
                errors.desc
                  ? 'border-rose-500 focus-visible:ring-rose-500'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
              required
            />
            {errors.desc && (
              <p
                id="expense-desc-error"
                className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400"
              >
                {errors.desc}
              </p>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label
              htmlFor="expense-category"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
            >
              {formT.categoryLabel}
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-base font-medium cursor-pointer"
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_NAMES[lang][cat]}
                </option>
              ))}
            </select>

            {/* Real-time Category Limit Status Feedback */}
            {(() => {
              const categoryLimit = categoryLimits?.[category];
              if (!categoryLimit || categoryLimit <= 0) return null;

              const { start: mStart, end: mEnd } = getMonthBounds(date || getTodayString());
              const existingSpentInMonth = existingExpenses
                .filter(
                  (e) =>
                    e.category === category &&
                    e.date >= mStart &&
                    e.date <= mEnd &&
                    e.id !== initialExpense?.id
                )
                .reduce((sum, e) => sum + e.amount, 0);

              const parsedCurrentAmount = parseFloat(amountStr) || 0;
              const projectedTotal = existingSpentInMonth + parsedCurrentAmount;
              const isOverProjected = projectedTotal > categoryLimit;
              const isNearProjected = !isOverProjected && (projectedTotal / categoryLimit) >= 0.8;
              const remainingProjected = categoryLimit - projectedTotal;

              if (isOverProjected) {
                return (
                  <div className="mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p>
                        {formT.categoryLimitExceededWarning(
                          CATEGORY_NAMES[lang][category],
                          `₹${formatINR(projectedTotal - categoryLimit)}`
                        )}
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 font-normal mt-0.5">
                        Current: {`₹${formatINR(existingSpentInMonth)}`} + This expense: {`₹${formatINR(parsedCurrentAmount)}`} = {`₹${formatINR(projectedTotal)}`} / Limit: {`₹${formatINR(categoryLimit)}`}
                      </p>
                    </div>
                  </div>
                );
              }

              if (isNearProjected) {
                return (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p>
                        {formT.categoryLimitNearWarning(
                          CATEGORY_NAMES[lang][category],
                          Math.round((projectedTotal / categoryLimit) * 100)
                        )}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-normal mt-0.5">
                        {`₹${formatINR(remainingProjected)}`} remaining of {`₹${formatINR(categoryLimit)}`} limit.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{CATEGORY_NAMES[lang][category]} limit: {`₹${formatINR(categoryLimit)}`}</span>
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                    {`₹${formatINR(remainingProjected)}`} left
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Grid: Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expense-payment"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                {formT.paymentLabel}
              </label>
              <select
                id="expense-payment"
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentMethod)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-base font-medium cursor-pointer"
              >
                {ALL_PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {PAYMENT_NAMES[lang][pm]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expense-date"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                {formT.dateLabel}
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl border bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-base tabular-nums cursor-pointer ${
                  errors.date
                    ? 'border-rose-500 focus-visible:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
                required
              />
              {errors.date && (
                <p className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          {/* Recurring Expense Toggle (User Request 1) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <label
                    htmlFor="recurring-toggle"
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer block"
                  >
                    {formT.recurringToggle}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formT.recurringToggleDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="recurring-toggle"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isRecurring ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isRecurring ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isRecurring && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {formT.recurringFrequency}:
                </span>
                <div className="grid grid-cols-2 gap-2 sm:w-64">
                  <button
                    type="button"
                    onClick={() => setRecurringFreq('daily')}
                    className={`min-h-[44px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                      recurringFreq === 'daily'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {formT.recurringDaily}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurringFreq('monthly')}
                    className={`min-h-[44px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                      recurringFreq === 'monthly'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {formT.recurringMonthly}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-base hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-base shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
