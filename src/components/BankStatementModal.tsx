/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Expense, Category, PaymentMethod, ParsedBankTransaction, BankStatementSummary } from '../types';
import { TRANSLATIONS, CATEGORY_NAMES, PAYMENT_NAMES } from '../i18n/translations';
import { ALL_CATEGORIES, CATEGORY_METADATA } from '../constants/categories';
import { formatINR } from '../utils/formatters';
import {
  parseBankStatement,
  getSampleBankStatements,
} from '../utils/bankStatement';
import {
  X,
  Upload,
  FileText,
  Landmark,
  Check,
  AlertCircle,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportExpenses: (expenses: Omit<Expense, 'id' | 'demo'>[]) => void;
  existingExpenses: Expense[];
  lang: 'en' | 'te';
}

type StatementTab = 'upload' | 'paste' | 'samples';

const ALL_PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Cash', 'Other'];

export const BankStatementModal: React.FC<BankStatementModalProps> = ({
  isOpen,
  onClose,
  onImportExpenses,
  existingExpenses,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const bT = t.bankStatement;

  const [activeTab, setActiveTab] = useState<StatementTab>('samples');
  const [statementSummary, setStatementSummary] = useState<BankStatementSummary | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    } else {
      setStatementSummary(null);
      setPastedText('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Duplicate checker helper
  const isDuplicateExpense = (item: { date: string; amount: number; desc: string }): boolean => {
    return existingExpenses.some(
      (e) =>
        e.date === item.date &&
        Math.abs(e.amount - item.amount) < 0.01 &&
        (e.desc.toLowerCase().includes(item.desc.toLowerCase()) ||
          item.desc.toLowerCase().includes(e.desc.toLowerCase()))
    );
  };

  // Process parsed statement and annotate with duplicates
  const processSummary = (summary: BankStatementSummary) => {
    if (summary.transactions.length === 0) {
      setErrorMessage(bT.noDebitsFound);
      setStatementSummary(null);
      return;
    }

    const annotatedTransactions: ParsedBankTransaction[] = summary.transactions.map((txn) => {
      const isDup = isDuplicateExpense(txn);
      return {
        ...txn,
        isDuplicate: isDup,
        // If duplicate skipping is enabled, unselect duplicates by default
        selected: isDup ? false : true,
      };
    });

    setStatementSummary({
      ...summary,
      transactions: annotatedTransactions,
    });
    setErrorMessage(null);
  };

  // Handle file selection
  const handleFile = (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || !content.trim()) {
        setErrorMessage(bT.toastEmptyFile);
        return;
      }
      try {
        const parsed = parseBankStatement(content, file.name);
        processSummary(parsed);
      } catch {
        setErrorMessage(bT.noDebitsFound);
      }
    };
    reader.onerror = () => {
      setErrorMessage(bT.noDebitsFound);
    };
    reader.readAsText(file);
  };

  // Handle paste parse
  const handleParsePasted = () => {
    if (!pastedText.trim()) return;
    try {
      const parsed = parseBankStatement(pastedText, 'Pasted Statement');
      processSummary(parsed);
    } catch {
      setErrorMessage(bT.noDebitsFound);
    }
  };

  // Handle sample selection
  const handleLoadSample = (sampleType: 'sbi' | 'hdfc' | 'icici') => {
    const samples = getSampleBankStatements();
    const content = samples[sampleType];
    const nameMap = {
      sbi: 'SBI Statement.csv',
      hdfc: 'HDFC Statement.csv',
      icici: 'ICICI Statement.csv',
    };
    const parsed = parseBankStatement(content, nameMap[sampleType]);
    processSummary(parsed);
  };

  // Toggle item selection
  const handleToggleSelect = (id: string) => {
    if (!statementSummary) return;
    setStatementSummary((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === id ? { ...t, selected: !t.selected } : t
        ),
      };
    });
  };

  // Select all / Deselect all
  const handleSelectAll = (select: boolean) => {
    if (!statementSummary) return;
    setStatementSummary((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        transactions: prev.transactions.map((t) => ({ ...t, selected: select })),
      };
    });
  };

  // Update item field (category, payment, desc)
  const handleUpdateItem = (
    id: string,
    field: 'category' | 'payment' | 'desc',
    val: string
  ) => {
    if (!statementSummary) return;
    setStatementSummary((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === id ? { ...t, [field]: val } : t
        ),
      };
    });
  };

  // Calculate selected total
  const selectedTransactions = useMemo(() => {
    return statementSummary?.transactions.filter((t) => t.selected) || [];
  }, [statementSummary]);

  const selectedTotal = useMemo(() => {
    return selectedTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [selectedTransactions]);

  // Execute import
  const handleImport = () => {
    if (selectedTransactions.length === 0) return;

    const newExpenses: Omit<Expense, 'id' | 'demo'>[] = selectedTransactions.map((t) => ({
      amount: t.amount,
      desc: t.desc,
      category: t.category,
      payment: t.payment,
      date: t.date,
    }));

    onImportExpenses(newExpenses);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank-statement-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="bank-statement-modal-title"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                {bT.modalTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {bT.modalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* If no statement is parsed yet, show source options */}
          {!statementSummary ? (
            <div className="space-y-6">
              {/* Source Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
                <button
                  onClick={() => setActiveTab('samples')}
                  className={`min-h-[44px] px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'samples'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{bT.tabSamples}</span>
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`min-h-[44px] px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{bT.tabUpload}</span>
                </button>

                <button
                  onClick={() => setActiveTab('paste')}
                  className={`min-h-[44px] px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{bT.tabPaste}</span>
                </button>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Tab: Samples */}
              {activeTab === 'samples' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Test the monthly bank statement loader immediately with pre-formatted statements from top Indian banks:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* SBI */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                          SBI
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {bT.sampleSbiTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {bT.sampleSbiDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadSample('sbi')}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <span>{bT.loadSampleCta}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* HDFC */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                          HDFC
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {bT.sampleHdfcTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {bT.sampleHdfcDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadSample('hdfc')}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <span>{bT.loadSampleCta}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* ICICI */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                          ICICI
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {bT.sampleIciciTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {bT.sampleIciciDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadSample('icici')}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <span>{bT.loadSampleCta}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: File Upload */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = '';
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                      isDragging
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                        {bT.dropzoneTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        {bT.dropzoneHint}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Paste Text */}
              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="paste-statement-text"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {bT.tabPaste}
                    </label>
                    <textarea
                      id="paste-statement-text"
                      rows={7}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={bT.pastePlaceholder}
                      className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleParsePasted}
                    disabled={!pastedText.trim()}
                    className={`min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-xs ${
                      pastedText.trim()
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{bT.pasteButton}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Statement Review Screen */
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      {statementSummary.bankName}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {statementSummary.monthYear}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {statementSummary.totalDebits} {bT.totalDebitsCount} · Total spend {`₹${formatINR(statementSummary.totalDebitAmount)}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <button
                    onClick={() => setStatementSummary(null)}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
                  >
                    Change Statement
                  </button>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                      Selected ({selectedTransactions.length})
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                      {`₹${formatINR(selectedTotal)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls bar: Select all, filter duplicates */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{bT.selectAll}</span>
                  </button>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>{bT.deselectAll}</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => {
                      const willSkip = e.target.checked;
                      setSkipDuplicates(willSkip);
                      if (statementSummary) {
                        setStatementSummary((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            transactions: prev.transactions.map((t) => ({
                              ...t,
                              selected: willSkip && t.isDuplicate ? false : t.selected,
                            })),
                          };
                        });
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>{bT.skipDuplicates}</span>
                </label>
              </div>

              {/* Transactions List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {statementSummary.transactions.map((item) => {
                  const meta = CATEGORY_METADATA[item.category];

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        item.selected
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 opacity-70'
                      }`}
                    >
                      {/* Left: Checkbox & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-5 h-5 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 shrink-0 cursor-pointer"
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                              {item.date}
                            </span>
                            {item.isDuplicate && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                {bT.duplicateTag}
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={item.desc}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'desc', e.target.value)
                            }
                            className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Right: Selectors & Amount */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-8 sm:pl-0">
                        {/* Category Selector */}
                        <div className="relative">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.id,
                                'category',
                                e.target.value as Category
                              )
                            }
                            className="text-xs font-medium pl-2 pr-6 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            {ALL_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {CATEGORY_NAMES[lang][c]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="relative">
                          <select
                            value={item.payment}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.id,
                                'payment',
                                e.target.value as PaymentMethod
                              )
                            }
                            className="text-xs font-medium pl-2 pr-6 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            {ALL_PAYMENT_METHODS.map((p) => (
                              <option key={p} value={p}>
                                {PAYMENT_NAMES[lang][p]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Amount */}
                        <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums w-24 text-right">
                          {`₹${formatINR(item.amount)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            {t.actions.cancel}
          </button>

          {statementSummary && (
            <button
              onClick={handleImport}
              disabled={selectedTransactions.length === 0}
              className={`w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                selectedTransactions.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {bT.importCta(
                  selectedTransactions.length,
                  `₹${formatINR(selectedTotal)}`
                )}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
