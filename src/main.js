// main.js — state machine + render loop.
// modes: draw -> share | watch -> digging -> done

import { encodeMessage, decodeMessage, COORD_MAX } from './codec.js';
import { simplifyRDP, buildDigPath, atLen } from './geom.js';
import { SCENE_W, SCENE_H, STRIP_H, layout, drawScene, drawHole } from './scene.js';
import { drawAnt } from './ants.js';
import { attractStrokes } from './letters.js';
import { makeFarm } from './farm.js';

const L = layout();
const canvas = document.getElementById('c');
const g = canvas.getContext('2d');

const ui = {
  hint: document.getElementById('hint'),
  overlay: document.getElementById('overlay'),
  overlayText: document.getElementById('overlay-text'),
  overlayBtn: document.getElementById('overlay-btn'),
  toolbar: document.getElementById('toolbar'),
  btnClear: document.getElementById('btn-clear'),
  btnDone: document.getElementById('btn-done'),
  sharebar: document.getElementById('sharebar'),
  shareUrl: document.getElementById('share-url'),
  btnCopy: document.getElementById('btn-copy'),
  btnReplay: document.getElementById('btn-replay'),
  btnAgain: document.getElementById('btn-again'),
  afterbar: document.getElementById('afterbar'),
  btnReplay2: document.getElementById('btn-replay2'),
  btnOwn: document.getElementById('btn-own'),
  btnSkip: document.getElementById('btn-skip'),
  shareCopied: document.getElementById('share-copied'),
  toast: document.getElementById('toast'),
};

// ---------- viewport (fixed 1200x760 logical, scaled to fit via css) ----------
let dpr = 1;
let bg = null, bgCtx = null;
const farm = makeFarm();
let dugR = null, dugRCtx = null;   // red outline layer
let dugW = null, dugWCtx = null;   // white interior layer (drawn over red)

function makeLayer() {
  const c = document.createElement('canvas');
  c.width = SCENE_W * dpr; c.height = SCENE_H * dpr;
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, ctx];
}

function rebuildLayers() {
  [bg, bgCtx] = makeLayer();
  drawScene(bgCtx, L);
  [dugR, dugRCtx] = makeLayer();
  [dugW, dugWCtx] = makeLayer();
  stampedLen = 0;
  if (digPath && frontLen > 0) stampTo(frontLen);
}

const stageWrap = document.getElementById('stage-wrap');

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = SCENE_W * dpr;
  canvas.height = SCENE_H * dpr;
  const avail = document.getElementById('app').clientWidth - 28;
  const s = Math.min(1, avail / SCENE_W);
  stageWrap.style.transform = `scale(${s})`;
  stageWrap.style.height = `${SCENE_H * s}px`;
  rebuildLayers();
}

// ---------- state ----------
let mode = 'draw';            // draw | watch | digging | done
let sharedDig = false;        // digging our own just-shared message — keep the share bar up
let rawStrokes = [];          // normalized {x:0..1023,y,dt ms}
let curStroke = null;
let drawing = false;
let lastTs = 0;
let inkWarned = false;
const MAX_RAW_POINTS = 1600;

let digPath = null;           // {pts, cum, totalLen, totalTime}
let digT = 0, frontLen = 0, stampedLen = 0;
let crumbs = [];
let tunnelAnts = [];          // wanderers roaming the dug white
let pendingRoamers = [];      // queued residents trickling in after the dig
let roamerTimer = 0;
let walkMaskLen = -1;         // frontLen the walk mask was built at
let antPhase = 0;             // leader leg phase, driven by dig progress
let idleAng = 0;              // accumulates while the front waits (pen lift)
let prevFrontW = 1;           // width at the front last frame (pen-lift edge)
let lastDugPos = null;        // last position the front was actually digging
let attracting = false;       // the "ant farm" holding-screen dig

// ---------- helpers ----------
function toast(msg, ms = 2600) {
  ui.toast.textContent = msg;
  ui.toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => ui.toast.classList.add('hidden'), ms);
}

const norm = (px, py) => ({
  x: Math.round(Math.min(COORD_MAX, Math.max(0, (px - L.dirt.x) / L.dirt.w * COORD_MAX))),
  y: Math.round(Math.min(COORD_MAX, Math.max(0, (py - L.dirt.y) / L.dirt.h * COORD_MAX))),
});
const denorm = (p) => ({
  x: L.dirt.x + p.x / COORD_MAX * L.dirt.w,
  y: L.dirt.y + p.y / COORD_MAX * L.dirt.h,
});
const strokesPx = () => rawStrokes.map(s => s.map(denorm));

