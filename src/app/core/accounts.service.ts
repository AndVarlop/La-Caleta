import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Account } from './models';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly sb = inject(SupabaseService);

  async list(): Promise<Account[]> {
    const { data, error } = await this.sb.client
      .from('accounts')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async create(name: string, balance = 0): Promise<Account> {
    const { data, error } = await this.sb.client
      .from('accounts')
      .insert({ name, balance })
      .select()
      .single();
    if (error) throw error;
    return data as Account;
  }

  async update(id: string, patch: Partial<Account>): Promise<Account> {
    const { data, error } = await this.sb.client
      .from('accounts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Account;
  }

  async remove(id: string) {
    const { error } = await this.sb.client.from('accounts').delete().eq('id', id);
    if (error) throw error;
  }
}
