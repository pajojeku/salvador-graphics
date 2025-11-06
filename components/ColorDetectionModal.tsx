import { useEffect, useRef, useState } from 'react';
import { ImageShape } from '@/lib/shapes/Image';
import ColorPickerModal from './ColorPickerModal';

interface ColorDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageShape?: ImageShape | null;
}

const ColorDetectionModal = ({
  isOpen,
  onClose,
  imageShape
}: ColorDetectionModalProps) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tolerance, setTolerance] = useState(30);
  const [colorPercentage, setColorPercentage] = useState(0);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Check if colors match within tolerance
  const colorMatches = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, tol: number): boolean => {
    const distance = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
    return distance <= tol;
  };

  // Draw preview with color detection
  useEffect(() => {
    if (!imageShape || !previewCanvasRef.current || !(imageShape as any).cachedPixels) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = imageShape.width;
    const height = imageShape.height;
    const src = (imageShape as any).cachedPixels as Uint8ClampedArray;
    if (!src) return;
    
    const targetRgb = hexToRgb(selectedColor);
    const previewImageData = ctx.createImageData(width, height);
    let matchingPixels = 0;
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      
      if (colorMatches(r, g, b, targetRgb.r, targetRgb.g, targetRgb.b, tolerance)) {
        // Matching pixel - show in white
        previewImageData.data[idx] = 255;
        previewImageData.data[idx + 1] = 255;
        previewImageData.data[idx + 2] = 255;
        previewImageData.data[idx + 3] = 255;
        matchingPixels++;
      } else {
        // Non-matching pixel - show in black
        previewImageData.data[idx] = 0;
        previewImageData.data[idx + 1] = 0;
        previewImageData.data[idx + 2] = 0;
        previewImageData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(previewImageData, 0, 0);
    setColorPercentage((matchingPixels / totalPixels) * 100);
  }, [imageShape, isOpen, selectedColor, tolerance]);

  // Draw original image
  useEffect(() => {
    if (!imageShape || !originalCanvasRef.current || !(imageShape as any).cachedPixels) return;
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = imageShape.width;
    const height = imageShape.height;
    const src = (imageShape as any).cachedPixels as Uint8ClampedArray;
    if (!src) return;
    
    const originalImageData = ctx.createImageData(width, height);
    for (let i = 0; i < src.length; i++) {
      originalImageData.data[i] = src[i];
    }
    ctx.putImageData(originalImageData, 0, 0);
  }, [imageShape, isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    onClose();
  };

  const handleColorClick = () => {
    setIsColorPickerOpen(true);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setIsColorPickerOpen(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageShape || !originalCanvasRef.current) return;

    const canvas = originalCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < imageShape.width && y >= 0 && y < imageShape.height) {
      const src = (imageShape as any).cachedPixels as Uint8ClampedArray;
      if (!src) return;
      
      const pixelIndex = (y * imageShape.width + x) * 4;
      const r = src[pixelIndex];
      const g = src[pixelIndex + 1];
      const b = src[pixelIndex + 2];
      
      // Convert RGB to hex
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      setSelectedColor(hex);
    }
  };

  const targetRgb = hexToRgb(selectedColor);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleCancel}>
        <div className="bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <i className="ri-eye-line text-indigo-400"></i>
              <span>Color Detection</span>
            </h2>
            <button type="button" onClick={handleCancel} className="text-zinc-400 hover:text-white transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="p-6 space-y-6">
            {/* Color Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-zinc-300">Target Color:</label>
              <button
                onClick={handleColorClick}
                className="w-20 h-10 rounded border-2 border-zinc-600 hover:border-zinc-500 transition-colors cursor-pointer"
                style={{ backgroundColor: selectedColor }}
                title="Click to change color"
              />
              <span className="text-sm text-zinc-400">{selectedColor.toUpperCase()}</span>
            </div>

            {/* Tolerance Slider */}
            <div className="flex items-center space-x-2">
              <label className="block text-sm font-medium text-zinc-300 w-32">Tolerance</label>
              <input
                type="range"
                min={0}
                max={255}
                value={tolerance}
                onChange={e => setTolerance(Number(e.target.value))}
                className="w-full ml-2 bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                min={0}
                max={255}
                value={tolerance}
                onChange={e => setTolerance(Number(e.target.value))}
                className="w-16 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-right focus:outline-none"
              />
              <span className="text-xs text-zinc-400 w-16 text-center">{tolerance}</span>
            </div>

            {imageShape && (imageShape as any).cachedPixels && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Original Image */}
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-400 mb-3">Click on the image to pick a color</p>
                  <canvas
                    ref={originalCanvasRef}
                    width={imageShape.width}
                    height={imageShape.height}
                    onClick={handleCanvasClick}
                    style={{
                      height: 240,
                      borderRadius: 8,
                      border: '1px solid #444',
                      background: '#222',
                      marginBottom: 8,
                      cursor: 'crosshair'
                    }}
                  />
                  <div className="text-xs text-zinc-400 mb-1">Original image</div>
                </div>

                {/* Detection Preview */}
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-400 mb-3">White = matching, Black = not matching</p>
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
                  <div className="text-xs text-zinc-400 mb-1">Detection preview</div>
                </div>
              </div>
            )}

            {/* Color Statistics */}
            <div className="bg-zinc-900 rounded border border-zinc-700 p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Detection Results</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Color Coverage:</span>
                  <span className="text-lg font-semibold text-indigo-400">{colorPercentage.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded h-4">
                  <div
                    className="bg-indigo-500 h-4 rounded transition-all duration-300"
                    style={{ width: `${Math.min(colorPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="pt-2 border-t border-zinc-700 mt-3">
                  <div className="text-xs text-zinc-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Target RGB:</span>
                      <span>({targetRgb.r}, {targetRgb.g}, {targetRgb.b})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tolerance:</span>
                      <span>{tolerance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-4 border-t border-zinc-700 bg-zinc-900/30">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        initialColor={selectedColor}
        onColorSelect={handleColorSelect}
      />
    </>
  );
}

export default ColorDetectionModal;
