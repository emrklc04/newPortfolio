import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReducedMotionService } from './reduced-motion.service';
import { SectionNavigationService } from './section-navigation.service';

@Injectable({ providedIn: 'root' })
export class AnchorScrollService {
  private readonly router = inject(Router);
  private readonly reducedMotion = inject(ReducedMotionService);
  private readonly sectionNavigation = inject(SectionNavigationService);

  scrollToSection(id: string): void {
    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      const behavior: ScrollBehavior = this.reducedMotion.prefersReduced() ? 'auto' : 'smooth';

      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior, block: 'start' });
        return;
      }

      // No matching DOM element — the id belongs to the free-roam 3D world, which renders onto a
      // canvas instead of discrete sections. Scroll the world into view and let it handle the
      // section itself (fly to the island, or open the section as a panel).
      if (this.sectionNavigation.open(id)) {
        document
          .querySelector('app-cube-experience')
          ?.scrollIntoView({ behavior, block: 'start' });
      }
      return;
    }

    void this.router.navigate(['/'], { fragment: id });
  }
}
