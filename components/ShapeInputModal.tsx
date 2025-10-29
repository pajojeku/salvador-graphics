'use client';

import { useState, useEffect } from 'react';

interface ShapeInputModalProps {
  isOpen: boolean;
  shapeType: 'line' | 'rectangle' | 'circle' | 'rgbcube' | 'bezier' | null;
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

  // For Bezier
  bezierPoints?: { x: number; y: number }[];
  bezierStrokeWidth?: number;
}

export default function ShapeInputModal({ isOpen, shapeType, onClose, onSubmit, canvasWidth, canvasHeight }: ShapeInputModalProps) {
  const [formData, setFormData] = useState<ShapeInputData>({});
  const [bezierPointIdx, setBezierPointIdx] = useState(0);
  
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({});
      setBezierPointIdx(0);
    }
  }, [isOpen, shapeType]);

  if (!isOpen || !shapeType) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For bezier, ensure defaults if not set
    if (shapeType === 'bezier') {
      const defaultPoints = [
        { x: 100, y: 100 },
        { x: 150, y: 50 },
        { x: 200, y: 150 },
        { x: 250, y: 100 }
      ];
      const data = {
        ...formData,
        bezierPoints: formData.bezierPoints && formData.bezierPoints.length >= 2 ? formData.bezierPoints : defaultPoints,
        bezierStrokeWidth: typeof formData.bezierStrokeWidth === 'number' ? formData.bezierStrokeWidth : 3
      };
      onSubmit(data);
    } else {
      onSubmit(formData);
    }
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
      
      case 'bezier': {
        // Default to 4 points if not set
        const points = formData.bezierPoints ?? [
          { x: 100, y: 100 },
          { x: 150, y: 50 },
          { x: 200, y: 150 },
          { x: 250, y: 100 }
        ];
        const strokeWidth = formData.bezierStrokeWidth ?? 3;
        // Ensure bezierPointIdx is in range
        const safeIdx = Math.max(0, Math.min(bezierPointIdx, points.length - 1));
        // Handlers
        const updatePoint = (idx: number, axis: 'x' | 'y', value: number) => {
          const newPoints = points.map((pt, i) => i === idx ? { ...pt, [axis]: value } : pt);
          setFormData(prev => ({ ...prev, bezierPoints: newPoints }));
        };
        const addPoint = () => {
          const curr = points[safeIdx] || { x: 0, y: 0 };
          const newPoints = [...points];
          newPoints.splice(safeIdx + 1, 0, { x: curr.x + 10, y: curr.y + 10 });
          setFormData(prev => ({ ...prev, bezierPoints: newPoints }));
          setBezierPointIdx(safeIdx + 1);
        };
        const handleStrokeWidth = (val: number) => {
          setFormData(prev => ({ ...prev, bezierStrokeWidth: val }));
        };
        return (
          <>
            {/* Stroke Width */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Stroke Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={strokeWidth}
                  onChange={e => handleStrokeWidth(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white"
                />
                <span className="text-xs text-zinc-400">px</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={strokeWidth}
                onChange={e => handleStrokeWidth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            {/* Control Point Selection */}
            <div className="flex items-center gap-2 mt-4">
              <label className="text-xs text-zinc-400">Control point:</label>
              <select
                value={safeIdx}
                onChange={e => setBezierPointIdx(Number(e.target.value))}
                className="bg-zinc-700 text-zinc-300 text-xs border border-zinc-600 rounded px-2 py-1"
              >
                {points.map((pt, idx) => (
                  <option key={idx} value={idx}>#{idx + 1}</option>
                ))}
              </select>
              <button
                type="button"
                className="ml-2 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-zinc-300 hover:bg-zinc-600"
                title="Add new point"
                onClick={addPoint}
              >+
              </button>
            </div>
            {/* X/Y for selected point */}
            {points[safeIdx] && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-zinc-400 block mb-1">X</label>
                  <input
                    type="number"
                    value={Math.round(points[safeIdx].x)}
                    onChange={e => updatePoint(safeIdx, 'x', parseInt(e.target.value) || 0)}
                    className="w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Y</label>
                  <input
                    type="number"
                    value={Math.round(points[safeIdx].y)}
                    onChange={e => updatePoint(safeIdx, 'y', parseInt(e.target.value) || 0)}
                    className="w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white"
                  />
                </div>
              </div>
            )}
          </>
        );
      }
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
      case 'bezier':
        return 'Add Bezier Curve';
      default:
        return 'Add Shape';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>{getTitle()}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
