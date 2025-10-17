
'use client';

import { useState, useEffect, useRef } from 'react';
import { CanvasManager } from '@/lib/CanvasManager';
import { Line, Rectangle, Circle, Brush } from '@/lib/shapes';
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
}

export default function Canvas({ project, currentTool = 'select', currentColor = '#000000', strokeWidth = 1, canvasManagerRef, canvasRefreshRef }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [selectedShape, setSelectedShape] = useState<{ shape: any; offsetX: number; offsetY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBrush, setCurrentBrush] = useState<Brush | null>(null);
  const [isMouseOutside, setIsMouseOutside] = useState(false);
  const updateTrigger = useRef(0);

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
      // Rysuj piksel (lub kilka dla thickness > 1)
      if (thickness === 1) {
        setPixel(x, y);
      } else {
        // Dla thickness=2, rysuj 2x2 kwadrat
        const offset = Math.floor(thickness / 2);
        for (let dy = -offset; dy <= offset; dy++) {
          for (let dx = -offset; dx <= offset; dx++) {
            setPixel(x + dx, y + dy);
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
      mgr.render(); // IMPORTANT: Render shapes first!
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

  // Inicjalizacja CanvasManager
  useEffect(() => {
    if (!project || !canvasRef.current) return;

    const manager = new CanvasManager(project.width, project.height);
    setCanvasManager(manager);
    
    // Expose manager to parent via ref
    if (canvasManagerRef) {
      canvasManagerRef.current = manager;
    }

    // Expose refresh function to parent
    if (canvasRefreshRef) {
      canvasRefreshRef.current = () => refreshCanvas(manager);
    }

    // Wczytaj zapisany stan z localStorage
    const savedData = projectStorage.getCanvasData(project.id);
    if (savedData) {
      try {
        manager.deserialize(savedData);
      } catch (e) {
        console.error('Failed to load canvas data:', e);
      }
    }

    // Inicjalizuj canvas
    manager.render();
    refreshCanvas(manager);

    return () => {
      if (canvasManagerRef) {
        canvasManagerRef.current = null;
      }
      if (canvasRefreshRef) {
        canvasRefreshRef.current = null;
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
        
        // Zapisz również thumbnail
        const thumbnailData = canvasManager.exportAsPNG();
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
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, [project]);

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
        setSelectedShape({
          shape,
          offsetX: x - (shape as any).x || x - (shape as any).center?.x || x - (shape as any).start?.x || 0,
          offsetY: y - (shape as any).y || y - (shape as any).center?.y || y - (shape as any).start?.y || 0
        });
        setIsDragging(true);
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
      const brush = new Brush([{ x, y }], color, strokeWidth);
      setCurrentBrush(brush);
      setIsDrawing(true);
      setIsMouseOutside(false); // Resetuj flagę na początku rysowania
    } else {
      // Tryb rysowania innych kształtów
      setStartPoint({ x, y });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasManager) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Canvas jest skalowany przez CSS, więc używamy proporcji
    const scaleX = project!.width / rect.width;
    const scaleY = project!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Zmień kursor jeśli jesteśmy nad handle'm w trybie select
    if (currentTool === 'select' && selectedShape && !isResizing && !isDragging && canvasRef.current) {
      const handle = findHandleAtPoint(x, y, selectedShape.shape);
      if (handle) {
        canvasRef.current.style.cursor = 'pointer';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }

    // Zmiana rozmiaru (resize)
    if (isResizing && selectedShape && resizeHandle && resizeStartPoint && currentTool === 'select') {
      const shape = selectedShape.shape;
      const dx = x - resizeStartPoint.x;
      const dy = y - resizeStartPoint.y;
      
      if (shape.type === 'circle') {
        const circle = shape as Circle;
        if (resizeHandle === 'right' || resizeHandle === 'left') {
          circle.radius = Math.max(1, Math.abs(circle.radius + (resizeHandle === 'right' ? dx : -dx)));
        } else {
          circle.radius = Math.max(1, Math.abs(circle.radius + (resizeHandle === 'bottom' ? dy : -dy)));
        }
      } else if (shape.type === 'rectangle') {
        const rect = shape as Rectangle;
        if (resizeHandle === 'top-left') {
          rect.width -= dx;
          rect.height -= dy;
          rect.x += dx;
          rect.y += dy;
        } else if (resizeHandle === 'top-right') {
          rect.width += dx;
          rect.height -= dy;
          rect.y += dy;
        } else if (resizeHandle === 'bottom-left') {
          rect.width -= dx;
          rect.height += dy;
          rect.x += dx;
        } else if (resizeHandle === 'bottom-right') {
          rect.width += dx;
          rect.height += dy;
        }
      } else if (shape.type === 'line') {
        const line = shape as Line;
        if (resizeHandle === 'start') {
          line.start.x += dx;
          line.start.y += dy;
        } else if (resizeHandle === 'end') {
          line.end.x += dx;
          line.end.y += dy;
        }
      }
      
      setResizeStartPoint({ x, y });
      canvasManager.render();
      refreshCanvas();
      return;
    }

    // Przesuwanie figury
    if (isDragging && selectedShape && currentTool === 'select') {
      const shape = selectedShape.shape;
      const newX = x - selectedShape.offsetX;
      const newY = y - selectedShape.offsetY;

      // Oblicz przesunięcie
      const currentX = (shape as any).x || (shape as any).center?.x || (shape as any).start?.x || 0;
      const currentY = (shape as any).y || (shape as any).center?.y || (shape as any).start?.y || 0;
      
      const dx = newX - currentX;
      const dy = newY - currentY;

      shape.move(dx, dy);
      canvasManager.render();
      refreshCanvas();
      return;
    }

    // Rysowanie pędzlem
    if (isDrawing && currentTool === 'brush' && currentBrush) {
      // Clampuj współrzędne do granic canvas
      const clampedX = Math.max(0, Math.min(x, project!.width));
      const clampedY = Math.max(0, Math.min(y, project!.height));
      
      const prevPoint = currentBrush.points[currentBrush.points.length - 1];
      currentBrush.addPoint({ x: clampedX, y: clampedY });
      
      // Rysuj tylko nowy segment pędzla bezpośrednio na canvasie
      const ctx = getPixelPerfectContext();
      if (ctx) {
        // Dla małych pędzli (1-2px) - rysuj bezpośrednio piksele bez anti-aliasingu
        if (strokeWidth <= 2) {
          const imageData = ctx.getImageData(0, 0, project!.width, project!.height);
          const color = hexToRgb(currentColor);
          
          // Rysuj linię Bresenhama między punktami
          drawPixelLine(imageData, Math.floor(prevPoint.x), Math.floor(prevPoint.y), 
                            Math.floor(clampedX), Math.floor(clampedY), color, strokeWidth);
          
          ctx.putImageData(imageData, 0, 0);
        } else {
          // Dla większych pędzli - użyj canvas API
          ctx.fillStyle = currentColor;
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Jeśli mysz właśnie wróciła z zewnątrz, nie rysuj linii - tylko zacznij nowy punkt
          if (!isMouseOutside) {
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(clampedX, clampedY);
            ctx.stroke();
          } else {
            // Mysz wróciła - narysuj tylko punkt, nie linię
            ctx.beginPath();
            ctx.arc(clampedX, clampedY, strokeWidth / 2, 0, 2 * Math.PI);
            ctx.fill();
            setIsMouseOutside(false); // Resetuj flagę
          }
        }
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

    // Koniec przesuwania
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    // Koniec rysowania
    if (!isDrawing) return;

    // Pędzel - "zapieczętuj" aktualny stan canvas
    if (currentTool === 'brush' && currentBrush) {
      // Pędzel jest już narysowany na canvasie przez handleMouseMove
      // Teraz musimy zaktualizować imageData w canvasManager
      const ctx = getPixelPerfectContext();
      if (ctx) {
        const currentImageData = ctx.getImageData(0, 0, project!.width, project!.height);
        // Zaktualizuj wewnętrzny bufor w canvasManager
        const managerImageData = canvasManager.getImageData();
        managerImageData.data.set(currentImageData.data);
      }
      
      setCurrentBrush(null);
      setIsDrawing(false);
      setIsMouseOutside(false); // Resetuj flagę
      // NIE dodajemy brush do shapes - został już narysowany bezpośrednio
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
      case 'circle': return 'crosshair';
      case 'hand': return 'grab';
      case 'zoom': return 'zoom-in';
      default: return 'crosshair';
    }
  };

  return (
    <div ref={containerRef} className="flex-1 bg-zinc-800 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div 
          className="bg-white border border-zinc-600 shadow-2xl relative"
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
            className="w-full h-full"
            draggable={false}
            style={{ 
              cursor: getCursorStyle(),
              imageRendering: 'pixelated' // Ostre piksele bez interpolacji
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={(e) => {
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
        </div>
      </div>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-zinc-900 bg-opacity-80 text-white px-3 py-2 rounded text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Info panel */}
      <div className="absolute bottom-4 left-4 bg-zinc-900 bg-opacity-90 text-white px-3 py-2 rounded text-xs space-y-1">
        <div>Size: {project.width} × {project.height} px</div>
        {selectedShape && (
          <div className="border-t border-zinc-700 pt-1 mt-1">
            <span>Tool: {selectedShape.shape.type.charAt(0).toUpperCase() + selectedShape.shape.type.slice(1)}</span>
            <div className="text-zinc-400 text-[10px]">Click and drag to move</div>
          </div>
        )}
      </div>
    </div>
  );
}
