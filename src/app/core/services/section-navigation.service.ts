import { Injectable, signal } from '@angular/core';

/** Mirrors the header nav's link ids. */
export type SectionId = 'projects' | 'journey' | 'about' | 'skills' | 'contact';

const SECTION_IDS: readonly string[] = [
  'projects',
  'journey',
  'about',
  'skills',
  'contact',
] as const;

/**
 * Lets the 3D world handle header-nav clicks for sections that have no scrollable DOM element.
 *
 * The world is a single canvas holding one island (Projects), so "Projekte" flies the camera there
 * while the remaining sections open as panels over the canvas. Either way the handler lives in
 * cube-experience.ts; this service is just the seam that lets the header reach it.
 */
@Injectable({ providedIn: 'root' })
export class SectionNavigationService {
  private readonly handler = signal<((id: SectionId) => void) | null>(null);

  register(handler: (id: SectionId) => void): void {
    this.handler.set(handler);
  }

  clear(): void {
    this.handler.set(null);
  }

  /** Returns true if the 3D world was registered and handled the navigation. */
  open(id: string): boolean {
    const handler = this.handler();
    if (!handler || !SECTION_IDS.includes(id)) {
      return false;
    }
    handler(id as SectionId);
    return true;
  }
}