function totalPoints() { return rawStrokes.reduce((n, s) => n + s.length, 0); }

function lenAtTime(path, t) {
  const { pts, cum } = path;
  if (t <= 0) return 0;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].t < t) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = pts[i - 1], b = pts[i];
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return cum[i - 1] + f * (cum[i] - cum[i - 1]);
}

// ---------- tunnel stamping ----------
function stampTo(len) {
  // red and white live on separate layers: red discs of later stamps would
  // otherwise paint over the white interior behind the dig front
  while (stampedLen < len) {
    stampedLen = Math.min(len, stampedLen + 1.6);
    const p = atLen(digPath, stampedLen);
    if (p.w < 0.1) continue;   // on-foot travel — ants above ground dig nothing
    const r = 5 + 11 * p.w;
    dugRCtx.fillStyle = '#ff2a00';
    dugRCtx.beginPath(); dugRCtx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); dugRCtx.fill();
    dugWCtx.fillStyle = '#fdf8f0';
    dugWCtx.beginPath(); dugWCtx.arc(p.x, p.y, r, 0, Math.PI * 2); dugWCtx.fill();
  }
}

function prepareDig() {
  digPath = buildDigPath(strokesPx());
  digT = 0; frontLen = 0; stampedLen = 0;
  crumbs = [];
  tunnelAnts = [];
  pendingRoamers = [];
  roamerTimer = 0;
  walkMaskLen = -1;
  antPhase = 0;
  idleAng = 0;
  prevFrontW = 1;
  lastDugPos = null;
  dugRCtx.clearRect(0, 0, SCENE_W, SCENE_H);
  dugWCtx.clearRect(0, 0, SCENE_W, SCENE_H);
}

function startDig() {
  prepareDig();
  mode = 'digging';
  show(null);
  if (sharedDig) show(ui.sharebar);
  ui.btnSkip.classList.remove('hidden');
  canvas.classList.add('watching');
  const jump = parseFloat(new URLSearchParams(location.search).get('digto'));
  if (jump > 0) {
    digT = Math.min(jump, digPath.totalTime + 1);
    frontLen = lenAtTime(digPath, digT);
    stampedLen = 0;
    stampTo(frontLen);
    crumbs = [];
  }
}

// ---------- mode / ui ----------
function show(el) {
  for (const e of [ui.overlay, ui.toolbar, ui.sharebar, ui.afterbar]) e.classList.add('hidden');
  if (el) el.classList.remove('hidden');
}

function enterDraw(msg) {
  mode = 'draw';
  attracting = false;
  sharedDig = false;
  rawStrokes = []; curStroke = null; drawing = false;
  digPath = null;
  if (dugRCtx) {
    dugRCtx.clearRect(0, 0, SCENE_W, SCENE_H);
    dugWCtx.clearRect(0, 0, SCENE_W, SCENE_H);
  }
  ui.btnDone.disabled = true;
  ui.hint.textContent = 'Draw a message in the dirt — a name, a word, anything';
  ui.btnSkip.classList.add('hidden');
  canvas.classList.remove('watching');
  show(ui.toolbar);
  if (msg) toast(msg);
}

function enterAttract() {
  attracting = true;
  rawStrokes = attractStrokes();
  ui.hint.textContent = 'The colony is warming up — hang on';
  canvas.classList.add('watching');
  startDig();
}

async function enterWatch(strokes) {
  sharedDig = false;
  rawStrokes = strokes;
  digPath = buildDigPath(strokesPx(), L.entrance);
  mode = 'watch';
  ui.overlayText.textContent = 'Someone digs you…';
  ui.overlayBtn.textContent = 'Release the Ants';
  ui.hint.textContent = '';
  canvas.classList.add('watching');
  show(ui.overlay);
}

// ---------- share ----------
async function buildShareUrl() {
  const base = location.origin + location.pathname + location.search;
  const aspect = L.dirt.w / L.dirt.h;
  for (const eps of [0.4, 1.2, 2.5, 5, 9]) {
    const strokes = rawStrokes.map(s => simplifyRDP(s, eps));
    const b64 = await encodeMessage(strokes, aspect);
    if (base.length + 3 + b64.length <= 1900) return { url: `${base}#d=${b64}`, eps };
  }
  return null;
}

