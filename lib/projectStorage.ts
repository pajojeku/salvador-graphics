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
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set thumbnail dimensions (aspect ratio preserved)
  const maxWidth = 400;
  const maxHeight = 300;
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
  
  // Create a gradient background
  const gradient = ctx.createRadialGradient(thumbWidth / 2, thumbHeight / 2, 0, thumbWidth / 2, thumbHeight / 2, thumbWidth);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#3b82f6');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, thumbWidth, thumbHeight);
  
  // Add grid pattern
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
  
  
  // Add dimension text
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${width} × ${height}`, thumbWidth / 2, thumbHeight / 2);
  
  // Convert to base64
  return canvas.toDataURL('image/png');
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

  // Delete a project
  delete: (id: string): boolean => {
    const projects = projectStorage.getAll();
    const filtered = projects.filter(p => p.id !== id);
    
    if (filtered.length === projects.length) return false;
    
    // Usuń również dane canvas
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
