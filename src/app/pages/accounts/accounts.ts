import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountsService } from '../../core/accounts.service';
import { Account } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [ReactiveFormsModule, MoneyPipe],
  templateUrl: './accounts.html',
})
export class AccountsPage {
  private readonly fb = inject(FormBuilder);
  private readonly accs = inject(AccountsService);

  readonly items = signal<Account[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly total = computed(() => this.items().reduce((a, b) => a + Number(b.balance), 0));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    balance: [0, [Validators.required]],
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.items.set(await this.accs.list());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
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
      const editing = this.editingId();
      if (editing) {
        const updated = await this.accs.update(editing, { name: v.name });
        this.items.update((arr) => arr.map((a) => (a.id === editing ? updated : a)));
      } else {
        const created = await this.accs.create(v.name, Number(v.balance));
        this.items.update((arr) => [...arr, created]);
      }
      this.cancel();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }

  edit(a: Account) {
    this.editingId.set(a.id);
    this.form.reset({ name: a.name, balance: Number(a.balance) });
    this.form.controls.balance.disable();
  }

  cancel() {
    this.editingId.set(null);
    this.form.reset({ name: '', balance: 0 });
    this.form.controls.balance.enable();
  }

  async remove(id: string) {
    if (!confirm('¿Eliminar cuenta? Se borrarán sus transacciones.')) return;
    await this.accs.remove(id);
    this.items.update((arr) => arr.filter((a) => a.id !== id));
  }
}
