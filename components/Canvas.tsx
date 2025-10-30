
'use client';

import { useState, useEffect, useRef } from 'react';
import { CanvasManager } from '@/lib/CanvasManager';
import { Line, Rectangle, Circle, Brush, RGBCube, Bezier, Polygon } from '@/lib/shapes';
import { projectStorage } from '@/lib/projectStorage';

interface CanvasProps {
  project?: {
    id: string;
    name: string;
    width: number;
    height: number;
  };
  currentTool?: string;
  currentColor?: string;
  strokeWidth?: number;
  canvasManagerRef?: React.MutableRefObject<CanvasManager | null>;
  canvasRefreshRef?: React.MutableRefObject<(() => void) | null>;
  bezierPointIdx?: number;
  setBezierPointIdx?: (idx: number) => void;
}

export default function Canvas({ project, currentTool = 'select', currentColor = '#000000', strokeWidth = 1, canvasManagerRef, canvasRefreshRef, bezierPointIdx, setBezierPointIdx }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [autoScale, setAutoScale] = useState(1); // Przechowuje domyślną skalę
  const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBezier, setCurrentBezier] = useState<Bezier | null>(null);
  const [currentPolygon, setCurrentPolygon] = useState<Polygon | null>(null);
  const [, forceUpdate] = useState({});
  const [selectedShape, setSelectedShape] = useState<{ shape: any; offsetX: number; offsetY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBrush, setCurrentBrush] = useState<Brush | null>(null);
  const [isMouseOutside, setIsMouseOutside] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [pixelColor, setPixelColor] = useState<{ r: number; g: number; b: number; a: number } | null>(null);
  const [rgbCubeCrossSection, setRgbCubeCrossSection] = useState<{ imageData: ImageData; axis: string; value: number; crossSectionLine?: Array<{x: number, y: number}> } | null>(null);
  const updateTrigger = useRef(0);
  const lastRenderTime = useRef<number>(0);
  const renderAnimationFrame = useRef<number | null>(null);

  // Helper do rysowania linii piksel po pikselu (bez anti-aliasingu)
  const drawPixelLine = (
    imageData: ImageData, 
    x0: number, 
    y0: number, 
    x1: number, 
    y1: number, 
    color: { r: number; g: number; b: number; a: number },
    thickness: number
  ) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const setPixel = (x: number, y: number) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const index = (y * width + x) * 4;
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = color.a;
      }
    };

    // Algorytm Bresenhama
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      // Rysuj piksel (lub kilka dla thickness >= 3)
      if (thickness <= 3) {
        for (let dy = -Math.floor(thickness / 2); dy <= Math.floor(thickness / 2); dy++) {
          setPixel(x, y + dy);
        }
      } else {
        // Dla thickness > 3, rysuj okrągły pędzel
        const radius = thickness / 2;
        const radiusSquared = radius * radius;
        const offset = Math.ceil(radius);
        for (let dy = -offset; dy <= offset; dy++) {
          for (let dx = -offset; dx <= offset; dx++) {
            const distSquared = dx * dx + dy * dy;
            if (distSquared <= radiusSquared) {
              setPixel(x + dx, y + dy);
            }
          }
        }
      }

      if (x === x1 && y === y1) break;

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
  };

  // Helper do konwersji hex na RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number; a: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 255
    } : { r: 0, g: 0, b: 0, a: 255 };
  };

  // Throttled render - renderuj maksymalnie ~60 FPS
  const throttledRender = (manager: CanvasManager) => {
    if (renderAnimationFrame.current !== null) {
      return; // Render już zaplanowany
    }
    
    renderAnimationFrame.current = requestAnimationFrame(() => {
      manager.render();
      refreshCanvas(manager);
      renderAnimationFrame.current = null;
    });
  };

  // Helper do pobierania context z wyłączonym wygładzaniem
  const getPixelPerfectContext = () => {
    if (!canvasRef.current) return null;
    const ctx = canvasRef.current.getContext('2d', {willReadFrequently: true});
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    return ctx;
  };

  // Helper do odświeżania widoku canvas
  const refreshCanvas = (manager?: CanvasManager) => {
    const mgr = manager || canvasManager;
    if (mgr && canvasRef.current) {
      console.log('refreshCanvas called');
      mgr.render();
      const ctx = getPixelPerfectContext();
      if (ctx) {
        ctx.putImageData(mgr.getImageData(), 0, 0);
      }
      
      updateTrigger.current++;
      forceUpdate({});
    }
  };

  // Pobierz pozycje uchwytów resize dla kształtu
  const getResizeHandles = (shape: any): Array<{ x: number; y: number; type: string }> => {
    if (!shape) return [];
    if (shape.type === 'circle') {
      const { center, radius } = shape as Circle;
      return [
        { x: center.x + radius, y: center.y, type: 'right' },
        { x: center.x - radius, y: center.y, type: 'left' },
        { x: center.x, y: center.y + radius, type: 'bottom' },
        { x: center.x, y: center.y - radius, type: 'top' }
      ];
    } else if (shape.type === 'rectangle') {
      const rect = shape as Rectangle;
      const x1 = rect.x;
      const y1 = rect.y;
      const x2 = rect.x + rect.width;
      const y2 = rect.y + rect.height;
      return [
        { x: x1, y: y1, type: 'top-left' },
        { x: x2, y: y1, type: 'top-right' },
        { x: x1, y: y2, type: 'bottom-left' },
        { x: x2, y: y2, type: 'bottom-right' }
      ];
    } else if (shape.type === 'line') {
      const line = shape as Line;
      return [
        { x: line.start.x, y: line.start.y, type: 'start' },
        { x: line.end.x, y: line.end.y, type: 'end' }
      ];
    } else if (shape.type === 'bezier') {
      // Każdy punkt kontrolny jako handle, type: 'pt-0', 'pt-1', ...
      return shape.points.map((pt: {x:number, y:number}, idx: number) => ({ x: pt.x, y: pt.y, type: `pt-${idx}` }));
    } else if (shape.type === 'polygon') {
      // Punkty kontrolne + rotation center
      const handles = shape.points.map((pt: {x:number, y:number}, idx: number) => ({ x: pt.x, y: pt.y, type: `pt-${idx}` }));
      if (shape.rotationCenter) {
        handles.push({ x: shape.rotationCenter.x, y: shape.rotationCenter.y, type: 'rotation-center' });
      }
      return handles;
    }
    return [];
  };

  // Sprawdź czy kliknięto w handle
  const findHandleAtPoint = (x: number, y: number, shape: any): string | null => {
    const handles = getResizeHandles(shape);
    const threshold = 8; // Promień kliknięcia w pikselach
    for (const handle of handles) {
      const dx = x - handle.x;
      const dy = y - handle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= threshold) {
        return handle.type;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!project || !canvasRef.current) return;

    const manager = new CanvasManager(project.width, project.height);
    setCanvasManager(manager);
    
    if (canvasManagerRef) {
      canvasManagerRef.current = manager;
    }

    if (canvasRefreshRef) {
      canvasRefreshRef.current = () => refreshCanvas(manager);
    }

    const savedData = projectStorage.getCanvasData(project.id);
    if (savedData) {
      console.log('Loading canvas data:', savedData);
      setIsLoading(true);
      try {
        manager.deserialize(savedData).then(() => {
          console.log('Deserialized shapes:', manager.getAllShapes());
          manager.render();
          refreshCanvas(manager);
          setIsLoading(false);
        }).catch((e) => {
          console.error('Failed to deserialize:', e);
          manager.render();
          refreshCanvas(manager);
          setIsLoading(false);
        });
      } catch (e) {
        console.error('Failed to load canvas data:', e);
        manager.render();
        refreshCanvas(manager);
        setIsLoading(false);
      }
    } else {
      console.log('No saved data for project');
      manager.render();
      refreshCanvas(manager);
    }

    return () => {
      if (canvasManagerRef) {
        canvasManagerRef.current = null;
      }
      if (canvasRefreshRef) {
        canvasRefreshRef.current = null;
      }
      // Anuluj oczekujący render
      if (renderAnimationFrame.current !== null) {
        cancelAnimationFrame(renderAnimationFrame.current);
        renderAnimationFrame.current = null;
      }
    };
  }, [project, canvasManagerRef, canvasRefreshRef]);

  // Auto-save canvas data do localStorage
  useEffect(() => {
    if (!canvasManager || !project) return;

    const saveInterval = setInterval(() => {
      try {
        const canvasData = canvasManager.serialize();
        projectStorage.saveCanvasData(project.id, canvasData);
        
        const thumbnailData = canvasManager.exportThumbnail();
        projectStorage.saveCanvasThumbnail(project.id, thumbnailData);
      } catch (e) {
        console.error('Failed to save canvas data:', e);
      }
    }, 2000); // Auto-save co 2 sekundy

    return () => clearInterval(saveInterval);
  }, [canvasManager, project]);

  // Auto-scale canvas do kontenera
  useEffect(() => {
    if (!project || !containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Margines (padding)
      const paddingX = 64; // 32px z każdej strony
      const paddingY = 64; // 32px z góry i dołu
      
      // Maksymalna dostępna przestrzeń
      const availableWidth = containerWidth - paddingX;
      const availableHeight = containerHeight - paddingY;
      
      // Oblicz skalę potrzebną do zmieszczenia się w kontenerze
      const scaleByWidth = availableWidth / project.width;
      const scaleByHeight = availableHeight / project.height;
      
      // Wybierz mniejszą skalę (żeby zmieścić się w obu wymiarach)
      // Dla małych canvasów pozwalamy na powiększenie, dla dużych na zmniejszenie
      const newScale = Math.min(scaleByWidth, scaleByHeight);
      
      setAutoScale(newScale);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, [project]);

  // Obsługa skrótów klawiszowych Ctrl+ i Ctrl-
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setScale(prev => Math.min(prev + 0.1, 5)); // Max 500%
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setScale(prev => Math.max(prev - 0.1, 0.1)); // Min 10%
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset zoom do domyślnego
  const resetZoom = () => {
    setScale(autoScale);
  };

  // Globalny mouseup handler - obsługuje kliknięcia poza canvasem
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!isDrawing || !canvasManager || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      
      // Canvas jest skalowany przez CSS, więc używamy proporcji i clampuj współrzędne do granic canvas
      const scaleX = project!.width / rect.width;
      const scaleY = project!.height / rect.height;
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;
      const x = Math.max(0, Math.min(rawX, project?.width || 0));
      const y = Math.max(0, Math.min(rawY, project?.height || 0));

      // Dokończ rysowanie z clampowanymi współrzędnymi
      if (currentTool === 'brush' && currentBrush) {
        // Pędzel jest już narysowany - zaktualizuj tylko imageData
        const ctx = getPixelPerfectContext();
        if (ctx) {
          const currentImageData = ctx.getImageData(0, 0, project!.width, project!.height);
          const managerImageData = canvasManager.getImageData();
          managerImageData.data.set(currentImageData.data);
        }
        setCurrentBrush(null);
        // NIE renderuj dla pędzla - jest już narysowany
      } else if (startPoint) {
        const color = hexToRgb(currentColor);
        if (currentTool === 'line') {
          const line = new Line(startPoint, { x, y }, color, strokeWidth);
          canvasManager.addShape(line);
        } else if (currentTool === 'rectangle') {
          const width = x - startPoint.x;
          const height = y - startPoint.y;
          const rect = new Rectangle(startPoint.x, startPoint.y, width, height, false, color, strokeWidth);
          canvasManager.addShape(rect);
        } else if (currentTool === 'circle') {
          const radius = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
          const circle = new Circle(startPoint, radius, false, color, strokeWidth);
          canvasManager.addShape(circle);
        } else if (currentTool === 'rgbcube') {
          const size = Math.max(Math.abs(x - startPoint.x), Math.abs(y - startPoint.y));
          // Użyj startPoint jako środka kostki, a nie lewego górnego rogu
          const centerX = startPoint.x;
          const centerY = startPoint.y;
          const cube = new RGBCube(centerX, centerY, size, color, strokeWidth);
          canvasManager.addShape(cube);
        } else if (currentTool === 'bezier' && currentBezier && currentBezier.points.length >= 4) {
          // Dodaj Bezier do canvasManager jeśli są co najmniej 4 punkty
          canvasManager.addShape(currentBezier.clone());
          setCurrentBezier(null);
        }
        // Renderuj tylko dla innych kształtów
        canvasManager.render();
        refreshCanvas();
      }

      setIsDrawing(false);
      setStartPoint(null);
      setIsDragging(false);
      setIsMouseOutside(false); // Resetuj flagę
    };

    if (isDrawing) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDrawing, startPoint, canvasManager, currentTool, project, refreshCanvas, currentBrush, currentColor, scale, strokeWidth]);

  // Synchronizuj selectedShape z CanvasManager (np. po kliknięciu w LayerPanel)
  useEffect(() => {
    if (!canvasManager) return;
    const selected = canvasManager.getSelectedShape();
    if (selected) {
      let shapeX = 0, shapeY = 0;
      if (selected.type === 'brush') {
        const brush = selected as Brush;
        if (brush.points.length > 0) {
          shapeX = brush.points[0].x;
          shapeY = brush.points[0].y;
        }
      } else if (selected.type === 'rectangle') {
        const rect = selected as Rectangle;
        shapeX = rect.x;
        shapeY = rect.y;
      } else if (selected.type === 'circle') {
        const circle = selected as Circle;
        shapeX = circle.center.x;
        shapeY = circle.center.y;
      } else if (selected.type === 'line') {
        const line = selected as Line;
        shapeX = line.start.x;
        shapeY = line.start.y;
      } else if (selected.type === 'image') {
        const img = selected as any;
        shapeX = img.x;
        shapeY = img.y;
      } else if (selected.type === 'rgbcube') {
        const cube = selected as RGBCube;
        shapeX = cube.x;
        shapeY = cube.y;
      }
      setSelectedShape({ shape: selected, offsetX: 0, offsetY: 0 });
    } else {
      setSelectedShape(null);
    }
  }, [canvasManager && canvasManager.getSelectedShape()]);

  // Obsługa rysowania i przesuwania
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasManager) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Canvas jest skalowany przez CSS, więc używamy proporcji
    // rect.width to szerokość wyświetlanego canvas (po CSS), project.width to rzeczywista szerokość w pikselach
    const scaleX = project!.width / rect.width;
    const scaleY = project!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Tryb SELECT - próbuj złapać figurę lub handle
    if (currentTool === 'select') {
      // Najpierw sprawdź czy kliknięto w handle zaznaczonego kształtu
      if (selectedShape) {
        const handle = findHandleAtPoint(x, y, selectedShape.shape);
        if (handle) {
          // If it's a Bezier or Polygon control point handle, update bezierPointIdx
          if ((selectedShape.shape.type === 'bezier' || selectedShape.shape.type === 'polygon') && handle.startsWith('pt-') && typeof setBezierPointIdx === 'function') {
            const idx = parseInt(handle.replace('pt-', ''));
            setBezierPointIdx(idx);
          }
          setIsResizing(true);
          setResizeHandle(handle);
          setResizeStartPoint({ x, y });
          return;
        }
      }
      // Następnie sprawdź czy kliknięto w jakiś kształt
      const shape = canvasManager.findShapeAtPoint(x, y);
      if (shape) {
        // Zaznacz i przygotuj do przesuwania
        canvasManager.selectShape(shape.id);
        // Oblicz offset w zależności od typu kształtu
        let shapeX = 0;
        let shapeY = 0;
        if (shape.type === 'brush') {
          // Dla brush użyj pierwszego punktu
          const brush = shape as Brush;
          if (brush.points.length > 0) {
            shapeX = brush.points[0].x;
            shapeY = brush.points[0].y;
          }
        } else if (shape.type === 'rectangle') {
          const rect = shape as Rectangle;
          shapeX = rect.x;
          shapeY = rect.y;
        } else if (shape.type === 'circle') {
          const circle = shape as Circle;
          shapeX = circle.center.x;
          shapeY = circle.center.y;
        } else if (shape.type === 'line') {
          const line = shape as Line;
          shapeX = line.start.x;
          shapeY = line.start.y;
        } else if (shape.type === 'image') {
          const img = shape as any;
          shapeX = img.x;
          shapeY = img.y;
        } else if (shape.type === 'rgbcube') {
          const cube = shape as RGBCube;
          shapeX = cube.x;
          shapeY = cube.y;
        } else if (shape.type === 'bezier') {
          // When selecting a Bezier, default to first control point
          if (typeof setBezierPointIdx === 'function') setBezierPointIdx(0);
        } else if (shape.type === 'polygon') {
          // Ustal offset względem lewego górnego rogu bounding boxa polygonu
          const polygon = shape as Polygon;
          if (polygon.points.length > 0) {
            shapeX = Math.min(...polygon.points.map(pt => pt.x));
            shapeY = Math.min(...polygon.points.map(pt => pt.y));
          }
        }
        setSelectedShape({
          shape,
          offsetX: x - shapeX,
          offsetY: y - shapeY
        });
        setIsDragging(true);
        // Dla obrazów i kostek RGB ustaw początkową pozycję preview na aktualną pozycję
        if (shape.type === 'image' || shape.type === 'rgbcube') {
          setDragPreviewPosition({ x: shapeX, y: shapeY });
        }
        canvasManager.render();
        refreshCanvas();
      } else {
        // Odznacz wszystko
        canvasManager.selectShape(null);
        setSelectedShape(null);
        canvasManager.render();
        refreshCanvas();
      }
    } else if (currentTool === 'brush') {
      // Rozpocznij rysowanie pędzlem
      const color = hexToRgb(currentColor);
      const roundedX = Math.floor(x);
      const roundedY = Math.floor(y);
      const brush = new Brush([{ x: roundedX, y: roundedY }], color, strokeWidth);
      console.log('[BRUSH START] Pierwszy punkt:', { x: roundedX, y: roundedY });
      setCurrentBrush(brush);
      setIsDrawing(true);
      setIsMouseOutside(false); // Resetuj flagę na początku rysowania
      
      // Narysuj pierwszy punkt od razu (dla pojedynczego kliknięcia)
      const ctx = getPixelPerfectContext();
      if (ctx) {
        // Dla wszystkich pędzli - rysuj bezpośrednio piksele bez anti-aliasingu
        const imageData = ctx.getImageData(0, 0, project!.width, project!.height);
        const data = imageData.data;
        const radius = strokeWidth / 2;
        const radiusSquared = radius * radius;
        const offset = Math.ceil(radius);
        
        for (let dy = -offset; dy <= offset; dy++) {
          for (let dx = -offset; dx <= offset; dx++) {
            const distSquared = dx * dx + dy * dy;
            if (distSquared <= radiusSquared) {
              const px = roundedX + dx;
              const py = roundedY + dy;
              if (px >= 0 && px < project!.width && py >= 0 && py < project!.height) {
                const index = (py * project!.width + px) * 4;
                data[index] = color.r;
                data[index + 1] = color.g;
                data[index + 2] = color.b;
                data[index + 3] = color.a;
              }
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
  } else if (currentTool === 'bezier') {
    const color = hexToRgb(currentColor);
    if (
      selectedShape &&
      selectedShape.shape.type === 'bezier' &&
      selectedShape.shape.selected &&
      !isDragging &&
      !isResizing
    ) {
      const bezier = selectedShape.shape;
      bezier.points.push({ x, y });
      bezier.color = color;
      if (typeof strokeWidth === 'number') bezier.strokeWidth = strokeWidth;
      setCurrentBezier(bezier);
      canvasManager.render();
      refreshCanvas();
    } else {
      const width = typeof strokeWidth === 'number' ? strokeWidth : 2;
      const bezier = new Bezier([{ x, y }], color, width);
      setCurrentBezier(bezier);
      canvasManager.addShape(bezier);
      canvasManager.selectShape(bezier.id);
      setSelectedShape({ shape: bezier, offsetX: 0, offsetY: 0 });
      canvasManager.render();
      refreshCanvas();
    }
    setIsDrawing(false);
    setStartPoint(null);
  } else if (currentTool === 'polygon') {
      const polyColor = hexToRgb(currentColor);
      if (
        selectedShape &&
        selectedShape.shape.type === 'polygon' &&
        selectedShape.shape.selected &&
        !isDragging &&
        !isResizing
      ) {
        const polygon = selectedShape.shape;
        polygon.points.push({ x, y });
        polygon.color = polyColor;
        if (typeof strokeWidth === 'number') polygon.strokeWidth = strokeWidth;
        setCurrentPolygon(polygon);
        canvasManager.render();
        refreshCanvas();
      } else {
        const width = typeof strokeWidth === 'number' ? strokeWidth : 2;
        const polygon = new Polygon([{ x, y }], polyColor, width);
        setCurrentPolygon(polygon);
        canvasManager.addShape(polygon);
        canvasManager.selectShape(polygon.id);
        setSelectedShape({ shape: polygon, offsetX: 0, offsetY: 0 });
        canvasManager.render();
        refreshCanvas();
      }
      setIsDrawing(false);
      setStartPoint(null);
    } else {
      // Tryb rysowania innych kształtów
      setStartPoint({ x, y });
      setIsDrawing(true);
    }
  };

  // Ref do zapamiętania poprzedniej pozycji myszy przy obracaniu polygonu
  const prevMouseRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasManager) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Canvas jest skalowany przez CSS, więc używamy proporcji
    const scaleX = project!.width / rect.width;
    const scaleY = project!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Zapisz pozycję myszy i pobierz kolor piksela
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);
    
    if (pixelX >= 0 && pixelX < project!.width && pixelY >= 0 && pixelY < project!.height) {
      setMousePosition({ x: pixelX, y: pixelY });
      
      // Pobierz kolor piksela
      const color = canvasManager.getPixel(pixelX, pixelY);
      setPixelColor(color);
      
      // Sprawdź czy mysz jest nad ZAZNACZONYM RGB Cube i wygeneruj przekrój
      // ALE tylko gdy cube NIE jest przenoszony ani skalowany
      let crossSectionGenerated = false;
      
      // Przekrój tylko dla zaznaczonego RGB Cube, który nie jest obecnie przenoszony/skalowany
      if (selectedShape && selectedShape.shape.type === 'rgbcube' && !isDragging && !isResizing) {
        const cube = selectedShape.shape as RGBCube;
        
        // Sprawdź czy punkt jest wewnątrz rzutowanej kostki
        if (cube.containsPoint({ x: pixelX, y: pixelY })) {
          // Znajdź ścianę i wartość na osi prostopadłej
          const faceInfo = cube.findFaceAt3DPoint(pixelX, pixelY);
          
          if (faceInfo) {
            // Generuj przekrój prostopadły do wykrytej ściany
            const crossSection = cube.generateCrossSection(faceInfo.axis, faceInfo.value, 100);
            
            // Oblicz linię przekroju na ścianie
            const crossSectionLine = cube.getCrossSectionLineOnFace(faceInfo.axis, faceInfo.value, pixelX, pixelY);
            
            setRgbCubeCrossSection({
              imageData: crossSection,
              axis: faceInfo.axis.toUpperCase(),
              value: faceInfo.value,
              crossSectionLine: crossSectionLine || undefined
            });
            crossSectionGenerated = true;
          }
        }
      }
      
      if (!crossSectionGenerated) {
        setRgbCubeCrossSection(null);
      }
    } else {
      setMousePosition(null);
      setPixelColor(null);
      setRgbCubeCrossSection(null);
    }

    // Zmień kursor jeśli jesteśmy nad handle'm w trybie select
    if (currentTool === 'select' && selectedShape && !isResizing && !isDragging && canvasRef.current) {
      const handle = findHandleAtPoint(x, y, selectedShape.shape);
      if (handle) {
        canvasRef.current.style.cursor = 'pointer';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }

    // Zmiana rozmiaru (resize) lub przesuwanie punktu kontrolnego Bezier
    if (isResizing && selectedShape && resizeHandle && resizeStartPoint && currentTool === 'select') {
      const shape = selectedShape.shape;
      // Zaokrąglij do pełnych pikseli
      const dx = Math.round(x - resizeStartPoint.x);
      const dy = Math.round(y - resizeStartPoint.y);
      // Zmień rozmiar tylko jeśli jest rzeczywista zmiana
      if (dx === 0 && dy === 0) {
        return;
      }
      if (shape.type === 'circle') {
        const circle = shape as Circle;
        if (resizeHandle === 'right' || resizeHandle === 'left') {
          circle.radius = Math.max(1, Math.round(Math.abs(circle.radius + (resizeHandle === 'right' ? dx : -dx))));
        } else {
          circle.radius = Math.max(1, Math.round(Math.abs(circle.radius + (resizeHandle === 'bottom' ? dy : -dy))));
        }
      } else if (shape.type === 'rectangle') {
        const rect = shape as Rectangle;
        if (resizeHandle === 'top-left') {
          rect.width = Math.round(rect.width - dx);
          rect.height = Math.round(rect.height - dy);
          rect.x = Math.round(rect.x + dx);
          rect.y = Math.round(rect.y + dy);
        } else if (resizeHandle === 'top-right') {
          rect.width = Math.round(rect.width + dx);
          rect.height = Math.round(rect.height - dy);
          rect.y = Math.round(rect.y + dy);
        } else if (resizeHandle === 'bottom-left') {
          rect.width = Math.round(rect.width - dx);
          rect.height = Math.round(rect.height + dy);
          rect.x = Math.round(rect.x + dx);
        } else if (resizeHandle === 'bottom-right') {
          rect.width = Math.round(rect.width + dx);
          rect.height = Math.round(rect.height + dy);
        }
      } else if (shape.type === 'line') {
        const line = shape as Line;
        if (resizeHandle === 'start') {
          line.start.x = Math.round(line.start.x + dx);
          line.start.y = Math.round(line.start.y + dy);
        } else if (resizeHandle === 'end') {
          line.end.x = Math.round(line.end.x + dx);
          line.end.y = Math.round(line.end.y + dy);
        }
      } else if ((shape.type === 'bezier' || shape.type === 'polygon') && resizeHandle.startsWith('pt-')) {
        // Przesuwanie punktu kontrolnego Bezier/Polygon
        const idx = parseInt(resizeHandle.slice(3), 10);
        if (!isNaN(idx)) {
          const oldPt = shape.points[idx];
          shape.moveControlPoint(idx, { x: oldPt.x + dx, y: oldPt.y + dy });
        }
      } else if (shape.type === 'polygon' && resizeHandle === 'rotation-center') {
        // Przesuwanie środka obrotu poligonu
        shape.moveRotationCenter({
          x: shape.rotationCenter.x + dx,
          y: shape.rotationCenter.y + dy
        });
      }
      setResizeStartPoint({ x: Math.round(x), y: Math.round(y) });
      throttledRender(canvasManager);
      return;
    }

    // Przesuwanie lub obracanie figury (obrót dla polygon przy shift)
    if (isDragging && selectedShape && currentTool === 'select') {
      const shape = selectedShape.shape;
      // Obracanie polygonu myszką przy trzymaniu shift
      if (shape.type === 'polygon' && e.shiftKey) {
        const polygon = shape as Polygon;
        const cx = polygon.rotationCenter?.x ?? 0;
        const cy = polygon.rotationCenter?.y ?? 0;
        // Zapamiętaj poprzednią pozycję myszy w refie
        if (!prevMouseRef.current) {
          prevMouseRef.current = { x, y };
          return;
        }
        const prev = prevMouseRef.current;
        // Kąt od środka do poprzedniej i obecnej pozycji
        const angle0 = Math.atan2(prev.y - cy, prev.x - cx);
        const angle1 = Math.atan2(y - cy, x - cx);
        const delta = angle1 - angle0;
        if (typeof polygon.rotatePoints === 'function' && Math.abs(delta) > 1e-6) {
          polygon.rotatePoints(delta);
          polygon.rotation = (polygon.rotation || 0) + delta;
          throttledRender(canvasManager);
        }
        prevMouseRef.current = { x, y };
        return;
      } else {
        // Resetuj pamięć jeśli nie obracamy
        if (prevMouseRef.current) prevMouseRef.current = null;
      }
      // Dla obrazów i kostek RGB - pokazuj preview zamiast bezpośredniego przesuwania
      if (shape.type === 'image' || shape.type === 'rgbcube') {
        const newX = Math.round(x - selectedShape.offsetX);
        const newY = Math.round(y - selectedShape.offsetY);
        setDragPreviewPosition({ x: newX, y: newY });
        return;
      }
      // Dla innych kształtów - natychmiastowe przesuwanie
      const newX = Math.round(x - selectedShape.offsetX);
      const newY = Math.round(y - selectedShape.offsetY);

      let currentX = 0;
      let currentY = 0;

      if (shape.type === 'brush') {
        const brush = shape as Brush;
        if (brush.points.length > 0) {
          currentX = Math.round(brush.points[0].x);
          currentY = Math.round(brush.points[0].y);
        }
      } else if (shape.type === 'rectangle') {
        const rect = shape as Rectangle;
        currentX = Math.round(rect.x);
        currentY = Math.round(rect.y);
      } else if (shape.type === 'circle') {
        const circle = shape as Circle;
        currentX = Math.round(circle.center.x);
        currentY = Math.round(circle.center.y);
      } else if (shape.type === 'line') {
        const line = shape as Line;
        currentX = Math.round(line.start.x);
        currentY = Math.round(line.start.y);
      } else if (shape.type === 'bezier') {
        // Przesuwaj względem lewego górnego rogu bounding boxa wszystkich punktów
        const bezier = shape as Bezier;
        if (bezier.points.length > 0) {
          const xs = bezier.points.map(pt => pt.x);
          const ys = bezier.points.map(pt => pt.y);
          currentX = Math.round(Math.min(...xs));
          currentY = Math.round(Math.min(...ys));
        }
      } else if (shape.type === 'polygon') {
        // Przesuwaj względem lewego górnego rogu bounding boxa wszystkich punktów
        const polygon = shape as Polygon;
        if (polygon.points.length > 0) {
          const xs = polygon.points.map(pt => pt.x);
          const ys = polygon.points.map(pt => pt.y);
          currentX = Math.round(Math.min(...xs));
          currentY = Math.round(Math.min(...ys));
        }
      }

      const dx = newX - currentX;
      const dy = newY - currentY;

      if (dx !== 0 || dy !== 0) {
        shape.move(dx, dy);
        throttledRender(canvasManager);
      }
      return;
    }

    // Rysowanie pędzlem
    if (isDrawing && currentTool === 'brush' && currentBrush) {
      // Clampuj współrzędne do granic canvas i zaokrąglij do pełnych pikseli
      const clampedX = Math.floor(Math.max(0, Math.min(x, project!.width)));
      const clampedY = Math.floor(Math.max(0, Math.min(y, project!.height)));
      
      const prevPoint = currentBrush.points[currentBrush.points.length - 1];
      
      // Dodaj punkt tylko jeśli to inny piksel niż poprzedni
      if (prevPoint.x !== clampedX || prevPoint.y !== clampedY) {
        currentBrush.addPoint({ x: clampedX, y: clampedY });
        console.log('[BRUSH MOVE] Dodano punkt:', { x: clampedX, y: clampedY }, 'Łącznie punktów:', currentBrush.points.length);
      }
      
      // Rysuj tylko nowy segment pędzla bezpośrednio na canvasie
      const ctx = getPixelPerfectContext();
      if (ctx) {
        // Dla wszystkich pędzli - rysuj bezpośrednio piksele bez anti-aliasingu
        const imageData = ctx.getImageData(0, 0, project!.width, project!.height);
        const color = hexToRgb(currentColor);
        
        // Rysuj linię Bresenhama między punktami
        drawPixelLine(imageData, Math.floor(prevPoint.x), Math.floor(prevPoint.y), 
                          Math.floor(clampedX), Math.floor(clampedY), color, strokeWidth);
        
        ctx.putImageData(imageData, 0, 0);
      }
      return;
    }

    // Podgląd podczas rysowania
    if (isDrawing && startPoint && currentTool !== 'select' && currentTool !== 'brush') {
      // Narysuj wszystko + podgląd
      canvasManager.render();

      // Dodaj tymczasowy kształt na podgląd (rysuj bezpośrednio na ctx)
      const ctx = getPixelPerfectContext();
      if (ctx) {
        ctx.putImageData(canvasManager.getImageData(), 0, 0);
        
        // Rysuj podgląd
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;

        if (currentTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (currentTool === 'rectangle') {
          ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
        } else if (currentTool === 'circle') {
          const radius = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
          ctx.beginPath();
          ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (currentTool === 'rgbcube') {
          // Draw 3D cube wireframe preview
          const size = Math.max(Math.abs(x - startPoint.x), Math.abs(y - startPoint.y));
          const color = hexToRgb(currentColor);
          // Użyj startPoint jako środka kostki
          const centerX = startPoint.x;
          const centerY = startPoint.y;
          const cube = new RGBCube(centerX, centerY, size, color, strokeWidth);
          
          // Helper function to rotate and project a point
          const rotateAndProject = (px: number, py: number, pz: number) => {
            // Rotate around X axis
            const cosX = Math.cos(cube.rotationX);
            const sinX = Math.sin(cube.rotationX);
            const y1 = py * cosX - pz * sinX;
            const z1 = py * sinX + pz * cosX;
            
            // Rotate around Y axis
            const cosY = Math.cos(cube.rotationY);
            const sinY = Math.sin(cube.rotationY);
            const x2 = px * cosY + z1 * sinY;
            const z2 = -px * sinY + z1 * cosY;
            
            // Perspective projection - używaj tej samej logiki co w RGBCube.project()
            const cameraDistance = Math.max(200, size * 2);
            const scale = cameraDistance / (cameraDistance + z2);
            return {
              x: cube.x + x2 * scale,
              y: cube.y + y1 * scale
            };
          };
          
          // Create 8 vertices of the cube
          const s = size / 2;
          const vertices = [
            rotateAndProject(-s, -s, -s), // 0
            rotateAndProject(s, -s, -s),  // 1
            rotateAndProject(s, s, -s),   // 2
            rotateAndProject(-s, s, -s),  // 3
            rotateAndProject(-s, -s, s),  // 4
            rotateAndProject(s, -s, s),   // 5
            rotateAndProject(s, s, s),    // 6
            rotateAndProject(-s, s, s)    // 7
          ];
          
          // Draw 12 edges of the cube
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
            ctx.moveTo(vertices[start].x, vertices[start].y);
            ctx.lineTo(vertices[end].x, vertices[end].y);
          });
          ctx.stroke();
        }

        ctx.setLineDash([]);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasManager) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Canvas jest skalowany przez CSS, więc używamy proporcji i clampuj do granic canvas
    const scaleX = project!.width / rect.width;
    const scaleY = project!.height / rect.height;
    const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, project!.width));
    const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, project!.height));

    // Koniec zmiany rozmiaru
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStartPoint(null);
      return;
    }

    // Koniec przesuwania - faktycznie przesuń obraz lub kostkę RGB
    if (isDragging && selectedShape && dragPreviewPosition && (selectedShape.shape.type === 'image' || selectedShape.shape.type === 'rgbcube')) {
      const shape = selectedShape.shape;
      let currentX = 0;
      let currentY = 0;
      
      if (shape.type === 'image') {
        const img = shape as any;
        currentX = Math.round(img.x);
        currentY = Math.round(img.y);
      } else if (shape.type === 'rgbcube') {
        const cube = shape as any;
        currentX = Math.round(cube.x);
        currentY = Math.round(cube.y);
      }
      
      // Oblicz przesunięcie - przesuń TYLKO jeśli pozycja faktycznie się zmieniła
      const dx = dragPreviewPosition.x - currentX;
      const dy = dragPreviewPosition.y - currentY;
      
      // Przesuń tylko jeśli nastąpiło faktyczne przesunięcie (więcej niż 1 piksel)
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        shape.move(dx, dy);
        canvasManager.render();
        refreshCanvas();
      }
      
      setDragPreviewPosition(null);
    }
    
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    // Koniec rysowania
    if (!isDrawing) return;

    // Pędzel - "zapieczętuj" aktualny stan canvas
    if (currentTool === 'brush' && currentBrush) {
      // Pędzel jest już narysowany na canvasie przez handleMouseMove
      // Teraz dodajemy go jako shape z zebranymi punktami
      
      console.log('[BRUSH END] Zakończono rysowanie. Zebrano punktów:', currentBrush.points.length);
      console.log('[BRUSH END] Wszystkie punkty:', currentBrush.points);
      
      // Dodaj brush jako shape z zebranymi punktami
      canvasManager.addShape(currentBrush);
      console.log('[BRUSH END] Shape dodany do canvasManager');
      
      // Odśwież canvas - przerenderuj wszystkie shape'y
      canvasManager.render();
      refreshCanvas();
      
      setCurrentBrush(null);
      setIsDrawing(false);
      setIsMouseOutside(false); // Resetuj flagę
      return;
    }

    // Inne kształty - potrzebują startPoint
    if (!startPoint) return;

    // Stwórz kształt w zależności od wybranego narzędzia
    const color = hexToRgb(currentColor);
    if (currentTool === 'line') {
      const line = new Line(startPoint, { x, y }, color, strokeWidth);
      canvasManager.addShape(line);
    } else if (currentTool === 'rectangle') {
      const width = x - startPoint.x;
      const height = y - startPoint.y;
      const rect = new Rectangle(startPoint.x, startPoint.y, width, height, false, color, strokeWidth);
      canvasManager.addShape(rect);
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
      const circle = new Circle(startPoint, radius, false, color, strokeWidth);
      canvasManager.addShape(circle);
    } else if (currentTool === 'rgbcube') {
      const size = Math.max(Math.abs(x - startPoint.x), Math.abs(y - startPoint.y));
      // Użyj startPoint jako środka kostki
      const centerX = startPoint.x;
      const centerY = startPoint.y;
      const cube = new RGBCube(centerX, centerY, size, color, strokeWidth);
      canvasManager.addShape(cube);
    }
    // Resetuj currentBezier jeśli zmieniono narzędzie lub odznaczono shape
    if (currentBezier && (currentTool !== 'bezier' || !selectedShape || selectedShape.shape.type !== 'bezier' || !selectedShape.shape.selected)) {
      setCurrentBezier(null);
    }

    // Renderuj i aktualizuj canvas
    canvasManager.render();
    refreshCanvas();

    setIsDrawing(false);
    setStartPoint(null);
  };

  if (!project) {
    return (
      <div className="flex-1 bg-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <i className="ri-artboard-line text-6xl mb-2"></i>
            <p>No project loaded</p>
          </div>
        </div>
      </div>
    );
  }

  // Określ kursor na podstawie narzędzia
  const getCursorStyle = () => {
    switch (currentTool) {
      case 'select': return 'default';
      case 'line':
      case 'rectangle':
      case 'circle':
      case 'bezier': return 'crosshair';
      case 'hand': return 'grab';
      case 'zoom': return 'zoom-in';
      default: return 'crosshair';
    }
  };

  return (
    <div ref={containerRef} className="flex-1 bg-zinc-800 relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/95 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <div className="text-zinc-400">Loading canvas...</div>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 overflow-auto">
        <div 
          className="min-h-full min-w-full flex items-center justify-center p-4"
          style={{
            minWidth: `${project.width * scale + 32}px`,
            minHeight: `${project.height * scale + 32}px`,
          }}
        >
          <div 
            className="bg-white border border-zinc-600 shadow-2xl relative flex-shrink-0"
            style={{
              width: `${project.width * scale}px`,
              height: `${project.height * scale}px`,
            }}
          >
          {/* Canvas element - TUTAJ RYSUJESZ */}
          <canvas
            ref={canvasRef}
            width={project.width}
            height={project.height}
            draggable={false}
            style={{ 
              cursor: getCursorStyle(),
              imageRendering: 'pixelated', // Ostre piksele bez interpolacji
              width: '100%',
              height: '100%',
              display: 'block'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={(e) => {
              // Wyczyść informacje o pozycji myszy i kolorze piksela
              setMousePosition(null);
              setPixelColor(null);
              
              // Oznacz, że mysz wyszła poza canvas
              if (isDrawing && currentTool === 'brush') {
                setIsMouseOutside(true);
              }
              
              // Dla pędzla - nie czyść, bo pędzel jest już narysowany
              // Dla innych narzędzi - wyczyść podgląd
              if (isDrawing && currentTool !== 'brush') {
                const ctx = getPixelPerfectContext();
                if (ctx && canvasManager) {
                  canvasManager.render();
                  ctx.putImageData(canvasManager.getImageData(), 0, 0);
                }
              }
              // Nie resetujemy isDrawing i startPoint - czekamy na mouseup
            }}
          />
          
          {/* Overlay canvas dla selection i preview */}
          <canvas
            width={project.width}
            height={project.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              imageRendering: 'pixelated'
            }}
            ref={(overlayCanvas) => {
              if (!overlayCanvas) return;
              const ctx = overlayCanvas.getContext('2d');
              if (!ctx) return;
              
              // Wyczyść overlay
              ctx.clearRect(0, 0, project.width, project.height);
              ctx.imageSmoothingEnabled = false;
              
              // Rysuj niebieską ramkę dla zaznaczonego kształtu
              if (selectedShape && currentTool === 'select') {
                const shape = selectedShape.shape;
                
                // Dla RGB Cube - rysuj wireframe zamiast prostokąta
                if (shape.type === 'rgbcube') {
                  const cube = shape as RGBCube;
                  const { vertices2D } = (cube as any).getVertices();
                  
                  ctx.strokeStyle = '#3b82f6'; // Niebieski
                  ctx.lineWidth = 2 / scale;
                  ctx.setLineDash([4 / scale, 4 / scale]);
                  
                  // 12 krawędzi kostki
                  const edges = [
                    [0, 1], [1, 2], [2, 3], [3, 0], // Front
                    [4, 5], [5, 6], [6, 7], [7, 4], // Back
                    [0, 4], [1, 5], [2, 6], [3, 7]  // Connect
                  ];
                  
                  ctx.beginPath();
                  edges.forEach(([start, end]) => {
                    ctx.moveTo(vertices2D[start].x, vertices2D[start].y);
                    ctx.lineTo(vertices2D[end].x, vertices2D[end].y);
                  });
                  ctx.stroke();
                  
                  ctx.setLineDash([]);
                } else {
                  // Dla innych kształtów - prostokątne obramowanie
                  ctx.strokeStyle = '#3b82f6'; // Niebieski kolor
                  ctx.lineWidth = 2 / scale; // Dostosuj grubość do skali
                  ctx.setLineDash([4 / scale, 4 / scale]); // Przerywana linia
                  
                  const bbox = shape.getBoundingBox();
                  if (bbox) {
                    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
                  }
                  
                  ctx.setLineDash([]); // Reset
                }
              }
              
              // Rysuj preview przesuwania (cień) - DLA OBRAZÓW I KOSTEK RGB
              if (isDragging && dragPreviewPosition && selectedShape) {
                const bbox = selectedShape.shape.getBoundingBox();
                if (bbox) {
                  if (selectedShape.shape.type === 'image') {
                    // Dla obrazów - prostokątny cień
                    ctx.strokeStyle = '#3b82f6'; // Niebieski
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Półprzezroczyste wypełnienie
                    ctx.lineWidth = 2 / scale;
                    ctx.setLineDash([4 / scale, 4 / scale]);
                    
                    ctx.fillRect(dragPreviewPosition.x, dragPreviewPosition.y, bbox.width, bbox.height);
                    ctx.strokeRect(dragPreviewPosition.x, dragPreviewPosition.y, bbox.width, bbox.height);
                    
                    ctx.setLineDash([]);
                  } else if (selectedShape.shape.type === 'rgbcube') {
                    // Dla kostki RGB - wireframe 3D
                    const cube = selectedShape.shape as RGBCube;
                    
                    // Tymczasowo zmień pozycję kostki na pozycję preview
                    const savedX = cube.x;
                    const savedY = cube.y;
                    cube.x = dragPreviewPosition.x;
                    cube.y = dragPreviewPosition.y;
                    
                    // Pobierz wierzchołki (metoda getVertices jest private, użyjemy any)
                    const { vertices2D } = (cube as any).getVertices();
                    
                    // Przywróć oryginalną pozycję
                    cube.x = savedX;
                    cube.y = savedY;
                    
                    // Rysuj wireframe
                    ctx.strokeStyle = '#3b82f6'; // Niebieski
                    ctx.lineWidth = 2 / scale;
                    ctx.setLineDash([4 / scale, 4 / scale]);
                    
                    // 12 krawędzi kostki
                    const edges = [
                      [0, 1], [1, 2], [2, 3], [3, 0], // Front
                      [4, 5], [5, 6], [6, 7], [7, 4], // Back
                      [0, 4], [1, 5], [2, 6], [3, 7]  // Connect
                    ];
                    
                    ctx.beginPath();
                    edges.forEach(([start, end]) => {
                      ctx.moveTo(vertices2D[start].x, vertices2D[start].y);
                      ctx.lineTo(vertices2D[end].x, vertices2D[end].y);
                    });
                    ctx.stroke();
                    
                    ctx.setLineDash([]);
                  }
                }
              }
              
              // Rysuj czerwoną linię przekroju RGB Cube
              if (rgbCubeCrossSection && rgbCubeCrossSection.crossSectionLine) {
                const line = rgbCubeCrossSection.crossSectionLine;
                if (line.length >= 2) {
                  ctx.strokeStyle = '#ef4444'; // Czerwony
                  ctx.lineWidth = 3 / scale;
                  ctx.setLineDash([]); // Solid line
                  
                  ctx.beginPath();
                  ctx.moveTo(line[0].x, line[0].y);
                  ctx.lineTo(line[1].x, line[1].y);
                  ctx.stroke();
                  
                  // Dodaj małe kropki na końcach linii
                  ctx.fillStyle = '#ef4444';
                  [line[0], line[1]].forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 3 / scale, 0, 2 * Math.PI);
                    ctx.fill();
                  });
                }
              }
            }}
          />
          </div>
        </div>
      </div>
      
      {/* Zoom control with slider */}
      <div className="absolute bottom-4 right-4 bg-zinc-900/90 backdrop-blur-sm text-white rounded-lg border border-zinc-700/50 shadow-lg">
        <div className="flex items-center space-x-3 px-3 py-2">
          
          {/* Zoom slider */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScale(prev => Math.max(prev - 0.1, 0.1))}
              className="text-zinc-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center hover:bg-zinc-800 rounded"
              title="Zmniejsz (Ctrl + -)"
            >
              <i className="ri-subtract-line"></i>
            </button>
            
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={Math.round(scale * 100)}
              onChange={(e) => setScale(parseInt(e.target.value) / 100)}
              className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer zoom-slider"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((Math.round(scale * 100) - 10) / 490) * 100}%, #3f3f46 ${((Math.round(scale * 100) - 10) / 490) * 100}%, #3f3f46 100%)`
              }}
            />
            
            <button
              onClick={() => setScale(prev => Math.min(prev + 0.1, 5))}
              className="text-zinc-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center hover:bg-zinc-800 rounded"
              title="Powiększ (Ctrl + +)"
            >
              <i className="ri-add-line"></i>
            </button>
          </div>
          
          {/* Zoom percentage */}
          <div 
            className="text-sm font-medium text-white text-center pr-3 select-none cursor-pointer"
            onClick={resetZoom}
          >
            {Math.round(scale * 100)}%
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="absolute bottom-4 left-4 bg-zinc-900 bg-opacity-90 text-white px-3 py-2 rounded text-xs space-y-1">
        <div>Size: {project.width} × {project.height} px</div>
        
        {/* Pixel info */}
        {mousePosition && pixelColor && (
          <div className="border-t border-zinc-700 pt-1 mt-1 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Pos:</span>
              <span>X: {mousePosition.x}, Y: {mousePosition.y}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 border border-zinc-600 rounded"
                style={{ 
                  backgroundColor: `rgb(${pixelColor.r}, ${pixelColor.g}, ${pixelColor.b})` 
                }}
              />
              <span className="text-zinc-400">RGB:</span>
              <span>
                R:{pixelColor.r} G:{pixelColor.g} B:{pixelColor.b}
                {pixelColor.a < 255 && ` A:${pixelColor.a}`}
              </span>
            </div>
          </div>
        )}
        
        {selectedShape && (
          <div className="border-t border-zinc-700 pt-1 mt-1">
            <span>Tool: {selectedShape.shape.type.charAt(0).toUpperCase() + selectedShape.shape.type.slice(1)}</span>
            <div className="text-zinc-400 text-[10px]">Click and drag to move</div>
          </div>
        )}
      </div>

      {/* RGB Cube Cross Section Preview */}
      {rgbCubeCrossSection && (
        <div className="absolute bottom-4 left-4 mb-32 bg-zinc-900 bg-opacity-90 text-white px-3 py-2 rounded space-y-1">
          <div className="text-xs text-zinc-400 mb-1">
            RGB Cube Cross Section ({rgbCubeCrossSection.axis}={Math.round(rgbCubeCrossSection.value)})
          </div>
          <canvas
            ref={(canvas) => {
              if (canvas && rgbCubeCrossSection) {
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.putImageData(rgbCubeCrossSection.imageData, 0, 0);
                }
              }
            }}
            className="border border-zinc-700 rounded"
            style={{ width: '100px', height: '100px', imageRendering: 'pixelated' }}
          />
          <div className="text-[10px] text-zinc-500">
            Plane perpendicular to {rgbCubeCrossSection.axis}-axis
          </div>
        </div>
      )}

      {/* Styles for zoom slider */}
      <style jsx>{`
        .zoom-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          border: 2px solid #6366f1;
        }

        .zoom-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          border: 2px solid #6366f1;
        }

        .zoom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        .zoom-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
