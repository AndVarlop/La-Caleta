import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TransactionsService } from '../../core/transactions.service';
import { PocketsService } from '../../core/pockets.service';
import { AuthService } from '../../core/auth.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { ChartDirective } from '../../shared/chart.directive';
import { CategoryTotal, MonthSummary, TransactionWithRelations } from '../../core/models';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MoneyPipe, ChartDirective],
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  private readonly tx = inject(TransactionsService);
  private readonly pockets = inject(PocketsService);
  private readonly auth = inject(AuthService);

  readonly profile = this.auth.profile;
  readonly user = this.auth.user;

  greetName(): string {
    const p = this.profile();
    const u = this.user();
    return p?.nickname || p?.name || u?.email?.split('@')[0] || '';
  }

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly balance = signal(0);
  readonly month = signal<MonthSummary>({ income: 0, expense: 0, balance: 0 });
  readonly recent = signal<TransactionWithRelations[]>([]);
  readonly byCategory = signal<CategoryTotal[]>([]);
  readonly pocketsTotal = signal(0);

  readonly chart = computed<ChartConfiguration>(() => {
    const items = this.byCategory();
    return {
      type: 'doughnut',
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
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
      },
    };
  });

  readonly remaining = computed(() => {
    const m = this.month();
    return Math.max(0, m.income - m.expense);
  });

  readonly balanceChart = computed<ChartConfiguration>(() => {
    const m = this.month();
    const remaining = Math.max(0, m.income - m.expense);
    const spent = m.expense;
    return {
      type: 'doughnut',
      data: {
        labels: ['Gastado', 'Restante'],
        datasets: [
          {
            data: [spent, remaining],
            backgroundColor: ['#f43f5e', '#10b981'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
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
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const [balance, month, recent, byCategory, pockets] = await Promise.all([
        this.tx.totalBalance(),
        this.tx.monthSummary(y, m),
        this.tx.list({ limit: 5 }),
        this.tx.expensesByCategory(y, m),
        this.pockets.list(),
      ]);
      this.balance.set(balance);
      this.month.set(month);
      this.recent.set(recent);
      this.byCategory.set(byCategory);
      this.pocketsTotal.set(pockets.reduce((a, b) => a + Number(b.balance), 0));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error cargando datos');
    } finally {
      this.loading.set(false);
    }
  }
}
