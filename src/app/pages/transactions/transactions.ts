import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TransactionsService } from '../../core/transactions.service';
import { AccountsService } from '../../core/accounts.service';
import { Account, TransactionWithRelations, TxType } from '../../core/models';
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
  private readonly accounts = inject(AccountsService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly items = signal<TransactionWithRelations[]>([]);
  readonly error = signal<string | null>(null);
  readonly accountList = signal<Account[]>([]);

  readonly activeMonth = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  readonly filters = this.fb.nonNullable.group({
    type: ['' as '' | TxType],
    accountId: ['' as string],
    from: [''],
    to: [''],
  });

  readonly isMonthMode = computed(() => {
    const v = this.filters.getRawValue();
    return !v.from && !v.to;
  });

  readonly monthLabel = computed(() => {
    const { year, month } = this.activeMonth();
    return new Date(year, month - 1, 1)
      .toLocaleString('es', { month: 'long', year: 'numeric' });
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
    this.accounts.list().then((list) => this.accountList.set(list));
    this.load();
    this.filters.valueChanges.subscribe(() => this.load());
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const v = this.filters.getRawValue();
      const monthMode = !v.from && !v.to;

      let from = v.from || undefined;
      let to = v.to || undefined;

      if (monthMode) {
        const { year, month } = this.activeMonth();
        const pad = (n: number) => String(n).padStart(2, '0');
        const lastDay = new Date(year, month, 0).getDate();
        from = `${year}-${pad(month)}-01`;
        to = `${year}-${pad(month)}-${lastDay}`;
      }

      this.items.set(
        await this.tx.list({
          type: v.type || undefined,
          accountId: v.accountId || undefined,
          from,
          to,
        }),
      );
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  prevMonth() {
    this.filters.patchValue({ from: '', to: '' }, { emitEvent: false });
    this.activeMonth.update(({ year, month }) =>
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
    );
    this.load();
  }

  nextMonth() {
    this.filters.patchValue({ from: '', to: '' }, { emitEvent: false });
    this.activeMonth.update(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    );
    this.load();
  }

  async remove(id: string) {
    if (!confirm('¿Eliminar transacción?')) return;
    await this.tx.remove(id);
    this.items.update((arr) => arr.filter((t) => t.id !== id));
  }

  clear() {
    this.activeMonth.set({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    this.filters.reset({ type: '', accountId: '', from: '', to: '' });
  }
}
