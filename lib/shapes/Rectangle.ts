import { Shape, Point, Color, ShapeData } from './Shape';

export interface RectangleData extends ShapeData {
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
  strokeWidth: number;
}

export class Rectangle extends Shape {
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;

  constructor(x: number, y: number, width: number, height: number, filled: boolean = false, color?: Color, strokeWidth: number = 1) {
    super('rectangle', color, strokeWidth);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.filled = filled;
  }

  draw(imageData: ImageData): void {
    // Normalizuj współrzędne - zawsze używaj dodatnich wymiarów
    const x1 = Math.min(this.x, this.x + this.width);
    const y1 = Math.min(this.y, this.y + this.height);
    const x2 = Math.max(this.x, this.x + this.width);
    const y2 = Math.max(this.y, this.y + this.height);

    if (this.filled) {
      // Fill rectangle
      for (let y = Math.floor(y1); y <= Math.floor(y2); y++) {
        for (let x = Math.floor(x1); x <= Math.floor(x2); x++) {
          this.setPixel(imageData, x, y);
        }
      }
    } else {
      // Draw rectangle outline with stroke width - z ostrymi narożnikami 90°
      const halfWidth = Math.floor(this.strokeWidth / 2);
      
      // Top edge - rozszerzona o strokeWidth w lewo i prawo dla ostrych narożników
      for (let y = Math.floor(y1) - halfWidth; y <= Math.floor(y1) + halfWidth; y++) {
        for (let x = Math.floor(x1) - halfWidth; x <= Math.floor(x2) + halfWidth; x++) {
          this.setPixel(imageData, x, y);
        }
      }
      
      // Bottom edge - rozszerzona o strokeWidth w lewo i prawo dla ostrych narożników
      for (let y = Math.floor(y2) - halfWidth; y <= Math.floor(y2) + halfWidth; y++) {
        for (let x = Math.floor(x1) - halfWidth; x <= Math.floor(x2) + halfWidth; x++) {
          this.setPixel(imageData, x, y);
        }
      }
      
      // Left edge - bez narożników (już narysowane w top/bottom)
      for (let y = Math.floor(y1) + halfWidth + 1; y <= Math.floor(y2) - halfWidth - 1; y++) {
        for (let x = Math.floor(x1) - halfWidth; x <= Math.floor(x1) + halfWidth; x++) {
          this.setPixel(imageData, x, y);
        }
      }
      
      // Right edge - bez narożników (już narysowane w top/bottom)
      for (let y = Math.floor(y1) + halfWidth + 1; y <= Math.floor(y2) - halfWidth - 1; y++) {
        for (let x = Math.floor(x2) - halfWidth; x <= Math.floor(x2) + halfWidth; x++) {
          this.setPixel(imageData, x, y);
        }
      }
    }

    this.drawSelectionHandles(imageData);
  }

  containsPoint(point: Point): boolean {
    // Normalizuj współrzędne
    const x1 = Math.min(this.x, this.x + this.width);
    const y1 = Math.min(this.y, this.y + this.height);
    const x2 = Math.max(this.x, this.x + this.width);
    const y2 = Math.max(this.y, this.y + this.height);
    
    if (this.filled) {
      return point.x >= x1 && point.x <= x2 &&
             point.y >= y1 && point.y <= y2;
    } else {
      // Check if point is near any edge
      const threshold = 5;
      const nearLeft = Math.abs(point.x - x1) < threshold && point.y >= y1 && point.y <= y2;
      const nearRight = Math.abs(point.x - x2) < threshold && point.y >= y1 && point.y <= y2;
      const nearTop = Math.abs(point.y - y1) < threshold && point.x >= x1 && point.x <= x2;
      const nearBottom = Math.abs(point.y - y2) < threshold && point.x >= x1 && point.x <= x2;
      
      return nearLeft || nearRight || nearTop || nearBottom;
    }
  }

  getBoundingBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  getControlPoints(): Point[] {
    // Return 4 corners
    return [
      { x: this.x, y: this.y }, // Top-left
      { x: this.x + this.width, y: this.y }, // Top-right
      { x: this.x + this.width, y: this.y + this.height }, // Bottom-right
      { x: this.x, y: this.y + this.height } // Bottom-left
    ];
  }

  moveControlPoint(index: number, newPos: Point): void {
    switch (index) {
      case 0: // Top-left
        this.width += this.x - newPos.x;
        this.height += this.y - newPos.y;
        this.x = newPos.x;
        this.y = newPos.y;
        break;
      case 1: // Top-right
        this.width = newPos.x - this.x;
        this.height += this.y - newPos.y;
        this.y = newPos.y;
        break;
      case 2: // Bottom-right
        this.width = newPos.x - this.x;
        this.height = newPos.y - this.y;
        break;
      case 3: // Bottom-left
        this.width += this.x - newPos.x;
        this.x = newPos.x;
        this.height = newPos.y - this.y;
        break;
    }
  }

  serialize(): RectangleData {
    return {
      id: this.id,
      type: this.type,
      color: this.color,
      selected: this.selected,
      visible: this.visible,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      filled: this.filled,
      strokeWidth: this.strokeWidth
    };
  }

  clone(): Rectangle {
    const newRect = new Rectangle(this.x, this.y, this.width, this.height, this.filled, { ...this.color }, this.strokeWidth);
    newRect.selected = this.selected;
    newRect.visible = this.visible;
    return newRect;
  }

  static deserialize(data: RectangleData): Rectangle {
    const rect = new Rectangle(data.x, data.y, data.width, data.height, data.filled, data.color, data.strokeWidth || 1);
    rect.id = data.id;
    rect.selected = data.selected;
    rect.visible = data.visible !== undefined ? data.visible : true;
    return rect;
  }
}
