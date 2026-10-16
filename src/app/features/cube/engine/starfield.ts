import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';

export function createStarfield(count = 1400, radius = 60): Points {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = radius * (0.55 + Math.random() * 0.45);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xcfe8ff,
    size: 0.16,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });

  return new Points(geometry, material);
}
