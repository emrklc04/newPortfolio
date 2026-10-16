import { Injectable, signal } from '@angular/core';

/** Face ids mirror the header's nav link ids so both the 3D and fallback paths share one scheme. */
export type CubeFaceId = 'projects' | 'journey' | 'about' | 'skills' | 'contact';

/**
 * Lets the CubeExperience component publish the document scrollY offset of each face so the
 * header nav can jump to a face without relying on a DOM element with a matching id (the cube
 * has no such elements — everything lives on a canvas).
 */
@Injectable({ providedIn: 'root' })
export class CubeFaceRegistryService {
  private readonly offsets = signal<Partial<Record<CubeFaceId, number>>>({});

  register(offsets: Partial<Record<CubeFaceId, number>>): void {
    this.offsets.set(offsets);
  }

  clear(): void {
    this.offsets.set({});
  }

  getOffset(id: string): number | undefined {
    return this.offsets()[id as CubeFaceId];
  }
}
