import { useEffect } from 'react';
import { ImageShape } from '@/lib/shapes/Image';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
  onCancel?: () => void;
  imageShape?: ImageShape | null;
}

export default function FiltersModal({ isOpen, onClose, onApply, onCancel, imageShape }: FiltersModalProps) {
  useEffect(() => {
    // Placeholder for future filter logic
  }, [isOpen, imageShape]);

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
          <div className="p-6 space-y-6 min-h-[120px] flex items-center justify-center text-zinc-400">
            <span className="text-zinc-500 text-center w-full">(No filters yet)</span>
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
