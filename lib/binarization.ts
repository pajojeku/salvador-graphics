// Binarization algorithms for ImageShape
// All functions return a new Uint8ClampedArray (binary RGBA)

// 1. Manual threshold
export function manualThreshold(src: Uint8ClampedArray, width: number, height: number, threshold: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    // Luminance (simple average)
    const lum = (src[i] + src[i+1] + src[i+2]) / 3;
    const v = lum >= threshold ? 255 : 0;
    dst[i] = dst[i+1] = dst[i+2] = v;
    dst[i+3] = src[i+3];
  }
  return dst;
}

// 2. Percent Black Selection (returns threshold used)
export function percentBlackSelection(src: Uint8ClampedArray, width: number, height: number, percent: number): {dst: Uint8ClampedArray, threshold: number} {
  // Build histogram
  const hist = new Array(256).fill(0);
  let total = 0;
  for (let i = 0; i < src.length; i += 4) {
    const lum = (src[i] + src[i+1] + src[i+2]) / 3;
    hist[Math.round(lum)]++;
    total++;
  }
  // Find threshold for given percent black
  let sum = 0;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    sum += hist[t];
    if (sum / total >= percent / 100) {
      threshold = t;
      break;
    }
  }
  return { dst: manualThreshold(src, width, height, threshold), threshold };
}

// 3. Mean Iterative Selection
export function meanIterativeSelection(src: Uint8ClampedArray, width: number, height: number): {dst: Uint8ClampedArray, threshold: number} {
  // Initial threshold: mean luminance
  let sum = 0, count = 0;
  for (let i = 0; i < src.length; i += 4) {
    sum += (src[i] + src[i+1] + src[i+2]) / 3;
    count++;
  }
  let threshold = sum / count;
  let prev = -1;
  // Iterate
  while (Math.abs(threshold - prev) > 0.5) {
    let sum1 = 0, count1 = 0, sum2 = 0, count2 = 0;
    for (let i = 0; i < src.length; i += 4) {
      const lum = (src[i] + src[i+1] + src[i+2]) / 3;
      if (lum >= threshold) {
        sum1 += lum; count1++;
      } else {
        sum2 += lum; count2++;
      }
    }
    prev = threshold;
    const m1 = count1 ? sum1 / count1 : 0;
    const m2 = count2 ? sum2 / count2 : 0;
    threshold = (m1 + m2) / 2;
  }
  return { dst: manualThreshold(src, width, height, threshold), threshold };
}

// 4. Entropy Selection (Kapur's method)
export function entropySelection(src: Uint8ClampedArray, width: number, height: number): {dst: Uint8ClampedArray, threshold: number} {
  // Histogram
  const hist = new Array(256).fill(0);
  let total = 0;
  for (let i = 0; i < src.length; i += 4) {
    const lum = (src[i] + src[i+1] + src[i+2]) / 3;
    hist[Math.round(lum)]++;
    total++;
  }
  // Normalize
  const prob = hist.map(h => h / total);
  let maxEntropy = -Infinity;
  let bestT = 0;
  for (let t = 1; t < 255; t++) {
    let p0 = 0, p1 = 0, h0 = 0, h1 = 0;
    for (let i = 0; i <= t; i++) p0 += prob[i];
    for (let i = t+1; i < 256; i++) p1 += prob[i];
    for (let i = 0; i <= t; i++) if (prob[i] > 0) h0 -= (prob[i]/p0) * Math.log(prob[i]/p0);
    for (let i = t+1; i < 256; i++) if (prob[i] > 0) h1 -= (prob[i]/p1) * Math.log(prob[i]/p1);
    const entropy = h0 + h1;
    if (entropy > maxEntropy) {
      maxEntropy = entropy;
      bestT = t;
    }
  }
  return { dst: manualThreshold(src, width, height, bestT), threshold: bestT };
}

// 5. Minimum Error (Kittler-Illingworth)
export function minimumError(src: Uint8ClampedArray, width: number, height: number): {dst: Uint8ClampedArray, threshold: number} {
  // Histogram
  const hist = new Array(256).fill(0);
  let total = 0;
  for (let i = 0; i < src.length; i += 4) {
    const lum = (src[i] + src[i+1] + src[i+2]) / 3;
    hist[Math.round(lum)]++;
    total++;
  }
  let minJ = Infinity, bestT = 0;
  for (let t = 1; t < 255; t++) {
    let w0 = 0, w1 = 0, mu0 = 0, mu1 = 0, var0 = 0, var1 = 0;
    for (let i = 0; i <= t; i++) w0 += hist[i];
    for (let i = t+1; i < 256; i++) w1 += hist[i];
    if (w0 === 0 || w1 === 0) continue;
    for (let i = 0; i <= t; i++) mu0 += i * hist[i];
    for (let i = t+1; i < 256; i++) mu1 += i * hist[i];
    mu0 /= w0; mu1 /= w1;
    for (let i = 0; i <= t; i++) var0 += (i - mu0) * (i - mu0) * hist[i];
    for (let i = t+1; i < 256; i++) var1 += (i - mu1) * (i - mu1) * hist[i];
    var0 /= w0; var1 /= w1;
    if (var0 === 0 || var1 === 0) continue;
    const J = 1 + 2 * (w0 * Math.log(var0) + w1 * Math.log(var1)) - 2 * (w0 * Math.log(w0) + w1 * Math.log(w1));
    if (J < minJ) {
      minJ = J;
      bestT = t;
    }
  }
  return { dst: manualThreshold(src, width, height, bestT), threshold: bestT };
}

// 6. Fuzzy Minimum Error (simplified, similar to Kittler)
export function fuzzyMinimumError(src: Uint8ClampedArray, width: number, height: number): {dst: Uint8ClampedArray, threshold: number} {
  // Histogram
  const hist = new Array(256).fill(0);
  let total = 0;
  for (let i = 0; i < src.length; i += 4) {
    const lum = (src[i] + src[i+1] + src[i+2]) / 3;
    hist[Math.round(lum)]++;
    total++;
  }
  let minF = Infinity, bestT = 0;
  for (let t = 1; t < 255; t++) {
    let w0 = 0, w1 = 0, mu0 = 0, mu1 = 0;
    for (let i = 0; i <= t; i++) w0 += hist[i];
    for (let i = t+1; i < 256; i++) w1 += hist[i];
    if (w0 === 0 || w1 === 0) continue;
    for (let i = 0; i <= t; i++) mu0 += i * hist[i];
    for (let i = t+1; i < 256; i++) mu1 += i * hist[i];
    mu0 /= w0; mu1 /= w1;
    const F = w0 * w1 * (mu0 - mu1) * (mu0 - mu1);
    if (F < minF) {
      minF = F;
      bestT = t;
    }
  }
  return { dst: manualThreshold(src, width, height, bestT), threshold: bestT };
}
