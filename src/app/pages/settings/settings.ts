import { Component, inject } from '@angular/core';
import { PaletteId, ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.html',
})
export class SettingsPage {
  readonly theme = inject(ThemeService);

  pick(id: PaletteId) {
    this.theme.setPalette(id);
  }

  toggle() {
    this.theme.toggleMode();
  }
}
