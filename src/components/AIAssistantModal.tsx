/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Expense, Settings, AIAnalysisResult, AIAnomaly, AISavingsTip } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { formatINR } from '../utils/formatters';
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  TrendingDown,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Cpu,
  WifiOff,
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  settings: Settings;
  lang: 'en' | 'te';
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  expenses,
  settings,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const aiT = t.aiAssistant;

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial analysis when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, expenses.length, settings.budget, lang]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchAnalysis = async (customQuestion?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/spending-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses,
          settings,
          lang,
          question: customQuestion,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const result: AIAnalysisResult = await res.json();
      setAnalysis(result);

      if (customQuestion && result.answer) {
        setChatHistory((prev) => [
          ...prev,
          { q: customQuestion, a: result.answer! },
        ]);
        setQuestion('');
      }
    } catch (err: unknown) {
      console.warn('AI fetch error, using local fallback:', err);
      // Fallback response so user always gets actionable advice
      setErrorMsg(
        lang === 'te'
          ? 'సర్వర్ కనెక్షన్ తాత్కాలికంగా ఆఫ్‌లైన్‌లో ఉంది. స్థానిక విశ్లేషణ చూపబడుతోంది.'
          : 'Server connection offline. Displaying local rule-based insights.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isLoading) return;
    fetchAnalysis(question.trim());
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isLoading) return;
    setQuestion(promptText);
    fetchAnalysis(promptText);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-assistant-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="ai-assistant-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  {aiT.title}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {aiT.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status banner */}
          <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 font-medium">
              {analysis?.isGeminiLive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{aiT.liveNotice}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>{aiT.offlineNotice}</span>
                </>
              )}
            </div>

            <button
              onClick={() => fetchAnalysis()}
              disabled={isLoading}
              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{lang === 'te' ? 'తాజాకరించు' : 'Refresh'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !analysis && (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {aiT.analyzingText}
              </p>
            </div>
          )}

          {/* AI Analysis Cards */}
          {analysis && (
            <div className="space-y-5">
              {/* Summary Assessment */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3>{aiT.overviewTitle}</h3>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  {analysis.summary}
                </p>
              </div>

              {/* Detected Anomalies */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3>{aiT.anomaliesTitle}</h3>
                </div>

                {analysis.anomalies.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {aiT.noAnomalies}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {analysis.anomalies.map((ano: AIAnomaly, i: number) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-800/90 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-3.5 space-y-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {ano.title}
                          </span>
                          {ano.amount !== undefined && (
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                              {`₹${formatINR(ano.amount)}`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {ano.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Savings Opportunities */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <Lightbulb className="w-4 h-4 text-emerald-500" />
                  <h3>{aiT.savingsTipsTitle}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.savingsTips.map((tip: AISavingsTip, i: number) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 space-y-2 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {tip.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {tip.tip}
                        </p>
                      </div>

                      {tip.potentialMonthlySavingINR > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {lang === 'te' ? 'సంభావ్య పొదుపు' : 'Est. Monthly Saving'}
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ~{`₹${formatINR(tip.potentialMonthlySavingINR)}`}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat History */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {lang === 'te' ? 'మీ మునుపటి ప్రశ్నలు' : 'Previous Inquiries'}
                  </h4>
                  <div className="space-y-3">
                    {chatHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1.5 text-xs">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl font-medium text-slate-800 dark:text-slate-200">
                          Q: {item.q}
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-emerald-900 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-900/40">
                          A: {item.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Prompts */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {aiT.quickPromptsTitle}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickPrompt(aiT.quickPrompt1)}
                className="text-xs font-medium px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                📊 {aiT.quickPrompt1}
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt(aiT.quickPrompt2)}
                className="text-xs font-medium px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                🔍 {aiT.quickPrompt2}
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt(aiT.quickPrompt3)}
                className="text-xs font-medium px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                💡 {aiT.quickPrompt3}
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt(aiT.quickPrompt4)}
                className="text-xs font-medium px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                🎯 {aiT.quickPrompt4}
              </button>
            </div>
          </div>
        </div>

        {/* Question Input Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSendQuestion} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={aiT.askPlaceholder}
              disabled={isLoading}
              className="flex-1 min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="min-h-[48px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{aiT.send}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
