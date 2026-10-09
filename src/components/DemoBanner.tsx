import React from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { Sparkles, Trash2 } from 'lucide-react';

interface DemoBannerProps {
  hasDemoData: boolean;
  onRemoveDemo: () => void;
  lang: 'en' | 'te';
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  hasDemoData,
  onRemoveDemo,
  lang,
}) => {
  if (!hasDemoData) return null;

  const t = TRANSLATIONS[lang];

  return (
    <aside
      aria-label="Demo data active notice"
      className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2.5 transition-colors"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="font-medium text-xs sm:text-sm">
            {t.dashboard.demoActiveBadge}
          </p>
        </div>
        <button
          onClick={onRemoveDemo}
          className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-100 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.actions.removeDemo}</span>
        </button>
      </div>
    </aside>
  );
};
