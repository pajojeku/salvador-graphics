'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Toolbar from '@/components/Toolbar';
import Canvas from '@/components/Canvas';
import LayerPanel from '@/components/LayerPanel';
import PropertiesPanel from '@/components/PropertiesPanel';
import MobileWarning from '@/components/MobileWarning';
import ShapeInputModal, { ShapeInputData } from '@/components/ShapeInputModal';
import ExportJPGModal from '@/components/ExportJPGModal';
import PointTransformationsModal from '@/components/PointTransformationsModal';
import FiltersModal, { FilterType } from '@/components/FiltersModal';
import NormalizationModal from '@/components/NormalizationModal';
import {
  applyAverageFilter,
  applyMedianFilter,
  applySobelFilter,
  applySharpenFilter,
  applyGaussianFilter,
} from '@/lib/filters';
import { histogramStretch, histogramEqualize } from '@/lib/normalization';
import { projectStorage, type Project } from '@/lib/projectStorage';

import { CanvasManager } from '@/lib/CanvasManager';
import { Shape } from '@/lib/shapes/Shape';
import { ImageShape } from '@/lib/shapes/Image';

function ProjectContent() {

  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedLayer, setSelectedLayer] = useState('Layer 1');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);

  // Normalization modal state/effect/handler (must be after selectedShape)
  const [isNormalizationModalOpen, setIsNormalizationModalOpen] = useState(false);
  useEffect(() => {
    function handleOpenNormalizationModal() {
      if (selectedShape && selectedShape.type === 'image') {
        setIsNormalizationModalOpen(true);
      } else {
        alert('Please select an image first.');
      }
    }
    window.addEventListener('openNormalizationModal', handleOpenNormalizationModal);
    return () => {
      window.removeEventListener('openNormalizationModal', handleOpenNormalizationModal);
    };
  }, [selectedShape]);
  const handleNormalizationModalClose = () => {
    setIsNormalizationModalOpen(false);
  };
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const canvasRefreshRef = useRef<(() => void) | null>(null);
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [modalShapeType, setModalShapeType] = useState<'line' | 'rectangle' | 'circle' | 'rgbcube' | null>(null);
  const [isExportJPGModalOpen, setIsExportJPGModalOpen] = useState(false);
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [pointModalValues, setPointModalValues] = useState({ brightness: 0, red: 0, green: 0, blue: 0 });
  const [pointModalMode, setPointModalMode] = useState<'normal' | 'multiply' | 'grayscale'>('normal');
  const [pointModalGrayscaleMethod, setPointModalGrayscaleMethod] = useState<'average' | 'weighted'>('average');
  const originalPointModalValuesRef = useRef<{ brightness: number; red: number; green: number; blue: number } | null>(null);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  // Stan filtrów dla modala (kontrolowany)
  const [filterType, setFilterType] = useState<FilterType>('none');

  // Po zmianie typu filtra natychmiast resetuj cachedPixels do oryginału (preview i obraz główny)
  useEffect(() => {
    if (!isFiltersModalOpen) return;
    if (selectedShape && selectedShape.type === 'image') {
      const img = selectedShape as ImageShape;
      // Przy każdej zmianie typu filtra resetuj cachedPixels do oryginału
      img.resetToOriginal();
      handleShapeUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);
  const [maskSize, setMaskSize] = useState<number>(3);
  const [sobelDir, setSobelDir] = useState<'x' | 'y' | 'xy'>('xy');
  const [sobelThreshold, setSobelThreshold] = useState<number>(64);
  const [sharpenStrength, setSharpenStrength] = useState<number>(0.5);
  const [gaussianSigma, setGaussianSigma] = useState<number>(1.0);
  const lastFilterStateRef = useRef<{
    filterType: FilterType;
    maskSize: number;
    sobelDir: 'x' | 'y' | 'xy';
    sobelThreshold: number;
    sharpenStrength: number;
    gaussianSigma: number;
  } | null>(null);

  useEffect(() => {
    function handleOpenFiltersModal() {
      if (selectedShape && selectedShape.type === 'image') {
        // Ustaw stan filtrów na podstawie wybranego obrazu
        const img = selectedShape as ImageShape;
        setFilterType(img.filterType || 'average');
        setMaskSize(img.maskSize ?? 3);
        setSobelDir(img.sobelDir ?? 'xy');
        setSobelThreshold(img.sobelThreshold ?? 64);
        setSharpenStrength(img.sharpenStrength ?? 0.5);
        setGaussianSigma(img.gaussianSigma ?? 1.0);
        lastFilterStateRef.current = {
          filterType: img.filterType || 'average',
          maskSize: img.maskSize ?? 3,
          sobelDir: img.sobelDir ?? 'xy',
          sobelThreshold: img.sobelThreshold ?? 64,
          sharpenStrength: img.sharpenStrength ?? 0.5,
          gaussianSigma: img.gaussianSigma ?? 1.0,
        };
        setIsFiltersModalOpen(true);
      } else {
        alert('Please select an image first.');
      }
    }
    window.addEventListener('openFiltersModal', handleOpenFiltersModal);
    return () => {
      window.removeEventListener('openFiltersModal', handleOpenFiltersModal);
    };
  }, [selectedShape]);

  const handleFiltersModalCancel = () => {
    // Przywróć stan filtrów i cachedPixels do stanu sprzed otwarcia modala
    if (selectedShape && selectedShape.type === 'image' && lastFilterStateRef.current && lastFilterPixelsRef.current) {
      const img = selectedShape as ImageShape;
      const last = lastFilterStateRef.current;
  img.filterType = last.filterType;
  img.maskSize = last.maskSize;
  img.sobelDir = last.sobelDir;
  img.sobelThreshold = last.sobelThreshold;
  img.sharpenStrength = last.sharpenStrength;
  img.gaussianSigma = last.gaussianSigma;
  img.setCachedPixels(lastFilterPixelsRef.current);
  setFilterType(last.filterType);
  setMaskSize(last.maskSize);
  setSobelDir(last.sobelDir);
  setSobelThreshold(last.sobelThreshold);
  setSharpenStrength(last.sharpenStrength);
  setGaussianSigma(last.gaussianSigma);
      handleShapeUpdate();
    }
    setIsFiltersModalOpen(false);
  };

  const handleFiltersModalApply = () => {
    // Zapisz stan filtrów do ImageShape i nałóż filtr na oryginalne piksele
    if (selectedShape && selectedShape.type === 'image') {
      const img = selectedShape as ImageShape;
      img.filterType = filterType;
      img.maskSize = maskSize;
      img.sobelDir = sobelDir;
      img.sobelThreshold = sobelThreshold;
      img.sharpenStrength = sharpenStrength;
      lastFilterStateRef.current = {
        filterType,
        maskSize,
        sobelDir,
        sobelThreshold,
        sharpenStrength,
        gaussianSigma,
      };
      img.gaussianSigma = gaussianSigma;
      // Nakładanie filtra na oryginalne piksele
      const src = img.getOriginalPixels();
      if (src) {
        let filtered = src;
        if (filterType === 'average') {
          filtered = applyAverageFilter(src, img.width, img.height, maskSize);
        } else if (filterType === 'median') {
          filtered = applyMedianFilter(src, img.width, img.height, maskSize);
        } else if (filterType === 'sobel') {
          filtered = applySobelFilter(src, img.width, img.height, sobelDir, sobelThreshold);
        } else if (filterType === 'sharpen') {
          filtered = applySharpenFilter(src, img.width, img.height, sharpenStrength);
        } else if (filterType === 'gaussian') {
          filtered = applyGaussianFilter(src, img.width, img.height, maskSize, gaussianSigma);
        } else if (filterType === 'none') {
          filtered = src;
        }
        img.setCachedPixels(filtered);
      }
      // Zapisz nowy stan cachedPixels do refa na potrzeby Cancel
      lastFilterPixelsRef.current = img.getCachedPixels();
      handleShapeUpdate();
    }
    setIsFiltersModalOpen(false);
  };

  const handleFiltersModalReset = () => {
    // Resetuj parametry i cachedPixels do oryginału, domyślnie brak filtra
    setFilterType('none');
    setMaskSize(3);
    setSobelDir('xy');
    setSobelThreshold(64);
    setSharpenStrength(0.5);
    if (selectedShape && selectedShape.type === 'image') {
      const img = selectedShape as ImageShape;
      img.resetToOriginal();
      img.gaussianSigma = 1.0;
      handleShapeUpdate();
    }
  };
// Ref do przechowywania cachedPixels sprzed otwarcia modala (do Cancel)
const lastFilterPixelsRef = useRef<Uint8ClampedArray | null>(null);

// W momencie otwarcia modala zapisz cachedPixels do refa
useEffect(() => {
  if (isFiltersModalOpen && selectedShape && selectedShape.type === 'image') {
    const img = selectedShape as ImageShape;
    lastFilterPixelsRef.current = img.getCachedPixels() ? new Uint8ClampedArray(img.getCachedPixels()!) : null;
  }
}, [isFiltersModalOpen, selectedShape]);

  useEffect(() => {
    const projectId = searchParams.get('id');
    
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    // Load project from localStorage
    const project = projectStorage.getById(projectId);
    
    if (!project) {
      setError('Project not found');
      setLoading(false);
      return;
    }

    // Apply normalization to all image shapes after loading (inline, like filters)
    if (canvasManagerRef.current) {
      const allShapes = canvasManagerRef.current.getAllShapes?.() || [];
      let normalizationApplied = false;
      for (const shape of allShapes) {
        if (shape.type === 'image') {
          const img = shape as ImageShape;
          const src = img.getOriginalPixels();
          if (!src) continue;
          let normalized = src;
          if (img.normalizationType === 'stretch') {
            normalized = histogramStretch(src, img.width, img.height);
            normalizationApplied = true;
          } else if (img.normalizationType === 'equalize') {
            normalized = histogramEqualize(src, img.width, img.height);
            normalizationApplied = true;
          }
          img.setCachedPixels(normalized);
        }
      }
      // Odśwież canvas jeśli była nałożona normalizacja
      if (normalizationApplied && canvasRefreshRef.current) {
        canvasRefreshRef.current();
      }
    }
    setCurrentProject(project);
    setLoading(false);
    // Update last modified time
    projectStorage.update(projectId, { lastModified: new Date().toISOString() });
  }, [searchParams]);

  const handleUndo = () => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.undo();
      canvasRefreshRef.current?.();
    }
  };

  const handleRedo = () => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.redo();
      canvasRefreshRef.current?.();
    }
  };

  const handleClear = () => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.clear();
      canvasRefreshRef.current?.();
      updateShapesList();
    }
  };

  const updateShapesList = () => {
    if (canvasManagerRef.current) {
      const allShapes = canvasManagerRef.current.getAllShapes();
      setShapes([...allShapes]);
      const selected = canvasManagerRef.current.getSelectedShape();
      setSelectedShape(selected);
    }
  };

  const handleShapeDelete = (shapeId: string) => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.removeShape(shapeId);
      canvasRefreshRef.current?.();
      updateShapesList();
    }
  };

  const handleShapeToggleVisibility = (shapeId: string) => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.toggleShapeVisibility(shapeId);
      canvasRefreshRef.current?.();
      updateShapesList();
    }
  };

  const handleShapeSelect = (shapeId: string) => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.selectShape(shapeId);
      canvasRefreshRef.current?.();
      updateShapesList();
    }
  };

  const handleShapeUpdate = () => {
    console.log('handleShapeUpdate called', { 
      hasCanvasManager: !!canvasManagerRef.current,
      hasRefreshFunc: !!canvasRefreshRef.current 
    });
    if (canvasManagerRef.current && canvasRefreshRef.current) {
      canvasRefreshRef.current();
      updateShapesList();
    }
  };

  const handleShapeModalOpen = (toolId: string) => {
    if (['line', 'rectangle', 'circle'].includes(toolId)) {
      setModalShapeType(toolId as 'line' | 'rectangle' | 'circle' | 'rgbcube');
      setIsShapeModalOpen(true);
    }
  };

  const handleShapeModalClose = () => {
    setIsShapeModalOpen(false);
    setModalShapeType(null);
  };

  const handleShapeModalSubmit = (data: ShapeInputData) => {
    if (!canvasManagerRef.current) return;

    // Convert hex color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255
      } : { r: 0, g: 0, b: 0, a: 255 };
    };

    const color = hexToRgb(currentColor);

    if (modalShapeType === 'rectangle' && data.x !== undefined && data.y !== undefined && data.width !== undefined && data.height !== undefined) {
      canvasManagerRef.current.addShapeManually('rectangle', {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        filled: data.filled ?? false,
        color,
        strokeWidth
      });
    } else if (modalShapeType === 'circle' && data.centerX !== undefined && data.centerY !== undefined && data.radius !== undefined) {
      canvasManagerRef.current.addShapeManually('circle', {
        centerX: data.centerX,
        centerY: data.centerY,
        radius: data.radius,
        filled: data.circleFilled ?? false,
        color,
        strokeWidth
      });
    } else if (modalShapeType === 'line' && data.x1 !== undefined && data.y1 !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
      canvasManagerRef.current.addShapeManually('line', {
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        color,
        strokeWidth
      });
    } else if (modalShapeType === 'rgbcube' && data.cubeX !== undefined && data.cubeY !== undefined && data.size !== undefined) {
      canvasManagerRef.current.addShapeManually('rgbcube', {
        x: data.cubeX,
        y: data.cubeY,
        size: data.size,
        color,
        strokeWidth
      });
    }

    canvasRefreshRef.current?.();
    updateShapesList();
  };

  const handleExportPNG = () => {
    if (canvasManagerRef.current && currentProject) {
      // Pobierz canvas jako PNG (base64)
      const dataUrl = canvasManagerRef.current.exportAsPNG();
      
      // Utwórz link do pobrania
      const link = document.createElement('a');
      link.download = `${currentProject.name}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleExportJPG = (quality: number) => {
    if (canvasManagerRef.current && currentProject) {
      // Pobierz canvas jako JPG z wybraną jakością
      const dataUrl = canvasManagerRef.current.exportAsJPEG(quality);
      
      // Utwórz link do pobrania
      const link = document.createElement('a');
      link.download = `${currentProject.name}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleSaveProject = () => {
    if (canvasManagerRef.current && currentProject) {
      // Serializuj stan canvas do JSON
      const canvasData = canvasManagerRef.current.serialize();
      
      // Utwórz pełny obiekt projektu
      const projectData = {
        id: currentProject.id,
        name: currentProject.name,
        width: currentProject.width,
        height: currentProject.height,
        created: currentProject.created,
        lastModified: new Date().toISOString(),
        canvasData: JSON.parse(canvasData)
      };
      
      // Konwertuj do JSON
      const jsonString = JSON.stringify(projectData, null, 2);
      
      // Utwórz blob i link do pobrania
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${currentProject.name}.slv`;
      link.href = url;
      link.click();
      
      // Zwolnij pamięć
      URL.revokeObjectURL(url);
    }
  };

  const handleLoadProject = () => {
    // Utwórz ukryty input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.slv';
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) return;
      
      try {
        // Wczytaj zawartość pliku
        const text = await file.text();
        const projectData = JSON.parse(text);
        
        // Walidacja podstawowych pól
        if (!projectData.name || !projectData.width || !projectData.height || !projectData.canvasData) {
          alert('Invalid project file format');
          return;
        }
        
        // Sprawdź czy projekt o takim ID już istnieje
        let projectId = projectData.id || Date.now().toString();
        const existingProject = projectStorage.getById(projectId);
        
        if (existingProject) {
          // Wygeneruj nowe unikalne ID
          projectId = Date.now().toString();
        }
        
        // Utwórz nowy projekt w localStorage
        const newProject: Project = {
          id: projectId,
          name: projectData.name,
          width: projectData.width,
          height: projectData.height,
          created: projectData.created || new Date().toISOString(),
          lastModified: new Date().toISOString(),
          thumbnail: projectData.thumbnail,
        };
        
        // Zapisz projekt
        const projects = projectStorage.getAll();
        projects.unshift(newProject);
        localStorage.setItem('salvador_projects', JSON.stringify(projects));
        
        // Zapisz dane canvas
        const canvasDataString = JSON.stringify(projectData.canvasData);
        projectStorage.saveCanvasData(projectId, canvasDataString);
        
        // Otwórz projekt w nowej karcie
        window.open(`/project?id=${projectId}`, '_blank');
        
      } catch (error) {
        console.error('Error loading project:', error);
        alert('Failed to load project file. Please make sure it\'s a valid .slv file.');
      }
    };
    
    // Kliknij input aby otworzyć dialog wyboru pliku
    input.click();
  };

  // Hook do odświeżania listy kształtów gdy canvas się zmieni
  useEffect(() => {
    const interval = setInterval(() => {
      updateShapesList();
    }, 500); // Sprawdzaj co 500ms czy lista się zmieniła

    return () => clearInterval(interval);
  }, [canvasManagerRef.current]);

  useEffect(() => {
    function handleOpenPointModal() {
      if (selectedShape && selectedShape.type === 'image') {
        const img = selectedShape as ImageShape;
        setPointModalValues({
          brightness: img.brightness ?? 0,
          red: img.red ?? 0,
          green: img.green ?? 0,
          blue: img.blue ?? 0,
        });
        setPointModalMode(img.mode ?? 'normal');
        setPointModalGrayscaleMethod(img.grayscaleMethod ?? 'average');
        setIsPointModalOpen(true);
      } else {
        alert('Please select an image first.');
      }
    }
    window.addEventListener('openPointTransformationsModal', handleOpenPointModal);
    return () => {
      window.removeEventListener('openPointTransformationsModal', handleOpenPointModal);
    };
  }, [selectedShape]);
  const handlePointModalGrayscaleMethodChange = (method: 'average' | 'weighted') => {
    setPointModalGrayscaleMethod(method);
  };

  if (loading) {
    return (
      <div className="h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          {/* Logo Salvador */}
          <div className="mb-6">
            <h1 className="text-5xl font-bold text-white flex items-center justify-center space-x-3 mb-2">
              <img src="/icon.png" alt="Salvador" className="w-12 h-12" />
              <span>Salvador</span>
            </h1>
            <p className="text-sm text-zinc-500">Graphics Editor</p>
          </div>
          
          {/* Loading animation */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          <div className="text-zinc-400 text-lg">Loading project...</div>
        </div>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          {/* Logo Salvador */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white flex items-center justify-center space-x-3 mb-2">
              <img src="/icon.png" alt="Salvador" className="w-12 h-12" />
              <span>Salvador</span>
            </h1>
            <p className="text-sm text-zinc-500">Graphics Editor</p>
          </div>
          
          {/* Error Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-900/30 rounded-full mb-6">
            <i className="ri-error-warning-line text-5xl text-red-400"></i>
          </div>
          
          <div className="text-red-400 text-xl mb-2 font-semibold">{error || 'Project not found'}</div>
          <div className="text-zinc-500 mb-8 max-w-md mx-auto">
            The project you're looking for doesn't exist or has been deleted.
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-3 rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center space-x-2"
          >
            <i className="ri-home-line text-lg"></i>
            <span className="font-semibold">Go to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Only update modal state, do not touch shape until Apply
  const handlePointModalChange = (vals: { brightness: number; red: number; green: number; blue: number }) => {
    setPointModalValues(vals);
  };

  const handlePointModalModeChange = (mode: 'normal' | 'multiply' | 'grayscale') => {
    setPointModalMode(mode);
  };

  // Apply: copy modal values to shape and save
  const handlePointModalApply = () => {
    if (selectedShape && selectedShape.type === 'image') {
      const img = selectedShape as ImageShape;
      img.brightness = pointModalValues.brightness;
      img.red = pointModalValues.red;
      img.green = pointModalValues.green;
      img.blue = pointModalValues.blue;
      img.mode = pointModalMode;
      img.grayscaleMethod = pointModalGrayscaleMethod;
      canvasRefreshRef.current?.();
    }
    if (canvasManagerRef.current && currentProject) {
      const canvasData = canvasManagerRef.current.serialize();
      projectStorage.saveCanvasData(currentProject.id, canvasData);
      projectStorage.update(currentProject.id, { lastModified: new Date().toISOString() });
    }
    setIsPointModalOpen(false);
  };

  // Cancel: revert to original values in shape and modal
  const handlePointModalCancel = () => {
    if (selectedShape && selectedShape.type === 'image' && originalPointModalValuesRef.current) {
      const img = selectedShape as ImageShape;
      const orig = originalPointModalValuesRef.current;
      img.brightness = orig.brightness;
      img.red = orig.red;
      img.green = orig.green;
      img.blue = orig.blue;
      setPointModalValues({ ...orig });
      canvasRefreshRef.current?.();
    }
    setIsPointModalOpen(false);
  };

  return (
    <>
      <MobileWarning />
      <div className="h-screen bg-zinc-900 flex flex-col">
        <Header 
          projectName={currentProject?.name}
          onExportPNG={handleExportPNG}
          onExportJPG={() => setIsExportJPGModalOpen(true)}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
        />
        
        <div className="flex-1 flex overflow-hidden">
          <Toolbar 
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            onShapeModalOpen={handleShapeModalOpen}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            currentColor={currentColor}
            onColorChange={setCurrentColor}
          />
          
          <div className="flex-1 flex flex-col">
            <Canvas 
              project={currentProject} 
              currentTool={selectedTool}
              currentColor={currentColor}
              strokeWidth={strokeWidth}
              canvasManagerRef={canvasManagerRef}
              canvasRefreshRef={canvasRefreshRef}
            />
          </div>
          
          <div className="w-75 bg-zinc-800 border-l border-zinc-700 flex flex-col">
            <LayerPanel 
              selectedLayer={selectedLayer}
              onLayerSelect={setSelectedLayer}
              shapes={shapes}
              onShapeDelete={handleShapeDelete}
              onShapeToggleVisibility={handleShapeToggleVisibility}
              onShapeSelect={handleShapeSelect}
            />
            <PropertiesPanel 
              strokeWidth={strokeWidth}
              onStrokeWidthChange={setStrokeWidth}
              selectedShape={selectedShape}
              onShapeUpdate={handleShapeUpdate}
            />
          </div>
        </div>
      </div>

      {/* Shape Input Modal */}
      <ShapeInputModal
        isOpen={isShapeModalOpen}
        shapeType={modalShapeType}
        onClose={handleShapeModalClose}
        onSubmit={handleShapeModalSubmit}
        canvasWidth={currentProject?.width ?? 800}
        canvasHeight={currentProject?.height ?? 600}
      />

      {/* Export JPG Modal */}
      <ExportJPGModal
        isOpen={isExportJPGModalOpen}
        onClose={() => setIsExportJPGModalOpen(false)}
        onExport={handleExportJPG}
        projectName={currentProject?.name}
      />

      {/* Point Transformations Modal */}
      <PointTransformationsModal
        isOpen={isPointModalOpen}
        onClose={handlePointModalCancel}
        brightness={pointModalValues.brightness}
        red={pointModalValues.red}
        green={pointModalValues.green}
        blue={pointModalValues.blue}
        mode={pointModalMode}
        onChange={handlePointModalChange}
        onModeChange={handlePointModalModeChange}
        grayscaleMethod={pointModalGrayscaleMethod}
        onGrayscaleMethodChange={handlePointModalGrayscaleMethodChange}
        onApply={handlePointModalApply}
        onCancel={handlePointModalCancel}
        imageShape={selectedShape && selectedShape.type === 'image' ? (selectedShape as ImageShape) : null}
      />
      {/* Filters Modal */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={handleFiltersModalCancel}
        onCancel={handleFiltersModalCancel}
        onApply={handleFiltersModalApply}
        imageShape={selectedShape && selectedShape.type === 'image' ? (selectedShape as ImageShape) : null}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        maskSize={maskSize}
        onMaskSizeChange={setMaskSize}
        sobelDir={sobelDir}
        onSobelDirChange={setSobelDir}
        sobelThreshold={sobelThreshold}
        onSobelThresholdChange={setSobelThreshold}
        sharpenStrength={sharpenStrength}
        onSharpenStrengthChange={setSharpenStrength}
        onReset={handleFiltersModalReset}
        gaussianSigma={gaussianSigma}
        onGaussianSigmaChange={setGaussianSigma}
      />
      {/* Normalization Modal */}
      <NormalizationModal
        isOpen={isNormalizationModalOpen}
        onClose={handleNormalizationModalClose}
        imageShape={selectedShape && selectedShape.type === 'image' ? (selectedShape as ImageShape) : null}
        onApplyNormalization={() => {
          handleShapeUpdate();
          if (currentProject) {
            projectStorage.update(currentProject.id, { ...currentProject });
          }
        }}
      />
    </>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-zinc-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <ProjectContent />
    </Suspense>
  );
}