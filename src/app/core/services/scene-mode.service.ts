import { Injectable, computed, inject, signal } from '@angular/core';
import { ReducedMotionService } from './reduced-motion.service';

function detectWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Decides whether the 3D cube experience or the accessible flat fallback is rendered. */
@Injectable({ providedIn: 'root' })
export class SceneModeService {
  private readonly reducedMotion = inject(ReducedMotionService);
  private readonly webglSupported = signal(detectWebgl());

  readonly use3d = computed(() => this.webglSupported() && !this.reducedMotion.prefersReduced());
}
