import { Component, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { TransactionsService } from '../../core/transactions.service';
import { CategoryTotal, MonthlySeries } from '../../core/models';
import { ChartDirective } from '../../shared/chart.directive';
import { CountDirective } from '../../shared/count.directive';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [ChartDirective, CountDirective, RevealDirective],
  templateUrl: './reports.html',
})
export class ReportsPage {
  private readonly tx = inject(TransactionsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly monthly = signal<MonthlySeries[]>([]);
  readonly byCategory = signal<CategoryTotal[]>([]);
  readonly totalExpense = computed(() =>
    this.byCategory().reduce((acc, c) => acc + c.total, 0),
  );

  readonly barChart = computed<ChartConfiguration>(() => {
    const data = this.monthly();
    return {
      type: 'bar',
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          { label: 'Ingresos', data: data.map((d) => d.income), backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Gastos', data: data.map((d) => d.expense), backgroundColor: '#f43f5e', borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: (v: number | string) => `$${v}` } },
        },
        plugins: { legend: { position: 'bottom' } },
      },
    };
  });

  readonly pieChart = computed<ChartConfiguration>(() => {
    const items = this.byCategory();
    return {
      type: 'pie',
      data: {
        labels: items.map((i) => i.name),
        datasets: [
          {
            data: items.map((i) => i.total),
            backgroundColor: items.map((i) => i.color || '#10b981'),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
      },
    };
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const now = new Date();
      const [monthly, byCategory] = await Promise.all([
        this.tx.monthlyEvolution(6),
        this.tx.expensesByCategory(now.getFullYear(), now.getMonth() + 1),
      ]);
      this.monthly.set(monthly);
      this.byCategory.set(byCategory);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }
}
