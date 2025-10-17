import { Shape, Color, Point } from './Shape';

export class Brush extends Shape {
  points: Point[];
  size: number;

  constructor(points: Point[], color: Color, strokeWidth: number = 3) {
    super('brush', color, strokeWidth);
    this.points = [...points];
    this.size = strokeWidth; // size jest teraz równe strokeWidth (promień pędzla)
  }

  draw(imageData: ImageData): void {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Jeśli zaznaczony, najpierw narysuj niebieską obwódkę (szerszy brush)
    if (this.selected) {
      const outlineColor: Color = { r: 0, g: 100, b: 255, a: 255 };
      const outlineSize = this.size + 2; // 2 piksele szerszy niż oryginalny
      
      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];
        
        if (i > 0) {
          const prevPoint = this.points[i - 1];
          this.drawLineWithColor(data, width, height, prevPoint, point, outlineColor, outlineSize);
        }
        
        this.drawCircleWithColor(data, width, height, point, outlineColor, outlineSize);
      }
    }

    // Rysuj właściwy brush (oryginalnym kolorem)
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      
      // Jeśli to nie pierwszy punkt, narysuj linię z poprzedniego punktu
      if (i > 0) {
        const prevPoint = this.points[i - 1];
        this.drawLine(data, width, height, prevPoint, point);
      }
      
      // Narysuj okrąg w aktualnym punkcie (twardy pędzel)
      this.drawCircle(data, width, height, point);
    }
  }

  private drawLine(data: Uint8ClampedArray, width: number, height: number, from: Point, to: Point): void {
    this.drawLineWithColor(data, width, height, from, to, this.color, this.size);
  }

  private drawLineWithColor(data: Uint8ClampedArray, width: number, height: number, from: Point, to: Point, color: Color, size: number): void {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;
    
    let x = from.x;
    let y = from.y;
    
    while (true) {
      this.drawCircleWithColor(data, width, height, { x, y }, color, size);
      
      if (x === to.x && y === to.y) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private drawCircle(data: Uint8ClampedArray, width: number, height: number, center: Point): void {
    this.drawCircleWithColor(data, width, height, center, this.color, this.size);
  }

  private drawCircleWithColor(data: Uint8ClampedArray, width: number, height: number, center: Point, color: Color, size: number): void {
    const radius = size / 2;
    const radiusSquared = radius * radius;
    const offset = Math.ceil(radius);
    
    for (let dy = -offset; dy <= offset; dy++) {
      for (let dx = -offset; dx <= offset; dx++) {
        // Sprawdź czy punkt jest wewnątrz okręgu
        const distSquared = dx * dx + dy * dy;
        if (distSquared <= radiusSquared) {
          const x = Math.floor(center.x) + dx;
          const y = Math.floor(center.y) + dy;
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const index = (y * width + x) * 4;
            data[index] = color.r;
            data[index + 1] = color.g;
            data[index + 2] = color.b;
            data[index + 3] = color.a;
          }
        }
      }
    }
  }

  containsPoint(point: Point): boolean {
    for (const brushPoint of this.points) {
      const distance = Math.sqrt(
        (point.x - brushPoint.x) ** 2 + (point.y - brushPoint.y) ** 2
      );
      if (distance <= this.size) {
        return true;
      }
    }
    return false;
  }

  getBoundingBox(): { x: number; y: number; width: number; height: number } {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.points[0].x;
    let maxX = this.points[0].x;
    let minY = this.points[0].y;
    let maxY = this.points[0].y;

    for (const point of this.points) {
      minX = Math.min(minX, point.x - this.size);
      maxX = Math.max(maxX, point.x + this.size);
      minY = Math.min(minY, point.y - this.size);
      maxY = Math.max(maxY, point.y + this.size);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  move(dx: number, dy: number): void {
    for (const point of this.points) {
      point.x += dx;
      point.y += dy;
    }
  }

  getControlPoints(): Point[] {
    return [...this.points];
  }

  moveControlPoint(index: number, newPos: Point): void {
    if (index >= 0 && index < this.points.length) {
      this.points[index] = { ...newPos };
    }
  }

  clone(): Shape {
    return new Brush([...this.points], { ...this.color }, this.strokeWidth);
  }

  addPoint(point: Point): void {
    this.points.push({ ...point });
  }

  serialize(): any {
    return {
      id: this.id,
      type: this.type,
      color: this.color,
      points: this.points,
      size: this.size,
      strokeWidth: this.strokeWidth,
      visible: this.visible
    };
  }

  static deserialize(data: any): Brush {
    // Sprawdź czy dane mają strokeWidth (nowy format) czy size (stary format)
    const brushSize = data.strokeWidth || data.size || 3;
    const brush = new Brush(data.points, data.color, brushSize);
    brush.id = data.id;
    brush.visible = data.visible !== undefined ? data.visible : true;
    return brush;
  }
}