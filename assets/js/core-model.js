/*
 * Automation Core: procedural 3D model, "precision instrument" edition.
 * A glowing core in a clear glass sphere, a stack of frosted-glass circuit plates, a fine-pitch
 * ring gear meshing with two polished pinions, and a pinned titanium gimbal with emissive inlays.
 * Real geometry throughout (no textures). Used live by the site and by tools/export-glb.mjs.
 *
 * window.buildAutomationCore(THREE, { forExport }) → { group, update(timeSec, pulse01) }
 */
(function (root) {
  function buildAutomationCore(THREE, opts) {
    opts = opts || {};
    const forExport = !!opts.forExport;
    const TAU = Math.PI * 2;

    let seed = 2024;
    const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    const group = new THREE.Group(); group.name = 'AutomationCore';
    const rig = new THREE.Group(); rig.name = 'Rig'; rig.scale.setScalar(0.83); group.add(rig); // fits a ~1.2 radius

    // ---------- Materials ----------
    const titanium = new THREE.MeshPhysicalMaterial({ name: 'BrushedTitanium', color: 0x6a737d, metalness: 1, roughness: 0.27, clearcoat: 0.3, clearcoatRoughness: 0.2 });
    const graphite = new THREE.MeshPhysicalMaterial({ name: 'GraphiteSteel', color: 0x2a3037, metalness: 1, roughness: 0.33, clearcoat: 0.35, clearcoatRoughness: 0.2 });
    const chrome = new THREE.MeshPhysicalMaterial({ name: 'PolishedChrome', color: 0xc9d1d8, metalness: 1, roughness: 0.12 });
    // Frosted glass without real-time refraction: refraction through the plates blurred the HDR core
    // into a blown-out disc from top-down angles. A satin translucent finish reads the same and stays crisp.
    const frosted = new THREE.MeshPhysicalMaterial({
      name: 'FrostedGlass', color: 0xbfe9f5, metalness: 0, roughness: 0.38, transparent: true, opacity: 0.26, depthWrite: false,
      clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.6, side: THREE.DoubleSide,
    });
    const clearGlass = new THREE.MeshPhysicalMaterial({
      name: 'ClearGlass', color: 0xcff6ff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 0.7,
    });

    const pathUniforms = { uTime: { value: 0 }, uPulse: { value: 0 }, uColor: { value: new THREE.Color(0x2ee6ff) } };
    const lightPath = forExport
      ? new THREE.MeshStandardMaterial({ name: 'LightPath', color: 0x081418, emissive: 0x2ee6ff, emissiveIntensity: 2.4, roughness: 0.4 })
      : new THREE.ShaderMaterial({
          name: 'LightPath', uniforms: pathUniforms, toneMapped: false,
          vertexShader: 'attribute float aOffset; varying vec2 vUv; varying float vOff; void main(){ vUv = uv; vOff = aOffset; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: [
            'uniform float uTime; uniform float uPulse; uniform vec3 uColor; varying vec2 vUv; varying float vOff;',
            'void main(){',
            '  float head = fract(vUv.x - uTime * 0.16 + vOff);',
            '  float streak = exp(-pow((head - 0.5) * 7.0, 2.0));',
            '  float b = 0.28 + 1.9 * streak + 1.3 * uPulse;',
            '  gl_FragColor = vec4(uColor * b, 1.0);',
            '}',
          ].join('\n'),
        });
    const nodeMat = new THREE.MeshBasicMaterial({ name: 'NodeLight', color: new THREE.Color(0.7, 1.7, 1.9), toneMapped: false });
    const coreMat = forExport
      ? new THREE.MeshStandardMaterial({ name: 'CoreLight', color: 0xffffff, emissive: 0xd9fbff, emissiveIntensity: 3 })
      : new THREE.MeshBasicMaterial({ name: 'CoreLight', color: new THREE.Color(1.25, 1.65, 1.75), toneMapped: false });

    // ---------- Helpers ----------
    const withOffset = (geo, o) => { geo.setAttribute('aOffset', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(o), 1)); return geo; };
    const glow = (geo, o) => { const m = new THREE.Mesh(withOffset(geo, o), lightPath); m.name = 'LightPath'; return m; };
    const tube = (pts, r, o) => glow(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.02), Math.max(32, pts.length * 8), r, 6, false), o);
    // Flat machined ring (washer) lying in the XZ plane, rectangular section with chamfered edges.
    function washer(r, w, h, mat, seg) {
      const c = Math.min(w, h) * 0.22, a = r - w / 2, b = r + w / 2, y = h / 2;
      const prof = [[a + c, -y], [b - c, -y], [b, -y + c], [b, y - c], [b - c, y], [a + c, y], [a, y - c], [a, -y + c], [a + c, -y]].map(([x, z]) => new THREE.Vector2(x, z));
      const geo = new THREE.LatheGeometry(prof, seg || 220); geo.computeVertexNormals();
      return new THREE.Mesh(geo, mat);
    }
    function gearShape(teeth, rOuter, depth, rHole, holes) {
      const rRoot = rOuter - depth, s = new THREE.Shape(), step = TAU / teeth;
      for (let i = 0; i < teeth; i++) {
        const a = i * step;
        [[rRoot, a], [rRoot, a + step * 0.2], [rOuter, a + step * 0.34], [rOuter, a + step * 0.56], [rRoot, a + step * 0.7], [rRoot, a + step]]
          .forEach(([r, t], k) => { const x = Math.cos(t) * r, y = Math.sin(t) * r; (i === 0 && k === 0) ? s.moveTo(x, y) : s.lineTo(x, y); });
      }
      const hole = new THREE.Path(); hole.absarc(0, 0, rHole, 0, TAU, true); s.holes.push(hole);
      if (holes) {
        const web = (rHole + rRoot) / 2, hr = (rRoot - rHole) * 0.3;
        for (let i = 0; i < holes; i++) { const t = (i / holes) * TAU, p = new THREE.Path(); p.absarc(Math.cos(t) * web, Math.sin(t) * web, hr, 0, TAU, true); s.holes.push(p); }
      }
      return s;
    }
    function gear(teeth, rOuter, depth, thick, rHole, holes, mat) {
      const geo = new THREE.ExtrudeGeometry(gearShape(teeth, rOuter, depth, rHole, holes), { depth: thick, curveSegments: 24, bevelEnabled: true, bevelThickness: thick * 0.12, bevelSize: Math.min(depth * 0.18, thick * 0.1), bevelSegments: 2 });
      geo.translate(0, 0, -thick / 2); geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
      return new THREE.Mesh(geo, mat);
    }
    const ringOn = (r, tubeR, mat, seg) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tubeR, 10, seg || 200), mat); m.rotation.x = Math.PI / 2; return m; };
    const nodeBead = (r) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), nodeMat)); const collar = new THREE.Mesh(new THREE.TorusGeometry(r * 1.35, r * 0.28, 8, 28), chrome); g.add(collar); return g; };

    // ---------- 1. Core + clear glass sphere + axis ----------
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 4), coreMat); core.name = 'Core'; rig.add(core);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 64, 48), clearGlass); shell.name = 'GlassSphere'; rig.add(shell);
    const filigree = new THREE.Group(); filigree.name = 'Filigree'; rig.add(filigree);
    [[0.3, 0, 0.2], [1.2, 0.6, -0.4], [-0.9, 1.4, 0.7]].forEach(([rx, ry, rz], i) => {
      const arc = glow(new THREE.TorusGeometry(0.405, 0.0022, 6, 160, TAU * (0.55 + i * 0.1)), rand());
      arc.rotation.set(rx, ry, rz); filigree.add(arc);
    });
    const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 2.84, 20), chrome); axis.name = 'Axis'; rig.add(axis);
    [-1, 1].forEach((s) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 32, 24), chrome); cap.position.y = s * 1.46; rig.add(cap);
      const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.06, 32), graphite); bearing.position.y = s * 1.38; rig.add(bearing);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 28), titanium); collar.position.y = s * 0.47; rig.add(collar);
    });

    // ---------- 2. Frosted-glass circuit plate stack ----------
    const plates = new THREE.Group(); plates.name = 'CircuitPlates'; rig.add(plates);
    [[-0.12, 0.72], [0, 0.82], [0.12, 0.72]].forEach(([y, rOut], i) => {
      const rIn = 0.46, sh = new THREE.Shape(); sh.absarc(0, 0, rOut, 0, TAU, false);
      const h = new THREE.Path(); h.absarc(0, 0, rIn, 0, TAU, true); sh.holes.push(h);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.016, curveSegments: 96, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
      geo.translate(0, 0, -0.008); geo.rotateX(-Math.PI / 2);
      const plate = new THREE.Mesh(geo, frosted); plate.position.y = y; plate.name = 'GlassPlate_' + i; plates.add(plate);
      const rim = ringOn(rOut + 0.004, 0.0065, chrome); rim.position.y = y; plates.add(rim);
      const inner = ringOn(rIn - 0.002, 0.008, graphite); inner.position.y = y; plates.add(inner);
      // Circuit traces: radial run → arc → 45° jog → pad.
      const ty = y + 0.0125, n = i === 1 ? 10 : 7;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * TAU + rand() * 0.3, span = 0.18 + rand() * 0.42, r1 = rIn + 0.06 + rand() * 0.12, r2 = rOut - 0.05 - rand() * 0.08;
        const P = (r, a) => new THREE.Vector3(Math.cos(a) * r, ty, Math.sin(a) * r), pts = [P(rIn + 0.02, a0), P(r1, a0)];
        for (let s = 1; s <= 10; s++) pts.push(P(r1, a0 + (span * s) / 10));
        pts.push(P(r1 + (r2 - r1) * 0.35, a0 + span + 0.05), P(r2, a0 + span + 0.05));
        plates.add(tube(pts, 0.0024, rand()));
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), nodeMat); pad.position.copy(pts[pts.length - 1]); plates.add(pad);
      }
    });
    // Light spokes from the glass sphere to the plates.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.26, P = (r) => new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      plates.add(tube([P(0.405), P(0.43), P(0.465)], 0.0035, k / 6));
    }

    // ---------- 3. Fine-pitch ring gear + two meshing pinions ----------
    const drive = new THREE.Group(); drive.name = 'GearTrain'; rig.add(drive);
    const RING_T = 128, PIN_T = 18, DEPTH = 0.022, RING_OUT = 0.96;
    const ringPitch = RING_OUT - DEPTH / 2, toothPitch = (TAU * ringPitch) / RING_T, pinPitch = (PIN_T * toothPitch) / TAU;
    const ringGear = gear(RING_T, RING_OUT, DEPTH, 0.05, 0.875, 0, graphite); ringGear.name = 'RingGear'; drive.add(ringGear);
    const ringBand = washer(0.885, 0.026, 0.04, titanium); drive.add(ringBand); // inner bearing race
    const pinions = [];
    [0.55, 0.55 + Math.PI * 0.94].forEach((ang, i) => {
      const p = new THREE.Group(); p.name = 'Pinion_' + i;
      const g = gear(PIN_T, pinPitch + DEPTH / 2, DEPTH, 0.046, 0.028, 5, chrome);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 32), titanium);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 12, 0, TAU, 0, Math.PI / 2), chrome); dome.position.y = 0.04;
      p.add(g, hub, dome);
      p.position.set(Math.cos(ang) * (ringPitch + pinPitch), 0, Math.sin(ang) * (ringPitch + pinPitch));
      p.userData.phase = Math.PI / PIN_T + ang * (RING_T / PIN_T); // keep teeth interleaved
      drive.add(p); pinions.push(p);
    });

    // ---------- 4. Pinned titanium gimbal with emissive inlays ----------
    const gimbalOuter = new THREE.Group(); gimbalOuter.name = 'GimbalOuter'; rig.add(gimbalOuter);
    const ringB = washer(1.42, 0.085, 0.03, titanium); ringB.rotation.x = Math.PI / 2; ringB.name = 'GimbalRingOuter'; gimbalOuter.add(ringB);
    [-1, 1].forEach((s) => { const inlay = glow(new THREE.TorusGeometry(1.42, 0.0042, 6, 240), 0.25 + s * 0.2); inlay.position.z = s * 0.0165; gimbalOuter.add(inlay); });
    const gimbalInner = new THREE.Group(); gimbalInner.name = 'GimbalInner'; gimbalOuter.add(gimbalInner);
    const ringA = washer(1.3, 0.075, 0.026, graphite); ringA.name = 'GimbalRingInner'; gimbalInner.add(ringA);
    [-1, 1].forEach((s) => { const inlay = glow(new THREE.TorusGeometry(1.3, 0.004, 6, 240), 0.6 + s * 0.15); inlay.rotation.x = Math.PI / 2; inlay.position.y = s * 0.0145; gimbalInner.add(inlay); });
    [-1, 1].forEach((s) => { // pivot pins joining inner ring to outer ring along X
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 20), chrome); pin.rotation.z = Math.PI / 2; pin.position.x = s * 1.36; gimbalInner.add(pin);
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 28), graphite); boss.rotation.z = Math.PI / 2; boss.position.x = s * 1.41; gimbalOuter.add(boss);
    });
    // Node beads on the gimbal.
    [[0, 1], [Math.PI, 1], [Math.PI / 2, 1]].forEach(([a]) => { const b = nodeBead(0.024); b.position.set(Math.cos(a + 0.8) * 1.42, Math.sin(a + 0.8) * 1.42, 0); gimbalOuter.add(b); });
    [0.9, 2.6, 4.4].forEach((a) => { const b = nodeBead(0.02); b.position.set(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3); gimbalInner.add(b); });

    // Three-quarter presentation angle.
    group.rotation.set(0.58, 0, -0.14);

    function update(t, pulse) {
      pathUniforms.uTime.value = t; pathUniforms.uPulse.value = pulse || 0;
      const w = 0.12;
      ringGear.rotation.y = t * w;
      pinions.forEach((p) => (p.rotation.y = -t * w * (RING_T / PIN_T) + p.userData.phase));
      plates.rotation.y = -t * 0.04;
      filigree.rotation.y = t * 0.1;
      gimbalOuter.rotation.y = t * 0.08;
      gimbalInner.rotation.x = 0.62 + Math.sin(t * 0.32) * 0.22;
      ringA.rotation.y = t * 0.15;
      const k = 1 + (pulse || 0) * 0.5 + Math.sin(t * 1.2) * 0.05;
      if (!forExport) coreMat.color.setRGB(1.25 * k, 1.65 * k, 1.75 * k);
      core.scale.setScalar(1 + Math.sin(t * 1.2) * 0.025);
    }
    update(0, 0);
    return { group, update, uniforms: pathUniforms };
  }
  root.buildAutomationCore = buildAutomationCore;
  if (typeof module !== 'undefined') module.exports = buildAutomationCore;
})(typeof window !== 'undefined' ? window : globalThis);
