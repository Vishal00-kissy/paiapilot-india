import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from '../utils/firebase';
import { TRANSLATIONS } from '../i18n/translations';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'te';
  onSuccess: (email: string) => void;
  onContinueAsGuest: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess,
  onContinueAsGuest,
  initialMode = 'login',
}) => {
  const t = TRANSLATIONS[lang];
  const authT = t.auth;

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmail(cleanEmail)) {
      setError(authT.emailRequired);
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setInfoMessage(authT.resetSent);
      } catch (err: unknown) {
        // Do not reveal email existence for security
        setInfoMessage(authT.resetSent);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setError(authT.passwordLength);
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError(authT.nameRequired);
        return;
      }
      if (password !== confirmPassword) {
        setError(authT.passwordMismatch);
        return;
      }
      if (!agreeTerms) {
        setError(authT.termsRequired);
        return;
      }

      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (userCredential.user && fullName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: fullName.trim(),
          });
        }
        onSuccess(cleanEmail);
        onClose();
      } catch (err: unknown) {
        const errObj = err as { code?: string; message?: string };
        if (errObj.code === 'auth/email-already-in-use') {
          setError('An account with this email address already exists. Please sign in instead.');
        } else if (errObj.code === 'auth/weak-password') {
          setError(authT.passwordLength);
        } else {
          setError(errObj.message || 'Registration failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login mode
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      onSuccess(cleanEmail);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (
        errObj.code === 'auth/wrong-password' ||
        errObj.code === 'auth/user-not-found' ||
        errObj.code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (errObj.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please reset your password or try again later.');
      } else {
        setError(errObj.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Branding */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-600/10 via-teal-600/5 to-transparent border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-900/20">
                ₹
              </div>
              <div>
                <h3 id="auth-modal-title" className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {mode === 'login' && authT.loginTitle}
                  {mode === 'register' && authT.registerTitle}
                  {mode === 'forgot' && authT.resetPasswordTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'login' && authT.loginSubtitle}
                  {mode === 'register' && authT.registerSubtitle}
                  {mode === 'forgot' && authT.resetPasswordSubtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-emerald-500"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-start gap-2 animate-in fade-in">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Full Name for Registration */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {authT.fullName}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={authT.fullNamePlaceholder}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {authT.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={authT.emailPlaceholder}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Password (for login and register) */}
          {mode !== 'forgot' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  {authT.password}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                  >
                    {authT.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authT.passwordPlaceholder}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (register mode) */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                {authT.confirmPassword}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={authT.confirmPasswordPlaceholder}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Remember me / Agree terms checkboxes */}
          {mode === 'login' && (
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{authT.rememberMe}</span>
            </label>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{authT.agreeTerms}</span>
            </label>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-md shadow-emerald-900/20 disabled:opacity-60 flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'login' && authT.signInBtn}
                  {mode === 'register' && authT.signUpBtn}
                  {mode === 'forgot' && authT.sendResetLink}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Mode Switchers */}
          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            {mode === 'login' && (
              <div>
                <span>{authT.noAccount} </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
                >
                  {authT.signUpBtn}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <span>{authT.hasAccount} </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
                >
                  {authT.signInBtn}
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
              >
                {authT.backToLogin}
              </button>
            )}

            {/* Guest mode option */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onContinueAsGuest();
                  onClose();
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                {authT.guestBtn}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
