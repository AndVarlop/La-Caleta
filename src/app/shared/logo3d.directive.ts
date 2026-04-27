import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, createTimeline } from 'animejs';

@Directive({
  selector: '[appLogo3d]',
  standalone: true,
})
export class Logo3dDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private floatStop: (() => void) | null = null;

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    const el = this.host.nativeElement;
    el.style.transformStyle = 'preserve-3d';
    el.style.willChange = 'transform, filter';
    el.style.perspective = '800px';

    // Entry animation: scale + flip
    createTimeline({ defaults: { ease: 'outElastic(1, .6)' } })
      .add(el, {
        scale: [0.4, 1],
        rotateY: [180, 0],
        rotateX: [-25, 0],
        opacity: [0, 1],
        filter: ['drop-shadow(0 0 0 rgba(0,0,0,0))', 'drop-shadow(0 12px 24px rgba(0,0,0,.18))'],
        duration: 1100,
      });

    // Idle float loop
    const loop = animate(el, {
      translateY: [
        { to: -6, duration: 1800 },
        { to: 0, duration: 1800 },
      ],
      rotateZ: [
        { to: 2, duration: 1800 },
        { to: -2, duration: 1800 },
        { to: 0, duration: 1800 },
      ],
      ease: 'inOutSine',
      loop: true,
      delay: 1100,
    });
    this.floatStop = () => loop.pause();
  }

  @HostListener('mouseenter') onEnter() {
    if (!this.isBrowser) return;
    animate(this.host.nativeElement, {
      scale: 1.08,
      rotateY: 12,
      rotateX: -6,
      duration: 350,
      ease: 'outQuad',
    });
  }

  @HostListener('mouseleave') onLeave() {
    if (!this.isBrowser) return;
    animate(this.host.nativeElement, {
      scale: 1,
      rotateY: 0,
      rotateX: 0,
      duration: 500,
      ease: 'outElastic(1, .5)',
    });
  }

  @HostListener('click') onClick() {
    if (!this.isBrowser) return;
    animate(this.host.nativeElement, {
      rotateY: '+=360',
      duration: 900,
      ease: 'outCubic',
    });
  }

  ngOnDestroy() {
    this.floatStop?.();
  }
}
