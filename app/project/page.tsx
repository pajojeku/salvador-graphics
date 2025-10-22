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
import { projectStorage, type Project } from '@/lib/projectStorage';
import { CanvasManager } from '@/lib/CanvasManager';
import { Shape } from '@/lib/shapes/Shape';

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
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const canvasRefreshRef = useRef<(() => void) | null>(null);
  const [isShapeModalOpen, setIsShapeModalOpen] = useState(false);
  const [modalShapeType, setModalShapeType] = useState<'line' | 'rectangle' | 'circle' | null>(null);
  const [isExportJPGModalOpen, setIsExportJPGModalOpen] = useState(false);

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
      setModalShapeType(toolId as 'line' | 'rectangle' | 'circle');
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