
'use client';

import { useState } from 'react';
import ColorPickerModal from './ColorPickerModal';

interface ToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onShapeModalOpen?: (toolId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  currentColor?: string;
  onColorChange?: (color: string) => void;
}

export default function Toolbar({ selectedTool, onToolSelect, onShapeModalOpen, onUndo, onRedo, onClear, currentColor = '#000000', onColorChange }: ToolbarProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const tools = [
    { id: 'select', icon: 'ri-cursor-line', tooltip: 'Select Tool' },
    { id: 'line', icon: 'ri-expand-diagonal-s-line', tooltip: 'Line Tool | Shift+Click for manual input' },
    { id: 'rectangle', icon: 'ri-checkbox-blank-line', tooltip: 'Rectangle Tool | Shift+Click for manual input' },
    { id: 'circle', icon: 'ri-checkbox-blank-circle-line', tooltip: 'Circle Tool | Shift+Click for manual input' },
    { id: 'rgbcube', icon: 'ri-box-3-line', tooltip: 'RGB Cube' },
    { id: 'bezier', icon: 'ri-pen-nib-line', tooltip: 'Bezier Curve Tool | Shift+Click for manual input' },
    { id: 'polygon', icon: 'ri-pentagon-line', tooltip: 'Polygon Tool | Shift+Click for manual input' },
    { id: 'brush', icon: 'ri-brush-line', tooltip: 'Brush Tool' },
    //{ id: 'eraser', icon: 'ri-eraser-line', tooltip: 'Eraser Tool (E)' },
    //{ id: 'eyedropper', icon: 'ri-drop-line', tooltip: 'Eyedropper Tool (I)' },
    //{ id: 'text', icon: 'ri-text', tooltip: 'Text Tool (T)' },
    //{ id: 'hand', icon: 'ri-hand-line', tooltip: 'Hand Tool (H)' },
    //{ id: 'zoom', icon: 'ri-zoom-in-line', tooltip: 'Zoom Tool (Z)' }
  ];

  const handleToolClick = (toolId: string, event: React.MouseEvent) => {
    // Check if Shift is pressed and it's a shape tool (not brush or select)
  const isShapeTool = ['line', 'rectangle', 'circle', 'rgbcube', 'bezier', 'polygon'].includes(toolId);
    
    if (event.shiftKey && isShapeTool && onShapeModalOpen) {
      onShapeModalOpen(toolId);
    } else {
      onToolSelect(toolId);
    }
  };

  return (
    <div className="w-12 bg-zinc-800 border-r border-zinc-700 flex flex-col">
      <div className="flex flex-col">
        {tools.map((tool, index) => (
          <div key={tool.id} className="relative group">
            <button
              onClick={(e) => handleToolClick(tool.id, e)}
              className={`w-full h-12 flex items-center justify-center cursor-pointer transition-colors ${
                selectedTool === tool.id 
                  ? 'bg-zinc-600 text-white' 
                  : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
              title={tool.tooltip}
            >
              <i className={`${tool.icon} text-lg w-5 h-5 flex items-center justify-center`}></i>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Actions */}
      <div className="mt-4 border-t border-zinc-700 pt-2">
        {onUndo && (
          <button
            onClick={onUndo}
            className="w-full h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Undo (Ctrl+Z) Work-in-progress"
          >
            <i className="ri-arrow-go-back-line text-lg"></i>
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            className="w-full h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Redo (Ctrl+Y) Work-in-progress"
          >
            <i className="ri-arrow-go-forward-line text-lg"></i>
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            className="w-full h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Clear Canvas"
          >
            <i className="ri-delete-bin-line text-lg"></i>
          </button>
        )}
      </div>
      
      {/* Color Picker */}
      <div className="mt-auto px-2 mb-4">
        <div className="relative group">
          <button
            onClick={() => setIsColorPickerOpen(true)}
            className="w-8 h-8 border-2 border-zinc-600 rounded cursor-pointer hover:border-indigo-500 transition-colors"
            style={{ backgroundColor: currentColor }}
            title="Pick Color"
          />
          <div className="absolute left-full ml-2 bottom-0 bg-zinc-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {currentColor}
          </div>
        </div>
      </div>

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        initialColor={currentColor}
        onColorSelect={(color) => onColorChange?.(color)}
      />
    </div>
  );
}
