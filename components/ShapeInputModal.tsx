'use client';

import { useState, useEffect } from 'react';

interface ShapeInputModalProps {
  isOpen: boolean;
  shapeType: 'line' | 'rectangle' | 'circle' | 'rgbcube' | null;
  onClose: () => void;
  onSubmit: (data: ShapeInputData) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ShapeInputData {
  // For Rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  filled?: boolean;
  
  // For Circle
  centerX?: number;
  centerY?: number;
  radius?: number;
  circleFilled?: boolean;
  
  // For Line
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  
  // For RGB Cube
  cubeX?: number;
  cubeY?: number;
  size?: number;
}

export default function ShapeInputModal({ isOpen, shapeType, onClose, onSubmit, canvasWidth, canvasHeight }: ShapeInputModalProps) {
  const [formData, setFormData] = useState<ShapeInputData>({});
  
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({});
    }
  }, [isOpen, shapeType]);

  if (!isOpen || !shapeType) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleChange = (field: keyof ShapeInputData, value: number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderFields = () => {
    switch (shapeType) {
      case 'rectangle':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  X (position)
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasWidth}
                  value={formData.x ?? ''}
                  onChange={(e) => handleChange('x', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Y (position)
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasHeight}
                  value={formData.y ?? ''}
                  onChange={(e) => handleChange('y', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Width
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.width ?? ''}
                  onChange={(e) => handleChange('width', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Height
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.height ?? ''}
                  onChange={(e) => handleChange('height', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="flex items-center space-x-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.filled ?? false}
                  onChange={(e) => handleChange('filled', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Fill</span>
              </label>
            </div>
          </>
        );
      
      case 'circle':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Center X
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasWidth}
                  value={formData.centerX ?? ''}
                  onChange={(e) => handleChange('centerX', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Center Y
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasHeight}
                  value={formData.centerY ?? ''}
                  onChange={(e) => handleChange('centerY', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Radius
              </label>
              <input
                type="number"
                min="1"
                value={formData.radius ?? ''}
                onChange={(e) => handleChange('radius', parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="50"
                required
              />
            </div>
            <div>
              <label className="flex items-center space-x-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.circleFilled ?? false}
                  onChange={(e) => handleChange('circleFilled', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Fill</span>
              </label>
            </div>
          </>
        );
      
      case 'line':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Start X
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasWidth}
                  value={formData.x1 ?? ''}
                  onChange={(e) => handleChange('x1', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Start Y
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasHeight}
                  value={formData.y1 ?? ''}
                  onChange={(e) => handleChange('y1', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  End X
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasWidth}
                  value={formData.x2 ?? ''}
                  onChange={(e) => handleChange('x2', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  End Y
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasHeight}
                  value={formData.y2 ?? ''}
                  onChange={(e) => handleChange('y2', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="100"
                  required
                />
              </div>
            </div>
          </>
        );
      
      case 'rgbcube':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Center X
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasWidth}
                  value={formData.cubeX ?? ''}
                  onChange={(e) => handleChange('cubeX', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Center Y
                </label>
                <input
                  type="number"
                  min="0"
                  max={canvasHeight}
                  value={formData.cubeY ?? ''}
                  onChange={(e) => handleChange('cubeY', parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="200"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Size
              </label>
              <input
                type="number"
                min="10"
                value={formData.size ?? ''}
                onChange={(e) => handleChange('size', parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="100"
                required
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (shapeType) {
      case 'rectangle':
        return 'Add Rectangle';
      case 'circle':
        return 'Add Circle';
      case 'line':
        return 'Add Line';
      case 'rgbcube':
        return 'Add RGB Cube';
      default:
        return 'Add Shape';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderFields()}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded font-medium transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <i className="ri-add-line"></i>
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
