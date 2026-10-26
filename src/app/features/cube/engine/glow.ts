import {
  AdditiveBlending,
  DataTexture,
  Object3D,
  RGBAFormat,
  Sprite,
  SpriteMaterial,
  UnsignedByteType,
  Vector3,
} from 'three';

const GLOW_SIZE = 64;
const glowPixels = new Uint8Array(GLOW_SIZE * GLOW_SIZE * 4);

for (let y = 0; y < GLOW_SIZE; y++) {
  for (let x = 0; x < GLOW_SIZE; x++) {
    const offset = (y * GLOW_SIZE + x) * 4;
    const normalizedX = (x + 0.5 - GLOW_SIZE / 2) / (GLOW_SIZE / 2);
    const normalizedY = (y + 0.5 - GLOW_SIZE / 2) / (GLOW_SIZE / 2);
    const distance = Math.hypot(normalizedX, normalizedY);
    const alpha = Math.pow(Math.max(0, 1 - distance), 2.2);
    glowPixels[offset] = 255;
    glowPixels[offset + 1] = 255;
    glowPixels[offset + 2] = 255;
    glowPixels[offset + 3] = Math.round(alpha * 255);
  }
}

const glowTexture = new DataTexture(glowPixels, GLOW_SIZE, GLOW_SIZE, RGBAFormat, UnsignedByteType);
glowTexture.needsUpdate = true;

/** Adds a camera-facing, additive halo for a small emissive light source. */
export function addGlow(
  parent: Object3D,
  position: Vector3,
  color: number,
  size: number,
  opacity = 0.8,
): Sprite {
  const sprite = new Sprite(
    new SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    }),
  );
  sprite.position.copy(position);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 2;
  parent.add(sprite);
  return sprite;
}
