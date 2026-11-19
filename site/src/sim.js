// 3D network simulation. Shows each solver's saved result (from
// scripts/sim/run_solvers.py) and lets the viewer cut cables. It never runs or
// re-implements the team's algorithms; the only computation here is the
// bridge/connectivity check used to test a cut.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const BASE = import.meta.env.BASE_URL + 'data/';
const ALGOS = [
  { key: 'brute_force', label: 'Brute force', color: 0xff6b6b },
  { key: 'genetic', label: 'Genetic', color: 0x4fd1c5 },
  { key: 'greedy', label: 'Greedy', color: 0xffc72c },
];
const CUT = 0xff3355;

// ---- graph check: components + bridges for a list of [u,v] edges ----
export function analyze(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], i) => { adj[u].push([v, i]); adj[v].push([u, i]); });
  const disc = new Array(n).fill(-1), low = new Array(n).fill(0), bridges = [];
  const comp = new Array(n).fill(-1);
  let t = 0, comps = 0;
  for (let s = 0; s < n; s++) {
    if (disc[s] !== -1) continue;
    const c = comps++;
    disc[s] = low[s] = t++; comp[s] = c;
    const st = [[s, -1, 0]];
    while (st.length) {
      const top = st[st.length - 1], [u, pe] = top;
      if (top[2] < adj[u].length) {
        const [w, ei] = adj[u][top[2]++];
        if (ei === pe) continue;
        if (disc[w] === -1) { disc[w] = low[w] = t++; comp[w] = c; st.push([w, ei, 0]); }
        else low[u] = Math.min(low[u], disc[w]);
      } else {
        st.pop();
        if (st.length) { const p = st[st.length - 1][0]; low[p] = Math.min(low[p], low[u]); if (low[u] > disc[p]) bridges.push(pe); }
      }
    }
  }
  return { comps, comp, bridges };
}

const fmt = (x, d = 2) => (x == null ? '—' : Number(x).toLocaleString(undefined, { maximumFractionDigits: d }));

