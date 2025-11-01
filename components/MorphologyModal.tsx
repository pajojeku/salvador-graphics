
import { useEffect, useRef, useState } from 'react';
import { ImageShape } from '@/lib/shapes/Image';
import {
  applyDilation,
  applyErosion,
  applyOpening,
  applyClosing,
  applyHitOrMiss,
  MorphologyType
} from '@/lib/morphology';




const morphologyOptions = [
  { value: 'none', label: 'None' },
  { value: 'dilation', label: 'Dilation' },
  { value: 'erosion', label: 'Erosion' },
  { value: 'opening', label: 'Opening' },
  { value: 'closing', label: 'Closing' },
  { value: 'hitormiss', label: 'Hit-or-miss' },
];


interface MorphologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
  onCancel?: () => void;
  imageShape?: ImageShape | null;
  morphologyType: MorphologyType;
  onMorphologyTypeChange: (type: MorphologyType) => void;
  kernelSize: number;
  onKernelSizeChange: (v: number) => void;
  onReset: () => void;
}

const MorphologyModal = ({
  isOpen,
  onClose,
  onApply,
  onCancel,
  imageShape,
  morphologyType,
  onMorphologyTypeChange,
  kernelSize,
  onKernelSizeChange,
  onReset,
}: MorphologyModalProps) => {

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  // Structuring element state: 2D array of 0/1
  const [structElem, setStructElem] = useState<number[][]>(() => {
    // Default: all ones
    return Array.from({ length: kernelSize }, () => Array(kernelSize).fill(1));
  });

  // Update structElem when kernelSize changes
  useEffect(() => {
    setStructElem(prev => {
      if (prev.length === kernelSize) return prev;
      // Resize matrix
      const newMat = Array.from({ length: kernelSize }, (_, y) =>
        Array.from({ length: kernelSize }, (_, x) =>
          prev[y]?.[x] ?? 1
        )
      );
      return newMat;
    });
  }, [kernelSize]);

  // Draw preview with selected filter
  useEffect(() => {
    if (!imageShape || !previewCanvasRef.current || !(imageShape as any).cachedPixels) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = imageShape.width;
    const height = imageShape.height;
    const src = (imageShape as any).cachedPixels as Uint8ClampedArray;
    if (!src) return;

    // Binarize helper
    function binarize(input: Uint8ClampedArray, threshold = 128) {
      const out = new Uint8ClampedArray(input.length);
      for (let i = 0; i < input.length; i += 4) {
        const v = input[i];
        const bin = v >= threshold ? 255 : 0;
        out[i] = out[i + 1] = out[i + 2] = bin;
        out[i + 3] = input[i + 3];
      }
      return out;
    }

    let filtered: Uint8ClampedArray = src;
    // Pass structElem to filters (TODO: update filter functions to accept it)
    if (morphologyType === 'dilation') {
      filtered = applyDilation(binarize(src), width, height, kernelSize, structElem);
    } else if (morphologyType === 'erosion') {
      filtered = applyErosion(binarize(src), width, height, kernelSize, structElem);
    } else if (morphologyType === 'opening') {
      filtered = applyOpening(binarize(src), width, height, kernelSize, structElem);
    } else if (morphologyType === 'closing') {
      filtered = applyClosing(binarize(src), width, height, kernelSize, structElem);
    } else if (morphologyType === 'hitormiss') {
      filtered = applyHitOrMiss(binarize(src), width, height, kernelSize, structElem);
    } else if (morphologyType === 'none') {
      filtered = src;
    }
    const previewImageData = ctx.createImageData(width, height);
    for (let i = 0; i < filtered.length; i++) {
      previewImageData.data[i] = filtered[i];
    }
    ctx.putImageData(previewImageData, 0, 0);
  }, [imageShape, isOpen, morphologyType, kernelSize]);

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
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 " onClick={e => e.stopPropagation()}>
        <form onSubmit={handleApply}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <i className="ri-shape-line text-indigo-400"></i>
              <span>Morphological Filters</span>
            </h2>
            <button type="button" onClick={handleCancel} className="text-zinc-400 hover:text-white transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 mb-4">
              {/* Dropdown and reset moved below, nothing here now */}
            </div>
            {imageShape && (imageShape as any).cachedPixels && (
              <div className="flex flex-row items-start justify-center gap-8 mb-4">
                {/* Left: Preview and kernel size */}
                <div className="flex flex-col items-center">
                  <div className="flex flex-col w-full mb-2">
                    <div className="flex items-center w-full mb-2">
                      <label className="block text-sm font-medium text-zinc-300 mr-2">Morphology type:</label>
                      <select
                        value={morphologyType}
                        onChange={e => onMorphologyTypeChange(e.target.value as MorphologyType)}
                        className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none border border-zinc-600 h-8"
                        style={{ minWidth: 180 }}
                      >
                        {morphologyOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2 h-8 bg-zinc-700 text-zinc-100 rounded border border-zinc-600 hover:bg-zinc-600 transition-colors text-sm font-normal ml-4"
                        onClick={handleReset}
                        title="Reset morphology params"
                      >
                        <i className="ri-refresh-line"></i>
                        Reset
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={previewCanvasRef}
                    width={imageShape.width}
                    height={imageShape.height}
                    style={{
                      height: 240,
                      borderRadius: 8,
                      border: '1px solid #444',
                      background: '#222',
                      marginBottom: 8,
                      marginTop: 8
                    }}
                  />
                  <div className="text-xs text-zinc-400 mb-1">Image preview</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <label className="block text-sm font-medium text-zinc-300 w-32">Kernel size</label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      step={2}
                      value={kernelSize}
                      onChange={e => onKernelSizeChange(Number(e.target.value))}
                      className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min={3}
                      max={15}
                      step={2}
                      value={kernelSize}
                      onChange={e => onKernelSizeChange(Number(e.target.value))}
                      className="w-12 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400 w-16 text-center">{kernelSize}</span>
                  </div>
                </div>
                {/* Right: Structuring element editor */}
                <div className="flex flex-col items-center mt-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Structuring element</label>
                  <div style={{ display: 'inline-block', border: '1px solid #444', borderRadius: 4, background: '#222', padding: 4 }}>
                    <table style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        {structElem.map((row, y) => (
                          <tr key={y}>
                            {row.map((val, x) => (
                              <td key={x} style={{ padding: 2 }}>
                                <button
                                  type="button"
                                  style={{
                                    width: 28, height: 28,
                                    background: val ? '#6366f1' : '#222',
                                    border: '1px solid #444',
                                    borderRadius: 4,
                                    color: val ? '#fff' : '#888',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => {
                                    setStructElem(prev => prev.map((r, yy) =>
                                      yy === y ? r.map((v, xx) => xx === x ? (v ? 0 : 1) : v) : r
                                    ));
                                  }}
                                >{val ? 1 : 0}</button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 text-center">Click to toggle 0/1. <br />Used as structuring element for all operations.</div>
                </div>
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
};

export default MorphologyModal;
