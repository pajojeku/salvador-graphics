import { Shape, Line, Rectangle, Circle, Brush, ImageShape, RGBCube, LineData, RectangleData, CircleData } from './shapes/index'

export interface CanvasState {
  shapes: Shape[];
  selectedShapeId: string | null;
  width: number;
  height: number;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private shapes: Shape[] = [];
  private selectedShapeId: string | null = null;
  private width: number;
  private height: number;

  // Backup dla undo/redo
  private history: ImageData[] = [];
  private historyIndex: number = -1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // Tworzenie canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = context;

    // Inicjalizacja bufora pikseli - TUTAJ MASZ DOSTĘP DO PIKSELI
    this.imageData = this.ctx.createImageData(width, height);
    this.clearCanvas();
    
    // Zapisz stan początkowy dla undo/redo
    (this as any).shapesHistory = [];
    this.saveState();
  }

  // ===== BEZPOŚREDNI DOSTĘP DO PIKSELI =====
  
  /**
   * Pobierz bufor pikseli - możesz bezpośrednio modyfikować
   * imageData.data to Uint8ClampedArray z wartościami RGBA
   */
  getImageData(): ImageData {
    return this.imageData;
  }

  /**
   * Pobierz kopię bufora pikseli (bezpieczne)
   */
  getImageDataCopy(): ImageData {
    const copy = this.ctx.createImageData(this.width, this.height);
    copy.data.set(this.imageData.data);
    return copy;
  }

  /**
   * Ustaw piksel na konkretnej pozycji
   */
  setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): void {
    x = Math.floor(x);
    y = Math.floor(y);
    
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const index = (y * this.width + x) * 4;
    this.imageData.data[index] = r;
    this.imageData.data[index + 1] = g;
    this.imageData.data[index + 2] = b;
    this.imageData.data[index + 3] = a;
  }

  /**
   * Pobierz kolor piksela
   */
  getPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null {
    x = Math.floor(x);
    y = Math.floor(y);
    
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    const index = (y * this.width + x) * 4;
    return {
      r: this.imageData.data[index],
      g: this.imageData.data[index + 1],
      b: this.imageData.data[index + 2],
      a: this.imageData.data[index + 3]
    };
  }

  /**
   * Wyczyść canvas (ustaw wszystkie piksele na białe)
   */
  clearCanvas(r: number = 255, g: number = 255, b: number = 255, a: number = 255): void {
    for (let i = 0; i < this.imageData.data.length; i += 4) {
      this.imageData.data[i] = r;
      this.imageData.data[i + 1] = g;
      this.imageData.data[i + 2] = b;
      this.imageData.data[i + 3] = a;
    }
  }

  /**
   * Zastosuj filtr/operację na każdym pikselu
   * Przykład użycia: applyFilter((r, g, b, a) => ({ r: 255-r, g: 255-g, b: 255-b, a }))
   */
  applyFilter(filterFn: (r: number, g: number, b: number, a: number, x: number, y: number) => 
    { r: number; g: number; b: number; a: number }): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = (y * this.width + x) * 4;
        const r = this.imageData.data[index];
        const g = this.imageData.data[index + 1];
        const b = this.imageData.data[index + 2];
        const a = this.imageData.data[index + 3];
        
        const result = filterFn(r, g, b, a, x, y);
        
        this.imageData.data[index] = result.r;
        this.imageData.data[index + 1] = result.g;
        this.imageData.data[index + 2] = result.b;
        this.imageData.data[index + 3] = result.a;
      }
    }
  }

  // ===== ZARZĄDZANIE KSZTAŁTAMI =====

  addShape(shape: Shape): void {
    this.shapes.push(shape);
    this.saveState(); // Zapisz stan dla undo
    this.render();
  }

  /**
   * Dodaj kształt z ręcznie wprowadzonymi danymi (z modala)
   */
  addShapeManually(type: 'line' | 'rectangle' | 'circle' | 'rgbcube', params: any): void {
    let shape: Shape | null = null;

    if (type === 'rectangle') {
      shape = new Rectangle(
        params.x,
        params.y,
        params.width,
        params.height,
        params.filled ?? false,
        params.color,
        params.strokeWidth
      );
    } else if (type === 'circle') {
      shape = new Circle(
        { x: params.centerX, y: params.centerY },
        params.radius,
        params.filled ?? false,
        params.color,
        params.strokeWidth
      );
    } else if (type === 'line') {
      shape = new Line(
        { x: params.x1, y: params.y1 },
        { x: params.x2, y: params.y2 },
        params.color,
        params.strokeWidth
      );
    } else if (type === 'rgbcube') {
      shape = new RGBCube(
        params.x,
        params.y,
        params.size,
        params.color,
        params.strokeWidth
      );
    }

    if (shape) {
      this.addShape(shape);
    }
  }

  removeShape(id: string): void {
    this.shapes = this.shapes.filter(s => s.id !== id);
    this.saveState(); // Zapisz stan dla undo
    this.render();
  }

  getShape(id: string): Shape | undefined {
    return this.shapes.find(s => s.id === id);
  }

  getAllShapes(): Shape[] {
    return this.shapes;
  }

  selectShape(id: string | null): void {
    this.shapes.forEach(s => s.selected = false);
    if (id) {
      const shape = this.getShape(id);
      if (shape) {
        shape.selected = true;
      }
    }
    this.selectedShapeId = id;
    this.render();
  }

  getSelectedShape(): Shape | null {
    return this.selectedShapeId ? this.getShape(this.selectedShapeId) || null : null;
  }

  toggleShapeVisibility(id: string): void {
    const shape = this.getShape(id);
    if (shape) {
      shape.visible = !shape.visible;
      this.saveState(); // Zapisz stan dla undo
      this.render();
    }
  }

  findShapeAtPoint(x: number, y: number): Shape | null {
    // Szukaj od końca (ostatnio narysowane na wierzchu)
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].containsPoint({ x, y })) {
        return this.shapes[i];
      }
    }
    return null;
  }

  /**
   * Wyczyść wszystkie kształty i zresetuj canvas
   */
  clear(): void {
    this.shapes = [];
    this.selectedShapeId = null;
    this.clearCanvas();
    this.saveState(); // Zapisz stan dla undo
    // Uwaga: Ta metoda aktualizuje tylko wewnętrzny bufor
    // Wywołaj render() lub ręcznie zaktualizuj widoczny canvas
  }

  // ===== RENDEROWANIE =====

  /**
   * Główna metoda renderująca - przerysowuje cały canvas
   */
  render(): void {
    // 1. Wyczyść canvas
    this.clearCanvas();

    // 2. Narysuj wszystkie widoczne kształty bezpośrednio na buforze pikseli
    this.shapes.forEach(shape => {
      if (shape.visible) {
        shape.draw(this.imageData);
      }
    });

    // 3. Przenieś bufor pikseli na canvas
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Pobierz HTMLCanvasElement do wyświetlenia w DOM
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Pobierz wymiary
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  // ===== SERIALIZACJA / DESERIALIZACJA =====

  /**
   * Zapisz stan canvas do JSON
   */
  serialize(): string {
    const data = {
      width: this.width,
      height: this.height,
      shapes: this.shapes.map(shape => shape.serialize()),
      // Opcjonalnie możesz zapisać też cały bufor pikseli jako base64
      // imageDataURL: this.canvas.toDataURL()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Wczytaj stan canvas z JSON
   */
  async deserialize(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    
    if (data.width && data.height && (data.width !== this.width || data.height !== this.height)) {
      throw new Error(`Canvas dimensions mismatch. Expected ${this.width}x${this.height}, got ${data.width}x${data.height}`);
    }

    this.shapes = [];
    const { imageDB } = await import('./imageDB');

    for (const shapeData of data.shapes) {
      let shape: Shape | null = null;
      
      switch (shapeData.type) {
        case 'line':
          shape = Line.deserialize(shapeData as LineData);
          break;
        case 'rectangle':
          shape = Rectangle.deserialize(shapeData as RectangleData);
          break;
        case 'circle':
          shape = Circle.deserialize(shapeData as CircleData);
          break;
        case 'rgbcube':
          shape = RGBCube.fromJSON(shapeData);
          break;
        case 'brush':
          shape = Brush.deserialize(shapeData);
          break;
        case 'image':
          console.log('Deserializing image shape:', shapeData);
          shape = ImageShape.deserialize(shapeData);
          if (shape instanceof ImageShape) {
            console.log('Loading image from DB:', shapeData.imageId);
            const imageRecord = await imageDB.getImage(shapeData.imageId);
            console.log('Image record:', imageRecord);
            if (imageRecord) {
              const pixels = new Uint8ClampedArray(imageRecord.data);
              console.log('Setting pixels, length:', pixels.length);
              shape.setOriginalPixels(pixels);
              // Automatycznie nałóż filtr zgodnie z parametrami z projektu
              let filtered = pixels;
              const { filterType, maskSize, sobelDir, sobelThreshold, sharpenStrength } = shape;
              if (filterType === 'average') {
                filtered = require('@/lib/filters').applyAverageFilter(pixels, shape.width, shape.height, maskSize ?? 3);
              } else if (filterType === 'median') {
                filtered = require('@/lib/filters').applyMedianFilter(pixels, shape.width, shape.height, maskSize ?? 3);
              } else if (filterType === 'sobel') {
                filtered = require('@/lib/filters').applySobelFilter(pixels, shape.width, shape.height, sobelDir ?? 'xy', sobelThreshold ?? 64);
              } else if (filterType === 'sharpen') {
                filtered = require('@/lib/filters').applySharpenFilter(pixels, shape.width, shape.height, sharpenStrength ?? 0.5);
              }
              shape.setCachedPixels(filtered);
            } else {
              console.error('Image not found in DB:', shapeData.imageId);
            }
          }
          break;
      }
      
      if (shape) {
        this.shapes.push(shape);
      }
    }

    this.render();
  }

  exportAsPNG(): string {
    return this.canvas.toDataURL('image/png');
  }

  exportAsJPEG(quality: number = 0.92): string {
    return this.canvas.toDataURL('image/jpeg', quality);
  }

  exportThumbnail(): string {
    const maxWidth = 200;
    const maxHeight = 150;
    const needsResize = this.width > maxWidth || this.height > maxHeight;
    
    if (!needsResize) {
      return this.canvas.toDataURL('image/png');
    }
    
    const thumbCanvas = document.createElement('canvas');
    const aspectRatio = this.width / this.height;
    
    let thumbWidth = maxWidth;
    let thumbHeight = maxWidth / aspectRatio;
    
    if (thumbHeight > maxHeight) {
      thumbHeight = maxHeight;
      thumbWidth = maxHeight * aspectRatio;
    }
    
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 0, 0, thumbWidth, thumbHeight);
    
    return thumbCanvas.toDataURL('image/jpeg', 0.6);
  }

  // ===== UNDO / REDO =====

  saveState(): void {
    // Zapisz stan jako serializowane kształty
    const shapesState = this.shapes.map(shape => shape.serialize());
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.ctx.createImageData(this.imageData)); // Placeholder - będziemy używać shapes
    this.historyIndex++;
    
    // Zapisz kształty w osobnej strukturze
    if (!(this as any).shapesHistory) {
      (this as any).shapesHistory = [];
    }
    (this as any).shapesHistory = (this as any).shapesHistory.slice(0, this.historyIndex);
    (this as any).shapesHistory.push(JSON.parse(JSON.stringify(shapesState)));
    
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      (this as any).shapesHistory.shift();
      this.historyIndex--;
    }
  }

  undo(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      
      // Przywróć kształty ze stanu
      if ((this as any).shapesHistory && (this as any).shapesHistory[this.historyIndex]) {
        const shapesState = (this as any).shapesHistory[this.historyIndex];
        this.shapes = [];
        
        shapesState.forEach((shapeData: any) => {
          let shape: Shape | null = null;
          
          switch (shapeData.type) {
            case 'line':
              shape = Line.deserialize(shapeData as LineData);
              break;
            case 'rectangle':
              shape = Rectangle.deserialize(shapeData as RectangleData);
              break;
            case 'circle':
              shape = Circle.deserialize(shapeData as CircleData);
              break;
            case 'brush':
              shape = Brush.deserialize(shapeData);
              break;
          }
          
          if (shape) {
            this.shapes.push(shape);
          }
        });
        
        this.render();
      }
      
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      
      // Przywróć kształty ze stanu
      if ((this as any).shapesHistory && (this as any).shapesHistory[this.historyIndex]) {
        const shapesState = (this as any).shapesHistory[this.historyIndex];
        this.shapes = [];
        
        shapesState.forEach((shapeData: any) => {
          let shape: Shape | null = null;
          
          switch (shapeData.type) {
            case 'line':
              shape = Line.deserialize(shapeData as LineData);
              break;
            case 'rectangle':
              shape = Rectangle.deserialize(shapeData as RectangleData);
              break;
            case 'circle':
              shape = Circle.deserialize(shapeData as CircleData);
              break;
            case 'brush':
              shape = Brush.deserialize(shapeData);
              break;
          }
          
          if (shape) {
            this.shapes.push(shape);
          }
        });
        
        this.render();
      }
      
      return true;
    }
    return false;
  }

  // ===== CLEANUP =====

  destroy(): void {
    this.shapes = [];
    this.history = [];
  }
}
