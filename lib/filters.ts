// 1D maska Gaussa
function gaussianKernel1D(size: number, sigma: number): number[] {
  const kernel = [];
  const mean = Math.floor(size / 2);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - mean;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }
  return kernel.map(v => v / sum);
}

// Filtr Gaussa (szybka konwolucja separowalna)
export function applyGaussianFilter(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  maskSize: number = 5,
  sigma: number = 1.0
): Uint8ClampedArray {
  const kernel = gaussianKernel1D(maskSize, sigma);
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);

  // Konwolucja w poziomie
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let k = 0; k < maskSize; k++) {
          const xx = Math.min(width - 1, Math.max(0, x + k - Math.floor(maskSize / 2)));
          acc += src[(y * width + xx) * 4 + c] * kernel[k];
        }
        tmp[(y * width + x) * 4 + c] = acc;
      }
      tmp[(y * width + x) * 4 + 3] = src[(y * width + x) * 4 + 3];
    }
  }

  // Konwolucja w pionie
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let k = 0; k < maskSize; k++) {
          const yy = Math.min(height - 1, Math.max(0, y + k - Math.floor(maskSize / 2)));
          acc += tmp[(yy * width + x) * 4 + c] * kernel[k];
        }
        dst[(y * width + x) * 4 + c] = acc;
      }
      dst[(y * width + x) * 4 + 3] = tmp[(y * width + x) * 4 + 3];
    }
  }
  return dst;
}
// Podstawowe filtry obrazu na Uint8ClampedArray
// Wszystkie funkcje zwracają nową tablicę (nie modyfikują wejścia)

export function applyAverageFilter(src: Uint8ClampedArray, width: number, height: number, maskSize: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  const half = Math.floor(maskSize / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            r += src[idx];
            g += src[idx + 1];
            b += src[idx + 2];
            a += src[idx + 3];
            count++;
          }
        }
      }
      const i = (y * width + x) * 4;
      dst[i] = r / count;
      dst[i + 1] = g / count;
      dst[i + 2] = b / count;
      dst[i + 3] = a / count;
    }
  }
  return dst;
}

export function applyMedianFilter(src: Uint8ClampedArray, width: number, height: number, maskSize: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  const half = Math.floor(maskSize / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rArr: number[] = [], gArr: number[] = [], bArr: number[] = [], aArr: number[] = [];
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            rArr.push(src[idx]);
            gArr.push(src[idx + 1]);
            bArr.push(src[idx + 2]);
            aArr.push(src[idx + 3]);
          }
        }
      }
      const i = (y * width + x) * 4;
      rArr.sort((a, b) => a - b);
      gArr.sort((a, b) => a - b);
      bArr.sort((a, b) => a - b);
      aArr.sort((a, b) => a - b);
      const mid = Math.floor(rArr.length / 2);
      dst[i] = rArr[mid];
      dst[i + 1] = gArr[mid];
      dst[i + 2] = bArr[mid];
      dst[i + 3] = aArr[mid];
    }
  }
  return dst;
}

export function applySobelFilter(src: Uint8ClampedArray, width: number, height: number, dir: 'x' | 'y' | 'xy', threshold: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  const gx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gy = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0, sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          // grayscale
          const v = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
          sx += gx[ky + 1][kx + 1] * v;
          sy += gy[ky + 1][kx + 1] * v;
        }
      }
      let mag = 0;
      if (dir === 'x') mag = Math.abs(sx);
      else if (dir === 'y') mag = Math.abs(sy);
      else mag = Math.sqrt(sx * sx + sy * sy);
      const edge = mag > threshold ? 255 : 0;
      const i = (y * width + x) * 4;
      dst[i] = dst[i + 1] = dst[i + 2] = edge;
      dst[i + 3] = 255;
    }
  }
  return dst;
}

export function applySharpenFilter(src: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
  // Prosta maska wyostrzająca
  const dst = new Uint8ClampedArray(src.length);
  const kernel = [
    0, -1, 0,
    -1, 4 + strength * 4, -1,
    0, -1, 0
  ];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const i = (y * width + x) * 4 + c;
        dst[i] = Math.max(0, Math.min(255, src[i] + sum));
      }
      // alpha
      dst[(y * width + x) * 4 + 3] = src[(y * width + x) * 4 + 3];
    }
  }
  return dst;
}
