// Exports the procedural Automation Core to assets/models/automation-core.glb (opens in Blender,
// three.js editor, gltf viewers). Run: node tools/export-glb.mjs
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Minimal FileReader so GLTFExporter can build a binary GLB under Node.
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend && this.onloadend(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = `data:${b.type || 'application/octet-stream'};base64,${Buffer.from(r).toString('base64')}`; this.onloadend && this.onloadend(); }); }
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = createRequire(import.meta.url)(path.join(root, 'assets/js/core-model.js'));
const { group } = build(THREE, { forExport: true });

const scene = new THREE.Scene();
scene.add(group);
let tris = 0, meshes = 0;
group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });

const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
mkdirSync(path.join(root, 'assets/models'), { recursive: true });
const out = path.join(root, 'assets/models/automation-core.glb');
writeFileSync(out, Buffer.from(glb));
console.log(`wrote ${out}\n${meshes} meshes, ${Math.round(tris).toLocaleString()} triangles, ${(glb.byteLength / 1024).toFixed(0)} KB`);
