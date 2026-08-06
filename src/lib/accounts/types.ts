export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  account_number: string | null;
  broker: string | null;
  currency: string;
  initial_balance: number;
  account_type: "standard" | "cent" | "prop" | "funded";
  color: string;
  is_default: boolean;
  created_at: string;
}

export type TradingAccountInput = Omit<
  TradingAccount,
  "id" | "user_id" | "created_at"
>;
