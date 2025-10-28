import React, { useState, useRef, useEffect } from 'react';
import { histogramStretch, histogramEqualize } from '../lib/normalization';


type NormalizationType = 'none' | 'stretch' | 'equalize';

interface NormalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageShape: any; // ImageShape | null
  onApplyNormalization?: () => void;
}


const normalizationTypeLabels: Record<NormalizationType, string> = {
  none: 'None',
  stretch: 'Histogram Stretching',
  equalize: 'Histogram Equalization',
};


const NormalizationModal: React.FC<NormalizationModalProps> = ({ isOpen, onClose, imageShape, onApplyNormalization }) => {
  const [normalizationType, setNormalizationType] = useState<NormalizationType>('none');
  const [initialNormalizationType, setInitialNormalizationType] = useState<NormalizationType>('none');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // On open, sync modal state with image
  useEffect(() => {
    if (isOpen && imageShape) {
      setNormalizationType(imageShape.normalizationType || 'none');
      setInitialNormalizationType(imageShape.normalizationType || 'none');
    }
  }, [isOpen, imageShape]);

  // Reset handler
  const handleReset = () => {
    setNormalizationType('none');
  };

  // Cancel handler: restore initial state
  const handleCancel = () => {
    if (imageShape) {
      setNormalizationType(initialNormalizationType);
    }
    onClose();
  };

  // Apply handler: save normalization to image
  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (imageShape) {
      imageShape.normalizationType = normalizationType;
      // Actually update cachedPixels
      const width = imageShape.width;
      const height = imageShape.height;
      let src = imageShape.originalPixels || imageShape.cachedPixels;
      if (!src) return;
      let normalized: Uint8ClampedArray = src;
      if (normalizationType === 'stretch') {
        normalized = histogramStretch(src, width, height);
      } else if (normalizationType === 'equalize') {
        normalized = histogramEqualize(src, width, height);
      }
      imageShape.cachedPixels = new Uint8ClampedArray(normalized);
    }
    if (onApplyNormalization) onApplyNormalization();
    onClose();
  };

  // Draw preview with normalization
  useEffect(() => {
    if (!imageShape || !previewCanvasRef.current || !(imageShape as any).cachedPixels) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = imageShape.width;
    const height = imageShape.height;
    // Always preview from originalPixels if available, else cachedPixels
    const src = (imageShape.originalPixels || imageShape.cachedPixels) as Uint8ClampedArray;
    let normalized: Uint8ClampedArray = src;
    if (normalizationType === 'stretch') {
      normalized = histogramStretch(src, width, height);
    } else if (normalizationType === 'equalize') {
      normalized = histogramEqualize(src, width, height);
    }
    const previewImageData = ctx.createImageData(width, height);
    for (let i = 0; i < normalized.length; i++) {
      previewImageData.data[i] = normalized[i];
    }
    ctx.putImageData(previewImageData, 0, 0);
  }, [imageShape, normalizationType, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <i className="ri-equalizer-line text-indigo-400"></i>
            <span>Normalization</span>
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        {/* Top bar: dropdown + reset */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center">
            <label className="block text-sm font-medium text-zinc-300 mr-2">Normalization type:</label>
            <select
              value={normalizationType}
              onChange={e => setNormalizationType(e.target.value as NormalizationType)}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none border border-zinc-600 h-8"
              style={{ minWidth: 180 }}
            >
              <option value="none">None</option>
              <option value="stretch">Histogram Stretching</option>
              <option value="equalize">Histogram Equalization</option>
            </select>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 px-2 h-8 bg-zinc-700 text-zinc-100 rounded border border-zinc-600 hover:bg-zinc-600 transition-colors text-sm font-normal"
            onClick={handleReset}
            title="Reset normalization params"
          >
            <i className="ri-refresh-line"></i>
            Reset
          </button>
        </div>
        <div className="p-6 space-y-6">
          {imageShape && (imageShape as any).cachedPixels && (() => {
            // Compute normalized preview data (same as for preview)
            const width = imageShape.width;
            const height = imageShape.height;
            const src = (imageShape as any).cachedPixels as Uint8ClampedArray;
            let normalized: Uint8ClampedArray = src;
            if (normalizationType === 'stretch') {
              normalized = histogramStretch(src, width, height);
            } else if (normalizationType === 'equalize') {
              normalized = histogramEqualize(src, width, height);
            }
            // Helper for histogram rendering
            function renderHistogram(channel: 0 | 1 | 2, color: string, label: string) {
              return (
                <React.Fragment>
                  <canvas
                    width={270}
                    height={70}
                    style={{
                      width: 270,
                      height: 70,
                      borderRadius: 6,
                      border: '1px solid #444',
                      background: '#222',
                    }}
                    ref={el => {
                      if (el && normalized) {
                        const px = normalized;
                        // Build histogram for channel
                        const hist = new Array(256).fill(0);
                        for (let i = 0; i < px.length; i += 4) {
                          if (px[i+3] !== 0) hist[px[i+channel]]++;
                        }
                        const hmax = Math.max(...hist) || 1;
                        const ctx = el.getContext('2d');
                        if (ctx) {
                          ctx.clearRect(0, 0, 270, 70);
                          // Axes
                          ctx.save();
                          ctx.strokeStyle = '#aaa';
                          ctx.lineWidth = 1;
                          // Y axis
                          ctx.beginPath(); ctx.moveTo(35, 10); ctx.lineTo(35, 60); ctx.stroke();
                          // X axis
                          ctx.beginPath(); ctx.moveTo(35, 60); ctx.lineTo(260, 60); ctx.stroke();
                          ctx.fillStyle = '#aaa'; ctx.font = '10px sans-serif';
                          // X ticks/labels
                          for (let i = 0; i <= 4; i++) {
                            const x = 35 + (i * 56);
                            ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 64); ctx.stroke();
                            ctx.fillText(Math.round((i * 255) / 4).toString(), x - 8, 68);
                          }
                          // Y ticks/labels
                          for (let i = 0; i <= 4; i++) {
                            const y = 60 - (i * 12.5);
                            ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(38, y); ctx.stroke();
                            const val = Math.round(Math.exp((i / 4) * Math.log(1 + hmax)) - 1);
                            ctx.fillText(val.toString(), 2, y + 3);
                          }
                          ctx.restore();
                          // Draw histogram bars (log scale)
                          ctx.fillStyle = color;
                          for (let v = 0; v < 256; v++) {
                            const h = Math.round((Math.log(1 + hist[v]) / Math.log(1 + hmax)) * 45);
                            const x = 35 + Math.round((v / 255) * (260 - 35));
                            ctx.fillRect(x, 60 - h, 1, h);
                          }
                        }
                      }
                    }}
                  />
                  <div className={`text-xs mb-1 ${label === 'Red' ? 'text-red-400' : label === 'Green' ? 'text-green-400' : 'text-blue-400'}`}>{label}</div>
                </React.Fragment>
              );
            }
            return (
              <div className="flex flex-row items-start mb-4 gap-4">
                {/* Image preview */}
                <div className="flex flex-col items-center">
                  <canvas
                    ref={previewCanvasRef}
                    width={imageShape.width}
                    height={imageShape.height}
                    style={{
                      height: 282,
                      borderRadius: 8,
                      border: '1px solid #444',
                      background: '#222',
                      marginBottom: 8,
                      imageRendering: 'pixelated',
                    }}
                  />
                  <div className="text-xs text-zinc-400 mb-1">Image preview</div>
                </div>
                {/* Histograms: R, G, B stacked */}
                <div className="flex flex-col items-center gap-2">
                  {renderHistogram(0, 'rgba(255,0,0,0.7)', 'Red')}
                  {renderHistogram(1, 'rgba(0,255,0,0.7)', 'Green')}
                  {renderHistogram(2, 'rgba(0,128,255,0.7)', 'Blue')}
                </div>
              </div>
            );
          })()}
        </div>
        <form onSubmit={handleApply}>
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

export default NormalizationModal;
