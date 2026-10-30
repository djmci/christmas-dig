// geom.js — path maths: simplify, smooth, connectors, dig timing.

// Ramer–Douglas–Peucker on [{x,y,...}] (keeps all fields on surviving pts)
export function simplifyRDP(pts, epsilon) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let dmax = 0, idx = -1;
    const { x: x1, y: y1 } = pts[a], { x: x2, y: y2 } = pts[b];
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const t = ((pts[i].x - x1) * dx + (pts[i].y - y1) * dy) / len2;
      const px = x1 + t * dx, py = y1 + t * dy;
      const d = Math.hypot(pts[i].x - px, pts[i].y - py);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > epsilon) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const MIN_SEG_MS = 30, MAX_SEG_MS = 1500;
const clampDt = (ms) => Math.min(MAX_SEG_MS, Math.max(MIN_SEG_MS, ms || 60));

// Catmull-Rom -> dense polyline, ~step px apart. Each segment's recorded
// duration (clamped) is shared across its subdivided samples.
export function smoothStroke(pts, step = 4) {
  if (pts.length < 3) return pts.map(p => ({ ...p, dt: clampDt(p.dt) }));
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i],
          p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const n = Math.max(1, Math.ceil(segLen / step));
    for (let j = 1; j <= n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        // the segment's recorded duration shared across its n samples
        dt: clampDt(p2.dt) / n,
      });
    }
  }
  return out;
}

// Build the dig route: exactly the drawn strokes, nothing else. Between
// strokes (pen lifts) one digger vanishes and another spawns at the next
// stroke start — the path carries w=0 there so nothing is stamped and the
// leader is hidden. Dig speed matches recorded draw speed (~330px/s cap).
export function buildDigPath(strokesPx, { smooth = true } = {}) {
  // stretch quick recordings up to ~10s of dig and cap slow ones at 20s,
  // preserving the writer's relative pace either way
  let recTotal = 0;
  for (const s of strokesPx)
    for (const p of s) recTotal += clampDt(p.dt);
  const timeScale = recTotal > 20000 ? 20000 / recTotal
                  : recTotal < 10000 ? 10000 / recTotal : 1;

  const pts = [];
  const idxRanges = [];   // per-stroke [firstIdx, lastIdx] into pts
  let t = 0;
  const push = (x, y, dtSec, w) => { t += dtSec; pts.push({ x, y, t, w }); };

  for (let si = 0; si < strokesPx.length; si++) {
    const dense = smooth ? smoothStroke(strokesPx[si], 4) : strokesPx[si];
    idxRanges.push([pts.length, 0]);
    // distance remaining to each point's stroke end — eases the digger to
    // a stop before each pen lift
    const EASE = 70;
    const rem = new Array(dense.length).fill(0);
    for (let i = dense.length - 2; i >= 0; i--)
      rem[i] = rem[i + 1] + Math.hypot(dense[i + 1].x - dense[i].x, dense[i + 1].y - dense[i].y);
    for (let i = 0; i < dense.length; i++) {
      const p = dense[i];
      let ms = (smooth ? Math.max(2, p.dt || 60) : clampDt(p.dt)) * timeScale;
      if (i > 0) {
        const pxLen = Math.hypot(p.x - dense[i - 1].x, p.y - dense[i - 1].y);
        ms = Math.max(ms, pxLen * 3);   // ants can't dig faster than ~330px/s
      }
      if (rem[i] < EASE) ms *= 1 + 2.2 * (1 - rem[i] / EASE) ** 2;
      push(p.x, p.y, ms / 1000, 1);
    }
    idxRanges[idxRanges.length - 1][1] = pts.length - 1;

    if (si < strokesPx.length - 1) {
      // pen lift: brief hold where the stroke ended, then spawn at the next
      const end = dense[dense.length - 1];
      const nxt = strokesPx[si + 1][0];
      const gap = Math.min(0.5, Math.max(0.12, (nxt.dt || 500) / 1000 * timeScale * 0.35));
      push(end.x, end.y, gap, 0);
      push(nxt.x, nxt.y, 0.02, 0);
    }
  }

  // cumulative arc length + helper to sample position at dig-clock t
  let len = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    cum.push(len);
  }
  const strokeRanges = idxRanges.map(([a, b]) => [cum[a], cum[b]]);
  return { pts, cum, totalLen: len, totalTime: t, strokeRanges };
}

// position/heading/width at dig-clock time t  -> {x,y,ang,w}
export function atTime(path, t) {
  const { pts } = path;
  if (t <= 0) {
    const a = pts[0], b = pts[1] || a;
    return { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x), w: a.w };
  }
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].t < t) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = pts[i - 1], b = pts[i];
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    ang: Math.atan2(b.y - a.y, b.x - a.x),
    w: a.w + (b.w - a.w) * f,
  };
}

// position/heading/width at arc length `len` along the route
export function atLen(path, len) {
  const { cum, pts } = path;
  if (len <= 0) {
    const a = pts[0], b = pts[1] || a;
    return { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x), w: a.w, t: a.t };
  }
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < len) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = pts[i - 1], b = pts[i];
  const f = cum[i] > cum[i - 1] ? (len - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    ang: Math.atan2(b.y - a.y, b.x - a.x),
    w: a.w + (b.w - a.w) * f,
    t: a.t + (b.t - a.t) * f,
  };
}

// inverse: dig-clock time at which the front reaches arc length `len`
export function timeAtLen(path, len) {
  const { cum, pts } = path;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < len) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, lo);
  const a = cum[i - 1], b = cum[i];
  const f = b > a ? (len - a) / (b - a) : 0;
  return pts[i - 1].t + (pts[i].t - pts[i - 1].t) * f;
}
