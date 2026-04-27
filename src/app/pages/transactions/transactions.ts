import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TransactionsService } from '../../core/transactions.service';
import { TransactionWithRelations, TxType } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe, RevealDirective],
  templateUrl: './transactions.html',
})
export class TransactionsPage {
  private readonly tx = inject(TransactionsService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly items = signal<TransactionWithRelations[]>([]);
  readonly error = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    type: ['' as '' | TxType],
    from: [''],
    to: [''],
  });

  readonly grouped = computed(() => {
    const map = new Map<string, TransactionWithRelations[]>();
    for (const t of this.items()) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return Array.from(map.entries()).map(([date, txs]) => ({ date, txs }));
  });

  constructor() {
    this.load();
    this.filters.valueChanges.subscribe(() => this.load());
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const v = this.filters.getRawValue();
      this.items.set(
        await this.tx.list({
          type: v.type || undefined,
          from: v.from || undefined,
          to: v.to || undefined,
        }),
      );
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  async remove(id: string) {
    if (!confirm('¿Eliminar transacción?')) return;
    await this.tx.remove(id);
    this.items.update((arr) => arr.filter((t) => t.id !== id));
  }

  clear() {
    this.filters.reset({ type: '', from: '', to: '' });
  }
}
