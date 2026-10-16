import { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group>>();

function loadOne(url: string): Promise<Group> {
  let pending = cache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => gltf.scene);
    cache.set(url, pending);
  }
  return pending;
}

/** Loads (and caches) a named set of GLB models, resolving once every one of them is ready. */
export async function loadModels<K extends string>(
  urls: Record<K, string>,
): Promise<Record<K, Group>> {
  const keys = Object.keys(urls) as K[];
  const loaded = await Promise.all(keys.map((key) => loadOne(urls[key])));

  const result = {} as Record<K, Group>;
  keys.forEach((key, index) => {
    result[key] = loaded[index];
  });
  return result;
}
