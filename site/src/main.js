import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import QRCode from 'qrcode';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

const REPO = 'https://github.com/neelp06/survivable-network-design-ttu';
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent?.appendChild(e);
  return e;
};

// ---------- QR codes ----------
document.querySelectorAll('[data-qr]').forEach((c) =>
  QRCode.toCanvas(c, REPO, { margin: 1, width: c.classList.contains('big') ? 400 : 168, color: { dark: '#0a0814', light: '#ffffff' } })
);

// ---------- navigation: dots, counter, progress, keyboard ----------
const slides = [...document.querySelectorAll('.slide')];
const dots = document.getElementById('dots');
const counter = document.getElementById('counter');
const pad = (n) => String(n).padStart(2, '0');
slides.forEach((s) => {
  const a = document.createElement('a');
  a.href = '#' + s.id;
  a.innerHTML = `<span>${s.dataset.title}</span>`;
  a.setAttribute('aria-label', s.dataset.title);
  dots.appendChild(a);
});
let current = 0;
const setCurrent = (i) => {
  current = i;
  [...dots.children].forEach((d, k) => d.classList.toggle('active', k === i));
  counter.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
  document.body.dataset.accent = slides[i].dataset.accent || '';
};
slides.forEach((s, i) =>
  ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && setCurrent(i) })
);
setCurrent(0);
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => (document.getElementById('progress').style.width = self.progress * 100 + '%') });

const go = (i) => slides[Math.max(0, Math.min(slides.length - 1, i))].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(current + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(slides.length - 1);
  else if (e.key.toLowerCase() === 'p') togglePresent();
  else if (e.key.toLowerCase() === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
});
const togglePresent = () => document.documentElement.classList.toggle('present');
document.getElementById('modeBtn').addEventListener('click', togglePresent);

// ---------- reveal transitions ----------
if (!reduced) {
  slides.forEach((s) => {
    const items = s.querySelectorAll('.reveal');
    gsap.to(items, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: s, start: 'top 70%', toggleActions: 'play none none reverse' },
    });
  });
  gsap.to('.hero-net', { yPercent: 18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '#title', start: 'top top', end: 'bottom top', scrub: true } });
}

// ---------- hero: ambient network ----------
(function heroNet() {
  const svg = document.getElementById('heroNet');
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const pts = Array.from({ length: 34 }, () => ({ x: 40 + rnd() * 1120, y: 40 + rnd() * 620 }));
  const edges = [];
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
    near.forEach(({ j }) => { if (!edges.some((e) => (e[0] === j && e[1] === i))) edges.push([i, j]); });
  });
  const lines = edges.map(([a, b]) => el('line', { x1: pts[a].x, y1: pts[a].y, x2: pts[b].x, y2: pts[b].y }, svg));
  pts.forEach((p) => el('circle', { cx: p.x, cy: p.y, r: 3 + rnd() * 2.5 }, svg));
  if (reduced) return;
  gsap.from(lines, { attr: { x2: (i) => lines[i].getAttribute('x1'), y2: (i) => lines[i].getAttribute('y1') }, duration: 1.6, ease: 'power2.out', stagger: 0.02 });
  setInterval(() => {
    const l = lines[(Math.random() * lines.length) | 0];
    l.classList.add('hot');
    setTimeout(() => l.classList.remove('hot'), 1400);
  }, 450);
})();

// ---------- question: interactive square example ----------
(function squareDemo() {
  const svg = document.getElementById('squareDemo');
  const status = document.getElementById('demoStatus');
  const P = { A: [70, 60], B: [250, 60], C: [250, 200], D: [70, 200] };
  const sets = { tree: [['A', 'B'], ['B', 'C'], ['C', 'D']], ring: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']] };
  let variant = 'tree';
  const render = () => {
    svg.innerHTML = '';
    const edges = sets[variant];
    const edgeEls = edges.map(([a, b]) => {
      const g = el('g', {}, svg);
      const ln = el('line', { class: 'edge', x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1] }, g);
      const hit = el('line', { class: 'hit', x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1] }, g);
      return { a, b, ln, hit };
    });
    const nodes = {};
    for (const k in P) { nodes[k] = el('circle', { class: 'node', cx: P[k][0], cy: P[k][1], r: 22 }, svg); el('text', { x: P[k][0], y: P[k][1] }, svg).textContent = k; }
    status.className = 'demo-status';
    status.textContent = `${edges.length} cables · cost ${edges.length}. Cut any cable to test survivability.`;
    edgeEls.forEach((e) => e.hit.addEventListener('click', () => {
      edgeEls.forEach((o) => o.ln.classList.toggle('cut', o === e));
      // flood fill from A without the cut edge
      const seen = new Set(['A']), q = ['A'];
      while (q.length) { const u = q.shift(); for (const o of edgeEls) { if (o === e) continue; const w = o.a === u ? o.b : o.b === u ? o.a : null; if (w && !seen.has(w)) { seen.add(w); q.push(w); } } }
      for (const k in nodes) nodes[k].classList.toggle('lost', !seen.has(k));
      const ok = seen.size === 4;
      status.className = 'demo-status ' + (ok ? 'good' : 'bad');
      status.textContent = ok ? `✓ Cut ${e.a}–${e.b}: every office still reachable the long way around.` : `✗ Cut ${e.a}–${e.b} is a bridge: the network splits in two.`;
      if (!reduced) gsap.fromTo(e.ln, { opacity: 1 }, { opacity: 0.6, duration: 0.4 });
    }));
  };
  document.querySelectorAll('.demo-tabs .tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.demo-tabs .tab').forEach((o) => o.classList.toggle('active', o === t));
    variant = t.dataset.variant; render();
  }));
  render();
})();

