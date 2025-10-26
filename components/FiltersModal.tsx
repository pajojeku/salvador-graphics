import { useEffect, useRef } from 'react';
import {
  applyAverageFilter,
  applyMedianFilter,
  applySobelFilter,
  applySharpenFilter,
  applyGaussianFilter,
} from '@/lib/filters';
import { ImageShape } from '@/lib/shapes/Image';



export type FilterType = 'none' | 'average' | 'median' | 'sobel' | 'sharpen' | 'gaussian';
export type SobelDir = 'x' | 'y' | 'xy';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
  onCancel?: () => void;
  imageShape?: ImageShape | null;
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;
  maskSize: number;
  onMaskSizeChange: (v: number) => void;
  sobelDir: SobelDir;
  onSobelDirChange: (v: SobelDir) => void;
  sobelThreshold: number;
  onSobelThresholdChange: (v: number) => void;
  sharpenStrength: number;
  onSharpenStrengthChange: (v: number) => void;
  onReset: () => void;
  gaussianSigma: number;
  onGaussianSigmaChange: (v: number) => void;
}

const FiltersModal = ({
  isOpen,
  onClose,
  onApply,
  onCancel,
  imageShape,
  filterType,
  onFilterTypeChange,
  maskSize,
  onMaskSizeChange,
  sobelDir,
  onSobelDirChange,
  sobelThreshold,
  onSobelThresholdChange,
  sharpenStrength,
  onSharpenStrengthChange,
  onReset,
  gaussianSigma,
  onGaussianSigmaChange
}: FiltersModalProps) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

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
    let filtered: Uint8ClampedArray = src;
    if (filterType === 'average') {
      filtered = applyAverageFilter(src, width, height, maskSize);
    } else if (filterType === 'median') {
      filtered = applyMedianFilter(src, width, height, maskSize);
    } else if (filterType === 'sobel') {
      filtered = applySobelFilter(src, width, height, sobelDir, sobelThreshold);
    } else if (filterType === 'sharpen') {
      filtered = applySharpenFilter(src, width, height, sharpenStrength);
    } else if (filterType === 'gaussian') {
      filtered = applyGaussianFilter(src, width, height, maskSize, gaussianSigma);
    } else if (filterType === 'none') {
      filtered = (imageShape as any).originalPixels ? (imageShape as any).originalPixels : src;
    }
    const previewImageData = ctx.createImageData(width, height);
    for (let i = 0; i < filtered.length; i++) {
      previewImageData.data[i] = filtered[i];
    }
    ctx.putImageData(previewImageData, 0, 0);
  }, [imageShape, isOpen, filterType, maskSize, sobelDir, sobelThreshold, sharpenStrength, gaussianSigma]);

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
    onReset();
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
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-zinc-300 mr-2">Filter type:</label>
                  <select
                    value={filterType}
                    onChange={e => onFilterTypeChange(e.target.value as FilterType)}
                    className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none border border-zinc-600 h-8"
                    style={{ minWidth: 180 }}
                  >
                    <option value="none">None</option>
                    <option value="average">Smoothing (averaging)</option>
                    <option value="median">Median</option>
                    <option value="gaussian">Gaussian blur</option>
                    <option value="sobel">Sobel edge detection</option>
                    <option value="sharpen">High-pass sharpening</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 h-8 bg-zinc-700 text-zinc-100 rounded border border-zinc-600 hover:bg-zinc-600 transition-colors text-sm font-normal"
                  onClick={handleReset}
                  title="Reset filter params"
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

              {(filterType === 'average' || filterType === 'median' || filterType === 'gaussian') && (
                <>
                  {filterType === 'gaussian' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <label className="block text-sm font-medium text-zinc-300 w-32">Sigma</label>
                      <input
                        type="range"
                        min={0.1}
                        max={5}
                        step={0.01}
                        value={gaussianSigma}
                        onChange={e => onGaussianSigmaChange(Number(e.target.value))}
                        className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="number"
                        min={0.1}
                        max={5}
                        step={0.01}
                        value={gaussianSigma}
                        onChange={e => onGaussianSigmaChange(Number(e.target.value))}
                        className="w-12 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400 w-16 text-center">{gaussianSigma}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <label className="block text-sm font-medium text-zinc-300 w-32">Mask size</label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      step={2}
                      value={maskSize}
                      onChange={e => onMaskSizeChange(Number(e.target.value))}
                      className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min={3}
                      max={15}
                      step={2}
                      value={maskSize}
                      onChange={e => onMaskSizeChange(Number(e.target.value))}
                      className="w-12 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400 w-16 text-center">{maskSize}</span>
                  </div>
                </>
              )}
              {filterType === 'sobel' && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-zinc-300">Direction:</label>
                    <select value={sobelDir} onChange={e => onSobelDirChange(e.target.value as SobelDir)} className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm border border-zinc-600">
                      <option value="x">X</option>
                      <option value="y">Y</option>
                      <option value="xy">XY</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <label className="block text-sm font-medium text-zinc-300 w-32">Threshold</label>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={sobelThreshold}
                      onChange={e => onSobelThresholdChange(Number(e.target.value))}
                      className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={sobelThreshold}
                      onChange={e => onSobelThresholdChange(Number(e.target.value))}
                      className="w-12 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400 w-16 text-center">{sobelThreshold}</span>
                  </div>
                </>
              )}
              {filterType === 'sharpen' && (
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-zinc-300 w-32">Strength</label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={sharpenStrength}
                    onChange={e => onSharpenStrengthChange(Number(e.target.value))}
                    className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.01}
                    value={sharpenStrength}
                    onChange={e => onSharpenStrengthChange(Number(e.target.value))}
                    className="w-12 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400 w-16 text-center">{sharpenStrength}</span>
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

export default FiltersModal;
