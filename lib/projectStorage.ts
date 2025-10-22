export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  created: string;
  lastModified: string;
  thumbnail?: string;
  canvasData?: string; // Serializowane dane canvas (shapes)
}

const STORAGE_KEY = 'salvador_projects';
const CANVAS_DATA_KEY = 'salvador_canvas_data_'; // Prefix dla danych canvas

// Generate a thumbnail for a project
export const generateThumbnail = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const maxWidth = 200;
  const maxHeight = 150;
  const aspectRatio = width / height;
  
  let thumbWidth = maxWidth;
  let thumbHeight = maxWidth / aspectRatio;
  
  if (thumbHeight > maxHeight) {
    thumbHeight = maxHeight;
    thumbWidth = maxHeight * aspectRatio;
  }
  
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;
  
  if (!ctx) return '';
  
  const gradient = ctx.createRadialGradient(thumbWidth / 2, thumbHeight / 2, 0, thumbWidth / 2, thumbHeight / 2, thumbWidth);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#3b82f6');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, thumbWidth, thumbHeight);
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  const gridSize = 20;
  for (let x = 0; x < thumbWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, thumbHeight);
    ctx.stroke();
  }
  
  for (let y = 0; y < thumbHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(thumbWidth, y);
    ctx.stroke();
  }
  
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${width} × ${height}`, thumbWidth / 2, thumbHeight / 2);
  
  return canvas.toDataURL('image/jpeg', 0.8);
};

export const projectStorage = {
  // Get all projects
  getAll: (): Project[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  },

  // Get a single project by ID
  getById: (id: string): Project | null => {
    const projects = projectStorage.getAll();
    return projects.find(p => p.id === id) || null;
  },

  // Save a new project
  save: (project: Omit<Project, 'id' | 'created' | 'lastModified'>): Project => {
    const projects = projectStorage.getAll();
    
    // Don't auto-generate thumbnail, only use if explicitly provided
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    
    projects.unshift(newProject); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return newProject;
  },

  // Update an existing project
  update: (id: string, updates: Partial<Project>): Project | null => {
    const projects = projectStorage.getAll();
    const index = projects.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    projects[index] = {
      ...projects[index],
      ...updates,
      lastModified: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const projects = projectStorage.getAll();
    const filtered = projects.filter(p => p.id !== id);
    
    if (filtered.length === projects.length) return false;
    
    const canvasDataStr = localStorage.getItem(CANVAS_DATA_KEY + id);
    if (canvasDataStr) {
      try {
        const canvasData = JSON.parse(canvasDataStr);
        if (canvasData.shapes) {
          const { imageDB } = await import('./imageDB');
          const imageIdsToCheck: string[] = [];
          
          for (const shape of canvasData.shapes) {
            if (shape.type === 'image' && shape.imageId) {
              imageIdsToCheck.push(shape.imageId);
            }
          }
          
          for (const imageId of imageIdsToCheck) {
            let isUsedElsewhere = false;
            
            for (const project of filtered) {
              const otherCanvasData = localStorage.getItem(CANVAS_DATA_KEY + project.id);
              if (otherCanvasData) {
                try {
                  const otherData = JSON.parse(otherCanvasData);
                  if (otherData.shapes) {
                    for (const otherShape of otherData.shapes) {
                      if (otherShape.type === 'image' && otherShape.imageId === imageId) {
                        isUsedElsewhere = true;
                        break;
                      }
                    }
                  }
                } catch (e) {
                  console.error('Error checking project:', e);
                }
              }
              if (isUsedElsewhere) break;
            }
            
            if (!isUsedElsewhere) {
              await imageDB.deleteImage(imageId);
            }
          }
        }
      } catch (e) {
        console.error('Error cleaning up images:', e);
      }
    }
    
    localStorage.removeItem(CANVAS_DATA_KEY + id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  // Clear all projects
  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
    // Usuń wszystkie dane canvas
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CANVAS_DATA_KEY)) {
        localStorage.removeItem(key);
      }
    });
  },

  // Zapisz dane canvas (shapes) dla projektu
  saveCanvasData: (projectId: string, canvasData: string): void => {
    localStorage.setItem(CANVAS_DATA_KEY + projectId, canvasData);
  },

  // Wczytaj dane canvas dla projektu
  getCanvasData: (projectId: string): string | null => {
    return localStorage.getItem(CANVAS_DATA_KEY + projectId);
  },

  // Wygeneruj i zapisz thumbnail z canvas
  saveCanvasThumbnail: (projectId: string, canvasDataUrl: string): void => {
    const projects = projectStorage.getAll();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index === -1) return;
    
    projects[index] = {
      ...projects[index],
      thumbnail: canvasDataUrl,
      lastModified: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
};