// ---------- events ----------
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / r.width * SCENE_W,
    y: (e.clientY - r.top) / r.height * SCENE_H,
  };
}

const inDirt = (p) => p.y >= L.dirt.y + 4 && p.y <= L.dirt.y + L.dirt.h - 4 &&
                      p.x >= L.dirt.x + 4 && p.x <= L.dirt.x + L.dirt.w - 4;

canvas.addEventListener('pointerdown', (e) => {
  const p = toLogical(e);
  // taps on the surface poke the farm — roo hops, hoist spins
  if (p.y < L.dirt.y) { farm.tap(p.x * 576 / SCENE_W, p.y * 128 / STRIP_H); return; }
  if (mode !== 'draw') return;
  if (!inDirt(p)) return;
  canvas.setPointerCapture(e.pointerId);
  drawing = true;
  const now = performance.now();
  curStroke = [{ ...norm(p.x, p.y), dt: lastTs ? now - lastTs : 400, px: p.x, py: p.y }];
  rawStrokes.push(curStroke);
  ui.btnDone.disabled = false;
});

canvas.addEventListener('pointermove', (e) => {
  if (!drawing || mode !== 'draw') return;
  const p = toLogical(e);
  const last = curStroke[curStroke.length - 1];
  if (Math.hypot(p.x - last.px, p.y - last.py) < 4) return;
  if (totalPoints() >= MAX_RAW_POINTS) {
    if (!inkWarned) { toast("That's plenty of ink — the ants have short attention spans"); inkWarned = true; }
    return;
  }
  const now = performance.now();
  curStroke.push({ ...norm(p.x, p.y), dt: now - lastTs, px: p.x, py: p.y });
  lastTs = now;
});

const endStroke = () => {
  if (!drawing) return;
  drawing = false;
  if (curStroke && curStroke.length < 2) rawStrokes.splice(rawStrokes.indexOf(curStroke), 1);
  curStroke = null;
  lastTs = performance.now();
  ui.btnDone.disabled = rawStrokes.length === 0;
};
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

ui.btnClear.addEventListener('click', () => {
  rawStrokes = []; curStroke = null; inkWarned = false;
  ui.btnDone.disabled = true;
});

ui.btnDone.addEventListener('click', async () => {
  ui.btnDone.disabled = true;
  const res = await buildShareUrl();
  if (!res) {
    toast('That message is a novel — keep it shorter');
    ui.btnDone.disabled = false;
    return;
  }
  if (res.eps > 1) toast('Tight message — the ants smoothed a few wobbles');
  history.replaceState(null, '', res.url);
  ui.shareUrl.value = res.url;
  sharedDig = true;
  startDig();
  show(ui.sharebar);
});

function showShareCopied() {
  ui.shareCopied.classList.remove('hidden');
  clearTimeout(showShareCopied._t);
  showShareCopied._t = setTimeout(() => ui.shareCopied.classList.add('hidden'), 5000);
}
ui.shareCopied.addEventListener('click', () => {
  clearTimeout(showShareCopied._t);
  ui.shareCopied.classList.add('hidden');
});

ui.btnCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ui.shareUrl.value);
    showShareCopied();
  } catch {
    ui.shareUrl.hidden = false;
    ui.shareUrl.select();
    toast('Copy it from the box');
  }
});

ui.btnReplay.addEventListener('click', startDig);
ui.btnAgain.addEventListener('click', () => {
  history.replaceState(null, '', location.pathname + location.search);
  enterDraw();
});
ui.btnReplay2.addEventListener('click', startDig);
ui.btnOwn.addEventListener('click', () => {
  history.replaceState(null, '', location.pathname + location.search);
  enterDraw();
});
function releaseAnts() {
  if (mode !== 'watch') return;
  startDig();
}
ui.overlayBtn.addEventListener('click', releaseAnts);
// skip = slam through to the finished dig, roamers and all
ui.btnSkip.addEventListener('click', () => {
  if (mode === 'digging' && digPath) digT = digPath.totalTime + 0.5;
});

// ---------- critters ----------
// wanderers roam anywhere inside the dug white, bounded by the red outline
let walkMask = null;

function buildWalkMask() {
  const m = document.createElement('canvas');
  m.width = SCENE_W; m.height = SCENE_H;
  const mc = m.getContext('2d', { willReadFrequently: true });
  mc.drawImage(dugW, 0, 0, SCENE_W, SCENE_H);
  walkMask = mc.getImageData(0, 0, SCENE_W, SCENE_H).data;
}

