import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReducedMotionService } from './reduced-motion.service';

@Injectable({ providedIn: 'root' })
export class AnchorScrollService {
  private readonly router = inject(Router);
  private readonly reducedMotion = inject(ReducedMotionService);

  scrollToSection(id: string): void {
    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      const element = document.getElementById(id);
      element?.scrollIntoView({
        behavior: this.reducedMotion.prefersReduced() ? 'auto' : 'smooth',
        block: 'start',
      });
      return;
    }

    void this.router.navigate(['/'], { fragment: id });
  }
}
