export class Perlin {
  constructor(seed) {
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    let s = seed >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  static fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  static lerp(a, b, t) { return a + t * (b - a); }
  grad2(h, x, y) {
    switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; }
  }
  grad3(h, x, y, z) {
    switch (h & 15) {
      case 0: return x + y;  case 1: return -x + y; case 2: return x - y;  case 3: return -x - y;
      case 4: return x + z;  case 5: return -x + z; case 6: return x - z;  case 7: return -x - z;
      case 8: return y + z;  case 9: return -y + z; case 10: return y - z; case 11: return -y - z;
      case 12: return x + y; case 13: return -y + z; case 14: return -x + y; default: return -y - z;
    }
  }
  noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = Perlin.fade(x), v = Perlin.fade(y), p = this.p;
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = Perlin.lerp(this.grad2(aa, x, y), this.grad2(ba, x - 1, y), u);
    const x2 = Perlin.lerp(this.grad2(ab, x, y - 1), this.grad2(bb, x - 1, y - 1), u);
    return Perlin.lerp(x1, x2, v);
  }
  noise3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = Perlin.fade(x), v = Perlin.fade(y), w = Perlin.fade(z), p = this.p;
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return Perlin.lerp(
      Perlin.lerp(
        Perlin.lerp(this.grad3(p[AA], x, y, z),     this.grad3(p[BA], x - 1, y, z), u),
        Perlin.lerp(this.grad3(p[AB], x, y - 1, z), this.grad3(p[BB], x - 1, y - 1, z), u), v),
      Perlin.lerp(
        Perlin.lerp(this.grad3(p[AA + 1], x, y, z - 1),     this.grad3(p[BA + 1], x - 1, y, z - 1), u),
        Perlin.lerp(this.grad3(p[AB + 1], x, y - 1, z - 1), this.grad3(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }
}

export let perlin = new Perlin(20240517);
export let hashSeed = 0;

export function initPerlin(seed) {
  const s = (seed >>> 0) || 1;
  perlin = new Perlin(s);
  hashSeed = s;
}

export function fbm2(x, y, oct = 4) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * perlin.noise2(x * f, y * f); n += a; a *= 0.5; f *= 2; }
  return s / n;
}
export function fbm3(x, y, z, oct = 3) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * perlin.noise3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2; }
  return s / n;
}
export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + (hashSeed | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 1103515245) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}