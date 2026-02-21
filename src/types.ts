export interface Receipt {
  id?: number;
  merchant: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  image_url?: string;
  created_at?: string;
}

export type AppState = 'SCANNING' | 'REVIEW_DETAIL' | 'LIST';

export const CATEGORIES = [
  'Food & Drinks',
  'Travel',
  'Supplies',
  'Entertainment',
  'Other'
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' }
];
