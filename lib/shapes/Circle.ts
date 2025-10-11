import { Shape, Point, Color, ShapeData } from './Shape';

export interface CircleData extends ShapeData {
  center: Point;
  radius: number;
  filled: boolean;
  strokeWidth: number;
}

export class Circle extends Shape {
  center: Point;
  radius: number;
  filled: boolean;

  constructor(center: Point, radius: number, filled: boolean = false, color?: Color, strokeWidth: number = 1) {
    super('circle', color, strokeWidth);
    this.center = center;
    this.radius = radius;
    this.filled = filled;
  }

  // Midpoint Circle Algorithm (Bresenham's circle) with stroke width support
  draw(imageData: ImageData): void {
    const cx = Math.floor(this.center.x);
    const cy = Math.floor(this.center.y);
    const r = Math.floor(this.radius);

    if (this.filled) {
      // Filled circle using scan-line fill
      for (let y = -r; y <= r; y++) {
        const dx = Math.floor(Math.sqrt(r * r - y * y));
        for (let x = -dx; x <= dx; x++) {
          this.setPixel(imageData, cx + x, cy + y);
        }
      }
    } else {
      // Draw circle outline with stroke width
      const halfStroke = Math.max(0.5, this.strokeWidth / 2);
      const innerRadius = Math.max(0, r - halfStroke);
      const outerRadius = r + halfStroke;
      
      for (let y = -Math.ceil(outerRadius); y <= Math.ceil(outerRadius); y++) {
        for (let x = -Math.ceil(outerRadius); x <= Math.ceil(outerRadius); x++) {
          const distance = Math.sqrt(x * x + y * y);
          if (distance >= innerRadius && distance <= outerRadius) {
            this.setPixel(imageData, cx + x, cy + y);
          }
        }
      }
    }

    this.drawSelectionHandles(imageData);
  }

  containsPoint(point: Point): boolean {
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (this.filled) {
      return distance <= this.radius;
    } else {
      // Check if point is near the circle edge
      return Math.abs(distance - this.radius) < 5; // 5 pixel threshold
    }
  }

  getBoundingBox() {
    return {
      x: this.center.x - this.radius,
      y: this.center.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }

  move(dx: number, dy: number): void {
    this.center.x += dx;
    this.center.y += dy;
  }

  getControlPoints(): Point[] {
    // Return 5 points: center + 4 cardinal points on circumference
    return [
      this.center,
      { x: this.center.x + this.radius, y: this.center.y }, // Right
      { x: this.center.x, y: this.center.y - this.radius }, // Top
      { x: this.center.x - this.radius, y: this.center.y }, // Left
      { x: this.center.x, y: this.center.y + this.radius }  // Bottom
    ];
  }

  moveControlPoint(index: number, newPos: Point): void {
    if (index === 0) {
      // Moving center
      this.center = { ...newPos };
    } else {
      // Moving radius control points
      const dx = newPos.x - this.center.x;
      const dy = newPos.y - this.center.y;
      this.radius = Math.sqrt(dx * dx + dy * dy);
    }
  }

  serialize(): CircleData {
    return {
      id: this.id,
      type: this.type,
      color: this.color,
      selected: this.selected,
      visible: this.visible,
      center: this.center,
      radius: this.radius,
      filled: this.filled,
      strokeWidth: this.strokeWidth
    };
  }

  clone(): Circle {
    const newCircle = new Circle({ ...this.center }, this.radius, this.filled, { ...this.color }, this.strokeWidth);
    newCircle.selected = this.selected;
    newCircle.visible = this.visible;
    return newCircle;
  }

  static deserialize(data: CircleData): Circle {
    const circle = new Circle(data.center, data.radius, data.filled, data.color, data.strokeWidth || 1);
    circle.id = data.id;
    circle.selected = data.selected;
    circle.visible = data.visible !== undefined ? data.visible : true;
    return circle;
  }
}
