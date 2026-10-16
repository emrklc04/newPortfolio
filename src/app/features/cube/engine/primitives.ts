import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';

export const SLAB_SIZE = 6;
export const SLAB_THICKNESS = 0.6;

/** The flat plinth that forms one visible face of the main cube; props sit on top of it (y = 0). */
export function createSlab(color: number): Mesh {
  // Slightly undersized vs. the cube's true edge length so neighbouring faces' slabs don't share
  // an exactly coincident plane at the seams (which causes z-fighting flicker).
  const footprint = SLAB_SIZE - 0.08;
  const material = new MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  const mesh = new Mesh(new BoxGeometry(footprint, SLAB_THICKNESS, footprint), material);
  mesh.position.y = -SLAB_THICKNESS / 2;
  return mesh;
}