function insideTunnel(x, y, pad = 0) {
  if (!walkMask) return false;
  const hit = (px, py) => {
    const xi = px | 0, yi = py | 0;
    return xi >= 0 && yi >= 0 && xi < SCENE_W && yi < SCENE_H &&
           walkMask[(yi * SCENE_W + xi) * 4 + 3] > 100;
  };
  if (!hit(x, y)) return false;
  if (!pad) return true;
  return hit(x + pad, y) && hit(x - pad, y) && hit(x, y + pad) && hit(x, y - pad);
}

const mkRoamer = (x, y) => ({
  x, y, ang: Math.random() * Math.PI * 2,
  speed: 30 + Math.random() * 35, phase: Math.random() * 9,
  turn: Math.random() < 0.5 ? 1 : -1,
});

function spawnTunnelAnts(n) {
  const ants = [];
  let tries = 0;
  while (ants.length < n && tries++ < 800) {
    const x = 20 + Math.random() * (SCENE_W - 40);
    const y = L.dirt.y + Math.random() * L.dirt.h;
    if (insideTunnel(x, y, 8)) ants.push(mkRoamer(x, y));
  }
  return ants;
}

function updateTunnelAnts(dt) {
  roamerTimer += dt;
  if (pendingRoamers.length && roamerTimer > 0.14) {
    const p = pendingRoamers.shift();
    tunnelAnts.push(mkRoamer(p.x, p.y));
    roamerTimer = 0;
  }
  for (const a of tunnelAnts) {
    a.phase += dt * 10;
    a.ang += (Math.random() - 0.5) * 2.5 * dt;
    const px = a.x + Math.cos(a.ang) * 7, py = a.y + Math.sin(a.ang) * 7;
    if (insideTunnel(px, py, 6)) {
      a.x += Math.cos(a.ang) * a.speed * dt;
      a.y += Math.sin(a.ang) * a.speed * dt;
    } else {
      // wall ahead — turn along it
      a.ang += a.turn * 5 * dt;
      if (Math.random() < dt * 0.3) a.turn *= -1;
    }
  }
}

// ---------- day / night ----------
// the farm runs its own sky + lighting; we just feed it the hour of day
const CYCLE_S = 150;
const daytOffset = parseFloat(new URLSearchParams(location.search).get('dayt')) || 0;

// ---------- render ----------
let last = performance.now();
const probe = new URLSearchParams(location.search).has('probe');

