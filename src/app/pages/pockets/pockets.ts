import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PocketsService } from '../../core/pockets.service';
import { AccountsService } from '../../core/accounts.service';
import { Account, Pocket, PocketMovementType, PocketMovementWithRelations } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-pockets',
  standalone: true,
  imports: [ReactiveFormsModule, MoneyPipe],
  templateUrl: './pockets.html',
})
export class PocketsPage {
  private readonly fb = inject(FormBuilder);
  private readonly pockets = inject(PocketsService);
  private readonly accs = inject(AccountsService);

  readonly items = signal<Pocket[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly movements = signal<PocketMovementWithRelations[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly movingId = signal<string | null>(null);
  readonly moveType = signal<PocketMovementType>('deposit');
  readonly removingId = signal<string | null>(null);
  readonly removeAccountId = signal<string>('');

  readonly total = computed(() => this.items().reduce((a, b) => a + Number(b.balance), 0));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    goal: [0],
    color: ['#10b981'],
  });

  readonly moveForm = this.fb.nonNullable.group({
    account_id: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  readonly moveAmount = toSignal(this.moveForm.controls.amount.valueChanges, {
    initialValue: this.moveForm.controls.amount.value,
  });
  readonly moveAccountId = toSignal(this.moveForm.controls.account_id.valueChanges, {
    initialValue: this.moveForm.controls.account_id.value,
  });

  readonly movingPocket = computed<Pocket | null>(() => {
    const id = this.movingId();
    return this.items().find((p) => p.id === id) ?? null;
  });

  readonly removingPocket = computed<Pocket | null>(() => {
    const id = this.removingId();
    return this.items().find((p) => p.id === id) ?? null;
  });

  readonly moveAccount = computed<Account | null>(() => {
    const id = this.moveAccountId();
    return this.accounts().find((a) => a.id === id) ?? null;
  });

  readonly moveOver = computed<boolean>(() => {
    const amount = Number(this.moveAmount()) || 0;
    if (amount <= 0) return false;
    if (this.moveType() === 'deposit') {
      const acc = this.moveAccount();
      return acc ? amount > Number(acc.balance) : false;
    }
    const p = this.movingPocket();
    return p ? amount > Number(p.balance) : false;
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const [pockets, accounts, movements] = await Promise.all([
        this.pockets.list(),
        this.accs.list(),
        this.pockets.movements(),
      ]);
      this.items.set(pockets);
      this.accounts.set(accounts);
      this.movements.set(movements);
      if (accounts.length && !this.moveForm.controls.account_id.value) {
        this.moveForm.controls.account_id.setValue(accounts[0].id);
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  progress(p: Pocket): number {
    const goal = Number(p.goal) || 0;
    if (!goal) return 0;
    const pct = (Number(p.balance) / goal) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      const payload = {
        name: v.name,
        goal: Number(v.goal) > 0 ? Number(v.goal) : null,
        color: v.color || null,
      };
      const editing = this.editingId();
      if (editing) {
        const updated = await this.pockets.update(editing, payload);
        this.items.update((arr) => arr.map((p) => (p.id === editing ? updated : p)));
      } else {
        const created = await this.pockets.create(payload);
        this.items.update((arr) => [...arr, created]);
      }
      this.cancel();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }

  edit(p: Pocket) {
    this.editingId.set(p.id);
    this.movingId.set(null);
    this.form.reset({
      name: p.name,
      goal: Number(p.goal) || 0,
      color: p.color || '#10b981',
    });
  }

  cancel() {
    this.editingId.set(null);
    this.form.reset({ name: '', goal: 0, color: '#10b981' });
  }

  openRemove(p: Pocket) {
    this.editingId.set(null);
    this.movingId.set(null);
    this.removingId.set(p.id);
    const bal = Number(p.balance);
    if (bal > 0) {
      this.removeAccountId.set(this.accounts()[0]?.id ?? '');
    } else {
      this.removeAccountId.set('');
    }
  }

  cancelRemove() {
    this.removingId.set(null);
    this.removeAccountId.set('');
  }

  async confirmRemove() {
    const p = this.removingPocket();
    if (!p) return;
    const bal = Number(p.balance);
    this.saving.set(true);
    this.error.set(null);
    try {
      if (bal > 0) {
        const acc = this.removeAccountId();
        if (!acc) throw new Error('Selecciona una cuenta para recibir el saldo');
        await this.pockets.remove(p.id, { accountId: acc, amount: bal });
      } else {
        await this.pockets.remove(p.id);
      }
      this.removingId.set(null);
      this.removeAccountId.set('');
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }

  openMove(p: Pocket, type: PocketMovementType) {
    this.editingId.set(null);
    this.movingId.set(p.id);
    this.moveType.set(type);
    this.moveForm.reset({
      account_id: this.accounts()[0]?.id ?? '',
      amount: 0,
      description: '',
      date: new Date().toISOString().slice(0, 10),
    });
  }

  cancelMove() {
    this.movingId.set(null);
  }

  async submitMove() {
    if (this.moveForm.invalid) {
      this.moveForm.markAllAsTouched();
      return;
    }
    if (this.moveOver()) {
      this.error.set(
        this.moveType() === 'deposit'
          ? 'No hay saldo suficiente en la cuenta.'
          : 'No hay saldo suficiente en el bolsillo.',
      );
      return;
    }
    const pocketId = this.movingId();
    if (!pocketId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const v = this.moveForm.getRawValue();
      await this.pockets.move({
        pocket_id: pocketId,
        account_id: v.account_id,
        type: this.moveType(),
        amount: Number(v.amount),
        description: v.description || null,
        date: v.date,
      });
      this.movingId.set(null);
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }

  async removeMovement(id: string) {
    if (!confirm('¿Eliminar movimiento?')) return;
    try {
      await this.pockets.removeMovement(id);
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    }
  }
}
