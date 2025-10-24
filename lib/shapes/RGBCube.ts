import { Shape, Point, Color } from './Shape';

export class RGBCube extends Shape {
  x: number;
  y: number;
  size: number;
  rotationX: number;
  rotationY: number;
  showFrame: boolean;

  constructor(
    x: number, 
    y: number, 
    size: number, 
    color: Color = { r: 0, g: 0, b: 0, a: 255 }, 
    strokeWidth: number = 1,
    rotationX: number = 0.75,
    rotationY: number = 2.5,
    showFrame: boolean = true
  ) {
    super('rgbcube', color, strokeWidth);
    this.x = x;
    this.y = y;
    this.size = size;
    this.rotationX = rotationX;
    this.rotationY = rotationY;
    this.showFrame = showFrame;
  }

  // Obróć punkt 3D wokół osi X i Y
  private rotatePoint(px: number, py: number, pz: number): [number, number, number] {
    // Rotacja wokół X
    let y = py * Math.cos(this.rotationX) - pz * Math.sin(this.rotationX);
    let z = py * Math.sin(this.rotationX) + pz * Math.cos(this.rotationX);
    
    // Rotacja wokół Y
    let x = px * Math.cos(this.rotationY) + z * Math.sin(this.rotationY);
    z = -px * Math.sin(this.rotationY) + z * Math.cos(this.rotationY);
    
    return [x, y, z];
  }

  // Rzutuj punkt 3D na 2D
  private project(x: number, y: number, z: number): [number, number] {
    // Użyj większej odległości kamery dla większych kostek
    const cameraDistance = Math.max(200, this.size * 2);
    const scale = cameraDistance / (cameraDistance + z);
    return [x * scale, y * scale];
  }

  // Pomocnicza metoda do generowania wierzchołków
  private getVertices() {
    const s = this.size / 2;
    
    // 8 wierzchołków kostki
    const vertices3D: Array<[number, number, number]> = [
      [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], // przód (z=-s)
      [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]      // tył (z=s)
    ];
    
    // Obróć i rzutuj wszystkie wierzchołki
    const vertices2D = vertices3D.map(([vx, vy, vz]) => {
      const [rx, ry, rz] = this.rotatePoint(vx, vy, vz);
      const [px, py] = this.project(rx, ry, rz);
      return { 
        x: Math.round(this.x + px), 
        y: Math.round(this.y + py),
        z: rz
      };
    });

    return { vertices2D, vertices3D, s };
  }

  draw(imageData: ImageData): void {
    const { vertices2D, vertices3D, s } = this.getVertices();
    
    // 6 ścian kostki z gradientami
    const faces = [
      { verts: [0, 1, 2, 3], name: 'front' },  // przód z=-s
      { verts: [5, 4, 7, 6], name: 'back' },   // tył z=s
      { verts: [0, 4, 5, 1], name: 'bottom' }, // dół y=-s
      { verts: [3, 2, 6, 7], name: 'top' },    // góra y=s
      { verts: [0, 3, 7, 4], name: 'left' },   // lewo x=-s
      { verts: [1, 5, 6, 2], name: 'right' }   // prawo x=s
    ];
    
    // Posortuj ściany według średniej głębokości
    // Większe z = dalej, rysuj najpierw
    const facesWithDepth = faces.map((face) => {
      const avgZ = face.verts.reduce((sum, i) => sum + vertices2D[i].z, 0) / 4;
      return { ...face, avgZ };
    });
    facesWithDepth.sort((a, b) => b.avgZ - a.avgZ);
    
    // Rysuj każdą ścianę z gradientem
    for (const { verts } of facesWithDepth) {
      const points = verts.map(i => vertices2D[i]);
      
      // Wypełnij ścianę z gradientem RGB
      this.fillFaceWithGradient(imageData, points, verts.map(i => vertices3D[i]), s);
      
      // Narysuj krawędzie (opcjonalnie)
      if (this.showFrame) {
        const black = { r: 0, g: 0, b: 0, a: 255 };
        for (let i = 0; i < points.length; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          this.drawLine(imageData, p1.x, p1.y, p2.x, p2.y, black);
        }
      }
    }
  }

  // Wypełnij ścianę z interpolowanym kolorem RGB
  private fillFaceWithGradient(
    imageData: ImageData, 
    points2D: Array<{x: number, y: number}>,
    points3D: Array<[number, number, number]>,
    s: number
  ): void {
    if (points2D.length !== 4) return;
    
    const minY = Math.floor(Math.min(...points2D.map(p => p.y)));
    const maxY = Math.ceil(Math.max(...points2D.map(p => p.y)));
    
    // Dla każdego pixela wewnątrz ściany
    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];
      
