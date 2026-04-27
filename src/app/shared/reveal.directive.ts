import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, stagger } from 'animejs';

@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input('appReveal') selector: string | '' = '';
  @Input() delay: number = 0;
  @Input() y: number = 14;
  @Input() duration: number = 600;
  @Input() staggerMs: number = 60;

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    const el = this.host.nativeElement;
    const targets: HTMLElement[] = this.selector
      ? Array.from(el.querySelectorAll(this.selector))
      : [el];
    if (!targets.length) return;
    for (const t of targets) {
      t.style.opacity = '0';
      t.style.transform = `translateY(${this.y}px)`;
      t.style.willChange = 'transform, opacity';
    }
    animate(targets, {
      opacity: [0, 1],
      translateY: [this.y, 0],
      duration: this.duration,
      delay: this.selector ? stagger(this.staggerMs, { start: this.delay }) : this.delay,
      ease: 'outCubic',
    });
  }
}
