// codec.js — pack drawn strokes into a compact byte array -> base64url.
//
// Format (v1):
//   u8  version = 1
//   u8  flags   (bit0: payload is deflate-raw compressed)
//   payload:
//     u16 aspect * 1000   (aspect of the dirt area the message was drawn in)
//     u8  strokeCount
//     per stroke:
//       u16 pointCount
//       per point: u32 big-endian  x:10 | y:10 | dt:12
//         x, y  = 0..1023 normalised to the dirt rect
//         dt    = milliseconds since the previous point, in 25ms units
//                 (12 bits -> up to ~102s; a pause is basically free)

const VERSION = 1;
const DT_MS = 25;
const DT_MAX = 0xfff;
export const COORD_MAX = 0x3ff;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_REV = new Map([...B64].map((c, i) => [c, i]));

export function b64urlEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    s += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    s += b === undefined ? '' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    s += c === undefined ? '' : B64[c & 63];
  }
  return s;
}

export function b64urlDecode(str) {
  const s = str.replace(/[^A-Za-z0-9\-_]/g, '');
  const out = new Uint8Array(Math.floor(s.length * 3 / 4));
  let o = 0, acc = 0, bits = 0;
  for (const ch of s) {
    const v = B64_REV.get(ch);
    if (v === undefined) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}

async function pipeThrough(bytes, StreamCtor, kind) {
  const stream = new Blob([bytes]).stream().pipeThrough(new StreamCtor(kind));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// strokes: [[{x,y,dt}], ...]  x,y in 0..1023, dt in ms (first pt of each
// stroke carries the gap since the previous stroke ended)
export async function encodeMessage(strokes, aspect) {
  const nPts = strokes.reduce((n, s) => n + s.length, 0);
  const payload = new Uint8Array(3 + strokes.length * 2 + nPts * 4);
  const v = new DataView(payload.buffer);
  let o = 0;
  v.setUint16(o, Math.round(aspect * 1000)); o += 2;
  v.setUint8(o++, strokes.length);
  for (const s of strokes) {
    v.setUint16(o, s.length); o += 2;
    for (const p of s) {
      const dt = Math.min(DT_MAX, Math.max(0, Math.round(p.dt / DT_MS)));
      v.setUint32(o, (p.x << 22) | (p.y << 12) | dt); o += 4;
    }
  }

  let body = payload, flags = 0;
  if (typeof CompressionStream !== 'undefined') {
    try {
      const deflated = await pipeThrough(payload, CompressionStream, 'deflate-raw');
      if (deflated.length < body.length) { body = deflated; flags |= 1; }
    } catch { /* store raw */ }
  }

  const out = new Uint8Array(2 + body.length);
  out[0] = VERSION; out[1] = flags;
  out.set(body, 2);
  return b64urlEncode(out);
}

// -> { aspect, strokes: [[{x,y,dt}]] } with x,y in 0..1023, dt in ms
export async function decodeMessage(b64) {
  const bytes = b64urlDecode(b64);
  if (bytes.length < 5) throw new Error('message too short');
  if (bytes[0] !== VERSION) throw new Error('unknown message version');
  const flags = bytes[1];
  let body = bytes.subarray(2);
  if (flags & 1) body = await pipeThrough(body, DecompressionStream, 'deflate-raw');

  const v = new DataView(body.buffer, body.byteOffset, body.byteLength);
  let o = 0;
  const aspect = v.getUint16(o) / 1000; o += 2;
  const nStrokes = v.getUint8(o++);
  const strokes = [];
  for (let s = 0; s < nStrokes; s++) {
    const n = v.getUint16(o); o += 2;
    const stroke = [];
    for (let i = 0; i < n; i++) {
      const w = v.getUint32(o); o += 4;
      stroke.push({ x: w >>> 22, y: (w >>> 12) & COORD_MAX, dt: (w & DT_MAX) * DT_MS });
    }
    strokes.push(stroke);
  }
  return { aspect, strokes };
}
