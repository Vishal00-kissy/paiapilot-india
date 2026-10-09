import { Expense } from '../types';
import { getTodayString } from './formatters';

export const generateDemoExpenses = (): Expense[] => {
  const today = getTodayString();
  const [yearStr, monthStr, dayStr] = today.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Helper to generate formatted date string
  const formatDate = (y: number, m: number, d: number): string => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Safe day clamped to days of month
  const safeDayThisMonth = (d: number): string => {
    const maxDays = new Date(year, month, 0).getDate();
    return formatDate(year, month, Math.max(1, Math.min(d, maxDays)));
  };

  // Last month date calculation
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  const safeDayLastMonth = (d: number): string => {
    const maxDays = new Date(lastMonthYear, lastMonth, 0).getDate();
    return formatDate(lastMonthYear, lastMonth, Math.max(1, Math.min(d, maxDays)));
  };

  // Reference days relative to current day
  const dToday = day;
  const dYesterday = Math.max(1, day - 1);
  const d3DaysAgo = Math.max(1, day - 3);
  const d5DaysAgo = Math.max(1, day - 5);
  const dEarly1 = 1;
  const dEarly2 = Math.min(2, day);
  const dEarly3 = Math.min(4, day);

  const demoItems: Expense[] = [
    // Today's expenses (2 items)
    {
      id: 'demo-1',
      amount: 45.0,
      desc: 'Chai and samosa snack at college canteen',
      category: 'Food',
      date: safeDayThisMonth(dToday),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-2',
      amount: 70.0,
      desc: 'Shared auto fare from metro station',
      category: 'Transport',
      date: safeDayThisMonth(dToday),
      payment: 'Cash',
      demo: true,
    },

    // This week expenses (6 items)
    {
      id: 'demo-3',
      amount: 240.0,
      desc: 'Fresh vegetables, coriander and milk pouch',
      category: 'Groceries',
      date: safeDayThisMonth(dYesterday),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-4',
      amount: 180.0,
      desc: 'Paracetamol & cough lozenges at pharmacy',
      category: 'Healthcare',
      date: safeDayThisMonth(dYesterday),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-5',
      amount: 160.0,
      desc: 'Class notebooks & black gel pens',
      category: 'Education',
      date: safeDayThisMonth(d3DaysAgo),
      payment: 'Cash',
      demo: true,
    },
    {
      id: 'demo-6',
      amount: 350.0,
      desc: 'Dinner thali with friends after exam',
      category: 'Food',
      date: safeDayThisMonth(d3DaysAgo),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-7',
      amount: 120.0,
      desc: 'Bus monthly pass recharge token',
      category: 'Transport',
      date: safeDayThisMonth(d5DaysAgo),
      payment: 'Card',
      demo: true,
    },
    {
      id: 'demo-8',
      amount: 499.0,
      desc: 'Cotton round-neck T-shirt from local store',
      category: 'Shopping',
      date: safeDayThisMonth(d5DaysAgo),
      payment: 'UPI',
      demo: true,
    },

    // Earlier this month expenses (4 items)
    {
      id: 'demo-9',
      amount: 3500.0,
      desc: 'Room rent shared split for hostel/flat',
      category: 'Rent',
      date: safeDayThisMonth(dEarly1),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-10',
      amount: 299.0,
      desc: 'Jio 28-day 1.5GB/day mobile recharge',
      category: 'Mobile Recharge',
      date: safeDayThisMonth(dEarly2),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-11',
      amount: 640.0,
      desc: 'State electricity board power bill share',
      category: 'Electricity',
      date: safeDayThisMonth(dEarly3),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-12',
      amount: 680.0,
      desc: 'Monthly grocery staples (atta, dal, oil)',
      category: 'Groceries',
      date: safeDayThisMonth(dEarly2),
      payment: 'Card',
      demo: true,
    },

    // Last month expenses in same day range (days 1..dToday) (4 items)
    // Ensures month-over-month comparison insight works!
    {
      id: 'demo-13',
      amount: 3500.0,
      desc: 'Room rent split (Monthly)',
      category: 'Rent',
      date: safeDayLastMonth(dEarly1),
      payment: 'UPI',
      demo: true,
      recurring: {
        isRecurring: true,
        frequency: 'monthly',
      },
    },
    {
      id: 'demo-14',
      amount: 580.0,
      desc: 'Last month grocery staples',
      category: 'Groceries',
      date: safeDayLastMonth(Math.min(3, day)),
      payment: 'Card',
      demo: true,
    },
    {
      id: 'demo-15',
      amount: 250.0,
      desc: 'Last month dinner outing',
      category: 'Food',
      date: safeDayLastMonth(Math.min(5, day)),
      payment: 'UPI',
      demo: true,
    },
    {
      id: 'demo-16',
      amount: 150.0,
      desc: 'Last month auto travel & train tickets',
      category: 'Transport',
      date: safeDayLastMonth(Math.min(7, day)),
      payment: 'Cash',
      demo: true,
    },
  ];

  return demoItems;
};
