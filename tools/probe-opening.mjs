/**
 * Reports the distinct x coordinates of a wall part's vertices, which on this low-poly kit reveals
 * where a door/window opening's vertical edges sit. Used to align the door and window inserts
 * against the wall modules instead of guessing. Usage:
 *   node tools/probe-opening.mjs <kit-dir> <Part> [<Part>...]
 *
 * Slicing at a height would not work here: the geometry has no vertices along the middle of an
 * edge, so a horizontal band through an opening is empty.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import path from 'node:path';

const [kitDir, ...parts] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const round = (n) => Math.round(n * 100) / 100;

for (const part of parts) {
  const doc = await io.read(path.join(kitDir, `${part}.gltf`));

  // Only the main structural primitive matters; the thin trim meshes add noise.
  const columns = new Map();
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const vertex = [0, 0, 0];
      for (let i = 0; i < position.getCount(); i++) {
        position.getElement(i, vertex);
        const x = round(vertex[0]);
        const column = columns.get(x) ?? { count: 0, maxY: -Infinity };
        column.count++;
        column.maxY = Math.max(column.maxY, vertex[1]);
        columns.set(x, column);
      }
    }
  }

  const sorted = [...columns.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`\n${part}`);
  console.log(
    sorted.map(([x, { count, maxY }]) => `  x=${x} (n=${count}, maxY=${round(maxY)})`).join('\n'),
  );
}
