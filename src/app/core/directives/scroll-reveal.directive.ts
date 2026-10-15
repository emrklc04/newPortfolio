import { Directive, ElementRef, Input, OnDestroy, afterNextRender, inject } from '@angular/core';
import { ReducedMotionService } from '../services/reduced-motion.service';

@Directive({
  selector: '[appScrollReveal]',
})
export class ScrollRevealDirective implements OnDestroy {
  @Input() appScrollRevealDelay = 0;

  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly reducedMotion = inject(ReducedMotionService);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => this.setup());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setup(): void {
    const el = this.element.nativeElement;
    el.classList.add('reveal');

    if (this.reducedMotion.prefersReduced()) {
      el.classList.add('reveal-visible');
      return;
    }

    // Content already on screen at load (e.g. above the fold, or a short page) should show
    // immediately rather than depend on a later scroll event ever reaching the observer.
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < viewportHeight * 0.9 && rect.bottom > 0) {
      el.classList.add('reveal-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('reveal-visible'), this.appScrollRevealDelay);
            this.observer?.unobserve(el);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    this.observer.observe(el);
  }
}
