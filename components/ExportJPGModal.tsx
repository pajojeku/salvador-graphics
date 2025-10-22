'use client';

import { useState, useEffect } from 'react';

interface ExportJPGModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (quality: number) => void;
  projectName?: string;
}

export default function ExportJPGModal({ isOpen, onClose, onExport, projectName }: ExportJPGModalProps) {
  const [quality, setQuality] = useState(92);
  const [previewQuality, setPreviewQuality] = useState(92);

  useEffect(() => {
    if (isOpen) {
      setQuality(92);
      setPreviewQuality(92);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(quality / 100);
    onClose();
  };

  const handleQualityChange = (value: number) => {
    setQuality(value);
  };

  const handleQualityCommit = () => {
    setPreviewQuality(quality);
  };

  const getQualityLabel = () => {
    if (quality >= 90) return 'Najwyższa';
    if (quality >= 80) return 'Wysoka';
    if (quality >= 70) return 'Średnia';
    if (quality >= 50) return 'Niska';
    return 'Bardzo niska';
  };

  const getEstimatedSize = () => {
    // Przybliżone oszacowanie rozmiaru w zależności od jakości
    const baseSize = 100; // KB dla jakości 100%
    const estimatedSize = Math.round((baseSize * quality) / 100);
    return estimatedSize;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <i className="ri-image-line text-indigo-400"></i>
            <span>Eksportuj do JPG</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* File info */}
            {projectName && (
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="text-xs text-zinc-400 mb-1">Nazwa pliku:</div>
                <div className="text-sm text-white font-medium">{projectName}.jpg</div>
              </div>
            )}

            {/* Quality slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-zinc-300">
                  Jakość kompresji
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-zinc-500">{getQualityLabel()}</span>
                  <span className="text-sm font-semibold text-indigo-400">{quality}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={quality}
                  onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                  onMouseUp={handleQualityCommit}
                  onTouchEnd={handleQualityCommit}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((quality - 10) / 90) * 100}%, #3f3f46 ${((quality - 10) / 90) * 100}%, #3f3f46 100%)`
                  }}
                />
                
                {/* Quality markers */}
                <div className="flex justify-between text-xs text-zinc-500 px-1">
                  <span>10%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>


            {/* Quick presets */}
            <div>
              <div className="text-xs text-zinc-400 mb-2">Szybkie ustawienia:</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Max', value: 100 },
                  { label: 'Wysoka', value: 90 },
                  { label: 'Średnia', value: 75 },
                  { label: 'Web', value: 60 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setQuality(preset.value);
                      setPreviewQuality(preset.value);
                    }}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                      quality === preset.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 border-t border-zinc-700 bg-zinc-900/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded font-medium transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <i className="ri-download-line"></i>
              <span>Eksportuj JPG</span>
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border: 2px solid #6366f1;
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border: 2px solid #6366f1;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
