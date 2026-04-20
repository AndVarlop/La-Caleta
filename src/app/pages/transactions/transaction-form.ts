import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TransactionsService } from '../../core/transactions.service';
import { CategoriesService } from '../../core/categories.service';
import { AccountsService } from '../../core/accounts.service';
import { Account, Category, TxType } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MoneyPipe],
  templateUrl: './transaction-form.html',
})
export class TransactionFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly tx = inject(TransactionsService);
  private readonly cats = inject(CategoriesService);
  private readonly accs = inject(AccountsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly accounts = signal<Account[]>([]);
  readonly allCategories = signal<Category[]>([]);

  readonly form = this.fb.nonNullable.group({
    type: ['expense' as TxType, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    account_id: ['', Validators.required],
    category_id: [''],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    description: [''],
  });

  readonly currentType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  readonly categories = computed<Category[]>(() =>
    this.allCategories().filter((c) => c.type === this.currentType()),
  );

  readonly currentAccountId = toSignal(this.form.controls.account_id.valueChanges, {
    initialValue: this.form.controls.account_id.value,
  });
  readonly currentAmount = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: this.form.controls.amount.value,
  });

  readonly selectedAccount = computed<Account | null>(() => {
    const id = this.currentAccountId();
    return this.accounts().find((a) => a.id === id) ?? null;
  });

  readonly overBalance = computed<boolean>(() => {
    if (this.currentType() !== 'expense') return false;
    const acc = this.selectedAccount();
    if (!acc) return false;
    const amount = Number(this.currentAmount()) || 0;
    const available = Number(acc.balance) || 0;
    const originalAmount = this.originalAmount();
    const originalAccount = this.originalAccountId();
    const effective =
      this.id() && originalAccount === acc.id ? available + originalAmount : available;
    return amount > effective;
  });

  private readonly originalAmount = signal(0);
  private readonly originalAccountId = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.currentType();
      const selected = this.form.controls.category_id.value;
      if (selected && !this.categories().some((c) => c.id === selected)) {
        this.form.controls.category_id.setValue('', { emitEvent: false });
      }
    });
    this.init();
  }

  async init() {
    const paramId = this.route.snapshot.paramMap.get('id');

    try {
      this.accounts.set(await this.accs.list());
    } catch (e: any) {
      console.error('accounts.list', e);
      this.error.set(`Cuentas: ${e?.message ?? e}`);
    }

    try {
      this.allCategories.set(await this.cats.list());
    } catch (e: any) {
      console.error('cats.list', e);
      this.error.set(`Categorías: ${e?.message ?? e}`);
    }

    const accounts = this.accounts();

    if (paramId && paramId !== 'new') {
      this.id.set(paramId);
      const list = await this.tx.list();
      const t = list.find((x) => x.id === paramId);
      if (t) {
        this.originalAmount.set(t.type === 'expense' ? Number(t.amount) : 0);
        this.originalAccountId.set(t.account_id);
        this.form.patchValue(
          {
            type: t.type,
            amount: t.amount,
            account_id: t.account_id,
            category_id: t.category_id ?? '',
            date: t.date,
            description: t.description ?? '',
          },
          { emitEvent: true },
        );
      }
    } else if (accounts.length && !this.form.controls.account_id.value) {
      this.form.controls.account_id.setValue(accounts[0].id);
    }
  }

  setType(type: TxType) {
    this.form.controls.type.setValue(type);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.overBalance()) {
      this.error.set('No tienes saldo suficiente en esa cuenta.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      const payload = {
        type: v.type,
        amount: Number(v.amount),
        account_id: v.account_id,
        category_id: v.category_id || null,
        date: v.date,
        description: v.description || null,
      };
      if (this.id()) await this.tx.update(this.id()!, payload);
      else await this.tx.create(payload);
      await this.router.navigateByUrl('/transactions');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }
}
