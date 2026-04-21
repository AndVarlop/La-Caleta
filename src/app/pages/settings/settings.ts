import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaletteId, ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth.service';
import { IdleService } from '../../core/idle.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.html',
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly idle = inject(IdleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;

  readonly idleOptions = [
    { label: '5 min', ms: 5 * 60 * 1000 },
    { label: '15 min', ms: 15 * 60 * 1000 },
    { label: '30 min', ms: 30 * 60 * 1000 },
    { label: '1 h', ms: 60 * 60 * 1000 },
  ];

  pick(id: PaletteId) {
    this.theme.setPalette(id);
  }

  toggle() {
    this.theme.toggleMode();
  }

  pickIdle(ms: number) {
    this.idle.setTimeout(ms);
  }

  async logout() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
