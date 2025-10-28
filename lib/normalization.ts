// Histogram stretching (contrast stretching)
export function histogramStretch(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  // Find min/max for each channel (ignore alpha=0)
  let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
  for (let i = 0; i < src.length; i += 4) {
    if (src[i+3] === 0) continue;
    rmin = Math.min(rmin, src[i]); rmax = Math.max(rmax, src[i]);
    gmin = Math.min(gmin, src[i+1]); gmax = Math.max(gmax, src[i+1]);
    bmin = Math.min(bmin, src[i+2]); bmax = Math.max(bmax, src[i+2]);
  }
  // Stretch each channel
  for (let i = 0; i < src.length; i += 4) {
    dst[i]   = rmax > rmin ? ((src[i]   - rmin) * 255) / (rmax - rmin) : src[i];
    dst[i+1] = gmax > gmin ? ((src[i+1] - gmin) * 255) / (gmax - gmin) : src[i+1];
    dst[i+2] = bmax > bmin ? ((src[i+2] - bmin) * 255) / (bmax - bmin) : src[i+2];
    dst[i+3] = src[i+3];
  }
  return dst;
}

// Histogram equalization (per channel, ignoring alpha=0)
export function histogramEqualize(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  // Compute histograms
  const histR = new Array(256).fill(0), histG = new Array(256).fill(0), histB = new Array(256).fill(0);
  let total = 0;
  for (let i = 0; i < src.length; i += 4) {
    if (src[i+3] === 0) continue;
    histR[src[i]]++;
    histG[src[i+1]]++;
    histB[src[i+2]]++;
    total++;
  }
  // Compute CDFs
  const cdfR = new Array(256).fill(0), cdfG = new Array(256).fill(0), cdfB = new Array(256).fill(0);
  cdfR[0] = histR[0]; cdfG[0] = histG[0]; cdfB[0] = histB[0];
  for (let i = 1; i < 256; i++) {
    cdfR[i] = cdfR[i-1] + histR[i];
    cdfG[i] = cdfG[i-1] + histG[i];
    cdfB[i] = cdfB[i-1] + histB[i];
  }
  // Map pixels
  for (let i = 0; i < src.length; i += 4) {
    if (src[i+3] === 0) {
      dst[i] = src[i]; dst[i+1] = src[i+1]; dst[i+2] = src[i+2]; dst[i+3] = src[i+3];
      continue;
    }
    dst[i]   = Math.round((cdfR[src[i]] / total) * 255);
    dst[i+1] = Math.round((cdfG[src[i+1]] / total) * 255);
    dst[i+2] = Math.round((cdfB[src[i+2]] / total) * 255);
    dst[i+3] = src[i+3];
  }
  return dst;
}
