import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaletteId, ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.html',
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;

  pick(id: PaletteId) {
    this.theme.setPalette(id);
  }

  toggle() {
    this.theme.toggleMode();
  }

  async logout() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
