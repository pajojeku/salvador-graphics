
'use client';

import { useState } from 'react';
import { Shape } from '@/lib/shapes';
import { Circle } from '@/lib/shapes/Circle';
import { Rectangle } from '@/lib/shapes/Rectangle';
import { Line } from '@/lib/shapes/Line';
import { Brush } from '@/lib/shapes/Brush';
import { RGBCube } from '@/lib/shapes/RGBCube';
import ColorPickerModal from './ColorPickerModal';

interface PropertiesPanelProps {
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
  selectedShape?: Shape | null;
  onShapeUpdate?: () => void;
}

export default function PropertiesPanel({ 
  strokeWidth = 1, 
  onStrokeWidthChange,
  selectedShape,
  onShapeUpdate 
}: PropertiesPanelProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
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

        {/* Selected Shape Properties */}
        {selectedShape && (
          <div className="border-t border-zinc-700 pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <i className="ri-shape-line text-zinc-400 w-4 h-4"></i>
              <span className="text-sm text-zinc-300">Selected Shape</span>
            </div>

            <div className="text-xs text-zinc-400">
              Type: <span className="text-zinc-300 capitalize">{selectedShape.type}</span>
            </div>

            {/* Color Picker - ukryj dla RGB Cube */}
            {!(selectedShape instanceof RGBCube) && (
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 block">Color</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsColorPickerOpen(true)}
                    className="w-12 h-8 border-2 border-zinc-600 rounded cursor-pointer hover:border-indigo-500 transition-colors"
                    style={{ backgroundColor: `#${selectedShape.color.r.toString(16).padStart(2, '0')}${selectedShape.color.g.toString(16).padStart(2, '0')}${selectedShape.color.b.toString(16).padStart(2, '0')}` }}
                  />
                  <span className="text-xs text-zinc-400">
                    RGB({selectedShape.color.r}, {selectedShape.color.g}, {selectedShape.color.b})
                  </span>
                </div>
              </div>
            )}

            {/* Circle Properties */}
            {selectedShape instanceof Circle && (
              <div className="space-y-2 text-xs">
                {/* Filled Toggle */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-zinc-400">Filled</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShape.filled}
                      onChange={(e) => {
                        selectedShape.filled = e.target.checked;
                        onShapeUpdate?.();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.center.x)}
                      onInput={(e) => {
                        selectedShape.center.x = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.center.y)}
                      onInput={(e) => {
                        selectedShape.center.y = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">Radius</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.radius)}
                      onInput={(e) => {
                        selectedShape.radius = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                
                {/* Stroke Width */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Stroke</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={selectedShape.strokeWidth}
                        onInput={(e) => {
                          selectedShape.strokeWidth = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                          onShapeUpdate?.();
                        }}
                        className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1 w-16"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={selectedShape.strokeWidth}
                    onInput={(e) => {
                      selectedShape.strokeWidth = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                      onShapeUpdate?.();
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Rectangle Properties */}
            {selectedShape instanceof Rectangle && (
              <div className="space-y-2 text-xs">
                {/* Filled Toggle */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-zinc-400">Filled</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShape.filled}
                      onChange={(e) => {
                        selectedShape.filled = e.target.checked;
                        onShapeUpdate?.();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.x)}
                      onInput={(e) => {
                        selectedShape.x = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.y)}
                      onInput={(e) => {
                        selectedShape.y = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">Width</label>
                    <input
                      type="number"
                      value={Math.round(Math.abs(selectedShape.width))}
                      onInput={(e) => {
                        const val = Number((e.target as HTMLInputElement).value) || 1;
                        const sign = selectedShape.width >= 0 ? 1 : -1;
                        selectedShape.width = sign * Math.abs(val);
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Height</label>
                    <input
                      type="number"
                      value={Math.round(Math.abs(selectedShape.height))}
                      onInput={(e) => {
                        const val = Number((e.target as HTMLInputElement).value) || 1;
                        const sign = selectedShape.height >= 0 ? 1 : -1;
                        selectedShape.height = sign * Math.abs(val);
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                
                {/* Stroke Width */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-xs text-zinc-400">Stroke</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={selectedShape.strokeWidth}
                        onInput={(e) => {
                          selectedShape.strokeWidth = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                          onShapeUpdate?.();
                        }}
                        className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1 w-12"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={selectedShape.strokeWidth}
                    onInput={(e) => {
                      selectedShape.strokeWidth = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                      onShapeUpdate?.();
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Line Properties */}
            {selectedShape instanceof Line && (
              <div className="space-y-2 text-xs">
                <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Start</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.start.x)}
                      onInput={(e) => {
                        selectedShape.start.x = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.start.y)}
                      onInput={(e) => {
                        selectedShape.start.y = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 mt-2">End</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.end.x)}
                      onInput={(e) => {
                        selectedShape.end.x = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.end.y)}
                      onInput={(e) => {
                        selectedShape.end.y = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                
                {/* Stroke Width */}
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Stroke</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={selectedShape.strokeWidth}
                        onInput={(e) => {
                          selectedShape.strokeWidth = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                          onShapeUpdate?.();
                        }}
                        className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1 w-16"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={selectedShape.strokeWidth}
                    onInput={(e) => {
                      selectedShape.strokeWidth = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                      onShapeUpdate?.();
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Brush Properties */}
            {selectedShape instanceof Brush && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={selectedShape.points.length > 0 ? Math.round(selectedShape.points[0].x) : 0}
                      onInput={(e) => {
                        if (selectedShape.points.length > 0) {
                          const oldX = selectedShape.points[0].x;
                          const newX = Number((e.target as HTMLInputElement).value) || 0;
                          const dx = newX - oldX;
                          selectedShape.move(dx, 0);
                          onShapeUpdate?.();
                        }
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={selectedShape.points.length > 0 ? Math.round(selectedShape.points[0].y) : 0}
                      onInput={(e) => {
                        if (selectedShape.points.length > 0) {
                          const oldY = selectedShape.points[0].y;
                          const newY = Number((e.target as HTMLInputElement).value) || 0;
                          const dy = newY - oldY;
                          selectedShape.move(0, dy);
                          onShapeUpdate?.();
                        }
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                
                {/* Size/Stroke Width */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Size</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={selectedShape.size}
                        onInput={(e) => {
                          const val = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                          selectedShape.size = val;
                          selectedShape.strokeWidth = val;
                          onShapeUpdate?.();
                        }}
                        className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1 w-16"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={selectedShape.size}
                    onInput={(e) => {
                      const val = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
                      selectedShape.size = val;
                      selectedShape.strokeWidth = val;
                      onShapeUpdate?.();
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* RGB Cube Properties */}
            {selectedShape instanceof RGBCube && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.x)}
                      onInput={(e) => {
                        const oldX = selectedShape.x;
                        selectedShape.x = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedShape.y)}
                      onInput={(e) => {
                        selectedShape.y = Number((e.target as HTMLInputElement).value) || 0;
                        onShapeUpdate?.();
                      }}
                      className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-zinc-400 block mb-1">Size</label>
                  <input
                    type="number"
                    value={Math.round(selectedShape.size)}
                    onInput={(e) => {
                      selectedShape.size = Math.max(10, Number((e.target as HTMLInputElement).value) || 10);
                      onShapeUpdate?.();
                    }}
                    className="w-16 bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-1.5 py-0.5"
                  />
                </div>

                {/* Rotation Controls */}
                <div className="space-y-2 mt-3 border-t border-zinc-700 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Rotation X</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        step="0.1"
                        min="0" 
                        max="6.28" 
                        value={selectedShape.rotationX.toFixed(2)}
                        onInput={(e) => {
                          selectedShape.rotationX = Number((e.target as HTMLInputElement).value) || 0;
                          onShapeUpdate?.();
                        }}
                        className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1 w-16"
                      />
                      <span className="text-xs text-zinc-400">rad</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="6.28" 
                    step="0.01"
                    value={selectedShape.rotationX}
                    onInput={(e) => {
                      selectedShape.rotationX = Number((e.target as HTMLInputElement).value) || 0;
                      onShapeUpdate?.();
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Rotation Y</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        step="0.1"
                        min="0" 
                        max="6.28" 
                        value={selectedShape.rotationY.toFixed(2)}
                        onInput={(e) => {
                          selectedShape.rotationY = Number((e.target as HTMLInputElement).value) || 0;
                          onShapeUpdate?.();
                        }}
                        className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1 w-16"
                      />
                      <span className="text-xs text-zinc-400">rad</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="6.28" 
                    step="0.01"
                    value={selectedShape.rotationY}
                    onInput={(e) => {
                      selectedShape.rotationY = Number((e.target as HTMLInputElement).value) || 0;
                      onShapeUpdate?.();
                    }}
                    className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Show Frame Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-zinc-700 mt-2 pt-2">
                  <span className="text-xs text-zinc-400">Show Frame</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShape.showFrame}
                      onChange={(e) => {
                        selectedShape.showFrame = e.target.checked;
                        onShapeUpdate?.();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Color Picker Modal */}
      {selectedShape && (
        <ColorPickerModal
          isOpen={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          initialColor={`#${selectedShape.color.r.toString(16).padStart(2, '0')}${selectedShape.color.g.toString(16).padStart(2, '0')}${selectedShape.color.b.toString(16).padStart(2, '0')}`}
          onColorSelect={(hex) => {
            selectedShape.color.r = parseInt(hex.slice(1, 3), 16);
            selectedShape.color.g = parseInt(hex.slice(3, 5), 16);
            selectedShape.color.b = parseInt(hex.slice(5, 7), 16);
            onShapeUpdate?.();
          }}
        />
      )}
    </div>
  );
}
