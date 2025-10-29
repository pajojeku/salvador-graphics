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
    // Draw Bezier curve if at least 4 points, use strokeWidth for thickness
    if (this.points.length >= 4) {
      this.drawThickLineBezierCurve(imageData, this.points, this.color, Math.max(1, this.strokeWidth));
    }

    // Draw helper (blue) lines only if selected, above the curve
    if (this.selected && this.points.length > 1) {
      const handleColor: Color = { r: 0, g: 120, b: 255, a: 255 };
      for (let i = 0; i < this.points.length - 1; i++) {
        this.drawHelperLine(imageData, this.points[i], this.points[i + 1], handleColor);
      }
    }

    // Always show control points (draw on top)
    this.drawSelectionHandles(imageData);
  }

  // Draw Bezier curve with thickness
  private drawThickLineBezierCurve(imageData: ImageData, points: Point[], color: Color, thickness: number) {
    const steps = 200;
    let prev = this.getBezierPoint(points, 0);
    for (let t = 1; t <= steps; t++) {
      const tt = t / steps;
      const curr = this.getBezierPoint(points, tt);
      this.drawThickLine(imageData, prev, curr, color, thickness);
      prev = curr;
    }
  }

  // Draw a thin helper line (for blue lines)
  private drawHelperLine(imageData: ImageData, p1: Point, p2: Point, color: Color) {
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

  // Draw a thick line (like Canvas.tsx drawPixelLine)
  private drawThickLine(imageData: ImageData, p1: Point, p2: Point, color: Color, thickness: number) {
    let x0 = Math.floor(p1.x), y0 = Math.floor(p1.y);
    let x1 = Math.floor(p2.x), y1 = Math.floor(p2.y);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      // Draw a circle/brush for thickness > 1
      if (thickness <= 3) {
        for (let dy2 = -Math.floor(thickness / 2); dy2 <= Math.floor(thickness / 2); dy2++) {
          this.setPixel(imageData, x0, y0 + dy2, color);
        }
      } else {
        const radius = thickness / 2;
        const radiusSquared = radius * radius;
        const offset = Math.ceil(radius);
        for (let dy2 = -offset; dy2 <= offset; dy2++) {
          for (let dx2 = -offset; dx2 <= offset; dx2++) {
            const distSquared = dx2 * dx2 + dy2 * dy2;
            if (distSquared <= radiusSquared) {
              this.setPixel(imageData, x0 + dx2, y0 + dy2, color);
            }
          }
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  containsPoint(point: Point): boolean {
    // Hit test: check if near any control point
    if (this.points.some(pt => Math.abs(pt.x - point.x) < 8 && Math.abs(pt.y - point.y) < 8)) {
      return true;
    }
    // Hit test: check if near the curve (if enough points)
    if (this.points.length >= 4) {
      // Sample points along the curve and check distance
      const steps = 200;
      for (let t = 0; t <= steps; t++) {
        const tt = t / steps;
        const curvePt = this.getBezierPoint(this.points, tt);
        const dx = curvePt.x - point.x;
        const dy = curvePt.y - point.y;
        if (dx * dx + dy * dy < 16) { // within 4px
          return true;
        }
      }
    }
    return false;
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
      strokeWidth: this.strokeWidth,
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
    const width = typeof data.strokeWidth === 'number' ? data.strokeWidth : 2;
    const bezier = new Bezier(data.points.map(pt => ({ ...pt })), data.color, width);
    bezier.id = data.id;
    bezier.selected = data.selected;
    bezier.visible = data.visible !== undefined ? data.visible : true;
    return bezier;
  }
}
