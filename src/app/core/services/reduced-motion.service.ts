import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReducedMotionService {
  private readonly query = window.matchMedia('(prefers-reduced-motion: reduce)');
  readonly prefersReduced = signal(this.query.matches);

  constructor() {
    this.query.addEventListener('change', (event) => {
      this.prefersReduced.set(event.matches);
    });
  }
}