function frame(now) {
  if (probe) document.title = `t=${digT.toFixed(1)} front=${frontLen.toFixed(0)} stamped=${stampedLen.toFixed(0)} mode=${mode}`;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const tSec = now / 1000;

  if (mode === 'digging') {
    digT += dt * 0.8;   // dig at 80% of recorded pace
    const target = lenAtTime(digPath, digT);
    const prevLen = frontLen;
    if (target > frontLen + 0.1) {
      frontLen = Math.min(target, digPath.totalLen);
      antPhase += (frontLen - prevLen) * 0.5;
      idleAng = 0;
      stampTo(frontLen);
      const head = atLen(digPath, frontLen);
      for (let i = 0; i < 2; i++) {
        crumbs.push({
          x: head.x + (Math.random() - 0.5) * 8, y: head.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 70,
          life: 0.5 + Math.random() * 0.4,
        });
      }
    } else {
      idleAng += dt;   // waiting at a pen lift — turns on the spot
    }
    // digger hits a pen lift -> clocks off and becomes a roamer.
    // gaps are zero-length holds, so spawn at the last dug position
    const headW = atLen(digPath, Math.max(1, frontLen)).w;
    if (headW >= 0.1) {
      lastDugPos = atLen(digPath, frontLen);
    } else if (prevFrontW >= 0.1 && lastDugPos && tunnelAnts.length < 16) {
      if (!walkMask) { buildWalkMask(); walkMaskLen = frontLen; }
      tunnelAnts.push(mkRoamer(lastDugPos.x, lastDugPos.y));
    }
    prevFrontW = headW;
    // refresh the walkable mask as tunnels grow, trickle in wanderers
    if (frontLen - walkMaskLen > 250) {
      buildWalkMask(); walkMaskLen = frontLen;
      const want = Math.min(6, 1 + Math.floor(frontLen / 400));
      while (tunnelAnts.length < want) tunnelAnts.push(...spawnTunnelAnts(1));
    }
    if (digT >= digPath.totalTime + 0.4) {
      mode = 'done';
      ui.btnSkip.classList.add('hidden');
      buildWalkMask();
      // the last digger clocks off as a roamer rather than vanishing
      if (lastDugPos) tunnelAnts.push(mkRoamer(lastDugPos.x, lastDugPos.y));
      // every stroke is its own sealed tube — queue a resident each so
      // they trickle in instead of popping into existence all at once
      for (const [s, e] of digPath.strokeRanges) {
        if (e <= s) continue;
        const n = e - s > 700 ? 2 : 1;
        for (let k = 0; k < n; k++)
          pendingRoamers.push(atLen(digPath, s + Math.random() * (e - s)));
      }
      if (attracting) {
        ui.hint.textContent = "That's the idea — now bury your own";
        ui.btnOwn.textContent = 'Draw Your Own';
      } else {
        ui.hint.textContent = 'Dug out by the colony — pass the link on';
        ui.btnOwn.textContent = 'Bury Your Own Message';
      }
      show(sharedDig ? ui.sharebar : ui.afterbar);
    }
  }

  // --- compose ---
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, SCENE_W, SCENE_H);
  g.imageSmoothingEnabled = true;

  // the farm owns the whole surface strip — sky, sun/moon, day-night
  // tint, lit windows and sign are all inside its 576x128 pixel canvas
  const phase = ((tSec / CYCLE_S) + daytOffset) % 1;
  farm.draw(now, phase * 24);
  g.imageSmoothingEnabled = false;
  g.drawImage(farm.canvas, 0, 0, 576, 128, 0, 0, SCENE_W, STRIP_H);
  g.imageSmoothingEnabled = true;

  g.drawImage(bg, 0, 0, SCENE_W, SCENE_H);
  drawHole(g, L);

  // drawn-stroke preview (thin version of the tunnel to come)
  if (mode === 'draw' && rawStrokes.length) {
    g.lineCap = g.lineJoin = 'round';
    for (const pass of [[6.5, '#ff2a00'], [3.8, '#fdf8f0']]) {
      g.strokeStyle = pass[1]; g.lineWidth = pass[0];
      for (const s of rawStrokes) {
        if (s.length < 2) continue;
        g.beginPath();
        const p0 = denorm(s[0]);
        g.moveTo(p0.x, p0.y);
        for (const p of s) { const d = denorm(p); g.lineTo(d.x, d.y); }
        g.stroke();
      }
    }
  }

  // dug tunnels: red underlay, then white interior on top
  if (digPath) {
    g.drawImage(dugR, 0, 0, SCENE_W, SCENE_H);
    g.drawImage(dugW, 0, 0, SCENE_W, SCENE_H);
  }

  // crumbs in flight
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const c = crumbs[i];
    c.life -= dt;
    if (c.life <= 0) { crumbs.splice(i, 1); continue; }
    c.vy += 160 * dt;
    c.x += c.vx * dt; c.y += c.vy * dt;
    g.globalAlpha = Math.min(1, c.life * 3);
    g.fillStyle = '#9a7a4e';
    g.beginPath(); g.arc(c.x, c.y, 1.6, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;

  // tunnel wanderers — trickle in while digging, stay on after
  if (mode === 'digging' || mode === 'done') {
    updateTunnelAnts(dt);
    for (const a of tunnelAnts) drawAnt(g, a.x, a.y, a.ang, { phase: a.phase, s: 1.1 });
  }

  // leader at the dig front — hidden during pen lifts so a new digger
  // "spawns" at the start of each stroke; legs only move while digging
  if (mode === 'digging' && frontLen > 2) {
    const p = atLen(digPath, Math.min(frontLen, digPath.totalLen - 0.5));
    if (p.w >= 0.1) drawAnt(g, p.x, p.y, p.ang + Math.sin(idleAng * 2.2) * 0.9, { phase: antPhase, s: 1.25 });
  }

  requestAnimationFrame(frame);
}

// ---------- boot ----------
window.addEventListener('resize', resize);
resize();

const m = location.hash.match(/#d=([A-Za-z0-9\-_]+)/);
if (m) {
  decodeMessage(m[1])
    .then(({ strokes }) => {
      if (!strokes.length || !strokes[0].length) throw new Error('empty');
      enterWatch(strokes);
      if (new URLSearchParams(location.search).has('play')) {
        setTimeout(releaseAnts, 600);
      }
    })
    .catch(() => enterDraw("That link didn't survive the trip — bury a new one"));
} else {
  enterAttract();
}

requestAnimationFrame(frame);