export async function initSim(root) {
  root.innerHTML = `
    <canvas class="sim-canvas"></canvas>
    <div class="sim-ui top">
      <label class="sim-select"><span>Network</span><select data-net></select></label>
      <div class="sim-tabs" data-tabs></div>
    </div>
    <div class="sim-ui panel" data-panelwrap>
      <button class="sim-min" data-min title="Minimize panel" aria-label="Minimize panel">–</button>
      <div data-panel></div>
    </div>
    <div class="sim-ui bottom">
      <span class="sim-hint" data-hint>Click a cable to cut it · drag to orbit · scroll to zoom</span>
      <button class="sim-btn" data-reset>Restore cables</button>
      <button class="sim-btn" data-cands>Show all candidate links</button>
      <button class="sim-btn" data-hideui title="Hide overlays (H)">Hide overlays</button>
    </div>
    <div class="sim-note" data-note></div>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('.sim-canvas');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0814, 0.0022);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.47; controls.autoRotate = true; controls.autoRotateSpeed = 0.4;
  controls.addEventListener('start', () => (controls.autoRotate = false));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene.add(new THREE.HemisphereLight(0xcfc4ff, 0x1a1430, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun); scene.add(sun.target);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 0.35);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const world = new THREE.Group(); scene.add(world);
  let state = null, candMat = null;

  const resize = () => {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h); candMat?.resolution.set(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(root);

  const index = await fetch(BASE + 'index.json').then((r) => r.json());
  const sel = $('[data-net]');
  sel.innerHTML = index.runs.map((r) => `<option value="${r.name}">${r.name.replace(/_/g, ' ')} · ${r.n} nodes${r.geo ? '' : ' (schematic)'}</option>`).join('');
  sel.addEventListener('change', () => load(sel.value));

  const tabs = $('[data-tabs]');
  tabs.innerHTML = ALGOS.map((a) => `<button class="sim-tab" data-algo="${a.key}" style="--c:#${a.color.toString(16).padStart(6, '0')}">${a.label}</button>`).join('');
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-algo]'); if (b && !b.disabled) showAlgo(b.dataset.algo); });
  const wrap = $('[data-panelwrap]');
  $('[data-min]').addEventListener('click', () => { const m = wrap.classList.toggle('min'); $('[data-min]').textContent = m ? '+' : '–'; $('[data-min]').title = m ? 'Expand panel' : 'Minimize panel'; });
  const toggleUI = () => { const h = root.classList.toggle('ui-hidden'); $('[data-hideui]').textContent = h ? 'Show overlays' : 'Hide overlays'; };
  $('[data-hideui]').addEventListener('click', toggleUI);
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'h' && visible) toggleUI(); });
  $('[data-reset]').addEventListener('click', () => { if (state) { state.cut.clear(); refresh(); } });
  $('[data-cands]').addEventListener('click', (e) => { if (!state) return; state.showCands = !state.showCands; e.target.classList.toggle('on', state.showCands); state.candGroup.visible = state.showCands; });

  async function load(name) {
    const doc = await fetch(BASE + 'runs/' + name + '.json').then((r) => r.json());
    world.clear();
    const n = doc.n;
    // positions: real (metres) if present, otherwise a circle (schematic)
    let pos;
    if (doc.nodes) pos = doc.nodes.map((p) => new THREE.Vector3(p.x, 0, -p.y));
    else {
      const R = 60 + n * 6;
      pos = Array.from({ length: n }, (_, i) => new THREE.Vector3(R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), 0, R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)));
    }
    const box = new THREE.Box3().setFromPoints(pos); const size = box.getSize(new THREE.Vector3()); const span = Math.max(size.x, size.z, 80);
    const center = box.getCenter(new THREE.Vector3());
    world.position.set(-center.x, 0, -center.z);

    // ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(span * 1.6, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1f2a22, roughness: 1 }));
    ground.position.set(center.x, -0.05, center.z); ground.receiveShadow = true; world.add(ground);
    const grid = new THREE.GridHelper(span * 3.2, 48, 0x3b4a3e, 0x2a3530); grid.position.copy(center); grid.material.transparent = true; grid.material.opacity = 0.35; world.add(grid);
    const sh = sun.shadow.camera, ext = span * 1.2; sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.far = span * 6; sh.updateProjectionMatrix();
    sun.position.set(span * 0.8, span * 1.6, span * 0.5); sun.target.position.set(0, 0, 0);

    // buildings / nodes
    const nodeMats = [], nodeMeshes = [];
    pos.forEach((p, i) => {
      const meta = doc.nodes?.[i];
      const h = meta?.height ?? span * 0.06 + 6;
      let geo;
      if (meta?.footprint?.length > 2) {
        const shape = new THREE.Shape(meta.footprint.map(([x, y]) => new THREE.Vector2(x - meta.x, y - meta.y)));
        geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
      } else { const w = span * 0.035 + 4; geo = new THREE.BoxGeometry(w, h, w); geo.translate(0, h / 2, 0); }
      const mat = new THREE.MeshStandardMaterial({ color: 0xd8cfc2, map: facadeTexture(), roughness: 0.85, emissive: 0x6b3fd4, emissiveIntensity: 0.0 });
      geo.computeBoundingBox(); const bb = geo.boundingBox;
      mat.map = mat.map.clone(); mat.map.needsUpdate = true;
      mat.map.repeat.set(Math.max(1, Math.round((bb.max.x - bb.min.x) / 6)), Math.max(1, Math.round(h / 4)));
      const m = new THREE.Mesh(geo, [mat, new THREE.MeshStandardMaterial({ color: 0x8f8a83, roughness: 0.9 })]);
      if (geo.groups.length === 0) m.material = mat;
      else if (geo.type === 'BoxGeometry') m.material = [mat, mat, new THREE.MeshStandardMaterial({ color: 0x6f6a66, roughness: 0.9 }), mat, mat, mat];
      m.castShadow = true; m.receiveShadow = true; m.position.copy(p); world.add(m);
      nodeMats.push(mat); nodeMeshes.push(m);
      const label = makeLabel(meta?.name ?? String(i), span); label.position.set(p.x, h + span * 0.03 + 4, p.z); world.add(label);
    });

    // candidate links (faint)
    const candGroup = new THREE.Group(); candGroup.visible = false;
    const cg = new LineSegmentsGeometry().setPositions(doc.links.flatMap(([u, v]) => [pos[u].x, 1.5, pos[u].z, pos[v].x, 1.5, pos[v].z]));
    const lm = new LineMaterial({ color: 0xc9b8ff, linewidth: 3, transparent: true, opacity: 0.75, dashed: true, dashSize: span * 0.02, gapSize: span * 0.012, worldUnits: false });
    lm.resolution.set(root.clientWidth, root.clientHeight);
    const cl = new LineSegments2(cg, lm); cl.computeLineDistances(); candGroup.add(cl); candMat = lm;
    world.add(candGroup);

    const cableGroup = new THREE.Group(); world.add(cableGroup);
    state = { doc, n, pos, span, nodeMats, nodeMeshes, cableGroup, candGroup, showCands: false, cut: new Set(), algo: null, cables: [] };
    $('[data-cands]').classList.remove('on');

    camera.position.set(span * 0.9, span * 0.75, span * 1.1); controls.target.set(0, 0, 0); controls.update();
    controls.autoRotate = true;
    $('[data-note]').textContent = doc.nodes ? `Positions: ${doc.nodes.length} buildings, real coordinates.` : 'Schematic layout: this test file has no coordinates, so nodes are placed on a circle.';

    ALGOS.forEach((a) => {
      const b = tabs.querySelector(`[data-algo="${a.key}"]`); const r = doc.results[a.key];
      b.disabled = !(r && r.status === 'ok'); b.title = r?.status ?? 'no result';
    });
    const first = ALGOS.find((a) => doc.results[a.key]?.status === 'ok');
    showAlgo(first ? first.key : null);
  }

  function showAlgo(key) {
    const s = state; s.algo = key; s.cut.clear();
    tabs.querySelectorAll('[data-algo]').forEach((b) => b.classList.toggle('active', b.dataset.algo === key));
    s.cableGroup.clear(); s.cables = [];
    const r = key && s.doc.results[key];
    if (r) {
      const color = ALGOS.find((a) => a.key === key).color;
      r.chosen.forEach(([u, v], i) => {
        const a = s.pos[u].clone().setY(3), b = s.pos[v].clone().setY(3);
        const len = a.distanceTo(b), rad = s.span * 0.006 + 0.6;
        const geo = new THREE.CylinderGeometry(rad, rad, len, 10, 1); geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat); mesh.position.copy(a).lerp(b, 0.5); mesh.lookAt(b);
        mesh.userData = { i, u, v, baseColor: color };
        // fat invisible hit target for easy clicking
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(rad * 5, rad * 5, len, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.copy(mesh.position); hit.quaternion.copy(mesh.quaternion); hit.userData = mesh.userData;
        s.cableGroup.add(mesh, hit); s.cables.push({ mesh, hit, mat });
      });
    }
    refresh();
  }

  function refresh() {
    const s = state, r = s.algo && s.doc.results[s.algo];
    const edges = r ? r.chosen : [];
    const live = edges.filter((_, i) => !s.cut.has(i));
    const an = analyze(s.n, live);
    const bridgeSet = new Set(an.bridges.map((k) => live[k].join('-')));
    // main component = the one containing the most nodes
    const counts = {}; an.comp.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    const main = +Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    s.nodeMats.forEach((m, i) => { const lost = an.comps > 1 && an.comp[i] !== main; m.emissive.setHex(lost ? CUT : 0x000000); m.emissiveIntensity = lost ? 0.8 : 0; });
    s.cables.forEach(({ mesh, mat }, i) => {
      const isCut = s.cut.has(i), isBridge = !isCut && bridgeSet.has(edges[i].join('-'));
      mat.color.setHex(isCut ? 0x331018 : mesh.userData.baseColor);
      mat.emissive.setHex(isCut ? 0x220008 : isBridge ? CUT : mesh.userData.baseColor);
      mat.emissiveIntensity = isCut ? 0.2 : isBridge ? 1.4 : 0.9;
      mat.transparent = isCut; mat.opacity = isCut ? 0.35 : 1;
    });
    renderPanel(r, an, live);
  }

  function renderPanel(r, an, live) {
    const s = state, panel = $('[data-panel]');
    if (!r) { panel.innerHTML = '<b>No solver results for this network.</b>'; return; }
    const ok = an.comps === 1 && an.bridges.length === 0;
    const cutTxt = s.cut.size
      ? (an.comps > 1 ? `<p class="bad">✗ Network split into ${an.comps} pieces after ${s.cut.size} cut${s.cut.size > 1 ? 's' : ''}.</p>` : `<p class="good">✓ Still connected after ${s.cut.size} cut${s.cut.size > 1 ? 's' : ''}.</p>`)
      : '';
    panel.innerHTML = `
      <div class="sim-algo">${ALGOS.find((a) => a.key === s.algo).label}</div>
      <dl>
        <dt>Total cost</dt><dd>${s.doc.cost_unit === 'USD' ? '$' + fmt(r.total_cost, 0) : fmt(r.total_cost)}</dd>
        <dt>Cables used</dt><dd>${r.chosen.length}</dd>
        <dt>Solver time</dt><dd>${fmt(r.time_us, 1)} µs</dd>
        <dt>Survives any 1 cut?</dt><dd class="${r.survivable ? 'good' : 'bad'}">${r.survivable ? 'Yes' : `No · ${r.bridges.length} bridge${r.bridges.length === 1 ? '' : 's'}`}</dd>
      </dl>
      ${cutTxt}
      ${s.cut.size === 0 && !ok ? '<p class="bad">Red glowing cables are bridges: cutting one splits the network.</p>' : ''}
      <p class="sim-fine">Cost and cables are this solver's saved output. Survivability is re-checked independently.</p>`;
  }

  // picking
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener('pointerup', (e) => {
    if (!state || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const rect = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(state.cables.map((c) => c.hit))[0];
    if (!hit) return;
    const i = hit.object.userData.i;
    state.cut.has(i) ? state.cut.delete(i) : state.cut.add(i);
    controls.autoRotate = false;
    refresh();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    canvas.style.cursor = ray.intersectObjects(state.cables.map((c) => c.hit)).length ? 'pointer' : 'grab';
  });

  // render only while visible
  let visible = false;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(root);
  const loop = () => { requestAnimationFrame(loop); if (!visible) return; controls.update(); composer.render(); };
  resize(); loop();
  if (index.runs.length) await load(index.runs[0].name);
}

function makeLabel(text, span) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  const fs = 44; ctx.font = `600 ${fs}px Inter, sans-serif`;
  c.width = Math.ceil(ctx.measureText(text).width) + 24; c.height = fs + 20;
  ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillStyle = 'rgba(10,8,20,.7)'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f1eef8'; ctx.textBaseline = 'middle'; ctx.fillText(text, 12, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  const k = (span * 0.035 + 3) / c.height; sp.scale.set(c.width * k, c.height * k, 1);
  return sp;
}

let _facade;
function facadeTexture() {
  if (_facade) return _facade;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#c9b9a4'; g.fillRect(0, 0, 64, 64);            // brick/stone tone
  g.fillStyle = 'rgba(120,80,60,.25)'; for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 1);
  g.fillStyle = '#2b3442'; g.fillRect(14, 16, 36, 30);            // window
  g.fillStyle = 'rgba(255,220,150,.55)'; g.fillRect(16, 18, 15, 26); // lit pane
  g.fillStyle = '#9aa6b5'; g.fillRect(31, 16, 2, 30);
  _facade = new THREE.CanvasTexture(c); _facade.wrapS = _facade.wrapT = THREE.RepeatWrapping; _facade.colorSpace = THREE.SRGBColorSpace;
  return _facade;
}
