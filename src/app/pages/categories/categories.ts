import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoriesService } from '../../core/categories.service';
import { Category, TxType } from '../../core/models';

const PALETTE = ['#10b981', '#f43f5e', '#6366f1', '#f59e0b', '#0ea5e9', '#a855f7', '#14b8a6', '#ef4444'];

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './categories.html',
})
export class CategoriesPage {
  private readonly fb = inject(FormBuilder);
  private readonly cats = inject(CategoriesService);

  readonly items = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly palette = PALETTE;

  readonly income = computed(() => this.items().filter((c) => c.type === 'income'));
  readonly expense = computed(() => this.items().filter((c) => c.type === 'expense'));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['expense' as TxType, Validators.required],
    color: [PALETTE[0], Validators.required],
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.items.set(await this.cats.list());
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
      const created = await this.cats.create(this.form.getRawValue());
      this.items.update((arr) => [...arr, created]);
      this.form.reset({ name: '', type: 'expense', color: PALETTE[0] });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string) {
    if (!confirm('¿Eliminar categoría? Las transacciones quedarán sin categoría.')) return;
    await this.cats.remove(id);
    this.items.update((arr) => arr.filter((c) => c.id !== id));
  }
}
