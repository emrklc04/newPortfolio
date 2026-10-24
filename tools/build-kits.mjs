/**
 * Bakes the loose source .gltf parts listed in tools/kit-manifest.mjs into one web-ready GLB per
 * pack, written to public/models/.
 *
 * Each part becomes a single top-level node named after its source file, so the runtime can look
 * a part up by name and clone it (see engine/kit-loader.ts). Textures are downscaled and converted
 * to WebP, and the packed occlusion/roughness/metalness maps are dropped in favour of scalar
 * factors — without that the source packs' 4K PNGs dominate the payload.
 *
 * Run after changing the manifest:  npm run build:kits
 */
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  mergeDocuments,
  prune,
  textureCompress,
  unpartition,
} from '@gltf-transform/functions';
import sharp from 'sharp';
import objToGltf from 'obj2gltf';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KITS } from './kit-manifest.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'public', 'models');

const BASE_COLOR_SIZE = 512;
const NORMAL_SIZE = 256;

// The source materials pair a metalness/roughness value of 1 with a packed ORM texture. Dropping
// that texture (it costs more than it adds at this scale) means the scalar factors take over, so
// they have to be reset too or every surface turns into a chrome mirror.
const ROUGHNESS_FACTOR = 0.85;
const METALLIC_FACTOR = 0;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/**
 * Reads one source part as a glTF document.
 *
 * Most packs ship glTF directly. The Ships pack only ships .blend/.fbx/.obj, so its parts are
 * converted on the fly — obj2gltf resolves the sibling .mtl itself, and those materials are plain
 * colours, so nothing is lost by going through OBJ.
 */
async function readPart(sourceDir, partName, format) {
  const sourcePath = path.join(sourceDir, `${partName}.${format}`);
  if (format === 'obj') {
    return io.readJSON({ json: await objToGltf(sourcePath), resources: {} });
  }
  return io.read(sourcePath);
}

/**
 * Merges one source part into `target` as a single top-level node named `partName`. glTF has no
 * notion of nested scenes, so the part's scene children are reparented onto a wrapper node and
 * the now-empty scene is discarded.
 */
async function mergePart(target, targetScene, sourceDir, partName, format) {
  const source = await readPart(sourceDir, partName, format);

  const scenesBefore = new Set(target.getRoot().listScenes());
  mergeDocuments(target, source);
  const mergedScenes = target
    .getRoot()
    .listScenes()
    .filter((scene) => !scenesBefore.has(scene));

  // three.js sanitizes node names on load, turning any whitespace into an underscore — so bake the
  // name in that form, or a part whose filename contains a space can never be looked up again.
  const wrapper = target.createNode(partName.replace(/\s/g, '_'));
  for (const scene of mergedScenes) {
    for (const child of scene.listChildren()) {
      scene.removeChild(child);
      wrapper.addChild(child);
    }
    scene.dispose();
  }
  targetScene.addChild(wrapper);
}

/** Strips the texture slots we trade away for payload size and resets the factors they drove. */
function simplifyMaterials(document) {
  for (const material of document.getRoot().listMaterials()) {
    material.setOcclusionTexture(null);
    material.setMetallicRoughnessTexture(null);
    material.setRoughnessFactor(ROUGHNESS_FACTOR);
    material.setMetallicFactor(METALLIC_FACTOR);
  }
}

async function buildKit({ name, sourceDir, parts, format = 'gltf' }) {
  const document = new Document();
  const scene = document.createScene(name);
  document.getRoot().setDefaultScene(scene);

  const absoluteSourceDir = path.resolve(projectRoot, sourceDir);
  for (const part of parts) {
    await mergePart(document, scene, absoluteSourceDir, part, format);
  }

  simplifyMaterials(document);

  await document.transform(
    // keepLeaves so the wrapper nodes themselves are never pruned.
    prune({ keepLeaves: true }),
    dedup(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      slots: /baseColorTexture/,
      resize: [BASE_COLOR_SIZE, BASE_COLOR_SIZE],
      quality: 80,
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      slots: /normalTexture/,
      resize: [NORMAL_SIZE, NORMAL_SIZE],
      quality: 75,
    }),
    // Every merged part arrives with its own buffer; a GLB may only have one.
    unpartition(),
  );

  const outputPath = path.join(outputDir, `${name}.glb`);
  await io.write(outputPath, document);

  const { size } = await fs.stat(outputPath);
  const partCount = scene.listChildren().length;
  const textureCount = document.getRoot().listTextures().length;
  console.log(
    `${name}.glb  ${(size / 1024 / 1024).toFixed(2)} MB  ` +
      `(${partCount} parts, ${textureCount} textures)`,
  );
}

await fs.mkdir(outputDir, { recursive: true });
for (const kit of KITS) {
  await buildKit(kit);
}
