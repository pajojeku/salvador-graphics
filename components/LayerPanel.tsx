
'use client';

import { useState } from 'react';
import { Shape } from '@/lib/shapes/Shape';

interface LayerPanelProps {
  selectedLayer: string;
  onLayerSelect: (layer: string) => void;
  shapes?: Shape[];
  onShapeDelete?: (shapeId: string) => void;
  onShapeToggleVisibility?: (shapeId: string) => void;
  onShapeSelect?: (shapeId: string) => void;
}

export default function LayerPanel({ selectedLayer, onLayerSelect, shapes = [], onShapeDelete, onShapeToggleVisibility, onShapeSelect }: LayerPanelProps) {
  const [activeTab, setActiveTab] = useState('layers');

  // Generuj nazwy dla kształtów z licznikami
  const getShapeDisplayName = (shape: Shape, originalIndex: number) => {
    // Zlicz wszystkie kształty tego samego typu do tego punktu w oryginalnej kolejności
    const typeCounts = shapes
      .slice(0, originalIndex + 1)
      .filter(s => s.type === shape.type)
      .length;
    
    switch (shape.type) {
      case 'brush':
        return `Brush ${typeCounts}`;
      case 'rectangle':
        return `Rectangle ${typeCounts}`;
      case 'circle':
        return `Circle ${typeCounts}`;
      case 'line':
        return `Line ${typeCounts}`;
      default:
        return `${shape.type} ${typeCounts}`;
    }
  };

  const getShapeIcon = (shapeType: string) => {
    switch (shapeType) {
      case 'brush':
        return 'ri-brush-line';
      case 'rectangle':
        return 'ri-rectangle-line';
      case 'circle':
        return 'ri-circle-line';
      case 'line':
        return 'ri-subtract-line';
      default:
        return 'ri-shape-line';
    }
  };

  return (
    <div className="border-b border-zinc-700">
      {/* Tab Headers */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-2">
        <div className="flex items-center space-x-2">
          <i className="ri-settings-3-line text-zinc-400 w-4 h-4 flex items-center justify-center"></i>
          <span className="text-sm text-zinc-300">Layers (Work-in-progress)</span>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-2 py-1 flex items-center justify-between">

        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-400">Opacity:</span>
          <span className="text-xs text-zinc-300">100% (WIP)</span>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto bg-zinc-800 max-h-48 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800">
        {shapes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            <div className="text-center">
              <i className="ri-file-list-line text-2xl mb-2"></i>
              <p className="text-sm">No objects created yet</p>
            </div>
          </div>
        ) : (
          [...shapes].reverse().map((shape, reverseIndex) => {
            const originalIndex = shapes.length - 1 - reverseIndex;
            const displayName = getShapeDisplayName(shape, originalIndex);
            return (
              <div
                key={shape.id}
                onClick={() => {
                  onLayerSelect(displayName);
                  onShapeSelect?.(shape.id);
                }}
                className={`group flex items-center px-2 py-1 cursor-pointer border-b border-zinc-700 ${
                  shape.selected ? 'bg-zinc-600' : 'hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center space-x-2 flex-1">
                  <button 
                    className="text-zinc-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShapeToggleVisibility?.(shape.id);
                    }}
                  >
                    <i className={`${shape.visible ? 'ri-eye-line' : 'ri-eye-off-line'} text-xs w-3 h-3 flex items-center justify-center`}></i>
                  </button>
                  <div className="w-8 h-6 bg-zinc-600 border border-zinc-500 rounded flex items-center justify-center">
                    <i className={`${getShapeIcon(shape.type)} text-xs text-zinc-400 w-3 h-3 flex items-center justify-center`}></i>
                  </div>
                  <span className="text-sm text-zinc-300 flex-1">{displayName}</span>
                  <button 
                    className="text-zinc-400 hover:text-red-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShapeDelete?.(shape.id);
                    }}
                    title="Delete shape"
                  >
                    <i className="ri-delete-bin-line text-xs w-3 h-3 flex items-center justify-center"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
