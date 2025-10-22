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
  private cachedPixels: Uint8ClampedArray | null = null;

  constructor(imageId: string, x: number, y: number, width: number, height: number) {
    super('image', { r: 0, g: 0, b: 0, a: 255 });
    this.imageId = imageId;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  setCachedPixels(pixels: Uint8ClampedArray) {
    this.cachedPixels = pixels;
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

        imageData.data[dstIdx] = this.cachedPixels[srcIdx];
        imageData.data[dstIdx + 1] = this.cachedPixels[srcIdx + 1];
        imageData.data[dstIdx + 2] = this.cachedPixels[srcIdx + 2];
        imageData.data[dstIdx + 3] = this.cachedPixels[srcIdx + 3];
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
    return image;
  }
}
