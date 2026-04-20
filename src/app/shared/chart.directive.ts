import {
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

let registered = false;

@Directive({
  selector: 'canvas[appChart]',
  standalone: true,
})
export class ChartDirective implements OnDestroy {
  readonly config = input.required<ChartConfiguration>({ alias: 'appChart' });

  private readonly host = inject(ElementRef<HTMLCanvasElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const cfg = this.config();
      if (!isPlatformBrowser(this.platformId)) return;
      if (!registered) {
        Chart.register(...registerables);
        registered = true;
      }
      if (this.chart) {
        this.chart.data = cfg.data;
        if (cfg.options) this.chart.options = cfg.options;
        this.chart.update();
      } else {
        this.chart = new Chart(this.host.nativeElement as HTMLCanvasElement, cfg);
      }
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.chart = null;
  }
}
