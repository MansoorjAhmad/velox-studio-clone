export interface Transaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  date: string;
  recurring: "none" | "daily" | "weekly" | "monthly" | "yearly" | null;
  created_at: string;
}

export type TransactionInput = Omit<
  Transaction,
  "id" | "user_id" | "created_at"
>;

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  creditor?: string | null;
  balance: number;
  original_balance?: number | null;
  total_amount?: number;
  paid_amount?: number;
  type?: "credit_card" | "loan" | "mortgage" | "other";
  interest_rate?: number | null;
  min_payment?: number | null;
  due_day?: number | null;
  strategy?: "avalanche" | "snowball" | "minimum" | null;
  is_paid_off?: boolean;
  created_at: string;
  updated_at?: string;
}

export type DebtInput = Omit<
  Debt,
  "id" | "user_id" | "created_at" | "updated_at" | "is_paid_off"
>;

export interface DebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

export const INCOME_CATEGORIES = [
  "Trading",
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Subscriptions",
  "Trading Costs",
  "Entertainment",
  "Health",
  "Education",
  "Other",
] as const;
