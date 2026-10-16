import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReducedMotionService } from './reduced-motion.service';
import { CubeFaceRegistryService } from './cube-face-registry.service';

@Injectable({ providedIn: 'root' })
export class AnchorScrollService {
  private readonly router = inject(Router);
  private readonly reducedMotion = inject(ReducedMotionService);
  private readonly cubeFaceRegistry = inject(CubeFaceRegistryService);

  scrollToSection(id: string): void {
    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      const behavior: ScrollBehavior = this.reducedMotion.prefersReduced() ? 'auto' : 'smooth';

      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior, block: 'start' });
        return;
      }

      // No matching DOM element — the id refers to a face inside the 3D cube experience, which
      // renders onto a canvas instead of discrete sections.
      const cubeOffset = this.cubeFaceRegistry.getOffset(id);
      if (cubeOffset !== undefined) {
        window.scrollTo({ top: cubeOffset, behavior });
      }
      return;
    }

    void this.router.navigate(['/'], { fragment: id });
  }
}
