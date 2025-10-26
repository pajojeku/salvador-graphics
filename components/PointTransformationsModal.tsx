import { useState, useEffect, useRef } from 'react';
import { ImageShape } from '@/lib/shapes/Image';

interface PointTransformationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brightness: number;
  red: number;
  green: number;
  blue: number;
  mode: 'normal' | 'multiply';
  onChange: (values: { brightness: number; red: number; green: number; blue: number }) => void;
  onModeChange: (mode: 'normal' | 'multiply') => void;
  onApply?: () => void;
  onCancel?: () => void;
  imageShape?: ImageShape | null;
}

type Mode = 'normal' | 'multiply';

export default function PointTransformationsModal({ isOpen, onClose, brightness: initialBrightness, red: initialRed, green: initialGreen, blue: initialBlue, mode: initialMode, onChange, onModeChange, onApply, onCancel, imageShape }: PointTransformationsModalProps) {
  const [brightness, setBrightness] = useState(initialBrightness);
  const [red, setRed] = useState(initialRed);
  const [green, setGreen] = useState(initialGreen);
  const [blue, setBlue] = useState(initialBlue);
  const [mode, setMode] = useState<Mode>(initialMode);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setBrightness(initialBrightness);
    setRed(initialRed);
    setGreen(initialGreen);
    setBlue(initialBlue);
  }, [initialBrightness, initialRed, initialGreen, initialBlue, isOpen]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

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
    for (let i = 0; i < src.length; i += 4) {
      let r = src[i];
      let g = src[i + 1];
      let b = src[i + 2];
      let a = src[i + 3];
      if (mode === 'normal') {
        r = Math.max(0, Math.min(255, r + Math.round((red / 100) * 255)));
        g = Math.max(0, Math.min(255, g + Math.round((green / 100) * 255)));
        b = Math.max(0, Math.min(255, b + Math.round((blue / 100) * 255)));
        if (brightness !== 0) {
          r = Math.max(0, Math.min(255, r + Math.round((brightness / 100) * 255)));
          g = Math.max(0, Math.min(255, g + Math.round((brightness / 100) * 255)));
          b = Math.max(0, Math.min(255, b + Math.round((brightness / 100) * 255)));
        }
      } else if (mode === 'multiply') {
        // Each channel is multiplied by its slider value (0.1–5), brightness is also a multiplier
        let rMult = red || 1;
        let gMult = green || 1;
        let bMult = blue || 1;
        let brightMult = brightness || 1;
        r = Math.max(0, Math.min(255, r * rMult * brightMult));
        g = Math.max(0, Math.min(255, g * gMult * brightMult));
        b = Math.max(0, Math.min(255, b * bMult * brightMult));
      }
      previewImageData.data[i] = r;
      previewImageData.data[i + 1] = g;
      previewImageData.data[i + 2] = b;
      previewImageData.data[i + 3] = a;
    }
    ctx.putImageData(previewImageData, 0, 0);
  }, [brightness, red, green, blue, imageShape, isOpen, mode]);

  if (!isOpen) return null;

  // Zmiany natychmiastowe, Apply zapisuje, Cancel odrzuca
  const handleSlider = (setter: (v: number) => void, value: number, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = parseInt(e.target.value);
    setter(v);
    onChange({
      brightness: field === 'brightness' ? v : brightness,
      red: field === 'red' ? v : red,
      green: field === 'green' ? v : green,
      blue: field === 'blue' ? v : blue,
    });
  };

  // Pole liczbowo: -255 do 255, przelicza na procenty i ustawia slider
  const handleNumber = (setter: (v: number) => void, min: number, max: number, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = parseInt(e.target.value);
    if (isNaN(v)) v = 0;
    if (v < min) v = min;
    if (v > max) v = max;
    // Przelicz na procenty względem 255
    let percent = Math.round((v / 255) * 100);
    setter(percent);
    onChange({
      brightness: field === 'brightness' ? percent : brightness,
      red: field === 'red' ? percent : red,
      green: field === 'green' ? percent : green,
      blue: field === 'blue' ? percent : blue,
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setBrightness(initialBrightness);
      setRed(initialRed);
      setGreen(initialGreen);
      setBlue(initialBlue);
      setMode(initialMode);
      onChange({ brightness: initialBrightness, red: initialRed, green: initialGreen, blue: initialBlue });
      onModeChange(initialMode);
      onClose();
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (onApply) {
      onApply();
    } else {
      onChange({ brightness, red, green, blue });
      onModeChange(mode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleCancel}>
      <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleApply}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <i className="ri-settings-3-line text-indigo-400"></i>
              <span>Point Transformations</span>
            </h2>
            <button type="button" onClick={handleCancel} className="text-zinc-400 hover:text-white transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center mb-4 justify-between">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-zinc-300 mr-2">Mode:</label>
                <select
                  value={mode}
                  onChange={e => {
                    setMode(e.target.value as Mode);
                    onModeChange(e.target.value as Mode);
                  }}
                  className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none border border-zinc-600 h-8"
                  style={{ minWidth: 90 }}
                >
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply</option>
                </select>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 px-2 h-8 bg-zinc-700 text-zinc-100 rounded border border-zinc-600 hover:bg-zinc-600 transition-colors text-sm font-normal"
                onClick={() => {
                  setBrightness(0);
                  setRed(0);
                  setGreen(0);
                  setBlue(0);
                  setMode('normal');
                  onChange({ brightness: 0, red: 0, green: 0, blue: 0 });
                  onModeChange('normal');
                }}
                title="Reset all adjustments"
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
            {([
              ['Brightness', brightness, setBrightness, 'brightness'],
              ['Red', red, setRed, 'red'],
              ['Green', green, setGreen, 'green'],
              ['Blue', blue, setBlue, 'blue'],
            ] as [string, number, (v: number) => void, string][]).map(([label, value, setter, field]) => {
              // For multiply mode, value is a multiplier (0.1–5), for normal it's percent (-100–100)
              const isMultiply = mode === 'multiply';
              return (
                <div key={label} className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-zinc-300 w-32">{label}</label>
                  <input
                    type="range"
                    min={isMultiply ? 0.1 : -100}
                    max={isMultiply ? 5 : 100}
                    step={isMultiply ? 0.01 : 1}
                    value={isMultiply ? (value === 0 ? 1 : value) : value}
                    onChange={e => {
                      let v = parseFloat(e.target.value);
                      if (isMultiply) {
                        setter(v);
                        onChange({
                          brightness: field === 'brightness' ? v : brightness,
                          red: field === 'red' ? v : red,
                          green: field === 'green' ? v : green,
                          blue: field === 'blue' ? v : blue,
                        });
                      } else {
                        handleSlider(setter, value, field)(e as any);
                      }
                    }}
                    className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    min={isMultiply ? 0.1 : -255}
                    max={isMultiply ? 5 : 255}
                    step={isMultiply ? 0.01 : 1}
                    value={isMultiply ? (value === 0 ? 1 : value) : Math.round((value / 100) * 255)}
                    onChange={e => {
                      let v = parseFloat(e.target.value);
                      if (isMultiply) {
                        if (isNaN(v)) v = 1;
                        if (v < 0.1) v = 0.1;
                        if (v > 5) v = 5;
                        setter(v);
                        onChange({
                          brightness: field === 'brightness' ? v : brightness,
                          red: field === 'red' ? v : red,
                          green: field === 'green' ? v : green,
                          blue: field === 'blue' ? v : blue,
                        });
                      } else {
                        handleNumber(setter, -255, 255, field)(e as any);
                      }
                    }}
                    className="w-12 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400 w-16 text-center">
                    {isMultiply ? `${value === 0 ? 1 : value}×` : `${value}%`}
                  </span>
                </div>
              );
            })}
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