/* Shared 3D scene: one Automation Core that travels through About → Services → Case Studies. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.documentElement;
const canvas = document.getElementById('core-canvas');
const reduced = root.classList.contains('reduced-motion');

function init() {
  if (!window.buildAutomationCore) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { root.classList.add('no-webgl'); return; }
  root.classList.add('has-webgl');

  const mobileMQ = window.matchMedia('(max-width: 760px)');
  renderer.setClearColor(0x0a0c0f, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // Linear value that comes out of ACES + sRGB as exactly #0a0c0f, so the canvas has no seam with the page.
  scene.background = new THREE.Color().setRGB(0.01212, 0.01368, 0.01616, THREE.LinearSRGBColorSpace);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  const DIST = 7, FOV = 32;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  camera.position.set(0, 0, DIST);

  // Lighting: soft white key, cyan back light, cool rim. Low-key and calm.
  const key = new THREE.DirectionalLight(0xffffff, 1.25); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8ecff, 1.1); rim.position.set(3.5, -1, -4); scene.add(rim);
  const back = new THREE.PointLight(0x2ee6ff, 16, 14, 2); back.position.set(1.8, 0.6, -2.4); scene.add(back);
  scene.add(new THREE.HemisphereLight(0x9fb4c0, 0x050607, 0.18));

  // Soft volumetric haze behind the object.
  const g = document.createElement('canvas'); g.width = g.height = 256;
  const ctx = g.getContext('2d'), grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(46,230,255,0.06)'); grad.addColorStop(0.45, 'rgba(46,170,200,0.015)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  haze.position.z = -2.2; scene.add(haze);

  const model = window.buildAutomationCore(THREE);
  const holder = new THREE.Group(); holder.add(model.group); scene.add(holder);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.22, 1.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, mobileMQ.matches ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);
  renderer.compile(scene, camera);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const bump = (x, c, w) => Math.exp(-Math.pow((x - c) / w, 2));
  const chapters = ['#about', '#services', '#work'].map((s) => document.querySelector(s));
  const cta = document.getElementById('contact');

  // Pointer parallax (desktop only, very subtle).
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !reduced) { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; } }, { passive: true });

  let pulseTarget = 0, pulse = 0;
  window.addEventListener('core:pulse', () => { if (!reduced) pulseTarget = 1; });

  const st = { x: 0, y: -3, scale: 0.6, rotY: 0, rotX: 0, vis: 0 }; // smoothed state
  let last = performance.now(), time = 0;

  function frame(now) {
    const dt = Math.min(0.3, (now - last) / 1000); last = now; if (!reduced) time += dt;
    const vh = window.innerHeight;

    // Scroll progress across the three chapters: 0 → 3.
    let s = 0;
    chapters.forEach((el) => { const r = el.getBoundingClientRect(); s += clamp((vh * 0.5 - r.top) / r.height, 0, 1); });
    const enter = smooth(0, 1, (vh - chapters[0].getBoundingClientRect().top) / (vh * 0.9));
    const exit = smooth(0, 1, (vh * 0.95 - cta.getBoundingClientRect().top) / (vh * 0.55));
    const vis = enter * (1 - exit);

    const mobile = mobileMQ.matches;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * DIST, hw = (h * camera.aspect) / 2;
    const side = 1 - 2 * smooth(0.78, 1.22, s) + 2 * smooth(1.78, 2.22, s); // right, left, right
    const sectionScale = 1 - 0.14 * smooth(0.78, 1.22, s) + 0.09 * smooth(1.78, 2.22, s);
    const dip = 1 - 0.14 * (bump(s, 1, 0.2) + bump(s, 2, 0.2)); // pulls back while crossing sides
    const base = mobile ? (Math.min(h, hw * 2) * 0.5) / 2.4 : (h * 0.56) / 2.4;

    const tx = mobile ? 0 : side * Math.min(hw * 0.54, hw - 1.5) + mouse.x * 0.15;
    const ty = (mobile ? h * 0.2 : 0) - (1 - enter) * h * 0.55 + exit * h * 0.12 - mouse.y * 0.1;
    const tScale = base * sectionScale * dip * (0.7 + 0.3 * enter) * (1 - 0.45 * exit);
    const tRotY = s * Math.PI * 1.15 + mouse.x * 0.25;
    const tRotX = 0.12 * Math.sin(s * Math.PI) + mouse.y * 0.15;

    // Inertia: ease every property toward its target.
    const k = 1 - Math.exp(-dt * (reduced ? 14 : 3.6));
    st.x += (tx - st.x) * k; st.y += (ty - st.y) * k; st.scale += (tScale - st.scale) * k;
    st.rotY += (tRotY - st.rotY) * k; st.rotX += (tRotX - st.rotX) * k;
    st.vis += (vis - st.vis) * (1 - Math.exp(-dt * 5));

    const opacity = clamp(st.vis * (mobile ? 0.75 : 1), 0, 1);
    canvas.style.opacity = opacity.toFixed(3);
    if (opacity < 0.003) { requestAnimationFrame(frame); return; } // nothing visible: skip the GPU work

    pulseTarget *= Math.exp(-dt * 2.4);
    pulse += (pulseTarget - pulse) * (1 - Math.exp(-dt * 12));

    holder.position.set(st.x, st.y, 0);
    holder.scale.setScalar(st.scale);
    holder.rotation.set(st.rotX, st.rotY + time * 0.06, 0);
    haze.position.set(st.x * 0.92, st.y, -2.2); haze.scale.setScalar(st.scale * 4.2);
    model.update(time, pulse);
    back.intensity = 16 + 20 * pulse;
    bloom.strength = 0.5 + 0.2 * pulse;

    composer.render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
