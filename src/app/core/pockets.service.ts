import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pocket, PocketMovement, PocketMovementType, PocketMovementWithRelations } from './models';

@Injectable({ providedIn: 'root' })
export class PocketsService {
  private readonly sb = inject(SupabaseService);

  async list(): Promise<Pocket[]> {
    const { data, error } = await this.sb.client
      .from('pockets')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Pocket[];
  }

  async create(payload: { name: string; goal?: number | null; color?: string | null }): Promise<Pocket> {
    const { data, error } = await this.sb.client
      .from('pockets')
      .insert({ name: payload.name, goal: payload.goal ?? null, color: payload.color ?? null })
      .select()
      .single();
    if (error) throw error;
    return data as Pocket;
  }

  async update(id: string, patch: Partial<Pocket>): Promise<Pocket> {
    const { data, error } = await this.sb.client
      .from('pockets')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Pocket;
  }

  async remove(id: string, refund?: { accountId: string; amount: number }) {
    if (refund && refund.amount > 0) {
      await this.move({
        pocket_id: id,
        account_id: refund.accountId,
        type: 'withdraw',
        amount: refund.amount,
        description: 'Devolución al cerrar bolsillo',
      });
    }
    const { error } = await this.sb.client.from('pockets').delete().eq('id', id);
    if (error) throw error;
  }

  async movements(pocketId?: string): Promise<PocketMovementWithRelations[]> {
    let q = this.sb.client
      .from('pocket_movements')
      .select('*, pocket:pockets(id,name,color), account:accounts(id,name)')
      .order('date', { ascending: false });
    if (pocketId) q = q.eq('pocket_id', pocketId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PocketMovementWithRelations[];
  }

  async move(payload: {
    pocket_id: string;
    account_id: string;
    type: PocketMovementType;
    amount: number;
    description?: string | null;
    date?: string;
  }): Promise<PocketMovement> {
    const { data, error } = await this.sb.client
      .from('pocket_movements')
      .insert({
        pocket_id: payload.pocket_id,
        account_id: payload.account_id,
        type: payload.type,
        amount: payload.amount,
        description: payload.description ?? null,
        date: payload.date ?? new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) throw error;
    return data as PocketMovement;
  }

  async removeMovement(id: string) {
    const { error } = await this.sb.client.from('pocket_movements').delete().eq('id', id);
    if (error) throw error;
  }
}
