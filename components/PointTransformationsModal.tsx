import { useState } from 'react';

interface PointTransformationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (values: { brightness: number; red: number; green: number; blue: number }) => void;
}

export default function PointTransformationsModal({ isOpen, onClose, onApply }: PointTransformationsModalProps) {
  const [brightness, setBrightness] = useState(0);
  const [red, setRed] = useState(0);
  const [green, setGreen] = useState(0);
  const [blue, setBlue] = useState(0);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ brightness, red, green, blue });
    onClose();
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
            <i className="ri-settings-3-line text-indigo-400"></i>
            <span>Point Transformations</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={(e) => { e.preventDefault(); handleApply(); }}>
          <div className="p-6 space-y-6">
            {/* Brightness Slider */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Brightness</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Red Slider */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Red</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={red}
                onChange={(e) => setRed(parseInt(e.target.value))}
                className="w-full bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Green Slider */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Green</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={green}
                onChange={(e) => setGreen(parseInt(e.target.value))}
                className="w-full bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Blue Slider */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Blue</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={blue}
                onChange={(e) => setBlue(parseInt(e.target.value))}
                className="w-full bg-zinc-700 rounded-lg appearance-none h-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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
              <span>Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}