      for (let i = 0; i < 4; i++) {
        const p1 = points2D[i];
        const p2 = points2D[(i + 1) % 4];
        
        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const t = (y - p1.y) / (p2.y - p1.y);
          const x = p1.x + t * (p2.x - p1.x);
          intersections.push(x);
        }
      }
      
      if (intersections.length < 2) continue;
      intersections.sort((a, b) => a - b);
      
      const startX = Math.ceil(intersections[0]);
      const endX = Math.floor(intersections[intersections.length - 1]);
      
      for (let x = startX; x <= endX; x++) {
        // Użyj współrzędnych barycentrycznych dla dokładnej interpolacji
        const weights = this.getBarycentricWeights(x, y, points2D);
        
        // Interpoluj współrzędne 3D używając wag
        let x3d = 0, y3d = 0, z3d = 0;
        for (let i = 0; i < 4; i++) {
          x3d += weights[i] * points3D[i][0];
          y3d += weights[i] * points3D[i][1];
          z3d += weights[i] * points3D[i][2];
        }
        
        // Przelicz współrzędne 3D (przed obróceniem!) na kolor RGB
        const r = Math.floor(Math.max(0, Math.min(255, ((x3d + s) / (2 * s)) * 255)));
        const g = Math.floor(Math.max(0, Math.min(255, ((y3d + s) / (2 * s)) * 255)));
        const b = Math.floor(Math.max(0, Math.min(255, ((z3d + s) / (2 * s)) * 255)));
        
        this.setPixel(imageData, x, y, { r, g, b, a: 255 });
      }
    }
  }

  // Oblicz wagi barycentryczne dla punktu (x, y) w czworokącie
  private getBarycentricWeights(x: number, y: number, points: Array<{x: number, y: number}>): number[] {
    // Dla czworokąta używamy interpolacji odwrotnej odległości
    const weights = points.map(p => {
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      return 1 / (dist + 0.001); // +0.001 żeby uniknąć dzielenia przez 0
    });
    
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  // Narysuj linię (Bresenham)
  private drawLine(imageData: ImageData, x0: number, y0: number, x1: number, y1: number, color: Color): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (true) {
      this.setPixel(imageData, Math.round(x), Math.round(y), color);
      
      if (Math.abs(x - x1) < 1 && Math.abs(y - y1) < 1) break;
      
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

  containsPoint(point: Point): boolean {
    // Użyj rzeczywistych granic rzutowanej kostki
    const bbox = this.getBoundingBox();
    return (
      point.x >= bbox.x &&
      point.x <= bbox.x + bbox.width &&
      point.y >= bbox.y &&
      point.y <= bbox.y + bbox.height
    );
  }

  // Rysuj wireframe kostki na canvas context (do podglądu przesuwania)
  drawWireframe(ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0): void {
    const savedX = this.x;
    const savedY = this.y;
    
    // Tymczasowo przesuń pozycję
    this.x += offsetX;
    this.y += offsetY;
    
    const { vertices2D } = this.getVertices();
    
    // Przywróć oryginalną pozycję
    this.x = savedX;
    this.y = savedY;
    
    // 12 krawędzi kostki
    const edges = [
      // Front face
      [0, 1], [1, 2], [2, 3], [3, 0],
      // Back face
      [4, 5], [5, 6], [6, 7], [7, 4],
      // Connecting edges
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    ctx.beginPath();
    edges.forEach(([start, end]) => {
      ctx.moveTo(vertices2D[start].x + offsetX, vertices2D[start].y + offsetY);
      ctx.lineTo(vertices2D[end].x + offsetX, vertices2D[end].y + offsetY);
    });
    ctx.stroke();
  }

  getBoundingBox() {
    // Oblicz rzeczywiste granice rzutowanych wierzchołków
    const { vertices2D } = this.getVertices();
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    vertices2D.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  getControlPoints(): Point[] {
    return [
      { x: this.x, y: this.y },
      { x: this.x + this.size, y: this.y + this.size }
    ];
  }

  moveControlPoint(index: number, newPos: Point): void {
    // Nie robimy nic - bez zmiany rozmiaru
  }

  serialize(): any {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      size: this.size,
      color: this.color,
      strokeWidth: this.strokeWidth,
      rotationX: this.rotationX,
      rotationY: this.rotationY,
      showFrame: this.showFrame
    };
  }

  clone(): Shape {
    return new RGBCube(this.x, this.y, this.size, { ...this.color }, this.strokeWidth, this.rotationX, this.rotationY, this.showFrame);
  }

  static fromJSON(data: any): RGBCube {
    return new RGBCube(
      data.x, 
      data.y, 
      data.size, 
      data.color, 
      data.strokeWidth,
      data.rotationX ?? -0.6,
      data.rotationY ?? 2.4,
      data.showFrame ?? true
    );
  }
}
