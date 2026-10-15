import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly explicit = signal(readStoredTheme() !== null);
  readonly theme = signal<Theme>(readStoredTheme() ?? (prefersDark() ? 'dark' : 'light'));

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.dataset['theme'] = theme;
      this.updateThemeColorMeta(theme);
      if (this.explicit()) {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (!this.explicit()) {
        this.theme.set(event.matches ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    this.explicit.set(true);
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private updateThemeColorMeta(theme: Theme): void {
    const color = theme === 'dark' ? '#0b0b0e' : '#fbfbfd';
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', color));
  }
}
