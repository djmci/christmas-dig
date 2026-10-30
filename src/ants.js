// ants.js — procedural ants. Body is three segments + animated legs;
// the leader gets a tiny santa hat.

const BODY = '#33150c';
const BODY_HI = '#54230f';

export function drawAnt(g, x, y, ang, { phase = 0, s = 1, carry = false } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(s, s);

  // legs: 3 per side on the thorax, swing with phase
  g.strokeStyle = BODY;
  g.lineWidth = 1.1;
  g.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const lx = -1 + i * 2.2;
      const sw = Math.sin(phase * 2 + i * 1.7 + (side > 0 ? Math.PI : 0)) * 2.2;
      g.beginPath();
      g.moveTo(lx, 0);
      g.lineTo(lx + sw * 0.4, side * (4.5 + Math.abs(sw) * 0.4));
      g.stroke();
    }
  }

  // gaster, thorax, head
  g.fillStyle = BODY;
  g.beginPath(); g.ellipse(-5.2, 0, 4.2, 3.1, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, 0, 2.4, 1.9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(4.6, 0, 2.9, 2.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = BODY_HI;
  g.beginPath(); g.ellipse(-5.8, -0.9, 2.4, 1.3, -0.3, 0, Math.PI * 2); g.fill();

  // antennae
  g.strokeStyle = BODY;
  g.lineWidth = 0.9;
  for (let side = -1; side <= 1; side += 2) {
    const w = Math.sin(phase * 3 + side) * 1.2;
    g.beginPath();
    g.moveTo(6.5, side * 1);
    g.quadraticCurveTo(9, side * (2.5 + w * 0.3), 10.5, side * (2 + w));
    g.stroke();
  }

  // carried dirt crumb
  if (carry) {
    g.fillStyle = '#8a5a2e';
    g.beginPath(); g.arc(9.5, 0, 2.2, 0, Math.PI * 2); g.fill();
  }

  g.restore();
}
