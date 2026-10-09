import React from 'react';
import { NavTab, AuthUser } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Plus, Globe, Sparkles, User, LogOut, LogIn } from 'lucide-react';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: 'en' | 'te';
  onToggleLang: () => void;
  onOpenAddModal: () => void;
  onOpenAIModal?: () => void;
  user?: AuthUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  lang,
  onToggleLang,
  onOpenAddModal,
  onOpenAIModal,
  user,
  onOpenAuthModal,
  onLogout,
}) => {
  const t = TRANSLATIONS[lang];

  const navItems: { tab: NavTab; label: string }[] = [
    { tab: 'home', label: t.nav.home },
    { tab: 'expenses', label: t.nav.expenses },
    { tab: 'summary', label: t.nav.summary },
    { tab: 'budget', label: t.nav.budget },
    { tab: 'settings', label: t.nav.settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 text-left group focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-900/20">
              ₹
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight block tracking-tight">
                {t.appName}
              </span>
              <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 block leading-none">
                Team Zenvex
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60"
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onSelectTab(item.tab)}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Primary Actions Zone */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* AI Advisor Button */}
          {onOpenAIModal && (
            <button
              onClick={onOpenAIModal}
              className="min-h-[48px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Open AI Advisor"
              title="Open Gemini AI Spending Assistant"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">{t.aiAssistant.buttonBadge}</span>
              <span className="sm:hidden">AI</span>
            </button>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={onToggleLang}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={`Switch language. Current: ${lang === 'en' ? 'English' : 'తెలుగు'}`}
            title="Switch Language / భాషను మార్చండి"
          >
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="tabular-nums">{lang === 'en' ? 'తెలుగు' : 'English'}</span>
          </button>

          {/* User Account / Auth Button */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 pl-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[120px] truncate" title={user.email || ''}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">{user.displayName || user.email?.split('@')[0] || 'User'}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                  title={t.auth?.logout || 'Log Out'}
                  aria-label="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="min-h-[48px] px-3.5 py-2 rounded-xl border border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
                aria-label="Sign In"
              >
                <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">{t.auth?.signInBtn || 'Sign In'}</span>
              </button>
            )
          )}

          {/* Add Expense Button */}
          <button
            onClick={onOpenAddModal}
            className="min-h-[48px] px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-sm shadow-emerald-900/10 flex items-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={t.actions.addExpense}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="hidden sm:inline">{t.actions.addExpense}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
