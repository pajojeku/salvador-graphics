import { Shape, Point, Color, ShapeData } from './Shape';

export interface BezierData extends ShapeData {
  points: Point[];
}

export class Bezier extends Shape {
  points: Point[];

  constructor(points: Point[] = [], color?: Color, strokeWidth: number = 2) {
    super('bezier' as any, color, strokeWidth);
    this.points = points;
  }

  draw(imageData: ImageData): void {
    // Draw Bezier curve if at least 4 points, always in shape color
    if (this.points.length >= 4) {
      this.drawBezierCurve(imageData, this.points, this.color);
    }
    // Draw points and helper lines only if selected
    if (this.selected) {
      const handleColor: Color = { r: 0, g: 120, b: 255, a: 255 };
      const handleSize = 6;
      this.points.forEach(pt => {
        for (let dx = -handleSize / 2; dx < handleSize / 2; dx++) {
          for (let dy = -handleSize / 2; dy < handleSize / 2; dy++) {
            this.setPixel(imageData, pt.x + dx, pt.y + dy, handleColor);
          }
        }
      });
      // Draw lines between points
      for (let i = 0; i < this.points.length - 1; i++) {
        this.drawLine(imageData, this.points[i], this.points[i + 1], handleColor);
      }
      this.drawSelectionHandles(imageData);
    }

  }

  // De Casteljau's algorithm for Bezier curve
  private drawBezierCurve(imageData: ImageData, points: Point[], color: Color) {
    const steps = 200;
    let prev = this.getBezierPoint(points, 0);
    for (let t = 1; t <= steps; t++) {
      const tt = t / steps;
      const curr = this.getBezierPoint(points, tt);
      this.drawLine(imageData, prev, curr, color);
      prev = curr;
    }
  }

  // Calculate Bezier point for t in [0,1]
  private getBezierPoint(points: Point[], t: number): Point {
    let tmp = points.map(p => ({ ...p }));
    for (let k = 1; k < tmp.length; k++) {
      for (let i = 0; i < tmp.length - k; i++) {
        tmp[i] = {
          x: (1 - t) * tmp[i].x + t * tmp[i + 1].x,
          y: (1 - t) * tmp[i].y + t * tmp[i + 1].y
        };
      }
    }
    return tmp[0];
  }

  private drawLine(imageData: ImageData, p1: Point, p2: Point, color: Color) {
    let x0 = Math.floor(p1.x), y0 = Math.floor(p1.y);
    let x1 = Math.floor(p2.x), y1 = Math.floor(p2.y);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.setPixel(imageData, x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  containsPoint(point: Point): boolean {
    // Hit test: check if near any control point
    return this.points.some(pt => Math.abs(pt.x - point.x) < 8 && Math.abs(pt.y - point.y) < 8);
  }

  getBoundingBox() {
    if (this.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const xs = this.points.map(p => p.x);
    const ys = this.points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  move(dx: number, dy: number): void {
    this.points = this.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
  }

  getControlPoints(): Point[] {
    return this.points;
  }

  moveControlPoint(index: number, newPos: Point): void {
    if (index >= 0 && index < this.points.length) {
      this.points[index] = { ...newPos };
    }
  }

  serialize(): BezierData {
    return {
      id: this.id,
      type: 'bezier',
      color: this.color,
      selected: this.selected,
      visible: this.visible,
      points: this.points.map(pt => ({ ...pt })),
    };
  }

  clone(): Bezier {
    const newBezier = new Bezier(this.points.map(pt => ({ ...pt })), { ...this.color }, this.strokeWidth);
    newBezier.selected = this.selected;
    newBezier.visible = this.visible;
    return newBezier;
  }

  static deserialize(data: BezierData): Bezier {
    const bezier = new Bezier(data.points.map(pt => ({ ...pt })), data.color, 2);
    bezier.id = data.id;
    bezier.selected = data.selected;
    bezier.visible = data.visible !== undefined ? data.visible : true;
    return bezier;
  }
}
