import { Shape, Point, Color, ShapeData } from './Shape';

export interface PolygonData extends ShapeData {
  points: Point[];
}


export class Polygon extends Shape {
  points: Point[];
  rotation: number = 0; // radians

  constructor(points: Point[] = [], color?: Color, strokeWidth: number = 2, rotation: number = 0) {
    super('polygon' as any, color, strokeWidth);
    this.points = points;
    this.rotation = rotation;
  }

  draw(imageData: ImageData): void {
    // Always draw the actual points (they are rotated in-place)
    const pts = this.points;
    if (pts.length >= 2) {
      for (let i = 0; i < pts.length - 1; i++) {
        this.drawThickLine(imageData, pts[i], pts[i + 1], this.color, Math.max(1, this.strokeWidth));
      }
      // Close the polygon if at least 3 points
      if (pts.length >= 3) {
        this.drawThickLine(imageData, pts[pts.length - 1], pts[0], this.color, Math.max(1, this.strokeWidth));
      }
    }
    // Draw helper lines if selected
    if (this.selected && pts.length > 1) {
      const handleColor: Color = { r: 0, g: 120, b: 255, a: 255 };
      for (let i = 0; i < pts.length - 1; i++) {
        this.drawHelperLine(imageData, pts[i], pts[i + 1], handleColor);
      }
      if (pts.length >= 3) {
        this.drawHelperLine(imageData, pts[pts.length - 1], pts[0], handleColor);
      }
      this.drawSelectionHandles(imageData);
    }
  }

  private drawThickLine(imageData: ImageData, p1: Point, p2: Point, color: Color, thickness: number) {
    let x0 = Math.floor(p1.x), y0 = Math.floor(p1.y);
    let x1 = Math.floor(p2.x), y1 = Math.floor(p2.y);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
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

  containsPoint(point: Point): boolean {
    // Hit test: check if near any control point
    if (this.points.some(pt => Math.abs(pt.x - point.x) < 8 && Math.abs(pt.y - point.y) < 8)) {
      return true;
    }
    // Hit test: check if near any edge
    if (this.points.length >= 2) {
      for (let i = 0; i < this.points.length; i++) {
        const p1 = this.points[i];
        const p2 = this.points[(i + 1) % this.points.length];
        if (this.pointNearLine(point, p1, p2, 4)) {
          return true;
        }
      }
    }
    return false;
  }

  private pointNearLine(pt: Point, p1: Point, p2: Point, threshold: number): boolean {
    const A = pt.x - p1.x;
    const B = pt.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) {
      xx = p1.x;
      yy = p1.y;
    } else if (param > 1) {
      xx = p2.x;
      yy = p2.y;
    } else {
      xx = p1.x + param * C;
      yy = p1.y + param * D;
    }
    const dx = pt.x - xx;
    const dy = pt.y - yy;
    return dx * dx + dy * dy < threshold * threshold;
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
    // Move all points by dx, dy
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
  // Rotate all points around the centroid by delta (in radians)
  rotatePoints(delta: number): void {
    if (this.points.length === 0) return;
    const cx = this.points.reduce((sum, p) => sum + p.x, 0) / this.points.length;
    const cy = this.points.reduce((sum, p) => sum + p.y, 0) / this.points.length;
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    this.points = this.points.map(pt => ({
      x: cx + (pt.x - cx) * cos - (pt.y - cy) * sin,
      y: cy + (pt.x - cx) * sin + (pt.y - cy) * cos
    }));
  }

  serialize(): PolygonData {
    return {
      id: this.id,
      type: 'polygon',
      color: this.color,
      selected: this.selected,
      visible: this.visible,
      strokeWidth: this.strokeWidth,
      points: this.points.map(pt => ({ ...pt })),
      rotation: this.rotation,
    } as any;
  }

  clone(): Polygon {
    const newPolygon = new Polygon(this.points.map(pt => ({ ...pt })), { ...this.color }, this.strokeWidth, this.rotation);
    newPolygon.selected = this.selected;
    newPolygon.visible = this.visible;
    return newPolygon;
  }

  static deserialize(data: PolygonData): Polygon {
    const width = typeof data.strokeWidth === 'number' ? data.strokeWidth : 2;
    const rotation = typeof (data as any).rotation === 'number' ? (data as any).rotation : 0;
    const polygon = new Polygon(data.points.map(pt => ({ ...pt })), data.color, width, rotation);
    polygon.id = data.id;
    polygon.selected = data.selected;
    polygon.visible = data.visible !== undefined ? data.visible : true;
    return polygon;
  }
}
