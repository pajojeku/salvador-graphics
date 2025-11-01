// Morphological filters for binary images (Uint8ClampedArray, 0/255 per pixel)
// All functions assume grayscale, single-channel, 8-bit images

export type MorphologyType =
  | 'none'
  | 'dilation'
  | 'erosion'
  | 'opening'
  | 'closing'
  | 'hitormiss';

export interface MorphologyOptions {
  kernelSize?: number; // odd, >= 3
  // For hit-or-miss, could add structuring element pattern in future
}

function getNeighborhood(
  src: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  kernelSize: number,
  structElem?: number[][],
  center?: { x: number; y: number }
): number[] {
  // center: współrzędne środka w macierzy structElem (domyślnie środek)
  const cx = center?.x ?? Math.floor(kernelSize / 2);
  const cy = center?.y ?? Math.floor(kernelSize / 2);
  const values: number[] = [];
  for (let sy = 0; sy < kernelSize; sy++) {
    for (let sx = 0; sx < kernelSize; sx++) {
      if (!structElem || structElem[sy]?.[sx]) {
        const dx = sx - cx;
        const dy = sy - cy;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          values.push(src[(ny * width + nx) * 4]);
        }
      }
    }
  }
  return values;
}

export function applyDilation(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number = 3,
  structElem?: number[][],
  center?: { x: number; y: number }
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values = getNeighborhood(src, x, y, width, height, kernelSize, structElem, center);
      const max = values.length ? Math.max(...values) : 0;
      for (let c = 0; c < 4; c++) {
        out[(y * width + x) * 4 + c] = c === 3 ? src[(y * width + x) * 4 + 3] : max;
      }
    }
  }
  return out;
}

export function applyErosion(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number = 3,
  structElem?: number[][],
  center?: { x: number; y: number }
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values = getNeighborhood(src, x, y, width, height, kernelSize, structElem, center);
      const min = values.length ? Math.min(...values) : 255;
      for (let c = 0; c < 4; c++) {
        out[(y * width + x) * 4 + c] = c === 3 ? src[(y * width + x) * 4 + 3] : min;
      }
    }
  }
  return out;
}

export function applyOpening(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number = 3,
  structElem?: number[][],
  center?: { x: number; y: number }
): Uint8ClampedArray {
  return applyDilation(
    applyErosion(src, width, height, kernelSize, structElem, center),
    width, height, kernelSize, structElem, center
  );
}

export function applyClosing(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number = 3,
  structElem?: number[][],
  center?: { x: number; y: number }
): Uint8ClampedArray {
  return applyErosion(
    applyDilation(src, width, height, kernelSize, structElem, center),
    width, height, kernelSize, structElem, center
  );
}

export function applyHitOrMiss(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  kernelSize: number = 3,
  structElem?: number[][],
  center?: { x: number; y: number }
): Uint8ClampedArray {
  // Simple version: thinning (erosion) and thickening (dilation) overlay
  // For real hit-or-miss, need structuring element pattern
  const eroded = applyErosion(src, width, height, kernelSize, structElem, center);
  const dilated = applyDilation(src, width, height, kernelSize, structElem, center);
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    // If pixel is foreground in eroded but not in dilated, mark as hit (thinning)
    out[i] = eroded[i] === 255 && dilated[i] !== 255 ? 255 : 0;
    out[i + 1] = out[i];
    out[i + 2] = out[i];
    out[i + 3] = src[i + 3];
  }
  return out;
}
