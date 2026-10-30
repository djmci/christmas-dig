// scene.js — the underground cross-section. The surface strip is owned by
// farm.js (a procedural pixel-art scene rendered per frame); this file
// paints the dirt the ants dig in: topsoil band, speckle, stones, and a
// few buried secrets down deep.

import * as SPR from './sprites.js';

export let SCENE_W = 1200;
export let SCENE_H = 760;

export let STRIP_H = 216;     // the farm's band above the dirt
export let FARM_SRC_W = 576;  // how much of the 576px farm canvas is drawn

// portrait screens get a narrower, taller scene: the left 2/3 of the
// farm zoomed slightly, with more dirt underneath
export function setScene(w, h, strip, farmSrcW) {
  SCENE_W = w; SCENE_H = h; STRIP_H = strip; FARM_SRC_W = farmSrcW;
}

export function layout() {
  const grassY = STRIP_H - 26;
  const grassH = 26;
  return {
    grassY, grassH,
    dirt: { x: 0, y: STRIP_H, w: SCENE_W, h: SCENE_H - STRIP_H },
    entrance: { x: 120, y: STRIP_H + 10 },
  };
}

// deterministic rng so speckles don't swim on resize
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261225);

export function drawScene(g, L) {
  const { dirt } = L;

  // --- light tan dirt with a dark topsoil band under the grass ---
  const dg = g.createLinearGradient(0, dirt.y, 0, dirt.y + dirt.h);
  dg.addColorStop(0, '#ddccb3');
  dg.addColorStop(0.5, '#cfb897');
  dg.addColorStop(1, '#bda27c');
  g.fillStyle = dg;
  g.fillRect(dirt.x, dirt.y, dirt.w, dirt.h);
  const topsoil = g.createLinearGradient(0, dirt.y, 0, dirt.y + 30);
  topsoil.addColorStop(0, '#6e5537');
  topsoil.addColorStop(0.6, '#8a6b4a');
  topsoil.addColorStop(1, 'rgba(138,107,74,0)');
  g.fillStyle = topsoil;
  g.fillRect(dirt.x, dirt.y, dirt.w, 30);

  // speckle and stone counts scale with dirt area so tall mobile
  // layouts keep the same density
  const density = dirt.w * dirt.h / (1200 * 544);
  for (let i = 0; i < 800 * density; i++) {
    const x = dirt.x + rnd() * dirt.w, y = dirt.y + rnd() * dirt.h;
    g.fillStyle = rnd() > 0.5 ? 'rgba(120,90,55,.18)' : 'rgba(255,246,225,.35)';
    const r = 0.6 + rnd() * 1.8;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 14 * density; i++) {
    const x = dirt.x + rnd() * dirt.w, y = dirt.y + rnd() * dirt.h;
    const r = 4 + rnd() * 9;
    g.fillStyle = `rgba(${150 + rnd() * 30 | 0},${128 + rnd() * 25 | 0},${100 + rnd() * 20 | 0},.5)`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.6 + rnd() * 0.3), rnd() * 3, 0, Math.PI * 2); g.fill();
  }

  // buried secrets in the deep soil — subtle, low alpha
  const bury = (spr, x, y, s = 4, a = 0.4) => {
    g.save(); g.globalAlpha = a;
    spr.map.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const col = spr.pal[row[c]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x + c * s, y + r * s, s, s);
      }
    });
    g.restore();
  };
  bury(SPR.dino, 380, dirt.y + dirt.h * 0.62, 4, 0.42);
  bury(SPR.chest, 880, dirt.y + dirt.h * 0.7, 4, 0.45);
  bury(SPR.fossil, 185, dirt.y + dirt.h * 0.82, 4, 0.38);

  // lost cricket ball + buried bottle cap
  g.save(); g.globalAlpha = 0.75;
  g.fillStyle = '#a31621';
  g.beginPath(); g.arc(SCENE_W * 0.58, dirt.y + dirt.h * 0.72, 12, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f5efe8'; g.lineWidth = 1.6;
  g.beginPath(); g.arc(SCENE_W * 0.58, dirt.y + dirt.h * 0.72, 8, -0.7, 0.7); g.stroke();
  g.beginPath(); g.arc(SCENE_W * 0.58, dirt.y + dirt.h * 0.72, 8, Math.PI - 0.7, Math.PI + 0.7); g.stroke();
  g.fillStyle = '#a08858';
  g.beginPath(); g.arc(SCENE_W * 0.22, dirt.y + dirt.h * 0.88, 9, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#77613c';
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.beginPath();
    g.moveTo(SCENE_W * 0.22 + Math.cos(a) * 6, dirt.y + dirt.h * 0.88 + Math.sin(a) * 6);
    g.lineTo(SCENE_W * 0.22 + Math.cos(a) * 9, dirt.y + dirt.h * 0.88 + Math.sin(a) * 9);
    g.stroke();
  }
  g.restore();
}

// the colony's front door — drawn per frame over the farm strip
export function drawHole(g, L, s = 1) {
  const { entrance } = L;
  g.fillStyle = '#4a3419';
  g.beginPath(); g.ellipse(entrance.x, STRIP_H, 11 * s, 4.5 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c9b28a';
  g.beginPath(); g.ellipse(entrance.x + 16 * s, STRIP_H + 1, 9 * s, 3.5 * s, 0, 0, Math.PI * 2); g.fill();
}
