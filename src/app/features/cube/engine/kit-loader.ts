import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Kit, KIT_URLS, KitName, Kits } from './kits';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Kit>>();

/**
 * Loads one baked kit GLB and indexes its top-level nodes by name. `build-kits.mjs` guarantees
 * one top-level node per source part, so the index keys match the constants in kits.ts.
 */
function loadOne(url: string): Promise<Kit> {
  let pending = cache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => {
      const parts = new Map<string, Object3D>();
      for (const child of gltf.scene.children) {
        parts.set(child.name, child);
      }
      return parts;
    });
    cache.set(url, pending);
  }
  return pending;
}

/** Loads every kit in parallel, resolving once all of them are ready. */
export async function loadKits(): Promise<Kits> {
  const names = Object.keys(KIT_URLS) as KitName[];
  const loaded = await Promise.all(names.map((name) => loadOne(KIT_URLS[name])));

  const kits = {} as Record<KitName, Kit>;
  names.forEach((name, index) => {
    kits[name] = loaded[index];
  });
  return kits;
}

/**
 * Looks up a kit part, throwing if it's absent. A missing part would otherwise render as nothing
 * at all — a silently empty island is much harder to diagnose than a failed load, and the only way
 * to hit this is a kits.ts name drifting out of sync with tools/kit-manifest.mjs.
 */
export function kitPart(kit: Kit, name: string): Object3D {
  const part = kit.get(name);
  if (!part) {
    throw new Error(
      `Kit part "${name}" not found. Add it to tools/kit-manifest.mjs and re-run \`npm run build:kits\`.`,
    );
  }
  return part;
}
