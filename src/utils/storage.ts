import { Expense, Settings, Category } from '../types';

export const STORAGE_KEY = 'paisapilot-india:v1';
export const CORRUPTED_BACKUP_KEY = 'paisapilot-india:corrupted_backup';

export interface StoredData {
  expenses: Expense[];
  settings: Settings;
  lastUpdated?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  budget: 0,
  demoBudget: false,
  household: {
    on: false,
    income: 0,
    savePct: 10,
  },
  lang: 'en',
  categoryLimits: {},
};

export const DEFAULT_DATA: StoredData = {
  expenses: [],
  settings: DEFAULT_SETTINGS,
};

/**
 * Safely load application data from localStorage.
 * If data is corrupted, saves raw backup to CORRUPTED_BACKUP_KEY,
 * starts fresh with DEFAULT_DATA, and never crashes.
 */
export const loadDataFromStorage = (): { data: StoredData; corruptedRecovered: boolean } => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { data: DEFAULT_DATA, corruptedRecovered: false };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { data: DEFAULT_DATA, corruptedRecovered: false };
    }

    try {
      const parsed = JSON.parse(raw);

      // Validate structure
      const validExpenses = Array.isArray(parsed.expenses)
        ? parsed.expenses.filter((item: unknown) => {
            if (!item || typeof item !== 'object') return false;
            const exp = item as Partial<Expense>;
            return (
              typeof exp.id === 'string' &&
              typeof exp.amount === 'number' &&
              !isNaN(exp.amount) &&
              typeof exp.desc === 'string' &&
              typeof exp.category === 'string' &&
              typeof exp.date === 'string'
            );
          })
        : [];

      const parsedSettings: Settings = {
        budget:
          typeof parsed.settings?.budget === 'number' && !isNaN(parsed.settings.budget)
            ? Math.max(0, parsed.settings.budget)
            : DEFAULT_SETTINGS.budget,
        demoBudget: Boolean(parsed.settings?.demoBudget),
        household: {
          on: Boolean(parsed.settings?.household?.on),
          income:
            typeof parsed.settings?.household?.income === 'number' &&
            !isNaN(parsed.settings.household.income)
              ? Math.max(0, parsed.settings.household.income)
              : DEFAULT_SETTINGS.household.income,
          savePct:
            typeof parsed.settings?.household?.savePct === 'number' &&
            !isNaN(parsed.settings.household.savePct)
              ? Math.min(90, Math.max(0, parsed.settings.household.savePct))
              : DEFAULT_SETTINGS.household.savePct,
        },
        lang: parsed.settings?.lang === 'te' ? 'te' : 'en',
        categoryLimits: (() => {
          const limits: Partial<Record<Category, number>> = {};
          if (parsed.settings?.categoryLimits && typeof parsed.settings.categoryLimits === 'object') {
            for (const [key, val] of Object.entries(parsed.settings.categoryLimits)) {
              if (typeof val === 'number' && !isNaN(val) && Number.isFinite(val) && val > 0) {
                limits[key as Category] = Math.round(val * 100) / 100;
              }
            }
          }
          return limits;
        })(),
      };

      return {
        data: {
          expenses: validExpenses,
          settings: parsedSettings,
          lastUpdated: parsed.lastUpdated,
        },
        corruptedRecovered: false,
      };
    } catch {
      // JSON Parsing failed -> Corrupted data
      // Backup the raw corrupted text
      try {
        window.localStorage.setItem(CORRUPTED_BACKUP_KEY, raw);
      } catch {
        // In case storage quota is full
      }

      // Save fresh default data to key
      saveDataToStorage(DEFAULT_DATA);

      return {
        data: DEFAULT_DATA,
        corruptedRecovered: true,
      };
    }
  } catch {
    // LocalStorage disabled or security error
    return { data: DEFAULT_DATA, corruptedRecovered: false };
  }
};

/**
 * Safely persist application data to localStorage.
 */
export const saveDataToStorage = (data: StoredData): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const payload = JSON.stringify({
      ...data,
      lastUpdated: new Date().toISOString(),
    });
    window.localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
};

export interface JSONBackupFormat {
  app: string;
  version: string;
  exportedAt: string;
  data: StoredData;
}

/**
 * Exports full data as a formatted JSON backup file and triggers download.
 */
