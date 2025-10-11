import { Shape, Point, Color, ShapeData } from './Shape';

export interface LineData extends ShapeData {
  start: Point;
  end: Point;
  strokeWidth: number;
}

export class Line extends Shape {
  start: Point;
  end: Point;

  constructor(start: Point, end: Point, color?: Color, strokeWidth: number = 1) {
    super('line', color, strokeWidth);
    this.start = start;
    this.end = end;
  }

  // Bresenham's line algorithm with stroke width support
  draw(imageData: ImageData): void {
    const halfWidth = Math.floor(this.strokeWidth / 2);
    
    // Dla każdej linii w obrębie grubości
    for (let dy = -halfWidth; dy <= halfWidth; dy++) {
      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        // Sprawdź czy piksel jest w obrębie okręgu o promieniu strokeWidth/2
        if (dx * dx + dy * dy <= halfWidth * halfWidth) {
          this.drawBasicLine(imageData, 
            this.start.x + dx, this.start.y + dy, 
            this.end.x + dx, this.end.y + dy);
        }
      }
    }

    this.drawSelectionHandles(imageData);
  }

  private drawBasicLine(imageData: ImageData, x0: number, y0: number, x1: number, y1: number): void {
    let startX = Math.floor(x0);
    let startY = Math.floor(y0);
    let endX = Math.floor(x1);
    let endY = Math.floor(y1);

    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(imageData, startX, startY);

      if (startX === endX && startY === endY) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        startX += sx;
      }
      if (e2 < dx) {
        err += dx;
        startY += sy;
      }
    }
  }

  containsPoint(point: Point): boolean {
    // Distance from point to line segment
    const A = point.x - this.start.x;
    const B = point.y - this.start.y;
    const C = this.end.x - this.start.x;
    const D = this.end.y - this.start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = this.start.x;
      yy = this.start.y;
    } else if (param > 1) {
      xx = this.end.x;
      yy = this.end.y;
    } else {
      xx = this.start.x + param * C;
      yy = this.start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < 5; // 5 pixel threshold
  }

  getBoundingBox() {
    return {
      x: Math.min(this.start.x, this.end.x),
      y: Math.min(this.start.y, this.end.y),
      width: Math.abs(this.end.x - this.start.x),
      height: Math.abs(this.end.y - this.start.y)
    };
  }

  move(dx: number, dy: number): void {
    this.start.x += dx;
    this.start.y += dy;
    this.end.x += dx;
    this.end.y += dy;
  }

  getControlPoints(): Point[] {
    return [this.start, this.end];
  }

  moveControlPoint(index: number, newPos: Point): void {
    if (index === 0) {
      this.start = { ...newPos };
    } else if (index === 1) {
      this.end = { ...newPos };
    }
  }

  serialize(): LineData {
    return {
      id: this.id,
      type: this.type,
      color: this.color,
      selected: this.selected,
      visible: this.visible,
      start: this.start,
      end: this.end,
      strokeWidth: this.strokeWidth
    };
  }

  clone(): Line {
    const newLine = new Line({ ...this.start }, { ...this.end }, { ...this.color }, this.strokeWidth);
    newLine.selected = this.selected;
    newLine.visible = this.visible;
    return newLine;
  }

  static deserialize(data: LineData): Line {
    const line = new Line(data.start, data.end, data.color, data.strokeWidth || 1);
    line.id = data.id;
    line.selected = data.selected;
    line.visible = data.visible !== undefined ? data.visible : true;
    return line;
  }
}
