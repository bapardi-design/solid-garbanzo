/** Seeded, serialisable PRNG (sfc32) plus small distribution helpers. */
export interface RngState { a: number; b: number; c: number; d: number }

export function hashString(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  private s: RngState;

  constructor(seed: string | RngState) {
    if (typeof seed === 'string') {
      this.s = {
        a: hashString(seed),
        b: hashString(seed + '#b'),
        c: hashString(seed + '#c'),
        d: hashString(seed + '#d'),
      };
      for (let i = 0; i < 16; i++) this.next();
    } else {
      this.s = { ...seed };
    }
  }

  state(): RngState { return { ...this.s }; }

  /** Uniform float in [0, 1). */
  next(): number {
    const s = this.s;
    s.a >>>= 0; s.b >>>= 0; s.c >>>= 0; s.d >>>= 0;
    let t = (s.a + s.b) | 0;
    s.a = s.b ^ (s.b >>> 9);
    s.b = (s.c + (s.c << 3)) | 0;
    s.c = (s.c << 21) | (s.c >>> 11);
    s.d = (s.d + 1) | 0;
    t = (t + s.d) | 0;
    s.c = (s.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  float(min: number, max: number): number { return min + this.next() * (max - min); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  normal(mean = 0, sd = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  poisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= this.next(); } while (p > L);
    return k - 1;
  }
  /** Weighted pick; weights must be non-negative and not all zero. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }
  fork(label: string): Rng { return new Rng(`${label}:${this.int(0, 0x7fffffff)}`); }
}

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
export const round1 = (x: number): number => Math.round(x * 10) / 10;
