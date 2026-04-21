import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
const STORAGE_KEY = 'lacaleta:idle-ms';
const DEFAULT_MS = 15 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly timeoutMs = signal<number>(this.loadTimeout());

  private timerId: number | null = null;
  private onTimeout: (() => void) | null = null;
  private readonly handler = () => this.reset();

  private loadTimeout(): number {
    if (!this.isBrowser) return DEFAULT_MS;
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MS;
  }

  setTimeout(ms: number) {
    this.timeoutMs.set(ms);
    if (this.isBrowser) localStorage.setItem(STORAGE_KEY, String(ms));
    if (this.onTimeout) this.reset();
  }

  start(onTimeout: () => void) {
    if (!this.isBrowser) return;
    this.stop();
    this.onTimeout = onTimeout;
    for (const e of EVENTS) {
      window.addEventListener(e, this.handler, { passive: true });
    }
    document.addEventListener('visibilitychange', this.handler);
    this.reset();
  }

  stop() {
    if (!this.isBrowser) return;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    for (const e of EVENTS) {
      window.removeEventListener(e, this.handler);
    }
    document.removeEventListener('visibilitychange', this.handler);
    this.onTimeout = null;
  }

  private reset() {
    if (!this.isBrowser || !this.onTimeout) return;
    if (this.timerId !== null) window.clearTimeout(this.timerId);
    const cb = this.onTimeout;
    this.timerId = window.setTimeout(() => cb(), this.timeoutMs());
  }
}
