import React, { useRef } from 'react';
import { Settings, Expense } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import {
  Globe,
  Sparkles,
  Trash2,
  HardDrive,
  WifiOff,
  Award,
  AlertTriangle,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Landmark,
  User,
  Cloud,
  LogOut,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import { AuthUser } from '../types';

interface SettingsViewProps {
  expenses: Expense[];
  settings: Settings;
  lang: 'en' | 'te';
  hasDemoData: boolean;
  onSetLang: (newLang: 'en' | 'te') => void;
  onLoadDemoData: () => void;
  onRemoveDemoData: () => void;
  onDownloadCSV: () => void;
  onDownloadJSON: () => void;
  onRestoreJSON: (file: File) => void;
  onRequestDeleteAll: () => void;
  onOpenLoadStatementModal?: () => void;
  user?: AuthUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onSyncGuestData?: () => void;
  isSyncing?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  expenses,
  settings,
  lang,
  hasDemoData,
  onSetLang,
  onLoadDemoData,
  onRemoveDemoData,
  onDownloadCSV,
  onDownloadJSON,
  onRestoreJSON,
  onRequestDeleteAll,
  onOpenLoadStatementModal,
  user,
  onOpenAuthModal,
  onLogout,
  onSyncGuestData,
  isSyncing,
}) => {
  const t = TRANSLATIONS[lang];
  const sT = t.settings;
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestoreJSON(file);
      // Reset input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {sT.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t.appName} · {t.byTeam}
        </p>
      </div>

      {/* Account & Cloud Sync Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${user ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              {user ? <Cloud className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {user ? (user.displayName || user.email) : (t.auth?.guestBadge || 'Guest Mode')}
                </h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${user ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {user ? (t.auth?.cloudSyncBadge || 'Cloud Synced') : (t.auth?.guestBadge || 'Offline / Local')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user ? user.email : 'Your records are stored securely in browser local storage.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {onSyncGuestData && (
                  <button
                    onClick={onSyncGuestData}
                    disabled={isSyncing}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    title="Sync local data into cloud account"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                )}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.auth?.logout || 'Log Out'}</span>
                  </button>
                )}
              </>
            ) : (
              onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t.auth?.signInBtn || 'Sign In / Register'}</span>
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* Language Switch Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {sT.languageTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sT.languageDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => onSetLang('en')}
            className={`min-h-[48px] px-4 py-3 rounded-xl border text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              lang === 'en'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <span>English</span>
          </button>
          <button
            onClick={() => onSetLang('te')}
            className={`min-h-[48px] px-4 py-3 rounded-xl border text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              lang === 'te'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <span>తెలుగు (Telugu)</span>
          </button>
        </div>
      </section>

      {/* Demo Data Management */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {sT.demoTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sT.demoDesc}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onLoadDemoData}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
            <span>{t.actions.loadDemo}</span>
          </button>

          {hasDemoData && (
            <button
              onClick={onRemoveDemoData}
              className="min-h-[48px] px-5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.actions.removeDemo}</span>
            </button>
          )}
        </div>
      </section>

      {/* CSV Data Export Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {sT.exportCSVTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sT.exportCSVDesc}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            onClick={onDownloadCSV}
            disabled={expenses.length === 0}
            className={`min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-xs ${
              expenses.length === 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{t.actions.downloadCSV}</span>
            {expenses.length > 0 && (
              <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-md tabular-nums">
                {expenses.length}
              </span>
            )}
          </button>
          {expenses.length === 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {sT.noExpensesToExport}
            </span>
          )}
        </div>
      </section>

      {/* JSON Complete Backup & Restore Section (Recommendation 1) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {sT.backupJSONTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sT.backupJSONDesc}
            </p>
          </div>
        </div>

        {/* Hidden file input for JSON restore */}
        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload JSON backup file"
        />

        <div className="pt-2 flex flex-wrap items-center gap-3">
          {/* Download JSON Backup */}
          <button
            onClick={onDownloadJSON}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Download className="w-4 h-4" />
            <span>{t.actions.downloadJSON}</span>
            {expenses.length > 0 && (
              <span className="text-xs bg-indigo-700/80 px-2 py-0.5 rounded-md tabular-nums">
                {expenses.length}
              </span>
            )}
          </button>

          {/* Restore JSON Backup */}
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{t.actions.restoreJSON}</span>
          </button>
        </div>
      </section>

      {/* Monthly Bank Statement Loader Section */}
      {onOpenLoadStatementModal && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {sT.loadStatementTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sT.loadStatementDesc}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenLoadStatementModal}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Landmark className="w-4 h-4" />
              <span>{t.actions.loadStatement}</span>
            </button>
          </div>
        </section>
      )}

      {/* Privacy and Offline Guarantee Card */}
      <section className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4>{sT.privacyTitle}</h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {sT.privacyBody}
        </p>
      </section>

      {/* Technical Disclaimers: LocalStorage & Offline Capability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage Info */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-sm">{sT.storageInfoTitle}</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {sT.storageInfoBody}
          </p>
        </section>

        {/* Offline Note */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
            <WifiOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-sm">{sT.offlineInfoTitle}</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {sT.offlineInfoBody}
          </p>
        </section>
      </div>

      {/* Hackathon Attribution Card */}
      <section className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {sT.aboutTeamTitle}
          </h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {sT.aboutTeamBody}
        </p>
      </section>

      {/* Danger Zone: Delete All Data */}
      <section className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-rose-950 dark:text-rose-100">
              {sT.dangerZone}
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {sT.deleteAllDesc}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onRequestDeleteAll}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>{sT.deleteAllTitle}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