// ---------- genetic: chromosome crossover illustration ----------
(function chromo() {
  const rows = document.querySelectorAll('.chromo-row');
  const A = [1,0,1,1,0,0,1,0,1,1,0,1], B = [0,1,1,0,1,0,0,1,1,0,1,0];
  const make = (row, bits) => bits.map((b) => { const d = document.createElement('div'); d.className = 'bit' + (b ? ' on' : ''); d.textContent = b; row.appendChild(d); return d; });
  make(rows[0], A);
  make(rows[1], B).forEach((d) => d.classList.add('from-b'));
  const child = make(rows[2], A.map(() => 0));
  const breed = () => {
    const mut = (Math.random() * 12) | 0;
    child.forEach((d, i) => {
      const fromB = Math.random() < 0.5;
      let v = fromB ? B[i] : A[i];
      if (i === mut) v ^= 1;
      d.textContent = v;
      d.className = 'bit' + (v ? ' on' : '') + (fromB ? ' from-b' : '') + (i === mut ? ' mut' : '');
    });
    if (!reduced) gsap.from(child, { scale: 0.6, opacity: 0, duration: 0.4, stagger: 0.03 });
  };
  ScrollTrigger.create({ trigger: '#genetic', start: 'top 60%', onEnter: breed, onEnterBack: breed });
  if (!reduced) setInterval(() => current === slides.findIndex((s) => s.id === 'genetic') && breed(), 2600);
})();

// ---------- greedy: tree then repair illustration ----------
(function greedyViz() {
  const svg = document.getElementById('greedyViz');
  const N = [[60, 60], [160, 40], [260, 70], [270, 180], [160, 220], [50, 180]];
  const tree = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
  const repair = [[5, 0]];
  const all = [...tree.map((e) => [...e, 'tree']), ...repair.map((e) => [...e, 'repair'])];
  const lines = all.map(([a, b, k]) => el('line', { x1: N[a][0], y1: N[a][1], x2: N[b][0], y2: N[b][1], stroke: k === 'tree' ? '#ff5c7a' : '#ffc72c', 'data-k': k }, svg));
  N.forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 13 }, svg));
  el('text', { x: 310, y: 252, 'text-anchor': 'end', fill: '#6b6488', 'font-family': 'JetBrains Mono', 'font-size': 10 }, svg).textContent = 'illustration only';
  const label = el('text', { x: 160, y: 140, 'text-anchor': 'middle', fill: '#a69fc0', 'font-family': 'JetBrains Mono', 'font-size': 12 }, svg);
  const tl = gsap.timeline({ paused: true, repeat: reduced ? 0 : -1, repeatDelay: 1.5 });
  const treeL = lines.filter((l) => l.dataset.k === 'tree'), repL = lines.filter((l) => l.dataset.k === 'repair');
  tl.set(lines, { opacity: 0 })
    .call(() => (label.textContent = '1 · MST: every link is a bridge'))
    .to(treeL, { opacity: 1, duration: 0.35, stagger: 0.3 })
    .call(() => (label.textContent = '2 · repair: cheapest cost per bridge covered'), null, '+=0.6')
    .to(repL[0], { opacity: 1, duration: 0.4 })
    .to(treeL, { stroke: '#9d7bff', duration: 0.5 }, '<')
    .call(() => (label.textContent = '3 · no bridges left: survivable ✓'), null, '+=0.8');
  ScrollTrigger.create({ trigger: '#greedy', start: 'top 60%', onEnter: () => tl.restart(), onEnterBack: () => tl.restart() });
})();

// ---------- 3D simulation (loaded lazily when the case study comes near) ----------
(function lazySim() {
  const slot = document.getElementById('simSlot');
  const io = new IntersectionObserver(async ([en]) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    try { (await import('./sim.js')).initSim(slot); }
    catch (err) { slot.querySelector('.sim-placeholder b').textContent = 'Simulation failed to load'; console.error(err); }
  }, { rootMargin: '600px' });
  io.observe(slot);
})();
