import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IdleService } from '../../core/idle.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly idle = inject(IdleService);

  readonly user = this.auth.user;
  readonly profile = this.auth.profile;
  readonly fabOpen = signal(false);

  ngOnInit() {
    this.idle.start(() => this.logout());
  }

  ngOnDestroy() {
    this.idle.stop();
  }

  displayName(): string {
    const p = this.profile();
    const u = this.user();
    return p?.nickname || p?.name || u?.email?.split('@')[0] || 'Usuario';
  }

  initial(): string {
    return (this.displayName() || '?').charAt(0).toUpperCase();
  }

  toggleFab() {
    this.fabOpen.update((v) => !v);
  }

  closeFab() {
    this.fabOpen.set(false);
  }

  async logout() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
