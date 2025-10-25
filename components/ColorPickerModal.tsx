'use client';

import { useState, useEffect, useRef } from 'react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor: string;
  onColorSelect: (color: string) => void;
}

type ColorMode = 'rgb' | 'cmyk';

export default function ColorPickerModal({ isOpen, onClose, initialColor, onColorSelect }: ColorPickerModalProps) {
  const [mode, setMode] = useState<ColorMode>('rgb');
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [m, setM] = useState(0);
  const [y, setY] = useState(0);
  const [k, setK] = useState(0);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [hexInput, setHexInput] = useState('#000000');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert hex -> RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Convert RGB -> Hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Convert RGB -> CMYK
  const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }
    
    const c = (1 - rNorm - k) / (1 - k);
    const m = (1 - gNorm - k) / (1 - k);
    const y = (1 - bNorm - k) / (1 - k);
    
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  };

  // Convert CMYK -> RGB
  const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
    const cNorm = c / 100;
    const mNorm = m / 100;
    const yNorm = y / 100;
    const kNorm = k / 100;
    
    const r = 255 * (1 - cNorm) * (1 - kNorm);
    const g = 255 * (1 - mNorm) * (1 - kNorm);
    const b = 255 * (1 - yNorm) * (1 - kNorm);
    
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b)
    };
  };

  // Convert RGB -> HSV (for color picker)
  const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === rNorm) {
        h = ((gNorm - bNorm) / delta) % 6;
      } else if (max === gNorm) {
        h = (bNorm - rNorm) / delta + 2;
      } else {
        h = (rNorm - gNorm) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }
    
    const s = max === 0 ? 0 : (delta / max) * 100;
    const v = max * 100;
    
    return { h, s, v };
  };

  // Convert HSV -> RGB
  const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
    const sNorm = s / 100;
    const vNorm = v / 100;
    
    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vNorm - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  // Initialize from initial color
  useEffect(() => {
    if (isOpen) {
      const rgb = hexToRgb(initialColor);
      setR(rgb.r);
      setG(rgb.g);
      setB(rgb.b);
      
      const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
      setC(cmyk.c);
      setM(cmyk.m);
      setY(cmyk.y);
      setK(cmyk.k);
      
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      
      setHexInput(initialColor);
    }
  }, [isOpen, initialColor]);

  // Update color when RGB changes
  const updateFromRgb = (newR: number, newG: number, newB: number) => {
    setR(newR);
    setG(newG);
    setB(newB);
    
    const cmyk = rgbToCmyk(newR, newG, newB);
    setC(cmyk.c);
    setM(cmyk.m);
    setY(cmyk.y);
    setK(cmyk.k);
    
    const hsv = rgbToHsv(newR, newG, newB);
    setHue(hsv.h);
    setSaturation(hsv.s);
    
    const hex = rgbToHex(newR, newG, newB);
    setHexInput(hex);
  };

  // Update color when CMYK changes
  const updateFromCmyk = (newC: number, newM: number, newY: number, newK: number) => {
    setC(newC);
    setM(newM);
    setY(newY);
    setK(newK);
    
    const rgb = cmykToRgb(newC, newM, newY, newK);
    setR(rgb.r);
    setG(rgb.g);
    setB(rgb.b);
    
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h);
    setSaturation(hsv.s);
    
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
  };

  // Draw color picker canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Background - gradient from white (top) to black (bottom)
    const vertGrad = ctx.createLinearGradient(0, 0, 0, height);
    vertGrad.addColorStop(0, 'white');
    vertGrad.addColorStop(1, 'black');
    
    // Base color based on hue
    const baseColor = hsvToRgb(hue, 100, 100);
    
    // Horizontal gradient from white to base color
    const horzGrad = ctx.createLinearGradient(0, 0, width, 0);
    horzGrad.addColorStop(0, 'white');
    horzGrad.addColorStop(1, `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
    
    // Draw horizontal gradient
    ctx.fillStyle = horzGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Vertical overlay for darkness
    ctx.fillStyle = vertGrad;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw indicator (+) of currently selected color
    const hsv = rgbToHsv(r, g, b);
    const x = (hsv.s / 100) * width;
    const y = (1 - hsv.v / 100) * height;
    
    const size = 6;
    
    // White border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    
    // Black plus on top
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    
  }, [hue, r, g, b]);

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const s = (x / rect.width) * 100;
    const v = 100 - (y / rect.height) * 100;
    
    setSaturation(s);
    
    const rgb = hsvToRgb(hue, s, v);
    updateFromRgb(rgb.r, rgb.g, rgb.b);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onColorSelect(hexInput);
    onClose();
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const rgb = hexToRgb(value);
      updateFromRgb(rgb.r, rgb.g, rgb.b);
    }
  };

  if (!isOpen) return null;

  const currentHex = rgbToHex(r, g, b);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <i className="ri-palette-line text-indigo-400"></i>
            <span>Color Picker</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Color preview */}
              <div className="flex items-center space-x-3">
                <div 
                  className="w-16 h-16 rounded-lg border-2 border-zinc-600 shadow-lg"
                  style={{ backgroundColor: currentHex }}
                />
                <div className="flex-1">
                  <div className="text-sm text-zinc-400 mb-1">Color Preview</div>
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexChange(e.target.value)}
                    className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* 2D Color picker */}
              <div>
                <div className="text-sm text-zinc-300 mb-2">Select Color</div>
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={200}
                  className="w-full h-48 rounded-lg border border-zinc-600 cursor-crosshair"
                  onClick={handleCanvasClick}
                />
              </div>

              {/* Hue slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-300">Hue</span>
                  <span className="text-sm text-zinc-500">{hue}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={hue}
                  onChange={(e) => {
                    const newHue = parseInt(e.target.value);
                    setHue(newHue);
                    const rgb = hsvToRgb(newHue, saturation, rgbToHsv(r, g, b).v);
                    updateFromRgb(rgb.r, rgb.g, rgb.b);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                  }}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMode('rgb')}
                  className={`mt-7 flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    mode === 'rgb'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  RGB
                </button>
                <button
                  type="button"
                  onClick={() => setMode('cmyk')}
                  className={`mt-7 flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    mode === 'cmyk'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  CMYK
                </button>
              </div>

              {/* RGB/CMYK Sliders */}
              {mode === 'rgb' ? (
                <div className="space-y-3">
                {/* Red */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Red</span>
                    <span className="text-sm text-zinc-500">{r}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={r}
                    onChange={(e) => updateFromRgb(parseInt(e.target.value), g, b)}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-red"
                    style={{
                      background: `linear-gradient(to right, #000000 0%, #ff0000 100%)`
                    }}
                  />
                </div>

                {/* Green */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Green</span>
                    <span className="text-sm text-zinc-500">{g}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={g}
                    onChange={(e) => updateFromRgb(r, parseInt(e.target.value), b)}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-green"
                    style={{
                      background: `linear-gradient(to right, #000000 0%, #00ff00 100%)`
                    }}
                  />
                </div>

                {/* Blue */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Blue</span>
                    <span className="text-sm text-zinc-500">{b}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={b}
                    onChange={(e) => updateFromRgb(r, g, parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-blue"
                    style={{
                      background: `linear-gradient(to right, #000000 0%, #0000ff 100%)`
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Cyan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Cyan</span>
                    <span className="text-sm text-zinc-500">{c}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={c}
                    onChange={(e) => updateFromCmyk(parseInt(e.target.value), m, y, k)}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-cyan"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #00ffff 100%)`
                    }}
                  />
                </div>

                {/* Magenta */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Magenta</span>
                    <span className="text-sm text-zinc-500">{m}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={m}
                    onChange={(e) => updateFromCmyk(c, parseInt(e.target.value), y, k)}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-magenta"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ff00ff 100%)`
                    }}
                  />
                </div>

                {/* Yellow */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Yellow</span>
                    <span className="text-sm text-zinc-500">{y}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={y}
                    onChange={(e) => updateFromCmyk(c, m, parseInt(e.target.value), k)}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-yellow"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffff00 100%)`
                    }}
                  />
                </div>

                {/* Key (Black) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">Key (Black)</span>
                    <span className="text-sm text-zinc-500">{k}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={k}
                    onChange={(e) => updateFromCmyk(c, m, y, parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-black"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #000000 100%)`
                    }}
                  />
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 border-t border-zinc-700 bg-zinc-900/30">
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
              <i className="ri-check-line"></i>
              <span>Choose</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
