/**
 * Prints the world-space bounding box of given kit parts, so house assembly can be built on the
 * kit's real grid conventions instead of guessed numbers. Usage:
 *   node tools/inspect-kit.mjs <kit-dir> <PartName> [PartName...]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import path from 'node:path';

const [kitDir, ...parts] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const round = (n) => Math.round(n * 1000) / 1000;

for (const part of parts) {
  const doc = await io.read(path.join(kitDir, `${part}.gltf`));
  const scene = doc.getRoot().listScenes()[0];
  const { min, max } = getBounds(scene);
  const size = max.map((v, i) => round(v - min[i]));
  console.log(
    `${part.padEnd(36)} min=[${min.map(round).join(', ')}]  max=[${max.map(round).join(', ')}]  size=[${size.join(', ')}]`,
  );
}
