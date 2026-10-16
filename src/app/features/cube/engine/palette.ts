/** Slab (ground plinth) color per face theme. Props themselves come from the Kenney GLB models
 * and carry their own baked colors/textures — only the ground they stand on is tinted here. */
export const PALETTE = {
  suburb: { slab: 0x6fae5d },
  city: { slab: 0x1f4f52 },
  ice: { slab: 0xb7cdd8 },
  pyramids: { slab: 0x9a9aa0 },
  forest: { slab: 0x2f5d3a },
  empty: { slab: 0x6b6b70 },
} as const;

export const SPACE_BACKGROUND = 0x05050c;
