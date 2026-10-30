// letters.js — two things: a tiny 5x7 bitmap font for pixel-art sign text,
// and hand-built stroke skeletons spelling "ANT FARM" for the attract dig.

// ---- 5x7 pixel font ----
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
};

// draw text one cell at a time; `cell` is in the ctx's current units
export function pixelText(g, text, x, y, cell, color) {
  g.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    if (ch === ' ') { cx += cell * 3; continue; }
    const rows = FONT[ch];
    if (!rows) { cx += cell * 6; continue; }
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 5; c++)
        if (rows[r][c] === '1') g.fillRect(cx + c * cell, y + r * cell, cell, cell);
    cx += cell * 6;
  }
  return cx - x;
}

export const pixelTextWidth = (text, cell) =>
  text.split('').reduce((w, ch) => w + (ch === ' ' ? 3 : 6) * cell, 0);

// ---- letter skeletons for the attract dig ----
// lowercase cursive-ish skeletons in a 0..1 letterbox (y down), designed
// to be rounded off by the same smoothing used for freehand strokes —
// a hand-lettered "ant farm" like the original's intro.
const GLYPHS = {
  a: [
    [[0.78, 0.3], [0.55, 0.18], [0.28, 0.28], [0.14, 0.55], [0.28, 0.82], [0.55, 0.9], [0.75, 0.72]],
    [[0.78, 0.28], [0.75, 0.92], [0.85, 1]],
  ],
  n: [
    [[0.02, 0.9], [0.05, 0.3], [0, 0.55], [0.12, 0.28], [0.45, 0.15], [0.62, 0.4], [0.6, 0.9]],
  ],
  t: [
    [[0.4, 0.02], [0.28, 0.9], [0.42, 0.98]],
    [[0.05, 0.32], [0.72, 0.28]],
  ],
  f: [
    [[0.88, 0.08], [0.6, -0.05], [0.4, 0.1], [0.3, 0.6], [0.22, 0.95]],
    [[0.02, 0.42], [0.62, 0.34]],
  ],
  r: [
    [[0.02, 0.9], [0.02, 0.3], [0.02, 0.55], [0.15, 0.3], [0.45, 0.15], [0.62, 0.28]],
  ],
  m: [
    [[0.02, 0.9], [0.02, 0.3], [0.02, 0.55], [0.12, 0.25], [0.32, 0.15], [0.45, 0.4], [0.45, 0.9], [0.45, 0.55], [0.55, 0.25], [0.75, 0.15], [0.88, 0.4], [0.88, 0.9]],
  ],
};

const K = 1023;

// "ant farm" as normalized dig strokes [{x,y,dt}] in 0..1023 coords.
// dt is proportional to the distance so dig speed stays even.
export function attractStrokes(word = 'ant farm') {
  const W = 84, GAP = 30, SPACE = 52;
  const letters = [...word];
  const totalW = letters.length * W + (letters.length - 1) * GAP + SPACE;
  const x0 = (K - totalW) / 2 + 46;
  const y0 = 340, H = 300;
  const STEP = 22;          // normalized units between sampled points
  const DT_PER_UNIT = 7.5;  // ms per normalized unit -> even dig speed

  const strokes = [];
  let lx = x0;
  for (const ch of letters) {
    if (ch === ' ') { lx += SPACE + GAP; continue; }
    for (const poly of GLYPHS[ch]) {
      const stroke = [];
      for (let s = 0; s < poly.length - 1; s++) {
        const [ax, ay] = poly[s], [bx, by] = poly[s + 1];
        const dist = Math.hypot(bx - ax, by - ay) * W;
        const n = Math.max(1, Math.round(dist / STEP));
        for (let i = s === 0 ? 0 : 1; i <= n; i++) {
          const t = i / n;
          stroke.push({
            x: Math.round(lx + (ax + (bx - ax) * t) * W),
            y: Math.round(y0 + (ay + (by - ay) * t) * H),
            dt: Math.max(30, Math.round(dist / n * DT_PER_UNIT)),
          });
        }
      }
      if (stroke.length) { stroke[0].dt = 450; strokes.push(stroke); }
    }
    lx += W + GAP;
  }
  return strokes;
}
