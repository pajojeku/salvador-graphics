
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { projectStorage, type Project, generateThumbnail } from '@/lib/projectStorage';

export default function StartScreen() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState('My project');
  const [projectWidth, setProjectWidth] = useState(640);
  const [projectHeight, setProjectHeight] = useState(480);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  // Generate preview thumbnail
  const previewThumbnail = useMemo(() => {
    if (!showCreateDialog) return '';
    return generateThumbnail(projectWidth, projectHeight);
  }, [projectWidth, projectHeight, showCreateDialog]);

  // Load projects from localStorage on mount
  useEffect(() => {
    setRecentProjects(projectStorage.getAll());
  }, []);

  const handleCreateProject = () => {
    if (projectName.trim()) {
      const newProject = projectStorage.save({
        name: projectName,
        width: projectWidth,
        height: projectHeight,
      });
      
      router.push(`/project?id=${newProject.id}`);
      setShowCreateDialog(false);
      setProjectName('');
      setProjectWidth(1920);
      setProjectHeight(1080);
    }
  };

  const handleOpenProject = (project: Project) => {
    router.push(`/project?id=${project.id}`);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await projectStorage.delete(projectId);
      setRecentProjects(projectStorage.getAll());
    }
  };

  const handleOpenFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
  input.accept = '.slv,.ppm,.jpg,.jpeg,.png';
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'ppm') {
        try {
          const { PPMLoader } = await import('@/lib/ppmLoader');
          const { imageDB } = await import('@/lib/imageDB');
          
          const ppmData = await PPMLoader.loadFromFile(file);
          
          const imageId = await imageDB.saveImage(
            file.name,
            ppmData.width,
            ppmData.height,
            ppmData.maxVal,
            ppmData.format,
            ppmData.pixels
          );

          const canvas = document.createElement('canvas');
          const maxWidth = 400;
          const maxHeight = 300;
          
          const needsResize = ppmData.width > maxWidth || ppmData.height > maxHeight;
          
          if (needsResize) {
            const aspectRatio = ppmData.width / ppmData.height;
            
            let thumbWidth = maxWidth;
            let thumbHeight = maxWidth / aspectRatio;
            
            if (thumbHeight > maxHeight) {
              thumbHeight = maxHeight;
              thumbWidth = maxHeight * aspectRatio;
            }
            
            canvas.width = thumbWidth;
            canvas.height = thumbHeight;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = ppmData.width;
              tempCanvas.height = ppmData.height;
              const tempCtx = tempCanvas.getContext('2d');
              
              if (tempCtx) {
                const imageData = tempCtx.createImageData(ppmData.width, ppmData.height);
                imageData.data.set(ppmData.pixels);
                tempCtx.putImageData(imageData, 0, 0);
                
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tempCanvas, 0, 0, thumbWidth, thumbHeight);
              }
            }
          } else {
            canvas.width = ppmData.width;
            canvas.height = ppmData.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              const imageData = ctx.createImageData(ppmData.width, ppmData.height);
              imageData.data.set(ppmData.pixels);
              ctx.putImageData(imageData, 0, 0);
            }
          }
          
          const thumbnail = needsResize ? canvas.toDataURL('image/jpeg', 0.6) : canvas.toDataURL('image/png');

          const newProject = projectStorage.save({
            name: file.name.replace('.ppm', ''),
            width: ppmData.width,
            height: ppmData.height,
            thumbnail: thumbnail,
          });

          const canvasData = {
            width: ppmData.width,
            height: ppmData.height,
            shapes: [{
              id: `img_${Date.now()}`,
              type: 'image',
              imageId: imageId,
              x: 0,
              y: 0,
              width: ppmData.width,
              height: ppmData.height,
              selected: false,
              visible: true,
            }],
          };

          projectStorage.saveCanvasData(newProject.id, JSON.stringify(canvasData));
          router.push(`/project?id=${newProject.id}`);
        } catch (error) {
          console.error('Error loading PPM:', error);
          alert('Failed to load PPM file: ' + (error as Error).message);
        }
  } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
        try {
          const { imageDB } = await import('@/lib/imageDB');
          // Load image using browser's native image loader
          const img = new window.Image();
          const imageUrl = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
          });
          // Convert to pixel data
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const pixels = new Uint8ClampedArray(imageData.data);
          // Save to imageDB (using P6 format and maxVal 255 for JPG/PNG)
          const imageId = await imageDB.saveImage(
            file.name,
            img.width,
            img.height,
            255, // maxVal for JPG/PNG
            'P6', // format
            pixels
          );
          // Create thumbnail
          const maxWidth = 400;
          const maxHeight = 300;
          const needsResize = img.width > maxWidth || img.height > maxHeight;
          let thumbnail: string;
          if (needsResize) {
            const aspectRatio = img.width / img.height;
            let thumbWidth = maxWidth;
            let thumbHeight = maxWidth / aspectRatio;
            if (thumbHeight > maxHeight) {
              thumbHeight = maxHeight;
              thumbWidth = maxHeight * aspectRatio;
            }
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = thumbWidth;
            thumbCanvas.height = thumbHeight;
            const thumbCtx = thumbCanvas.getContext('2d');
            if (thumbCtx) {
              thumbCtx.imageSmoothingEnabled = false;
              thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
            }
            thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
          } else {
            thumbnail = canvas.toDataURL('image/png');
          }
          // Clean up
          URL.revokeObjectURL(imageUrl);
          // Create project
          const newProject = projectStorage.save({
            name: file.name.replace(/\.(jpg|jpeg|png)$/i, ''),
            width: img.width,
            height: img.height,
            thumbnail: thumbnail,
          });
          const canvasData = {
            width: img.width,
            height: img.height,
            shapes: [{
              id: `img_${Date.now()}`,
              type: 'image',
              imageId: imageId,
              x: 0,
              y: 0,
              width: img.width,
              height: img.height,
              selected: false,
              visible: true,
            }],
          };
          projectStorage.saveCanvasData(newProject.id, JSON.stringify(canvasData));
          router.push(`/project?id=${newProject.id}`);
        } catch (error) {
          console.error('Error loading image:', error);
          alert('Failed to load image file: ' + (error as Error).message);
        }
      } else if (extension === 'slv') {
        try {
          const text = await file.text();
          const projectData = JSON.parse(text);
          
          if (!projectData.name || !projectData.width || !projectData.height || !projectData.canvasData) {
            alert('Invalid project file format');
            return;
          }
          
          let projectId = projectData.id || Date.now().toString();
          const existingProject = projectStorage.getById(projectId);
          
          if (existingProject) {
            projectId = Date.now().toString();
          }
          
          const newProject: Project = {
            id: projectId,
            name: projectData.name,
            width: projectData.width,
            height: projectData.height,
            created: projectData.created || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            thumbnail: projectData.thumbnail,
          };
          
          const projects = projectStorage.getAll();
          projects.unshift(newProject);
          localStorage.setItem('salvador_projects', JSON.stringify(projects));
          
          const canvasDataString = JSON.stringify(projectData.canvasData);
          projectStorage.saveCanvasData(projectId, canvasDataString);
          
          router.push(`/project?id=${projectId}`);
        } catch (error) {
          console.error('Error loading project:', error);
          alert('Failed to load project file. Please make sure it\'s a valid .slv file.');
        }
      } else {
        alert('Unsupported file format. Please select a .slv, .ppm, or .jpg/.jpeg file.');
      }
    };
    
    input.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full bg-zinc-900 flex">
      {/* Left Sidebar */}
      <div className="w-72 bg-gradient-to-b from-zinc-800 to-zinc-900 border-r border-zinc-700/50 p-6  flex flex-col">
        {/* Logo Salvador */}
        <div className="mb-8 mt-2">
          <div className="text-center mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center space-x-2">
              <img src="/icon.png" alt="Salvador" className="w-8 h-8" />
              <span >Salvador</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Graphics Editor</p>
          </div>
        </div>
        
        {/* Primary Actions */}
        <div className="space-y-3 mb-6">
          <button 
            onClick={() => setShowCreateDialog(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-3.5 rounded-lg text-left flex items-center space-x-3 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="ri-add-line text-xl"></i>
            </div>
            <div>
              <div className="font-semibold">Create New</div>
              <div className="text-xs text-indigo-100 opacity-80">Start a new project</div>
            </div>
          </button>
          
          <button 
            onClick={handleOpenFile}
            className="w-full bg-zinc-700/50 hover:bg-zinc-700 text-white px-4 py-3.5 rounded-lg text-left flex items-center space-x-3 cursor-pointer transition-all duration-200 border border-zinc-600/50 hover:border-zinc-500 group"
          >
            <div className="w-10 h-10 bg-zinc-600/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="ri-folder-open-line text-xl"></i>
            </div>
            <div>
              <div className="font-semibold">Open File</div>
              <div className="text-xs text-zinc-400">Project or image</div>
            </div>
          </button>
        </div>
        
        {/* Quick Templates */}
        <div className="border-t border-zinc-700/50 pt-6 mb-6">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 px-2">Quick Start</h3>
          <div className="space-y-2">            
            <button 
              onClick={() => {
                setProjectWidth(1024);
                setProjectHeight(1024);
                setShowCreateDialog(true);
              }}
              className="w-full text-zinc-300 hover:text-white hover:bg-zinc-700/50 px-3 py-2.5 rounded-lg text-left text-sm cursor-pointer transition-all duration-200 flex items-center space-x-3 group"
            >
              <i className="ri-instagram-line text-lg text-pink-400 group-hover:text-pink-300"></i>
              <div className="flex-1">
                <div className="font-medium">Nice Square</div>
                <div className="text-xs text-zinc-500">1024 × 1024</div>
              </div>
              <i className="ri-arrow-right-s-line text-zinc-600 group-hover:text-zinc-400"></i>
            </button>
            
            <button 
              onClick={() => {
                setProjectWidth(1920);
                setProjectHeight(600);
                setShowCreateDialog(true);
              }}
              className="w-full text-zinc-300 hover:text-white hover:bg-zinc-700/50 px-3 py-2.5 rounded-lg text-left text-sm cursor-pointer transition-all duration-200 flex items-center space-x-3 group"
            >
              <i className="ri-image-2-line text-lg text-green-400 group-hover:text-green-300"></i>
              <div className="flex-1">
                <div className="font-medium">Web Banner</div>
                <div className="text-xs text-zinc-500">1920 × 600</div>
              </div>
              <i className="ri-arrow-right-s-line text-zinc-600 group-hover:text-zinc-400"></i>
            </button>

            <button 
              onClick={() => {
                setProjectWidth(1920);
                setProjectHeight(1080);
                setShowCreateDialog(true);
              }}
              className="w-full text-zinc-300 hover:text-white hover:bg-zinc-700/50 px-3 py-2.5 rounded-lg text-left text-sm cursor-pointer transition-all duration-200 flex items-center space-x-3 group"
            >
              <i className="ri-artboard-line text-lg text-blue-400 group-hover:text-blue-300"></i>
              <div className="flex-1">
                <div className="font-medium">Wallpaper</div>
                <div className="text-xs text-zinc-500">1920 × 1080</div>
              </div>
              <i className="ri-arrow-right-s-line text-zinc-600 group-hover:text-zinc-400"></i>
            </button>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-auto pt-6 border-t border-zinc-700/50">
          <div className="text-xs text-zinc-500 space-y-1">
            <div className="flex items-center justify-between px-2">
              <span>Projects</span>
              <span className="font-semibold text-zinc-400">{recentProjects.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center space-x-3">
                  <span>Recent Projects</span>
                </h1>
                <p className="text-zinc-400">Continue working on your recent projects or start something new</p>
              </div>
              
              {recentProjects.length > 0 && (
                <button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                >
                  <i className="ri-add-line text-xl"></i>
                  <span className="font-semibold">New Project</span>
                </button>
              )}
            </div>

          </div>

          {/* Projects Grid */}
          {recentProjects.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-800 rounded-full mb-6">
                <i className="ri-folder-open-line text-5xl text-zinc-600"></i>
              </div>
              <h3 className="text-2xl font-semibold text-zinc-300 mb-2">No recent projects</h3>
              <p className="text-zinc-500 mb-8 max-w-md mx-auto">Get started by creating your first project. Choose from templates or start from scratch.</p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-4 rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <i className="ri-add-line text-xl"></i>
                <span className="font-semibold text-lg">Create Your First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="bg-zinc-800/50 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-zinc-800 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border border-zinc-700/50 hover:border-indigo-500/50 group"
                >
                  <div className="aspect-video bg-gradient-to-br from-zinc-700 to-zinc-800 relative overflow-hidden">
                    {project.thumbnail ? (
                      <>
                        <img 
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <div className="text-center">
                          <i className="ri-image-line text-5xl mb-3 block"></i>
                          <p className="text-sm font-medium">{project.width} × {project.height}</p>
                          <p className="text-xs text-zinc-600 mt-1">No preview</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">
                      {project.width} × {project.height}
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="absolute top-3 left-3 bg-red-600/80 hover:bg-red-600 backdrop-blur-md text-white w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:scale-110"
                      title="Delete project"
                    >
                      <i className="ri-delete-bin-line text-base"></i>
                    </button>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-white font-semibold mb-3 truncate text-lg group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center space-x-2">
                          <i className="ri-time-line text-zinc-500"></i>
                          <span className="text-zinc-500">Modified</span>
                        </span>
                        <span className="font-medium text-zinc-300">{formatDate(project.lastModified)}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center space-x-2">
                          <i className="ri-calendar-line text-zinc-500"></i>
                          <span className="text-zinc-500">Created</span>
                        </span>
                        <span className="font-medium text-zinc-300">{formatDate(project.created)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-2xl border border-zinc-700">
            <h2 className="text-xl font-bold text-white">Create New Project</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left side - Form */}
              <div className="space-y-4 my-auto">
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full bg-zinc-700 text-white border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-zinc-400 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">Width (px)</label>
                    <input
                      type="number"
                      value={projectWidth}
                      onChange={(e) => setProjectWidth(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-700 text-white border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-zinc-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">Height (px)</label>
                    <input
                      type="number"
                      value={projectHeight}
                      onChange={(e) => setProjectHeight(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-700 text-white border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-zinc-400 text-sm"
                    />
                  </div>
                </div>

              </div>

              {/* Right side - Preview */}
              <div className="flex flex-col">
                <label className="block text-sm text-zinc-300 mb-2">Preview</label>
                <div className="flex-1 bg-zinc-900 rounded-lg p-4 flex items-center justify-center border border-zinc-700">
                  {previewThumbnail && (
                    <img 
                      src={previewThumbnail} 
                      alt="Project preview"
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-zinc-700">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setProjectName('');
                  setProjectWidth(1920);
                  setProjectHeight(1080);
                }}
                className="px-4 py-2 text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!projectName.trim()}
                className={`px-4 py-2 rounded cursor-pointer whitespace-nowrap ${
                  projectName.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
