
'use client';

interface PropertiesPanelProps {
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
}

export default function PropertiesPanel({ strokeWidth = 1, onStrokeWidthChange }: PropertiesPanelProps) {
  return (
    <div className="bg-zinc-800">
      {/* Properties Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-2">
        <div className="flex items-center space-x-2">
          <i className="ri-settings-3-line text-zinc-400 w-4 h-4 flex items-center justify-center"></i>
          <span className="text-sm text-zinc-300">Properties</span>
        </div>
      </div>

      {/* Properties Content */}
      <div className="p-4 space-y-4">
        {/* Tool Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <i className="ri-brush-line text-zinc-400 w-4 h-4 flex items-center justify-center"></i>
            <span className="text-sm text-zinc-300">Tool</span>
          </div>
          
          {/* Stroke Width */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Width</span>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={strokeWidth}
                  onChange={(e) => onStrokeWidthChange?.(Number(e.target.value))}
                  className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1 w-20"
                />
                <span className="text-xs text-zinc-400">px</span>
              </div>
            </div>
            <div className="space-y-2">
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange?.(Number(e.target.value))}
                className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
              />
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
