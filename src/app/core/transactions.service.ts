import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  CategoryTotal,
  MonthSummary,
  MonthlySeries,
  Transaction,
  TransactionWithRelations,
  TxType,
} from './models';

export interface TransactionFilters {
  from?: string;
  to?: string;
  type?: TxType;
  categoryId?: string;
  accountId?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly sb = inject(SupabaseService);

  async list(filters: TransactionFilters = {}): Promise<TransactionWithRelations[]> {
    let q = this.sb.client
      .from('transactions')
      .select('*, category:categories(id,name,color,type), account:accounts(id,name)')
      .order('date', { ascending: false });

    if (filters.from) q = q.gte('date', filters.from);
    if (filters.to) q = q.lte('date', filters.to);
    if (filters.type) q = q.eq('type', filters.type);
    if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
    if (filters.accountId) q = q.eq('account_id', filters.accountId);
    if (filters.limit) q = q.limit(filters.limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TransactionWithRelations[];
  }

  async create(payload: {
    account_id: string;
    category_id: string | null;
    amount: number;
    type: TxType;
    description?: string | null;
    date: string;
  }): Promise<Transaction> {
    const { data, error } = await this.sb.client
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Transaction;
  }

  async update(id: string, patch: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.sb.client
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Transaction;
  }

  async remove(id: string) {
    const { error } = await this.sb.client.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  async monthSummary(year: number, month: number): Promise<MonthSummary> {
    const { data, error } = await this.sb.client.rpc('month_summary', {
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    const row = (data ?? [])[0] ?? { income: 0, expense: 0, balance: 0 };
    return {
      income: Number(row.income) || 0,
      expense: Number(row.expense) || 0,
      balance: Number(row.balance) || 0,
    };
  }

  async totalBalance(): Promise<number> {
    const { data, error } = await this.sb.client.rpc('total_balance');
    if (error) throw error;
    return Number(data) || 0;
  }

  async expensesByCategory(year: number, month: number): Promise<CategoryTotal[]> {
    const { data, error } = await this.sb.client.rpc('expenses_by_category', {
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      category_id: r.category_id,
      name: r.name ?? 'Sin categoría',
      color: r.color,
      total: Number(r.total) || 0,
    }));
  }

  async monthlyEvolution(months = 6): Promise<MonthlySeries[]> {
    const { data, error } = await this.sb.client.rpc('monthly_evolution', { p_months: months });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      month: r.month,
      income: Number(r.income) || 0,
      expense: Number(r.expense) || 0,
    }));
  }
}
