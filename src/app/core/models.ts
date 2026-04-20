export type TxType = 'income' | 'expense';

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  avatar_url?: string | null;
  nickname?: string | null;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  created_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TxType;
  color?: string | null;
  icon?: string | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  type: TxType;
  description: string | null;
  date: string;
  created_at?: string;
}

export interface TransactionWithRelations extends Transaction {
  category?: Pick<Category, 'id' | 'name' | 'color' | 'type'> | null;
  account?: Pick<Account, 'id' | 'name'> | null;
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryTotal {
  category_id: string;
  name: string;
  color: string | null;
  total: number;
}

export interface MonthlySeries {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export interface Pocket {
  id: string;
  user_id: string;
  name: string;
  goal: number | null;
  balance: number;
  color: string | null;
  created_at?: string;
}

export type PocketMovementType = 'deposit' | 'withdraw';

export interface PocketMovement {
  id: string;
  user_id: string;
  pocket_id: string;
  account_id: string;
  type: PocketMovementType;
  amount: number;
  description: string | null;
  date: string;
  created_at?: string;
}

export interface PocketMovementWithRelations extends PocketMovement {
  pocket?: Pick<Pocket, 'id' | 'name' | 'color'> | null;
  account?: Pick<Account, 'id' | 'name'> | null;
}
