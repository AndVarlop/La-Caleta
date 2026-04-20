import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Category, TxType } from './models';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly sb = inject(SupabaseService);

  async list(type?: TxType): Promise<Category[]> {
    let q = this.sb.client.from('categories').select('*').order('name');
    if (type) q = q.eq('type', type);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async create(payload: { name: string; type: TxType; color?: string; icon?: string }): Promise<Category> {
    const { data, error } = await this.sb.client
      .from('categories')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  }

  async update(id: string, patch: Partial<Category>): Promise<Category> {
    const { data, error } = await this.sb.client
      .from('categories')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  }

  async remove(id: string) {
    const { error } = await this.sb.client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }
}
