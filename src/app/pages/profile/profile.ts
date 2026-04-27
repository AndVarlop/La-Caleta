import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TransactionsService } from '../../core/transactions.service';
import { PocketsService } from '../../core/pockets.service';
import { Pocket, TransactionWithRelations } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { CountDirective } from '../../shared/count.directive';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, MoneyPipe, CountDirective, RevealDirective],
  templateUrl: './profile.html',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly tx = inject(TransactionsService);
  private readonly pockets = inject(PocketsService);

  readonly profile = this.auth.profile;
  readonly user = this.auth.user;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly recent = signal<TransactionWithRelations[]>([]);
  readonly pocketsList = signal<Pocket[]>([]);

  readonly pocketsTotal = computed(() =>
    this.pocketsList().reduce((a, b) => a + Number(b.balance), 0),
  );

  displayName(): string {
    const p = this.profile();
    const u = this.user();
    return p?.nickname || p?.name || u?.email?.split('@')[0] || 'Usuario';
  }

  initial(): string {
    return (this.displayName() || '?').charAt(0).toUpperCase();
  }

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [recent, pockets] = await Promise.all([
        this.tx.list({ limit: 5 }),
        this.pockets.list(),
      ]);
      this.recent.set(recent);
      this.pocketsList.set(pockets);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }
}
