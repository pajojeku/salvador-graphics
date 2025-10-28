import React, { useState, useRef, useEffect } from 'react';
import {
  manualThreshold,
  percentBlackSelection,
  meanIterativeSelection,
  entropySelection,
  minimumError,
  fuzzyMinimumError
} from '../lib/binarization';

const binarizationTypeLabels = {
  none: 'None',
  manual: 'Manual Threshold',
  percent: 'Percent Black Selection',
  mean: 'Mean Iterative Selection',
  entropy: 'Entropy Selection',
  minError: 'Minimum Error',
  fuzzyMinError: 'Fuzzy Minimum Error',
};

type BinarizationType = keyof typeof binarizationTypeLabels;

interface BinarizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageShape: any; // ImageShape | null
  onApplyBinarization?: () => void;
}

const BinarizationModal: React.FC<BinarizationModalProps> = ({ isOpen, onClose, imageShape, onApplyBinarization }) => {
  const [binarizationType, setBinarizationType] = useState<BinarizationType>('none');
  const [initialBinarizationType, setInitialBinarizationType] = useState<BinarizationType>('none');
  const [threshold, setThreshold] = useState(128);
  const [percent, setPercent] = useState(50);
  const [autoThreshold, setAutoThreshold] = useState<number | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync modal state with image
  useEffect(() => {
    if (isOpen && imageShape) {
      setBinarizationType(imageShape.binarizationType || 'none');
      setInitialBinarizationType(imageShape.binarizationType || 'none');
      setThreshold(imageShape.binarizationThreshold ?? 128);
      setPercent(imageShape.binarizationPercent ?? 50);
      setAutoThreshold(null);
    }
  }, [isOpen, imageShape]);

  // Reset handler
  const handleReset = () => {
    setBinarizationType('none');
    setThreshold(128);
    setPercent(50);
    setAutoThreshold(null);
  };

  // Cancel handler
  const handleCancel = () => {
    if (imageShape) {
      setBinarizationType(initialBinarizationType);
    }
    onClose();
  };

  // Apply handler
  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (imageShape) {
      imageShape.binarizationType = binarizationType;
      imageShape.binarizationThreshold = threshold;
      imageShape.binarizationPercent = percent;
      // Apply to cachedPixels
      const width = imageShape.width;
      const height = imageShape.height;
      let src = imageShape.originalPixels || imageShape.cachedPixels;
      if (!src) return;
      let result: Uint8ClampedArray = src;
      if (binarizationType === 'manual') {
        result = manualThreshold(src, width, height, threshold);
      } else if (binarizationType === 'percent') {
        result = percentBlackSelection(src, width, height, percent).dst;
      } else if (binarizationType === 'mean') {
        result = meanIterativeSelection(src, width, height).dst;
      } else if (binarizationType === 'entropy') {
        result = entropySelection(src, width, height).dst;
      } else if (binarizationType === 'minError') {
        result = minimumError(src, width, height).dst;
      } else if (binarizationType === 'fuzzyMinError') {
        result = fuzzyMinimumError(src, width, height).dst;
      }
      imageShape.cachedPixels = new Uint8ClampedArray(result);
    }
    if (onApplyBinarization) onApplyBinarization();
    onClose();
  };

  // Draw preview
  useEffect(() => {
    if (!imageShape || !previewCanvasRef.current || !(imageShape as any).cachedPixels) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = imageShape.width;
    const height = imageShape.height;
    const src = (imageShape.originalPixels || imageShape.cachedPixels) as Uint8ClampedArray;
    let result: Uint8ClampedArray = src;
    let autoT: number | null = null;
    if (binarizationType === 'manual') {
      result = manualThreshold(src, width, height, threshold);
      autoT = threshold;
    } else if (binarizationType === 'percent') {
      const out = percentBlackSelection(src, width, height, percent);
      result = out.dst;
      autoT = out.threshold;
    } else if (binarizationType === 'mean') {
      const out = meanIterativeSelection(src, width, height);
      result = out.dst;
      autoT = out.threshold;
    } else if (binarizationType === 'entropy') {
      const out = entropySelection(src, width, height);
      result = out.dst;
      autoT = out.threshold;
    } else if (binarizationType === 'minError') {
      const out = minimumError(src, width, height);
      result = out.dst;
      autoT = out.threshold;
    } else if (binarizationType === 'fuzzyMinError') {
      const out = fuzzyMinimumError(src, width, height);
      result = out.dst;
      autoT = out.threshold;
    }
    setAutoThreshold(autoT);
    const previewImageData = ctx.createImageData(width, height);
    for (let i = 0; i < result.length; i++) {
      previewImageData.data[i] = result[i];
    }
    ctx.putImageData(previewImageData, 0, 0);
  }, [imageShape, binarizationType, threshold, percent, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleApply}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <i className="ri-contrast-2-line text-indigo-400"></i>
              <span>Binarization</span>
            </h2>
            <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-zinc-300 mr-2">Binarization type:</label>
                  <select
                    value={binarizationType}
                    onChange={e => setBinarizationType(e.target.value as BinarizationType)}
                    className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none border border-zinc-600 h-8"
                    style={{ minWidth: 180 }}
                  >
                    {Object.entries(binarizationTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 h-8 bg-zinc-700 text-zinc-100 rounded border border-zinc-600 hover:bg-zinc-600 transition-colors text-sm font-normal"
                  onClick={handleReset}
                  title="Reset binarization params"
                >
                  <i className="ri-refresh-line"></i>
                  Reset
                </button>
              </div>
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
            {binarizationType === 'manual' && (
              <div className="mb-4">
                <label className="block text-sm text-zinc-300 mb-1">Threshold: {threshold}</label>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  className="w-full bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>0</span>
                  <span>255</span>
                </div>
              </div>
            )}
            {binarizationType === 'percent' && (
              <div className="mb-4">
                <label className="block text-sm text-zinc-300 mb-1">Percent black: {percent}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={percent}
                  onChange={e => setPercent(Number(e.target.value))}
                  className="w-full bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
            {autoThreshold !== null && binarizationType !== 'none' && binarizationType !== 'manual' && (
              <div className="mb-2 text-xs text-zinc-400">Auto threshold: {Math.round(autoThreshold)}</div>
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
};

export default BinarizationModal;
