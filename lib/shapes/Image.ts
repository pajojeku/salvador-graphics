// Usunięto błędny fragment getCachedPixels spoza klasy
import { Shape, Point, Color, ShapeData } from './Shape';

export interface ImageData extends ShapeData {
  type: 'image';
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}


export class ImageShape extends Shape {
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  brightness: number = 0;
  red: number = 0;
  green: number = 0;
  blue: number = 0;
  mode: 'normal' | 'multiply' | 'grayscale' = 'normal';
  grayscaleMethod: 'average' | 'weighted' = 'average';
  // Filtry:
  filterType: 'none' | 'average' | 'median' | 'sobel' | 'sharpen' | 'gaussian' = 'none';
  maskSize: number = 3;
  sobelDir: 'x' | 'y' | 'xy' = 'xy';
  sobelThreshold: number = 64;
  sharpenStrength: number = 0.5;
  gaussianSigma: number = 1.0;
  private cachedPixels: Uint8ClampedArray | null = null;
  private originalPixels: Uint8ClampedArray | null = null;

  constructor(imageId: string, x: number, y: number, width: number, height: number) {
    super('image', { r: 0, g: 0, b: 0, a: 255 });
    this.imageId = imageId;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }



  setOriginalPixels(pixels: Uint8ClampedArray) {
    this.originalPixels = new Uint8ClampedArray(pixels);
    this.cachedPixels = new Uint8ClampedArray(pixels);
  }

  getOriginalPixels(): Uint8ClampedArray | null {
    return this.originalPixels;
  }

  setCachedPixels(pixels: Uint8ClampedArray) {
    this.cachedPixels = new Uint8ClampedArray(pixels);
  }

  getCachedPixels(): Uint8ClampedArray | null {
    return this.cachedPixels;
  }

  resetToOriginal() {
    if (this.originalPixels) {
      this.cachedPixels = new Uint8ClampedArray(this.originalPixels);
    }
  }

  draw(imageData: globalThis.ImageData): void {
    if (!this.visible || !this.cachedPixels) return;

    const srcWidth = this.width;
    const srcHeight = this.height;
    const dstWidth = imageData.width;
    const dstHeight = imageData.height;

    for (let dy = 0; dy < srcHeight; dy++) {
      for (let dx = 0; dx < srcWidth; dx++) {
        const targetX = Math.floor(this.x + dx);
        const targetY = Math.floor(this.y + dy);
        if (targetX < 0 || targetX >= dstWidth || targetY < 0 || targetY >= dstHeight) continue;
        const srcIdx = (dy * srcWidth + dx) * 4;
        const dstIdx = (targetY * dstWidth + targetX) * 4;
        let r = this.cachedPixels[srcIdx];
        let g = this.cachedPixels[srcIdx + 1];
        let b = this.cachedPixels[srcIdx + 2];
        let a = this.cachedPixels[srcIdx + 3];
        if (this.mode === 'normal') {
          r = Math.max(0, Math.min(255, r + Math.round((this.red / 100) * 255)));
          g = Math.max(0, Math.min(255, g + Math.round((this.green / 100) * 255)));
          b = Math.max(0, Math.min(255, b + Math.round((this.blue / 100) * 255)));
          if (this.brightness !== 0) {
            r = Math.max(0, Math.min(255, r + Math.round((this.brightness / 100) * 255)));
            g = Math.max(0, Math.min(255, g + Math.round((this.brightness / 100) * 255)));
            b = Math.max(0, Math.min(255, b + Math.round((this.brightness / 100) * 255)));
          }
        } else if (this.mode === 'multiply') {
          let rMult = this.red || 1;
          let gMult = this.green || 1;
          let bMult = this.blue || 1;
          let brightMult = this.brightness || 1;
          r = Math.max(0, Math.min(255, r * rMult * brightMult));
          g = Math.max(0, Math.min(255, g * gMult * brightMult));
          b = Math.max(0, Math.min(255, b * bMult * brightMult));
        } else if (this.mode === 'grayscale') {
          let gray = 0;
          if (this.grayscaleMethod === 'average') {
            gray = Math.round((r + g + b) / 3);
          } else {
            gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          }
          r = g = b = gray;
        }
        imageData.data[dstIdx] = r;
        imageData.data[dstIdx + 1] = g;
        imageData.data[dstIdx + 2] = b;
        imageData.data[dstIdx + 3] = a;
      }
    }
  }

