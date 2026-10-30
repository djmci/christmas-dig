// farm.js — procedural pixel-art aussie farm, ported from
// "Aussie Farm – end of year" (user-supplied). Renders into a 576x128
// canvas; the caller upscales with smoothing off and passes the time of
// day (hours 0-24) plus a ms clock for animation.

export function makeFarm() {
  const cv = document.createElement('canvas');
  const W = 576, H = 128, HZ = 52, GY = 100;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (a, b, x) => { x = cl((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const mixA = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  const disc = (x, y, r, c) => { for (let d = -r; d <= r; d++) { const w = Math.floor(Math.sqrt(r * r - d * d + .5)); R(x - w, y + d, 2 * w + 1, 1, c); } };
  const ln = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) R(x0 + (x1 - x0) * i / (n || 1), y0 + (y1 - y0) * i / (n || 1), 1, 1, c); };
  const hh = x => 6 + 4 * Math.sin(x * .02) + 3 * Math.sin(x * .05 + 1);
  const stars = [...Array(90)].map(() => ({ x: rnd() * W | 0, y: rnd() * 46 | 0, p: rnd() * 6 }));
  const tufts = [...Array(380)].map(() => ({ x: rnd() * W | 0, y: HZ + 3 + rnd() * 62 | 0, h: 2 + rnd() * 3 | 0 }));
  const pebbles = [...Array(40)].map(() => ({ x: rnd() * W | 0, y: 123 + rnd() * 4 | 0, w: 1 + rnd() * 3 | 0 }));
  const clouds = [{ x: 20, y: 14, s: .6 }, { x: 150, y: 26, s: .4 }, { x: 250, y: 10, s: .8 }, { x: 330, y: 28, s: .5 }, { x: 430, y: 16, s: .7 }, { x: 520, y: 30, s: .45 }];
  const FONT = { M: '101111111101101', E: '111100110100111', R: '110101110101101', Y: '101101010010010', X: '101101010101101', A: '010101111101101', S: '011100010001110' };
  const txt = (s, x, y, c) => { [...s].forEach((ch, i) => { const b = FONT[ch]; if (!b) return; for (let k = 0; k < 15; k++) if (b[k] === '1') R(x + i * 8 + (k % 3) * 2, y + ((k / 3) | 0) * 2, 2, 2, c); }); };
  const ROO = ['..bb..b.....', '..bbbbbb....', '...bbbbbbd..', '...bbbbbb...', '....bbbb....', '....bbbbb...', '...bbbbbbb..', '..bbbllbbb..', '..bbllllbb.b', '..bbllllbbbb', '..bbllllbb..', '..bbbllbbb..', '.bbbbbbbbbb.', '.bbbbbbbbbb.', 'bbbb..bbbbb.', 'bbb....bbbb.', 'bb.....bbdd.', 'b......dddd.'];
  const PAL = { b: '#a9693a', l: '#d9a672', d: '#4a2d1c' };
  const spr = (rows, pal, x, y, flip) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') R(x + (flip ? row.length - 1 - i : i), y + j, 1, 1, pal[ch]); } });
  let spin = 0, rot = 0, wind = 0, last = 0;
  const roo = { x: 330, dir: -1, hop: 0, t: 0, idle: 3 };
  const sheep = [{ x: 175, r: 5 }, { x: 225, r: 0 }, { x: 262, r: 2 }, { x: 350, r: 4 }];
  const hoist = { cx: 285, y: GY + 8 };
  const lights = [];

  function draw(ms, T) {
    const dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms;
    // sky
    const s = Math.sin((T - 6) / 12 * Math.PI);
    const dW = sm(.05, .45, s), nW = sm(0, -.3, s), uW = cl(1 - dW - nW);
    const mx = (d, u, n) => [0, 1, 2].map(i => d[i] * dW + u[i] * uW + n[i] * nW);
    const top = mx([84, 152, 214], [110, 90, 170], [50, 70, 150]), bot = mx([186, 224, 240], [255, 170, 110], [110, 130, 200]);
    for (let y = 0; y < HZ; y += 4) R(0, y, W, 4, rgb(mixA(top, bot, y / HZ)));
    // sun
    if (T > 5 && T < 19) {
      const sx = 30 + (T - 6) / 12 * (W - 60), sy = HZ - 4 - Math.sin((T - 6) / 12 * Math.PI) * 44;
      disc(sx, sy, 13, 'rgba(255,240,150,.22)'); disc(sx, sy, 8, '#fce36a'); disc(sx, sy, 6, '#fff3a0');
    }
    // clouds
    clouds.forEach(c => {
      const x = ((c.x + ms * .004 * c.s) % (W + 80)) - 40, y = c.y;
      R(x, y, 30, 6, '#fff'); R(x + 5, y - 4, 18, 5, '#fff'); R(x + 11, y - 7, 10, 4, '#fff'); R(x, y + 5, 30, 2, '#dbe6f0');
    });
    // hills
    for (let x = 0; x < W; x += 2) { const h = hh(x); R(x, HZ - h, 2, h + 3, '#6f9c78'); R(x, HZ - h, 2, 2, '#86b08a'); }
    // ground
    R(0, HZ + 2, W, 122 - HZ, '#6aa63f');
    for (let y = HZ + 2; y < 122; y += 6) R(0, y, W, 3, '#74b046');
    R(0, 122, W, H - 122, '#97704a'); R(0, 122, W, 2, '#7a9a3c');
    pebbles.forEach(p => R(p.x, p.y, p.w, 1, '#c9ab80'));
    tufts.forEach(t => { R(t.x, t.y, 1, t.h, '#3f7a2c'); R(t.x + 1, t.y + 1, 1, t.h - 1, '#8cc457'); });
    // barn + silo
    const bx = 10, by = GY;
    R(bx + 56, by - 48, 12, 48, '#9aa3ab'); R(bx + 64, by - 48, 3, 48, '#7d868e'); for (let i = 0; i < 6; i++) R(bx + 56, by - 48 + i * 8, 12, 1, '#7d868e'); R(bx + 58, by - 52, 8, 4, '#aab2b9'); R(bx + 60, by - 54, 4, 2, '#aab2b9');
    R(bx, by - 26, 56, 26, '#b8402a'); R(bx, by - 26, 56, 1, '#f0e6d8');
    R(bx - 3, by - 32, 62, 6, '#6e2a22'); R(bx + 4, by - 38, 48, 6, '#7d3028'); R(bx + 12, by - 43, 32, 5, '#8a362c');
    R(bx + 20, by - 18, 16, 18, '#8c2e20'); ln(bx + 20, by - 18, bx + 35, by - 1, '#f0e6d8'); ln(bx + 35, by - 18, bx + 20, by - 1, '#f0e6d8'); R(bx + 20, by - 18, 16, 1, '#f0e6d8');
    const wins = [[bx + 7, by - 20, 7, 7], [bx + 42, by - 20, 7, 7], [bx + 25, by - 37, 6, 5]];
    wins.forEach(w => { R(w[0] - 1, w[1] - 1, w[2] + 2, w[3] + 2, '#f0e6d8'); R(w[0], w[1], w[2], w[3], '#2e2a3a'); });
    // sign
    const sx0 = 120, sy0 = GY;
    R(sx0 + 6, sy0 - 16, 3, 16, '#8a4a2a'); R(sx0 + 47, sy0 - 16, 3, 16, '#8a4a2a');
    R(sx0, sy0 - 46, 56, 30, '#c4452a'); R(sx0, sy0 - 46, 56, 1, '#e8644a'); R(sx0, sy0 - 17, 56, 1, '#8e2c18');
    txt('MERRY', sx0 + 9, sy0 - 42, '#fff4e0'); txt('XMAS', sx0 + 13, sy0 - 30, '#fff4e0');
    // gum trees
    [200, 458].forEach(gx => {
      R(gx, GY - 38, 5, 38, '#d9d2c3'); R(gx + 3, GY - 38, 2, 38, '#b9b1a1'); ln(gx + 2, GY - 30, gx - 8, GY - 44, '#d9d2c3'); ln(gx + 3, GY - 34, gx + 14, GY - 46, '#d9d2c3');
      [[gx - 18, GY - 56, 22, 9], [gx + 6, GY - 58, 24, 9], [gx - 8, GY - 66, 22, 8], [gx - 12, GY - 48, 12, 5]].forEach(b => { R(b[0], b[1], b[2], b[3], '#6f9a72'); R(b[0] + 3, b[1] + b[3] - 3, b[2] - 6, 3, '#587f5e'); });
    });
    // fence (behind)
    for (let x = 238; x < 340; x += 10) R(x, GY - 10, 3, 12, '#7a5230'); R(238, GY - 7, 103, 2, '#9a6a3c'); R(238, GY - 2, 103, 2, '#9a6a3c');
    for (let x = 524; x < 572; x += 10) R(x, GY - 10, 3, 12, '#7a5230'); R(524, GY - 7, 49, 2, '#9a6a3c'); R(524, GY - 2, 49, 2, '#9a6a3c');
    // windmill
    const wx = 410, wt = GY - 64;
    ln(wx - 9, GY + 2, wx - 2, wt, '#7f8890'); ln(wx + 9, GY + 2, wx + 2, wt, '#7f8890'); ln(wx - 9, GY + 2, wx + 9, GY + 2, '#7f8890');
    for (let i = 1; i < 6; i++) { const y = wt + i * 11, o = 2 + (y - wt) / 66 * 7; ln(wx - o, y, wx + o, y, '#7f8890'); }
    wind = 1.2 + Math.sin(ms * .0008) * .8; rot += dt * wind * 2.2;
    for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4; for (let i = 2; i <= 15; i++) R(wx + Math.cos(a) * i, wt + Math.sin(a) * i, i > 10 ? 2 : 1, 1, '#cdd2d6'); }
    disc(wx, wt, 2, '#8a949c'); R(wx + 2, wt, 14, 2, '#8a949c'); R(wx + 14, wt - 5, 6, 10, '#c9ced3');
    // bush
    disc(500, GY + 2, 8, '#4d7f3a'); disc(496, GY - 2, 6, '#5f9645'); disc(505, GY, 5, '#4d7f3a');
    // hoist
    const { cx, y: hy } = hoist; spin = Math.max(0, spin - dt * 3); hoist.a = (hoist.a || 0) + dt * (.35 + spin);
    const ty = hy - 56, pts = [0, 1, 2, 3].map(i => [cx + Math.cos(hoist.a + i * Math.PI / 2) * 44, ty + Math.sin(hoist.a + i * Math.PI / 2) * 11]);
    R(cx - 1, ty, 3, hy - ty, '#aab0b6'); R(cx - 4, hy - 3, 9, 3, '#8a9096');
    for (const sc of [1, .62, .3]) { const q = pts.map(p => [cx + (p[0] - cx) * sc, ty + (p[1] - ty) * sc]); for (let i = 0; i < 4; i++) ln(q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1], '#a9aeb4'); }
    lights.length = 0;
    for (let i = 0; i < 4; i++) for (let j = 1; j < 7; j++) { const a = pts[i], b = pts[(i + 1) % 4], f = j / 7; lights.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, i * 7 + j]); }
    const LC = ['#ff4d4d', '#ffd84d', '#4dd2ff', '#7dff6a', '#ff7ae0'];
    lights.forEach(l => R(l[0], l[1], 2, 2, LC[l[2] % 5]));
    for (let i = 0; i < 3; i++) { const a = pts[i], b = pts[i + 1], x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2; R(x, y + 1, 1, 3, '#999'); R(x - 1, y + 4, 4, 5, '#d63a2a'); R(x - 1, y + 8, 6, 3, '#d63a2a'); R(x - 1, y + 3, 4, 1, '#fff'); }
    R(cx - 3, ty - 9, 7, 2, '#ffd23a'); R(cx - 1, ty - 12, 3, 8, '#ffd23a'); R(cx - 4, ty - 7, 9, 2, '#ffd23a'); R(cx - 2, ty - 5, 5, 2, '#ffd23a');
    R(cx + 8, hy - 8, 10, 8, '#d8d8d8'); R(cx + 8, hy - 5, 10, 2, '#d63a2a'); R(cx + 12, hy - 8, 2, 8, '#d63a2a');
    R(cx + 19, hy - 7, 9, 7, '#2ab5b0'); R(cx + 19, hy - 5, 9, 2, '#ffd23a'); R(cx + 23, hy - 7, 2, 7, '#ffd23a');
    // sheep
    sheep.forEach((p, k) => {
      const x = p.x + Math.sin(ms * .0002 + p.r) * 16, v = Math.cos(ms * .0002 + p.r) > 0 ? 1 : -1, y = GY + 9 + k * 3 + ((Math.sin(ms * .012 + k) > .5) ? -1 : 0);
      R(x + 2, y, 2, 3, '#3a3436'); R(x + 8, y, 2, 3, '#3a3436'); R(x, y - 8, 12, 8, '#f2efe6'); R(x + 1, y - 10, 10, 3, '#fff'); R(x + (v > 0 ? 10 : -3), y - 8, 5, 5, '#3a3436'); R(x, y + 3, 12, 1, 'rgba(0,0,0,.18)');
    });
    // kangaroo
    roo.idle -= dt;
    if (roo.hop <= 0 && roo.idle < 0) { roo.dir = roo.x > W - 120 ? -1 : (roo.x < 150 ? 1 : (rnd() > .5 ? 1 : -1)); roo.hop = 1 + rnd() * 1.6; roo.idle = 5 + rnd() * 5; }
    let yo = 0;
    if (roo.hop > 0) { roo.hop -= dt; roo.x = cl(roo.x + roo.dir * 46 * dt, 90, W - 30); roo.t += dt * 8; yo = -Math.abs(Math.sin(roo.t)) * 14; }
    R(roo.x + 1, GY + 26, 12, 2, 'rgba(0,0,0,.22)');
    spr(ROO, PAL, Math.round(roo.x), GY + 9 + yo, roo.dir < 0);
    // tint
    const tint = mx([255, 255, 255], [255, 190, 160], [70, 88, 150]);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = rgb(tint); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    // night extras
    const night = cl(nW + uW * .6), stA = nW;
    if (stA > .02) {
      g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); for (let x = W; x >= 0; x -= 2) g.lineTo(x, HZ - hh(x)); g.closePath(); g.clip();
      stars.forEach(s => R(s.x, s.y, 1, 1, `rgba(255,255,255,${stA * (.4 + .6 * Math.sin(ms * .003 + s.p) ** 2)})`));
      [[470, 28], [470, 8], [478, 19], [462, 16], [466, 24]].forEach((p, i) => { disc(p[0], p[1], i < 2 ? 2 : 1, `rgba(255,255,255,${stA})`); disc(p[0], p[1], 4, `rgba(180,200,255,${stA * .12})`); });
      const Tm = (T + 12) % 24;
      if (Tm > 5 && Tm < 19) {
        const mxp = 30 + (Tm - 6) / 12 * (W - 60), myp = HZ - 4 - Math.sin((Tm - 6) / 12 * Math.PI) * 44;
        g.globalAlpha = stA; disc(mxp, myp, 12, 'rgba(255,255,220,.08)'); disc(mxp, myp, 7, '#f4efd0'); R(mxp - 4, myp - 3, 3, 2, '#d9d3b0'); R(mxp + 2, myp + 1, 3, 3, '#d9d3b0'); R(mxp - 3, myp + 4, 2, 2, '#d9d3b0'); g.globalAlpha = 1;
      }
      g.restore();
    }
    if (night > .02) {
      const lit = night;
      wins.forEach(w => { R(w[0], w[1], w[2], w[3], `rgba(255,205,100,${lit})`); disc(w[0] + 3, w[1] + 3, 9, `rgba(255,200,90,${lit * .12})`); });
      lights.forEach(l => { if (Math.sin(ms * .005 + l[2] * 1.9) > -.3) { const c = LC[l[2] % 5]; R(l[0] - 1, l[1] - 1, 4, 4, c); g.globalAlpha = lit * .35; R(l[0] - 3, l[1] - 3, 8, 8, c); g.globalAlpha = 1; } });
      for (let x = sx0 + 2; x < sx0 + 56; x += 6) { const o = (x / 6 | 0) % 2; if (Math.sin(ms * .006 + x) > -.4) { const c = LC[(x / 6 | 0) % 5]; R(x, sy0 - 46, 2, 2, c); R(x + (o ? 1 : 0), sy0 - 17, 2, 2, c); } }
      g.globalAlpha = lit; R(hoist.cx - 3, hoist.y - 65, 7, 2, '#fff2a0'); R(hoist.cx - 1, hoist.y - 68, 3, 8, '#fff2a0'); R(hoist.cx - 4, hoist.y - 63, 9, 2, '#fff2a0'); g.globalAlpha = 1; disc(hoist.cx, hoist.y - 62, 12, `rgba(255,235,140,${lit * .1})`);
      for (let i = 0; i < 24; i++) {
        const fx = (i * 47 + Math.sin(ms * .0007 + i) * 14 + W) % W, fy = GY - 2 + ((i * 29) % 24) + Math.cos(ms * .0009 + i * 2) * 6, fl = Math.max(0, Math.sin(ms * .004 + i * 1.7));
        if (fl > .2) { g.globalAlpha = stA * fl; R(fx, fy, 2, 2, '#e8ff7a'); R(fx - 1, fy - 1, 4, 4, 'rgba(220,255,120,.25)'); g.globalAlpha = 1; }
      }
      if (stA > .3) for (let k = 0; k < 2; k++) {
        const bx2 = ((ms * .03 * (k + 1) + k * 170) % (W + 40)) - 20, by2 = 14 + k * 12 + Math.sin(ms * .002 + k) * 10, f = Math.sin(ms * .02 + k) > 0;
        g.globalAlpha = stA; R(bx2, by2, 3, 2, '#14141f'); if (f) { R(bx2 - 4, by2 - 2, 4, 1, '#14141f'); R(bx2 + 3, by2 - 2, 4, 1, '#14141f'); } else { R(bx2 - 4, by2 + 1, 4, 1, '#14141f'); R(bx2 + 3, by2 + 1, 4, 1, '#14141f'); } g.globalAlpha = 1;
      }
    }
  }

  // interactive: tap the roo to hop, the hoist to spin
  function tap(x, y) {
    if (Math.abs(x - (roo.x + 6)) < 14 && y > GY - 10 && y < GY + 40) {
      roo.dir = x < roo.x + 6 ? 1 : -1;
      if (roo.x > W - 60) roo.dir = -1;
      if (roo.x < 110) roo.dir = 1;
      roo.hop = 1.6; roo.idle = 6;
      return true;
    }
    if (Math.abs(x - hoist.cx) < 50 && y > 25 && y < 118) { spin = 6; return true; }
    return false;
  }

  return { canvas: cv, draw, tap };
}
