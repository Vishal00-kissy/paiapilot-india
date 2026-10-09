import React from 'react';
import { NavTab } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { Home, IndianRupee, BarChart3, Wallet, Settings as SettingsIcon } from 'lucide-react';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: 'en' | 'te';
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  lang,
}) => {
  const t = TRANSLATIONS[lang].nav;

  const tabs: {
    tab: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { tab: 'home', label: t.home, icon: Home },
    { tab: 'expenses', label: t.expenses, icon: IndianRupee },
    { tab: 'summary', label: t.summary, icon: BarChart3 },
    { tab: 'budget', label: t.budget, icon: Wallet },
    { tab: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 shadow-lg"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 items-stretch h-18 max-w-lg mx-auto">
        {tabs.map((item) => {
          const isActive = currentTab === item.tab;
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              onClick={() => onSelectTab(item.tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1.5 px-1 transition-all ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-transform ${
                  isActive ? 'scale-110 bg-emerald-50 dark:bg-emerald-950/40' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight tracking-tight mt-0.5 truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