export const exportDataToJSON = (expenses: Expense[], settings: Settings): { success: boolean; filename: string } => {
  try {
    const payload: JSONBackupFormat = {
      app: 'PaisaPilot India',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        expenses,
        settings,
        lastUpdated: new Date().toISOString(),
      },
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `paisapilot-backup-${dateStr}.json`;
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch {
    return { success: false, filename: '' };
  }
};

export interface JSONRestoreValidationResult {
  isValid: boolean;
  errorMessage?: string;
  parsedData?: StoredData;
  stats?: {
    expenseCount: number;
    totalAmount: number;
    hasSettings: boolean;
  };
}

/**
 * Validates and parses a JSON backup file content.
 */
export const validateAndParseJSONBackup = (jsonString: string): JSONRestoreValidationResult => {
  if (!jsonString || typeof jsonString !== 'string') {
    return { isValid: false, errorMessage: 'Empty or invalid file content.' };
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Support both direct StoredData or wrapped JSONBackupFormat
    const candidateData: StoredData = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

    if (!candidateData || typeof candidateData !== 'object') {
      return { isValid: false, errorMessage: 'Invalid backup structure.' };
    }

    if (!Array.isArray(candidateData.expenses)) {
      return { isValid: false, errorMessage: 'Expenses array is missing or invalid in backup.' };
    }

    const validatedExpenses: Expense[] = [];
    let totalAmount = 0;

    for (const item of candidateData.expenses) {
      if (!item || typeof item !== 'object') continue;
      const exp = item as Partial<Expense>;
      if (
        typeof exp.amount === 'number' &&
        !isNaN(exp.amount) &&
        Number.isFinite(exp.amount) &&
        exp.amount > 0 &&
        typeof exp.desc === 'string' &&
        typeof exp.category === 'string' &&
        typeof exp.date === 'string'
      ) {
        validatedExpenses.push({
          id: typeof exp.id === 'string' && exp.id ? exp.id : `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          amount: Math.round(exp.amount * 100) / 100,
          desc: exp.desc.slice(0, 100),
          category: exp.category as Expense['category'],
          date: exp.date,
          payment: exp.payment ? exp.payment : 'Cash',
          demo: Boolean(exp.demo),
        });
        totalAmount += exp.amount;
      }
    }

    const parsedSettings: Settings = {
      budget:
        typeof candidateData.settings?.budget === 'number' && !isNaN(candidateData.settings.budget)
          ? Math.max(0, candidateData.settings.budget)
          : DEFAULT_SETTINGS.budget,
      demoBudget: Boolean(candidateData.settings?.demoBudget),
      household: {
        on: Boolean(candidateData.settings?.household?.on),
        income:
          typeof candidateData.settings?.household?.income === 'number' &&
          !isNaN(candidateData.settings.household.income)
            ? Math.max(0, candidateData.settings.household.income)
            : DEFAULT_SETTINGS.household.income,
        savePct:
          typeof candidateData.settings?.household?.savePct === 'number' &&
          !isNaN(candidateData.settings.household.savePct)
            ? Math.min(90, Math.max(0, candidateData.settings.household.savePct))
            : DEFAULT_SETTINGS.household.savePct,
      },
      lang: candidateData.settings?.lang === 'te' ? 'te' : 'en',
      categoryLimits: (() => {
        const limits: Partial<Record<Category, number>> = {};
        if (candidateData.settings?.categoryLimits && typeof candidateData.settings.categoryLimits === 'object') {
          for (const [key, val] of Object.entries(candidateData.settings.categoryLimits)) {
            if (typeof val === 'number' && !isNaN(val) && Number.isFinite(val) && val > 0) {
              limits[key as Category] = Math.round(val * 100) / 100;
            }
          }
        }
        return limits;
      })(),
    };

    return {
      isValid: true,
      parsedData: {
        expenses: validatedExpenses,
        settings: parsedSettings,
        lastUpdated: candidateData.lastUpdated || new Date().toISOString(),
      },
      stats: {
        expenseCount: validatedExpenses.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        hasSettings: Boolean(candidateData.settings),
      },
    };
  } catch (err: unknown) {
    return {
      isValid: false,
      errorMessage: err instanceof Error ? err.message : 'Invalid JSON file.',
    };
  }
};
