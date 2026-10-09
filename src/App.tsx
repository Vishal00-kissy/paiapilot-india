/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense, Settings, NavTab, ToastMessage, AuthUser } from './types';
import {
  loadDataFromStorage,
  saveDataToStorage,
  DEFAULT_SETTINGS,
  exportDataToJSON,
  validateAndParseJSONBackup,
  StoredData,
} from './utils/storage';
import { generateDemoExpenses } from './utils/demoData';
import { exportExpensesToCSV } from './utils/csvExport';
import { formatINR, getMonthBounds } from './utils/formatters';
import { populateRecurringExpenses } from './utils/recurring';
import {
  auth,
  onAuthStateChanged,
  signOut,
  validateFirestoreConnection,
} from './utils/firebase';
import {
  loadUserDataFromFirestore,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  saveSettingsToFirestore,
  migrateGuestDataToFirestore,
} from './utils/firestoreService';
import { TRANSLATIONS, CATEGORY_NAMES } from './i18n/translations';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DemoBanner } from './components/DemoBanner';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { ExpenseModal } from './components/ExpenseModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { BankStatementModal } from './components/BankStatementModal';
import { AuthModal } from './components/AuthModal';
import { HomeView } from './components/HomeView';
import { ExpensesView } from './components/ExpensesView';
import { SummaryView } from './components/SummaryView';
import { BudgetView } from './components/BudgetView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // Load initial stored state
  const [data, setData] = useState<{ expenses: Expense[]; settings: Settings }>(() => {
    const { data: initialData } = loadDataFromStorage();
    return {
      expenses: initialData.expenses,
      settings: initialData.settings,
    };
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [isSyncing, setIsSyncing] = useState(false);

  // Validate Firestore connectivity on initial mount
  useEffect(() => {
    validateFirestoreConnection();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };
        setCurrentUser(authUser);

        // Load user's cloud data
        try {
          const cloudData = await loadUserDataFromFirestore(firebaseUser.uid);
          if (cloudData && (cloudData.expenses.length > 0 || cloudData.settings.budget > 0)) {
            setData({
              expenses: cloudData.expenses,
              settings: cloudData.settings,
            });
          } else {
            // First time cloud user: if local guest data exists, auto-sync it to their cloud account
            const { data: localData } = loadDataFromStorage();
            if (localData.expenses.length > 0) {
              await migrateGuestDataToFirestore(firebaseUser.uid, localData.expenses, localData.settings);
            }
          }
        } catch (err) {
          console.warn('Error fetching cloud data, continuing with local state', err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Confirmation modals state
  const [deleteExpenseCandidate, setDeleteExpenseCandidate] = useState<Expense | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<{
    data: StoredData;
    count: number;
    totalAmount: number;
  } | null>(null);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveDataToStorage(data);
  }, [data]);

  // Synchronize <html lang="..."> attribute with active language
  useEffect(() => {
    document.documentElement.lang = data.settings.lang;
  }, [data.settings.lang]);

  // Check recurring expenses on mount and auto-populate missing occurrences
  useEffect(() => {
    const res = populateRecurringExpenses(data.expenses);
    if (res.generatedCount > 0) {
      setData((prev) => ({
        ...prev,
        expenses: res.updatedExpenses,
      }));
      showToast(t.form.toastRecurringGenerated(res.generatedCount), 'info');
    }
  }, []);

  // Show Toast helper
  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'error' = 'success') => {
      setToast({
        id: Date.now().toString(),
        type,
        text,
      });
    },
    []
  );

  const t = TRANSLATIONS[data.settings.lang];

  // Effective budget calculation (Household mode replaces manual budget when on & income > 0)
  const effectiveBudget = useMemo(() => {
    const { household, budget } = data.settings;
    if (household?.on && household.income > 0) {
      return household.income * (1 - household.savePct / 100);
    }
    return budget || 0;
  }, [data.settings]);

  // Check if any demo items exist
  const hasDemoData = useMemo(() => {
    return data.expenses.some((e) => e.demo);
  }, [data.expenses]);

  // Language Toggle
  const handleToggleLang = () => {
    const nextLang = data.settings.lang === 'en' ? 'te' : 'en';
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        lang: nextLang,
      },
    }));
  };

  const handleSetLang = (newLang: 'en' | 'te') => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        lang: newLang,
      },
    }));
  };

  // Add / Edit Expense handler
  const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'demo'>) => {
    if (editingExpense) {
      // Update existing
      const updatedList = data.expenses.map((e) =>
        e.id === editingExpense.id
          ? {
              ...e,
              ...expenseData,
            }
          : e
      );
      const res = populateRecurringExpenses(updatedList);
      setData((prev) => ({
        ...prev,
        expenses: res.updatedExpenses,
      }));

      // Cloud persistence if user is logged in
      if (currentUser) {
        const savedItem = res.updatedExpenses.find((e) => e.id === editingExpense.id);
        if (savedItem) {
          saveExpenseToFirestore(currentUser.uid, savedItem).catch(console.error);
        }
      }

      // Check if this expense pushed category over limit
      const catLimit = data.settings.categoryLimits?.[expenseData.category];
      let limitAlertMsg = '';
      if (catLimit && catLimit > 0) {
        const { start: mStart, end: mEnd } = getMonthBounds(expenseData.date);
        const newCatMonthSpent = res.updatedExpenses
          .filter((e) => e.category === expenseData.category && e.date >= mStart && e.date <= mEnd)
          .reduce((sum, e) => sum + e.amount, 0);

        if (newCatMonthSpent > catLimit) {
          const over = newCatMonthSpent - catLimit;
          const catName = CATEGORY_NAMES[data.settings.lang][expenseData.category];
          limitAlertMsg = ` (⚠️ ${catName} limit exceeded by ₹${formatINR(over)})`;
        }
      }

      if (res.generatedCount > 0) {
        showToast(
          `${t.form.toastUpdated} (${t.form.toastRecurringGenerated(res.generatedCount)})${limitAlertMsg}`,
          limitAlertMsg ? 'info' : 'success'
        );
      } else {
        showToast(`${t.form.toastUpdated}${limitAlertMsg}`, limitAlertMsg ? 'info' : 'success');
      }
    } else {
      // Create new
      const newExpense: Expense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...expenseData,
        demo: false,
      };
      const initialList = [newExpense, ...data.expenses];
      const res = populateRecurringExpenses(initialList);
      setData((prev) => ({
        ...prev,
        expenses: res.updatedExpenses,
      }));

      // Cloud persistence if user is logged in
      if (currentUser) {
        saveExpenseToFirestore(currentUser.uid, newExpense).catch(console.error);
      }

      // Check if this expense pushed category over limit
      const catLimit = data.settings.categoryLimits?.[expenseData.category];
      let limitAlertMsg = '';
      if (catLimit && catLimit > 0) {
        const { start: mStart, end: mEnd } = getMonthBounds(expenseData.date);
        const newCatMonthSpent = res.updatedExpenses
          .filter((e) => e.category === expenseData.category && e.date >= mStart && e.date <= mEnd)
          .reduce((sum, e) => sum + e.amount, 0);

        if (newCatMonthSpent > catLimit) {
          const over = newCatMonthSpent - catLimit;
          const catName = CATEGORY_NAMES[data.settings.lang][expenseData.category];
          limitAlertMsg = ` (⚠️ ${catName} limit exceeded by ₹${formatINR(over)})`;
        }
      }

      if (res.generatedCount > 0) {
        showToast(
          `${t.form.toastAdded} (${t.form.toastRecurringGenerated(res.generatedCount)})${limitAlertMsg}`,
          limitAlertMsg ? 'info' : 'success'
        );
      } else {
        showToast(`${t.form.toastAdded}${limitAlertMsg}`, limitAlertMsg ? 'info' : 'success');
      }
    }

    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  // Open Edit Expense Modal
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  // Delete Expense Request (Opens custom ConfirmModal)
  const handleRequestDeleteExpense = (expense: Expense) => {
    setDeleteExpenseCandidate(expense);
  };

  const handleConfirmDeleteExpense = () => {
    if (!deleteExpenseCandidate) return;
    const targetId = deleteExpenseCandidate.id;
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== targetId),
    }));

    // Cloud delete if user is logged in
    if (currentUser) {
      deleteExpenseFromFirestore(currentUser.uid, targetId).catch(console.error);
    }

    setDeleteExpenseCandidate(null);
    showToast(t.form.toastDeleted, 'info');
  };

  // Auth & Sync handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      // Revert to local storage state
      const { data: localData } = loadDataFromStorage();
      setData(localData);
      showToast(t.auth?.logoutSuccess || 'Logged out successfully.', 'info');
    } catch {
      showToast('Logout failed', 'error');
    }
  };

  const handleSyncGuestData = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const res = await migrateGuestDataToFirestore(currentUser.uid, data.expenses, data.settings);
      showToast(t.auth?.syncSuccess || `Merged ${res.count} records with cloud account!`, 'success');
    } catch {
      showToast('Sync failed. Please check internet connection.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load Demo Data
  const handleLoadDemoData = () => {
    const demoItems = generateDemoExpenses();
    const shouldSetDemoBudget = !data.settings.budget && !data.settings.household.on;

    setData((prev) => {
      // Remove any prior demo items first, then append fresh ones so we don't duplicate
      const nonDemo = prev.expenses.filter((e) => !e.demo);
      return {
        ...prev,
        expenses: [...demoItems, ...nonDemo],
        settings: {
          ...prev.settings,
          budget: shouldSetDemoBudget ? 12000 : prev.settings.budget,
          demoBudget: shouldSetDemoBudget ? true : prev.settings.demoBudget,
          categoryLimits:
            Object.keys(prev.settings.categoryLimits || {}).length === 0
              ? {
                  Food: 3000,
                  Groceries: 4000,
                  Transport: 1500,
                  'Mobile Recharge': 500,
                  Shopping: 2500,
                }
              : prev.settings.categoryLimits,
        },
      };
    });

    showToast(t.settings.demoLoaded, 'success');
  };

  // Remove Demo Data
  const handleRemoveDemoData = () => {
    setData((prev) => {
      const nonDemo = prev.expenses.filter((e) => !e.demo);
      return {
        ...prev,
        expenses: nonDemo,
        settings: {
          ...prev.settings,
          budget: prev.settings.demoBudget ? 0 : prev.settings.budget,
          demoBudget: false,
        },
      };
    });

    showToast(t.settings.demoRemoved, 'info');
  };

  // Delete All Data Confirmation
  const handleConfirmDeleteAll = () => {
    setData({
      expenses: [],
      settings: {
        ...DEFAULT_SETTINGS,
        lang: data.settings.lang, // Retain user's language preference
      },
    });
    setIsDeleteAllModalOpen(false);
    showToast(t.form.toastCleared, 'info');
  };

  // Download CSV Export
  const handleDownloadCSV = () => {
    if (data.expenses.length === 0) {
      showToast(t.settings.noExpensesToExport, 'info');
      return;
    }
    const result = exportExpensesToCSV(data.expenses, data.settings.lang);
    if (result.success) {
      showToast(t.settings.csvExported, 'success');
    }
  };

  // Download JSON Backup
  const handleDownloadJSON = () => {
    const result = exportDataToJSON(data.expenses, data.settings);
    if (result.success) {
      showToast(t.settings.jsonExported, 'success');
    }
  };

  // Restore JSON from file
  const handleRestoreJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const res = validateAndParseJSONBackup(text);
      if (!res.isValid || !res.parsedData) {
        showToast(res.errorMessage || t.settings.restoreJSONError, 'error');
        return;
      }
      setRestoreCandidate({
        data: res.parsedData,
        count: res.stats?.expenseCount ?? 0,
        totalAmount: res.stats?.totalAmount ?? 0,
      });
    };
    reader.onerror = () => {
      showToast(t.settings.restoreJSONError, 'error');
    };
    reader.readAsText(file);
  };

  // Confirm JSON Restore
  const handleConfirmRestore = () => {
    if (!restoreCandidate) return;
    setData({
      expenses: restoreCandidate.data.expenses,
      settings: restoreCandidate.data.settings,
    });
    setRestoreCandidate(null);
    showToast(t.settings.restoreJSONSuccess, 'success');
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<Settings>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  };

  // Import Statement Expenses handler
  const handleImportStatementExpenses = (
    statementExpenses: Omit<Expense, 'id' | 'demo'>[]
  ) => {
    if (statementExpenses.length === 0) return;

    const newItems: Expense[] = statementExpenses.map((se, idx) => ({
      id: `stmt-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      ...se,
      demo: false,
    }));

    const combined = [...newItems, ...data.expenses];
    const res = populateRecurringExpenses(combined);

    setData((prev) => ({
      ...prev,
      expenses: res.updatedExpenses,
    }));

    const totalImportedAmount = statementExpenses.reduce((sum, e) => sum + e.amount, 0);
    showToast(
      t.bankStatement.toastSuccess(
        statementExpenses.length,
        `₹${formatINR(totalImportedAmount)}`
      ),
      'success'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={data.settings.lang}
        onToggleLang={handleToggleLang}
        onOpenAddModal={() => {
          setEditingExpense(null);
          setIsExpenseModalOpen(true);
        }}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        user={currentUser}
        onOpenAuthModal={() => {
          setAuthInitialMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Demo Active Banner */}
      <DemoBanner
        hasDemoData={hasDemoData}
        onRemoveDemo={handleRemoveDemoData}
        lang={data.settings.lang}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-20 md:pb-12">
        {currentTab === 'home' && (
          <HomeView
            expenses={data.expenses}
            settings={data.settings}
            lang={data.settings.lang}
            effectiveBudget={effectiveBudget}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            onLoadDemoData={handleLoadDemoData}
            onOpenAIModal={() => setIsAIModalOpen(true)}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesView
            expenses={data.expenses}
            lang={data.settings.lang}
            onEditExpense={handleEditExpense}
            onRequestDeleteExpense={handleRequestDeleteExpense}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            onOpenLoadStatementModal={() => setIsStatementModalOpen(true)}
            categoryLimits={data.settings.categoryLimits}
          />
        )}

        {currentTab === 'summary' && (
          <SummaryView
            expenses={data.expenses}
            lang={data.settings.lang}
            categoryLimits={data.settings.categoryLimits}
          />
        )}

        {currentTab === 'budget' && (
          <BudgetView
            expenses={data.expenses}
            settings={data.settings}
            lang={data.settings.lang}
            onUpdateSettings={handleUpdateSettings}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            expenses={data.expenses}
            settings={data.settings}
            lang={data.settings.lang}
            hasDemoData={hasDemoData}
            onSetLang={handleSetLang}
            onLoadDemoData={handleLoadDemoData}
            onRemoveDemoData={handleRemoveDemoData}
            onDownloadCSV={handleDownloadCSV}
            onDownloadJSON={handleDownloadJSON}
            onRestoreJSON={handleRestoreJSON}
            onRequestDeleteAll={() => setIsDeleteAllModalOpen(true)}
            onOpenLoadStatementModal={() => setIsStatementModalOpen(true)}
            user={currentUser}
            onOpenAuthModal={() => {
              setAuthInitialMode('login');
              setIsAuthModalOpen(true);
            }}
            onLogout={handleLogout}
            onSyncGuestData={handleSyncGuestData}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={data.settings.lang}
      />

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        initialExpense={editingExpense}
        lang={data.settings.lang}
        categoryLimits={data.settings.categoryLimits}
        existingExpenses={data.expenses}
      />

      {/* AI Assistant Modal (Recommendation 2) */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        expenses={data.expenses}
        settings={data.settings}
        lang={data.settings.lang}
      />

      {/* Monthly Bank Statement Loader Modal */}
      <BankStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        onImportExpenses={handleImportStatementExpenses}
        existingExpenses={data.expenses}
        lang={data.settings.lang}
      />

      {/* User Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={data.settings.lang}
        initialMode={authInitialMode}
        onSuccess={() => {
          showToast(t.auth?.loginSuccess || 'Signed in successfully!', 'success');
        }}
        onContinueAsGuest={() => {
          showToast('Continuing in Guest mode. Your records stay local.', 'info');
        }}
      />

      {/* Delete Expense Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteExpenseCandidate)}
        title={t.expenses.confirmDeleteTitle}
        message={t.expenses.confirmDeleteBody}
        confirmLabel={t.actions.confirmDelete}
        cancelLabel={t.actions.cancel}
        isDestructive={true}
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => setDeleteExpenseCandidate(null)}
      />

      {/* Delete All Data Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteAllModalOpen}
        title={t.settings.confirmDeleteAllTitle}
        message={t.settings.confirmDeleteAllBody}
        confirmLabel={t.actions.confirmClear}
        cancelLabel={t.actions.cancel}
        isDestructive={true}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setIsDeleteAllModalOpen(false)}
      />

      {/* JSON Restore Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(restoreCandidate)}
        title={t.settings.restoreConfirmTitle}
        message={
          restoreCandidate
            ? t.settings.restoreConfirmBody(
                restoreCandidate.count,
                `₹${formatINR(restoreCandidate.totalAmount)}`
              )
            : ''
        }
        confirmLabel={t.actions.restoreJSON}
        cancelLabel={t.actions.cancel}
        isDestructive={false}
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreCandidate(null)}
      />

      {/* Accessible Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
