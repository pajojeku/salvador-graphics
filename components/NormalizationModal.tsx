import React, { useState } from 'react';


type NormalizationType = 'none' | 'stretch' | 'equalize';

interface NormalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageShape: any; // ImageShape | null
}


const normalizationTypeLabels: Record<NormalizationType, string> = {
  none: 'None',
  stretch: 'Histogram Stretching',
  equalize: 'Histogram Equalization',
};

const NormalizationModal: React.FC<NormalizationModalProps> = ({ isOpen, onClose, imageShape }) => {
  const [normalizationType, setNormalizationType] = useState<NormalizationType>('none');

  // Reset handler
  const handleReset = () => {
    setNormalizationType('none');
    // Add more reset logic if needed
  };

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
          {imageShape && (imageShape as any).cachedPixels && (
            <div className="flex flex-row items-start mb-4 gap-4">
              {/* Image preview */}
              <div className="flex flex-col items-center">
                <canvas
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
                  ref={el => {
                    if (el && imageShape.cachedPixels) {
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        // Wyłącz wygładzanie (pixel-perfect)
                        ctx.imageSmoothingEnabled = false;
                        const imgData = ctx.createImageData(imageShape.width, imageShape.height);
                        for (let i = 0; i < imageShape.cachedPixels.length; i++) {
                          imgData.data[i] = imageShape.cachedPixels[i];
                        }
                        ctx.putImageData(imgData, 0, 0);
                      }
                    }
                  }}
                />
                <div className="text-xs text-zinc-400 mb-1">Image preview</div>
              </div>
              {/* Histograms: R, G, B stacked */}
              <div className="flex flex-col items-center gap-2">
                {/* Red */}
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
                    if (el && imageShape.cachedPixels) {
                      const px = imageShape.cachedPixels;
                      // Build histogram for R
                      const hist = new Array(256).fill(0);
                      for (let i = 0; i < px.length; i += 4) {
                        if (px[i+3] !== 0) hist[px[i]]++;
                      }
                      // Debug: log R histogram
                      console.log('R histogram:', hist);
                      // Logarytmiczne skalowanie
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
                          // Y axis labels in log scale
                          const val = Math.round(Math.exp((i / 4) * Math.log(1 + hmax)) - 1);
                          ctx.fillText(val.toString(), 2, y + 3);
                        }
                        ctx.restore();
                        // Draw histogram bars (log scale)
                        ctx.fillStyle = 'rgba(255,0,0,0.7)';
                        for (let v = 0; v < 256; v++) {
                          const h = Math.round((Math.log(1 + hist[v]) / Math.log(1 + hmax)) * 45);
                          const x = 35 + Math.round((v / 255) * (260 - 35));
                          ctx.fillRect(x, 60 - h, 1, h);
                        }
                      }
                    }
                  }}
                />
                <div className="text-xs text-red-400 mb-1">Red</div>
                {/* Green */}
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
                    if (el && imageShape.cachedPixels) {
                      const px = imageShape.cachedPixels;
                      // Build histogram for G
                      const hist = new Array(256).fill(0);
                      for (let i = 0; i < px.length; i += 4) {
                        if (px[i+3] !== 0) hist[px[i+1]]++;
                      }
                      // Debug: log G histogram
                      console.log('G histogram:', hist);
                      // Logarytmiczne skalowanie
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
                        // Draw histogram bars
                        ctx.fillStyle = 'rgba(0,255,0,0.7)';
                        for (let v = 0; v < 256; v++) {
                          const h = Math.round((Math.log(1 + hist[v]) / Math.log(1 + hmax)) * 45);
                          const x = 35 + Math.round((v / 255) * (260 - 35));
                          ctx.fillRect(x, 60 - h, 1, h);
                        }
                      }
                    }
                  }}
                />
                <div className="text-xs text-green-400 mb-1">Green</div>
                {/* Blue */}
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
                    if (el && imageShape.cachedPixels) {
                      const px = imageShape.cachedPixels;
                      // Build histogram for B
                      const hist = new Array(256).fill(0);
                      for (let i = 0; i < px.length; i += 4) {
                        if (px[i+3] !== 0) hist[px[i+2]]++;
                      }
                      // Debug: log B histogram
                      console.log('B histogram:', hist);
                      // Logarytmiczne skalowanie
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
                        // Draw histogram bars
                        ctx.fillStyle = 'rgba(0,128,255,0.7)';
                        for (let v = 0; v < 256; v++) {
                          const h = Math.round((Math.log(1 + hist[v]) / Math.log(1 + hmax)) * 45);
                          const x = 35 + Math.round((v / 255) * (260 - 35));
                          ctx.fillRect(x, 60 - h, 1, h);
                        }
                      }
                    }
                  }}
                />
                <div className="text-xs text-blue-400 mb-1">Blue</div>
              </div>
            </div>
          )}
          <div className="text-zinc-300 text-center">(Normalization controls here...)</div>
        </div>
        <div className="flex justify-end space-x-3 p-4 border-t border-zinc-700 bg-zinc-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NormalizationModal;
