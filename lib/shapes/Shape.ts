// Base class for all shapes
export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ShapeType = 'line' | 'rectangle' | 'circle' | 'brush' | 'image' | 'rgbcube';

export interface ShapeData {
  id: string;
  type: ShapeType;
  color: Color;
  selected: boolean;
  visible: boolean;
  strokeWidth?: number;
}

export abstract class Shape {
  id: string;
  type: ShapeType;
  color: Color;
  selected: boolean = false;
  visible: boolean = true;
  strokeWidth: number;

  constructor(type: ShapeType, color: Color = { r: 0, g: 0, b: 0, a: 255 }, strokeWidth: number = 1) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.color = color;
    this.strokeWidth = strokeWidth;
    this.visible = true;
  }

  // Abstract methods to be implemented by subclasses
  abstract draw(imageData: ImageData): void;
  abstract containsPoint(point: Point): boolean;
  abstract getBoundingBox(): { x: number; y: number; width: number; height: number };
  abstract move(dx: number, dy: number): void;
  abstract getControlPoints(): Point[];
  abstract moveControlPoint(index: number, newPos: Point): void;
  abstract serialize(): any;
  abstract clone(): Shape;

  // Helper method to set pixel in ImageData
  protected setPixel(imageData: ImageData, x: number, y: number, color: Color = this.color): void {
    const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
    
    // Bounds checking
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      return;
    }

    imageData.data[index] = color.r;
    imageData.data[index + 1] = color.g;
    imageData.data[index + 2] = color.b;
    imageData.data[index + 3] = color.a;
  }

  // Helper to draw selection handles
  drawSelectionHandles(imageData: ImageData): void {
    if (!this.selected) return;

    const handles = this.getControlPoints();
    const handleSize = 6;
    const handleColor: Color = { r: 0, g: 120, b: 255, a: 255 };

    handles.forEach(handle => {
      // Draw small rectangles for handles
      for (let dx = -handleSize / 2; dx < handleSize / 2; dx++) {
        for (let dy = -handleSize / 2; dy < handleSize / 2; dy++) {
          this.setPixel(imageData, handle.x + dx, handle.y + dy, handleColor);
        }
      }
    });
  }
}