  containsPoint(point: Point): boolean {
    return point.x >= this.x && point.x <= this.x + this.width &&
           point.y >= this.y && point.y <= this.y + this.height;
  }

  getBoundingBox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  getControlPoints(): Point[] {
    return [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height },
    ];
  }

  moveControlPoint(index: number, newPos: Point): void {
    if (index === 0) {
      const deltaX = newPos.x - this.x;
      const deltaY = newPos.y - this.y;
      this.x = newPos.x;
      this.y = newPos.y;
      this.width -= deltaX;
      this.height -= deltaY;
    } else if (index === 1) {
      const deltaY = newPos.y - this.y;
      this.y = newPos.y;
      this.width = newPos.x - this.x;
      this.height -= deltaY;
    } else if (index === 2) {
      this.width = newPos.x - this.x;
      this.height = newPos.y - this.y;
    } else if (index === 3) {
      const deltaX = newPos.x - this.x;
      this.x = newPos.x;
      this.width -= deltaX;
      this.height = newPos.y - this.y;
    }
  }

  serialize(): any {
    return {
      id: this.id,
      type: 'image',
      imageId: this.imageId,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      selected: this.selected,
      visible: this.visible,
      brightness: this.brightness,
      red: this.red,
      green: this.green,
      blue: this.blue,
      mode: this.mode,
      grayscaleMethod: this.grayscaleMethod,
      filterType: this.filterType,
      maskSize: this.maskSize,
      sobelDir: this.sobelDir,
      sobelThreshold: this.sobelThreshold,
  sharpenStrength: this.sharpenStrength,
  gaussianSigma: this.gaussianSigma,
    };
  }

  clone(): Shape {
    const cloned = new ImageShape(this.imageId, this.x, this.y, this.width, this.height);
    cloned.selected = this.selected;
    cloned.visible = this.visible;
    cloned.cachedPixels = this.cachedPixels;
    return cloned;
  }

  static deserialize(data: any): ImageShape {
    const image = new ImageShape(data.imageId, data.x, data.y, data.width, data.height);
    image.id = data.id;
    image.selected = data.selected;
    image.visible = data.visible;
    image.brightness = typeof data.brightness === 'number' ? data.brightness : 0;
    image.red = typeof data.red === 'number' ? data.red : 0;
    image.green = typeof data.green === 'number' ? data.green : 0;
    image.blue = typeof data.blue === 'number' ? data.blue : 0;
    if (data.mode === 'multiply' || data.mode === 'grayscale') {
      image.mode = data.mode;
    } else {
      image.mode = 'normal';
    }
    image.grayscaleMethod = data.grayscaleMethod === 'weighted' ? 'weighted' : 'average';
    // Filtry:
  if (data.filterType) image.filterType = data.filterType;
    if (typeof data.maskSize === 'number') image.maskSize = data.maskSize;
    if (data.sobelDir) image.sobelDir = data.sobelDir;
    if (typeof data.sobelThreshold === 'number') image.sobelThreshold = data.sobelThreshold;
    if (typeof data.sharpenStrength === 'number') image.sharpenStrength = data.sharpenStrength;
  if (typeof data.gaussianSigma === 'number') image.gaussianSigma = data.gaussianSigma;
  // originalPixels i cachedPixels muszą być ustawione po wczytaniu obrazu z DB!
    return image;
  }
}
