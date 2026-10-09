export type Category =
  | 'Groceries'
  | 'Food'
  | 'Transport'
  | 'Rent'
  | 'Electricity'
  | 'Education'
  | 'Healthcare'
  | 'Mobile Recharge'
  | 'Shopping'
  | 'Other';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Other';

export interface RecurringConfig {
  isRecurring: boolean;
  frequency: 'daily' | 'monthly';
  parentId?: string;
}

export interface Expense {
  id: string;
  amount: number;
  desc: string;
  category: Category;
  date: string; // YYYY-MM-DD
  payment: PaymentMethod;
  demo: boolean;
  recurring?: RecurringConfig;
}

export interface HouseholdSettings {
  on: boolean;
  income: number;
  savePct: number; // 0–90, default 10
}

export interface Settings {
  budget: number;
  demoBudget: boolean;
  household: HouseholdSettings;
  lang: 'en' | 'te';
  categoryLimits?: Partial<Record<Category, number>>;
}

export type NavTab = 'home' | 'expenses' | 'summary' | 'budget' | 'settings';

export interface SummaryPeriod {
  type: 'daily' | 'weekly' | 'monthly';
  currentDate: string; // YYYY-MM-DD anchor
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
}

export interface AIAnomaly {
  title: string;
  desc: string;
  severity: 'high' | 'medium' | 'low';
  amount?: number;
}

export interface AISavingsTip {
  title: string;
  tip: string;
  potentialMonthlySavingINR: number;
}

export interface AIAnalysisResult {
  success: boolean;
  summary: string;
  anomalies: AIAnomaly[];
  savingsTips: AISavingsTip[];
  answer?: string;
  isGeminiLive?: boolean;
  isOfflineFallback?: boolean;
}

export interface ParsedBankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  desc: string;
  originalNarration: string;
  amount: number;
  category: Category;
  payment: PaymentMethod;
  selected: boolean;
  isDuplicate?: boolean;
}

export interface BankStatementSummary {
  bankName: string;
  monthYear: string;
  totalDebits: number;
  totalDebitAmount: number;
  transactions: ParsedBankTransaction[];
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

