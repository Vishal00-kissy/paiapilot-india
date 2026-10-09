import { Expense, Settings } from '../types';
import { db, doc, setDoc, collection, getDocs, writeBatch } from './firebase';

export interface UserCloudData {
  expenses: Expense[];
  settings: Settings;
}

/**
 * Load user expenses and settings from Firestore
 */
export async function loadUserDataFromFirestore(userId: string): Promise<UserCloudData | null> {
  try {
    // 1. Fetch settings
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'current');
    const { getDoc } = await import('firebase/firestore');
    const settingsSnap = await getDoc(settingsDocRef);
    let userSettings: Settings | undefined = undefined;
    if (settingsSnap.exists()) {
      userSettings = settingsSnap.data() as Settings;
    }

    // 2. Fetch expenses
    const expensesColRef = collection(db, 'users', userId, 'expenses');
    const querySnapshot = await getDocs(expensesColRef);
    const userExpenses: Expense[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      userExpenses.push({
        id: docSnapshot.id,
        amount: Number(data.amount) || 0,
        desc: String(data.desc || ''),
        category: data.category,
        date: String(data.date || ''),
        payment: data.payment,
        demo: Boolean(data.demo),
        recurring: data.recurring,
      });
    });

    return {
      expenses: userExpenses,
      settings: userSettings || {
        budget: 0,
        demoBudget: false,
        household: { on: false, income: 0, savePct: 10 },
        lang: 'en',
        categoryLimits: {},
      },
    };
  } catch (err) {
    console.error('Failed to load user data from Firestore:', err);
    throw err;
  }
}

/**
 * Save / sync an expense to Firestore for authenticated user
 */
export async function saveExpenseToFirestore(userId: string, expense: Expense): Promise<void> {
  try {
    const expenseDocRef = doc(db, 'users', userId, 'expenses', expense.id);
    await setDoc(expenseDocRef, {
      id: expense.id,
      amount: expense.amount,
      desc: expense.desc,
      category: expense.category,
      date: expense.date,
      payment: expense.payment,
      demo: Boolean(expense.demo),
      recurring: expense.recurring || null,
      userId: userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save expense to Firestore:', err);
    throw err;
  }
}

/**
 * Delete expense from Firestore
 */
export async function deleteExpenseFromFirestore(userId: string, expenseId: string): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    const expenseDocRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(expenseDocRef);
  } catch (err) {
    console.error('Failed to delete expense from Firestore:', err);
    throw err;
  }
}

/**
 * Save settings to Firestore
 */
export async function saveSettingsToFirestore(userId: string, settings: Settings): Promise<void> {
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'current');
    await setDoc(settingsDocRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save settings to Firestore:', err);
    throw err;
  }
}

/**
 * Migrate guest/local data to Firestore
 */
export async function migrateGuestDataToFirestore(
  userId: string,
  localExpenses: Expense[],
  localSettings: Settings
): Promise<{ count: number }> {
  try {
    // 1. Save settings
    await saveSettingsToFirestore(userId, localSettings);

    // 2. Batch write expenses (chunks of 450 to stay under Firestore 500 limit)
    const chunkSize = 400;
    for (let i = 0; i < localExpenses.length; i += chunkSize) {
      const chunk = localExpenses.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const expense of chunk) {
        const ref = doc(db, 'users', userId, 'expenses', expense.id);
        batch.set(ref, {
          id: expense.id,
          amount: expense.amount,
          desc: expense.desc,
          category: expense.category,
          date: expense.date,
          payment: expense.payment,
          demo: Boolean(expense.demo),
          recurring: expense.recurring || null,
          userId: userId,
          migratedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    }

    return { count: localExpenses.length };
  } catch (err) {
    console.error('Failed to migrate data to Firestore:', err);
    throw err;
  }
}
