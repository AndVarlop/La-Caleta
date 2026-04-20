import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type PaletteId =
  | 'emerald'
  | 'violet'
  | 'lilac'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'pink'
  | 'orange';

export type Mode = 'light' | 'dark';

export interface Palette {
  id: PaletteId;
  label: string;
  swatch: string;
  shades: Record<string, string>;
}

export const PALETTES: Palette[] = [
  {
    id: 'emerald',
    label: 'Verde',
    swatch: '#10b981',
    shades: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
    },
  },
  {
    id: 'violet',
    label: 'Morado',
    swatch: '#8b5cf6',
    shades: {
      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
      500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95',
    },
  },
  {
    id: 'lilac',
    label: 'Lila',
    swatch: '#c084fc',
    shades: {
      50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc',
      500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87',
    },
  },
  {
    id: 'amber',
    label: 'Amarillo',
    swatch: '#f59e0b',
    shades: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
      500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
    },
  },
  {
    id: 'rose',
    label: 'Rojo',
    swatch: '#ef4444',
    shades: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
      500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
    },
  },
  {
    id: 'sky',
    label: 'Azul',
    swatch: '#0ea5e9',
    shades: {
      50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
      500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e',
    },
  },
  {
    id: 'pink',
    label: 'Rosado',
    swatch: '#ec4899',
    shades: {
      50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6',
      500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843',
    },
  },
  {
    id: 'orange',
    label: 'Naranja',
    swatch: '#f97316',
    shades: {
      50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
      500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
    },
  },
];

const PALETTE_KEY = 'lacaleta:palette';
const MODE_KEY = 'lacaleta:mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly palette = signal<PaletteId>(this.initialPalette());
  readonly mode = signal<Mode>(this.initialMode());

  readonly palettes = PALETTES;

  constructor() {
    effect(() => {
      const id = this.palette();
      if (this.isBrowser) this.applyPalette(id);
    });
    effect(() => {
      const m = this.mode();
      if (this.isBrowser) this.applyMode(m);
    });
  }

  setPalette(id: PaletteId) {
    this.palette.set(id);
    if (this.isBrowser) localStorage.setItem(PALETTE_KEY, id);
  }

  setMode(m: Mode) {
    this.mode.set(m);
    if (this.isBrowser) localStorage.setItem(MODE_KEY, m);
  }

  toggleMode() {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private initialPalette(): PaletteId {
    if (!this.isBrowser) return 'emerald';
    const v = localStorage.getItem(PALETTE_KEY) as PaletteId | null;
    return v && PALETTES.some((p) => p.id === v) ? v : 'emerald';
  }

  private initialMode(): Mode {
    if (!this.isBrowser) return 'light';
    const v = localStorage.getItem(MODE_KEY) as Mode | null;
    if (v === 'light' || v === 'dark') return v;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyPalette(id: PaletteId) {
    const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0];
    const root = document.documentElement;
    for (const [k, v] of Object.entries(p.shades)) {
      root.style.setProperty(`--p-${k}`, v);
    }
  }

  private applyMode(m: Mode) {
    const root = document.documentElement;
    if (m === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }
}
