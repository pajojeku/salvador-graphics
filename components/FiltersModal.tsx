import { useEffect, useState, useRef } from 'react';
import { ImageShape } from '@/lib/shapes/Image';


interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
  onCancel?: () => void;
  imageShape?: ImageShape | null;
}

export default function FiltersModal({ isOpen, onClose, onApply, onCancel, imageShape }: FiltersModalProps) {
  const [filterType, setFilterType] = useState('average');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setFilterType('average');
  }, [isOpen]);

  // Draw preview (just original for now)
  useEffect(() => {
    if (!imageShape || !previewCanvasRef.current || !(imageShape as any).cachedPixels) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = imageShape.width;
    const height = imageShape.height;
    const src = (imageShape as any).cachedPixels as Uint8ClampedArray;
    if (!src) return;
    const previewImageData = ctx.createImageData(width, height);
    for (let i = 0; i < src.length; i++) {
      previewImageData.data[i] = src[i];
    }
    ctx.putImageData(previewImageData, 0, 0);
  }, [imageShape, isOpen, filterType]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (onApply) {
      onApply();
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    setFilterType('average');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleCancel}>
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleApply}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <i className="ri-magic-line text-indigo-400"></i>
              <span>Filters</span>
            </h2>
            <button type="button" onClick={handleCancel} className="text-zinc-400 hover:text-white transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center mb-4 justify-between">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-zinc-300 mr-2">Filter type:</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none border border-zinc-600 h-8"
                  style={{ minWidth: 180 }}
                >
                  <option value="average">Smoothing (averaging)</option>
                  <option value="median">Median</option>
                  <option value="sobel">Sobel edge detection</option>
                  <option value="sharpen">High-pass sharpening</option>
                </select>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 px-2 h-8 bg-zinc-700 text-zinc-100 rounded border border-zinc-600 hover:bg-zinc-600 transition-colors text-sm font-normal"
                onClick={handleReset}
                title="Reset filter type"
              >
                <i className="ri-refresh-line"></i>
                Reset
              </button>
            </div>
            {imageShape && (imageShape as any).cachedPixels && (
              <div className="flex flex-col items-center mb-4">
                <canvas
                  ref={previewCanvasRef}
                  width={imageShape.width}
                  height={imageShape.height}
                  style={{
                    height: 240,
                    borderRadius: 8,
                    border: '1px solid #444',
                    background: '#222',
                    marginBottom: 8
                  }}
                />
                <div className="text-xs text-zinc-400 mb-1">Image preview</div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3 p-4 border-t border-zinc-700 bg-zinc-900/30">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded font-medium transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <i className="ri-check-line"></i>
              <span>Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
