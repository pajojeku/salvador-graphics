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

  // Generuj przekrój 2D kostki RGB w danym punkcie i osi
  // axis: 'x' | 'y' | 'z' - oś prostopadła do przekroju
  // value: wartość w zakresie [-size/2, size/2] na danej osi
  generateCrossSection(axis: 'x' | 'y' | 'z', value: number, resolution: number = 100): ImageData {
    const imageData = new ImageData(resolution, resolution);
    const s = this.size / 2;
    
    // Normalizuj wartość do zakresu [-s, s]
    const normalizedValue = Math.max(-s, Math.min(s, value));
    
    for (let py = 0; py < resolution; py++) {
      for (let px = 0; px < resolution; px++) {
        // Mapuj piksele na współrzędne 3D kostki [-s, s]
        let rx, ry, rz;
        
        if (axis === 'x') {
          // Przekrój prostopadły do osi X
          rx = normalizedValue;
          ry = (py / (resolution - 1)) * this.size - s;
          rz = (px / (resolution - 1)) * this.size - s;
        } else if (axis === 'y') {
          // Przekrój prostopadły do osi Y
          rx = (px / (resolution - 1)) * this.size - s;
          ry = normalizedValue;
          rz = (py / (resolution - 1)) * this.size - s;
        } else { // 'z'
          // Przekrój prostopadły do osi Z
          rx = (px / (resolution - 1)) * this.size - s;
          ry = (py / (resolution - 1)) * this.size - s;
          rz = normalizedValue;
        }
        
        // Konwertuj współrzędne 3D na kolor RGB (zakres [-s, s] -> [0, 255])
        const r = Math.round(((rx + s) / this.size) * 255);
        const g = Math.round(((ry + s) / this.size) * 255);
        const b = Math.round(((rz + s) / this.size) * 255);
        
        // Ustaw kolor piksela
        const idx = (py * resolution + px) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255; // Pełna nieprzezroczystość
      }
    }
    
    return imageData;
  }

  // Znajdź najbliższą ścianę i współrzędne 3D dla danego punktu 2D na ekranie
  // Zwraca oś prostopadłą do ściany i interpolowaną wartość dla pozostałych osi
  findFaceAt3DPoint(screenX: number, screenY: number): { axis: 'x' | 'y' | 'z'; value: number } | null {
    const { vertices2D, vertices3D, s } = this.getVertices();
    
    // Definicje ścian z informacją o osiach równoległych
    const faces = [
      { verts: [0, 1, 2, 3], name: 'front', axis: 'z' as const, parallelAxes: ['x', 'y'] as const },   // z=-s
      { verts: [5, 4, 7, 6], name: 'back', axis: 'z' as const, parallelAxes: ['x', 'y'] as const },    // z=s
      { verts: [0, 4, 5, 1], name: 'bottom', axis: 'y' as const, parallelAxes: ['x', 'z'] as const },  // y=-s
      { verts: [3, 2, 6, 7], name: 'top', axis: 'y' as const, parallelAxes: ['x', 'z'] as const },     // y=s
      { verts: [0, 3, 7, 4], name: 'left', axis: 'x' as const, parallelAxes: ['y', 'z'] as const },    // x=-s
      { verts: [1, 5, 6, 2], name: 'right', axis: 'x' as const, parallelAxes: ['y', 'z'] as const }    // x=s
    ];
    
    // Posortuj ściany według głębokości (mniejsze z = bliżej kamery)
    const facesWithDepth = faces.map((face) => {
      const avgZ = face.verts.reduce((sum, i) => sum + vertices2D[i].z, 0) / 4;
      return { ...face, avgZ };
    });
    facesWithDepth.sort((a, b) => a.avgZ - b.avgZ);
    
    // Sprawdź tylko najbliższe ściany (frontalne) - pierwsze 3 po sortowaniu
    for (const face of facesWithDepth.slice(0, 3)) {
      const points = face.verts.map(i => vertices2D[i]);
      
      // Sprawdź czy punkt jest wewnątrz wielokąta
      if (this.isPointInPolygon(screenX, screenY, points)) {
        // Oblicz współrzędne barycentryczne/interpolację
        const vertices3DFace = face.verts.map(i => vertices3D[i]);
        
        // Interpoluj współrzędne 3D na podstawie pozycji w ścianie
        const interp3D = this.interpolate3DCoords(screenX, screenY, points, vertices3DFace);
        
        if (interp3D) {
          // Dla przekroju - wybierz tę z dwóch osi równoległych, która najlepiej odpowiada
          // kierunkowi kursora na ekranie. Dzięki temu przekrój będzie podążał za pozycją myszy
          // nawet gdy kursor nie jest przy samej krawędzi.
          const center2D = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
          center2D.x /= points.length;
          center2D.y /= points.length;

          const mouseVec = { x: screenX - center2D.x, y: screenY - center2D.y };

          let bestAxis: 'x' | 'y' | 'z' = face.parallelAxes[0];
          let bestScore = -Infinity;

          // Small offset in 3D to test screen-space sensitivity
          const delta = Math.max(0.001, s * 0.01);

          for (const axisCandidate of face.parallelAxes) {
            // Start from interpolated 3D coordinate
            const testPos: [number, number, number] = [interp3D[0], interp3D[1], interp3D[2]];
            if (axisCandidate === 'x') testPos[0] += delta; else if (axisCandidate === 'y') testPos[1] += delta; else testPos[2] += delta;

            // Rotate & project the test position to screen
            const [rx, ry, rz] = this.rotatePoint(testPos[0], testPos[1], testPos[2]);
            const [projX, projY] = this.project(rx, ry, rz);
            const projScreen = { x: this.x + projX, y: this.y + projY };

            // Axis vector in screen space (from face center to perturbed point)
            const axisVec = { x: projScreen.x - center2D.x, y: projScreen.y - center2D.y };
            const axisLen = Math.sqrt(axisVec.x * axisVec.x + axisVec.y * axisVec.y) + 1e-6;

            // Score how well axis aligns with mouse direction: dot(mouse, axisNormalized) * axisLen
            const dot = (mouseVec.x * axisVec.x + mouseVec.y * axisVec.y) / (axisLen);
            const score = Math.abs(dot) * axisLen;

            if (score > bestScore) {
              bestScore = score;
              bestAxis = axisCandidate as 'x' | 'y' | 'z';
            }
          }

          let value = 0;
          if (bestAxis === 'x') value = interp3D[0];
          else if (bestAxis === 'y') value = interp3D[1];
          else value = interp3D[2];

          return { axis: bestAxis, value };
        }
      }
    }
    
    return null;
  }

  // Oblicz linię przekroju na danej ścianie - zwraca punkty 2D linii na ekranie
  getCrossSectionLineOnFace(axis: 'x' | 'y' | 'z', value: number, screenX: number, screenY: number): Array<{x: number, y: number}> | null {
    const { vertices2D, vertices3D, s } = this.getVertices();
    
    // Znajdź ścianę na której jest mysz
    const faces = [
      { verts: [0, 1, 2, 3], name: 'front', faceAxis: 'z' as const },
      { verts: [5, 4, 7, 6], name: 'back', faceAxis: 'z' as const },
      { verts: [0, 4, 5, 1], name: 'bottom', faceAxis: 'y' as const },
      { verts: [3, 2, 6, 7], name: 'top', faceAxis: 'y' as const },
      { verts: [0, 3, 7, 4], name: 'left', faceAxis: 'x' as const },
      { verts: [1, 5, 6, 2], name: 'right', faceAxis: 'x' as const }
    ];
    
    const facesWithDepth = faces.map((face) => {
      const avgZ = face.verts.reduce((sum, i) => sum + vertices2D[i].z, 0) / 4;
      return { ...face, avgZ };
    });
    // Sortuj od NAJBLIŻSZYCH do najdalszych (mniejsze z = bliżej kamery)
    facesWithDepth.sort((a, b) => a.avgZ - b.avgZ);
    
    // Znajdź ścianę zawierającą punkt - sprawdzaj od najbliższych
    for (const face of facesWithDepth.slice(0, 3)) {
      const points2D = face.verts.map(i => vertices2D[i]);
      
      if (this.isPointInPolygon(screenX, screenY, points2D)) {
        // Znaleźliśmy ścianę - teraz obliczmy linię przekroju
        // Linia przekroju to przecięcie płaszczyzny (axis=value) ze ścianą
        
        const vertices3DFace = face.verts.map(i => vertices3D[i]);
        const linePoints: Array<{x: number, y: number}> = [];
        
        // Sprawdź każdą krawędź ściany
        for (let i = 0; i < 4; i++) {
          const v1_3d = vertices3DFace[i];
          const v2_3d = vertices3DFace[(i + 1) % 4];
          const v1_2d = points2D[i];
          const v2_2d = points2D[(i + 1) % 4];
          
          // Sprawdź czy krawędź przecina płaszczyznę przekroju
          let val1, val2;
          if (axis === 'x') {
            val1 = v1_3d[0];
            val2 = v2_3d[0];
          } else if (axis === 'y') {
            val1 = v1_3d[1];
            val2 = v2_3d[1];
          } else {
            val1 = v1_3d[2];
            val2 = v2_3d[2];
          }
          
          // Sprawdź czy value jest między val1 a val2
          if ((val1 <= value && value <= val2) || (val2 <= value && value <= val1)) {
            // Oblicz punkt przecięcia
            const t = Math.abs(val1 - val2) < 0.001 ? 0.5 : (value - val1) / (val2 - val1);
            
            const intersectionX = v1_2d.x + t * (v2_2d.x - v1_2d.x);
            const intersectionY = v1_2d.y + t * (v2_2d.y - v1_2d.y);
            
            linePoints.push({ x: intersectionX, y: intersectionY });
          }
        }
        
        // Powinniśmy mieć 2 punkty (linia przecina ścianę w dwóch miejscach)
        if (linePoints.length >= 2) {
          return [linePoints[0], linePoints[1]];
        }
        
        return null;
      }
    }
    
    return null;
  }

  // Sprawdź czy punkt jest wewnątrz wielokąta (ray casting algorithm)
  private isPointInPolygon(x: number, y: number, polygon: Array<{ x: number; y: number }>): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Interpoluj współrzędne 3D na podstawie pozycji 2D w wielokącie
  private interpolate3DCoords(
    x: number, 
    y: number, 
    points2D: Array<{ x: number; y: number }>,
    points3D: Array<[number, number, number]>
  ): [number, number, number] | null {
    // Użyj interpolacji odwrotnej odległości
    const weights = points2D.map(p => {
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      return 1 / (dist + 0.001);
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    let rx = 0, ry = 0, rz = 0;
    for (let i = 0; i < points3D.length; i++) {
      const w = weights[i] / totalWeight;
      rx += points3D[i][0] * w;
      ry += points3D[i][1] * w;
      rz += points3D[i][2] * w;
    }
    
    return [rx, ry, rz];
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
