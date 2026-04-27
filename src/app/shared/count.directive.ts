import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate } from 'animejs';

@Directive({
  selector: '[appCount]',
  standalone: true,
})
export class CountDirective implements AfterViewInit, OnChanges {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input('appCount') value: number = 0;
  @Input() duration: number = 900;
  @Input() decimals: number = 0;
  @Input() prefix: string = '';
  @Input() suffix: string = '';
  @Input() locale: string = 'es-CO';

  private current = 0;

  ngAfterViewInit() {
    this.animateTo();
  }

  ngOnChanges() {
    if (this.isBrowser) this.animateTo();
  }

  private animateTo() {
    if (!this.isBrowser) {
      this.el.nativeElement.textContent = this.format(this.value);
      return;
    }
    const target = Number(this.value) || 0;
    const proxy = { v: this.current };
    animate(proxy, {
      v: target,
      duration: this.duration,
      ease: 'outQuart',
      onUpdate: () => {
        this.el.nativeElement.textContent = this.format(proxy.v);
      },
      onComplete: () => {
        this.current = target;
        this.el.nativeElement.textContent = this.format(target);
      },
    });
  }

  private format(n: number): string {
    const fmt = new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: this.decimals,
      maximumFractionDigits: this.decimals,
    });
    return `${this.prefix}${fmt.format(n)}${this.suffix}`;
  }
}
