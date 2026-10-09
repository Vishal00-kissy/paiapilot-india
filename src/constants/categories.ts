import { Category, PaymentMethod } from '../types';

export const ALL_CATEGORIES: Category[] = [
  'Groceries',
  'Food',
  'Transport',
  'Rent',
  'Electricity',
  'Education',
  'Healthcare',
  'Mobile Recharge',
  'Shopping',
  'Other',
];

export const NEEDS_CATEGORIES: Category[] = [
  'Groceries',
  'Rent',
  'Electricity',
  'Healthcare',
  'Education',
  'Mobile Recharge',
  'Transport',
];

export const isNeedCategory = (category: Category): boolean => {
  return NEEDS_CATEGORIES.includes(category);
};

export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Card',
  'Other',
];

export interface CategoryMeta {
  color: string;
  bgLight: string;
  isNeed: boolean;
}

export const CATEGORY_METADATA: Record<Category, CategoryMeta> = {
  Groceries: {
    color: '#059669', // Emerald
    bgLight: 'rgba(5, 150, 105, 0.12)',
    isNeed: true,
  },
  Food: {
    color: '#ea580c', // Orange
    bgLight: 'rgba(234, 88, 12, 0.12)',
    isNeed: false,
  },
  Transport: {
    color: '#0284c7', // Sky
    bgLight: 'rgba(2, 132, 199, 0.12)',
    isNeed: true,
  },
  Rent: {
    color: '#7c3aed', // Violet
    bgLight: 'rgba(124, 58, 237, 0.12)',
    isNeed: true,
  },
  Electricity: {
    color: '#ca8a04', // Yellow/Amber
    bgLight: 'rgba(202, 138, 4, 0.12)',
    isNeed: true,
  },
  Education: {
    color: '#2563eb', // Blue
    bgLight: 'rgba(37, 99, 235, 0.12)',
    isNeed: true,
  },
  Healthcare: {
    color: '#e11d48', // Rose
    bgLight: 'rgba(225, 29, 72, 0.12)',
    isNeed: true,
  },
  'Mobile Recharge': {
    color: '#0d9488', // Teal
    bgLight: 'rgba(13, 148, 136, 0.12)',
    isNeed: true,
  },
  Shopping: {
    color: '#db2777', // Pink
    bgLight: 'rgba(219, 39, 119, 0.12)',
    isNeed: false,
  },
  Other: {
    color: '#64748b', // Slate
    bgLight: 'rgba(100, 116, 139, 0.12)',
    isNeed: false,
  },
};
