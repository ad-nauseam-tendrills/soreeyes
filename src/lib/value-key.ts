// Value key: deterministic image maths for turning a reference photo into a
// two- or three-value "answer key". No ML — luminance, a histogram, Otsu's
// threshold and posterization. Runs in the browser on canvas pixel data.

/** Rec. 709 relative luminance of 8-bit sRGB values, 0–255. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Luminance for every pixel of RGBA data. */
export function lumaOf(rgba: Uint8ClampedArray | number[]): Uint8Array {
  const n = Math.floor(rgba.length / 4);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.round(luminance(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
  return out;
}

export function histogram(luma: ArrayLike<number>): number[] {
  const h = new Array<number>(256).fill(0);
  for (let i = 0; i < luma.length; i++) h[luma[i]]++;
  return h;
}

/**
 * Otsu's threshold over the histogram range [lo, hi]: the cut that best separates
 * the values into two groups. Returns t such that values < t are "dark".
 */
export function otsu(hist: number[], lo = 0, hi = 255): number {
  let total = 0;
  let sum = 0;
  for (let v = lo; v <= hi; v++) {
    total += hist[v];
    sum += v * hist[v];
  }
  if (total === 0) return Math.round((lo + hi) / 2);
  let wB = 0;
  let sumB = 0;
  let best = -1;
  let bestT = lo;
  for (let t = lo; t <= hi; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      bestT = t;
    }
  }
  return bestT + 1;
}

/**
 * Two-threshold Otsu: the pair of cuts that best separates the values into three
 * groups (exhaustive search with prefix sums — 256² steps, instant).
 * Returns [t1, t2]: values < t1 dark, < t2 middle, the rest light.
 */
export function otsu3(hist: number[]): [number, number] {
  const P = new Array<number>(257).fill(0); // counts of values < i
  const S = new Array<number>(257).fill(0); // sum of values < i
  for (let v = 0; v < 256; v++) {
    P[v + 1] = P[v] + hist[v];
    S[v + 1] = S[v] + v * hist[v];
  }
  const total = P[256];
  if (total === 0) return [85, 170];
  const term = (a: number, b: number) => {
    const w = P[b] - P[a];
    if (w === 0) return 0;
    const s = S[b] - S[a];
    return (s * s) / w; // between-class variance up to a constant
  };
  let best = -1;
  let bestPair: [number, number] = [85, 170];
  for (let t1 = 1; t1 < 255; t1++) {
    for (let t2 = t1 + 1; t2 < 256; t2++) {
      const v = term(0, t1) + term(t1, t2) + term(t2, 256);
      if (v > best) {
        best = v;
        bestPair = [t1, t2];
      }
    }
  }
  return bestPair;
}

/** Default thresholds: one cut for two values (Otsu), two for three (two-threshold Otsu). */
export function defaultThresholds(hist: number[], levels: 2 | 3): number[] {
  return levels === 2 ? [otsu(hist)] : otsu3(hist);
}

/** Display grays for each level, darkest first (paint-like, not pure black/white). */
export const LEVEL_GRAYS: Record<2 | 3, number[]> = {
  2: [58, 214],
  3: [58, 140, 222],
};

/** Map each luminance to its level gray given ascending thresholds. */
export function posterize(luma: ArrayLike<number>, thresholds: number[], grays: number[]): Uint8Array {
  const out = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i++) {
    let level = 0;
    while (level < thresholds.length && luma[i] >= thresholds[level]) level++;
    out[i] = grays[level];
  }
  return out;
}
