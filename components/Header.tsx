

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  projectName?: string;
  onExportPNG?: () => void;
  onExportJPG?: () => void;
  onSaveProject?: () => void;
  onLoadProject?: () => void;
}

export default function Header({ projectName, onExportPNG, onExportJPG, onSaveProject, onLoadProject }: HeaderProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleBinarization = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openBinarizationModal');
      window.dispatchEvent(event);
    }
    setActiveMenu(null);
  };

  const menuItems = [
    { name: 'Salvador', icon: 'ri-home-line', isHome: true, logo: '/icon.png' },
    { name: 'File', hasDropdown: true },
    { name: 'Image', hasDropdown: true },
  ];

  const handleExportPNG = () => {
    setActiveMenu(null);
    onExportPNG?.();
  };

  const handleExportJPG = () => {
    setActiveMenu(null);
    onExportJPG?.();
  };

  const handleSaveProject = () => {
    setActiveMenu(null);
    onSaveProject?.();
  };

  const handleLoadProject = () => {
    setActiveMenu(null);
    onLoadProject?.();
  };

  const handlePointTransformations = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openPointTransformationsModal');
      window.dispatchEvent(event);
    }
    setActiveMenu(null);
  };


  const handleNormalization = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openNormalizationModal');
      window.dispatchEvent(event);
    }
    setActiveMenu(null);
  };

  const handleFilters = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openFiltersModal');
      window.dispatchEvent(event);
    }
    setActiveMenu(null);
  };

  const handleMorphology = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openMorphologyModal');
      window.dispatchEvent(event);
    }
    setActiveMenu(null);
  };

  const handleColorDetection = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openColorDetectionModal');
      window.dispatchEvent(event);
    }
    setActiveMenu(null);
  };

  return (
    <div className="bg-zinc-900 border-b border-zinc-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {menuItems.map((item) => (
            <div key={item.name} className="relative">
              {item.isHome ? (
                <Link href="/">
                  <button className="flex font-bold items-center space-x-2 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700 rounded whitespace-nowrap cursor-pointer">
                    {item.logo && <img src={item.logo} alt="Salvador" className="w-5 h-5" />}
                    <span>{item.name}</span>
                  </button>
                </Link>
              ) : (
                <>
                  <button
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700 rounded whitespace-nowrap cursor-pointer"
                    onClick={() => item.hasDropdown && setActiveMenu(item.name)}
                    
                  >
                    {item.icon && <i className={`${item.icon} text-zinc-400`}></i>}
                    <span>{item.name}</span>
                    {item.hasDropdown && <i className="ri-arrow-down-s-line text-xs"></i>}
                  </button>

                  {/* Dropdown menu for File */}
                  {item.name === 'File' && activeMenu === 'File' && (
                    <div 
                      className="absolute left-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg py-1 min-w-[180px] z-50"
                      onMouseEnter={() => setActiveMenu('File')}
                      onMouseLeave={() => setActiveMenu(null)}
                    >
                      <button
                        onClick={handleSaveProject}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-save-line"></i>
                        <span>Save project</span>
                      </button>
                      <button
                        onClick={handleLoadProject}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-folder-open-line"></i>
                        <span>Load project</span>
                      </button>
                      <div className="border-t border-zinc-700 my-1"></div>
                      <button
                        onClick={handleExportPNG}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-download-line"></i>
                        <span>Export to PNG</span>
                      </button>
                      <button
                        onClick={handleExportJPG}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-image-line"></i>
                        <span>Export to JPG</span>
                      </button>
                    </div>
                  )}

                  {/* Dropdown menu for Image */}
                  {item.name === 'Image' && activeMenu === 'Image' && (
                    <div 
                      className="absolute left-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg py-1 min-w-[180px] z-50"
                      onMouseEnter={() => setActiveMenu('Image')}
                      onMouseLeave={() => setActiveMenu(null)}
                    >
                      <button
                        onClick={handlePointTransformations}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-color-filter-line"></i>
                        <span>Point Transformations</span>
                      </button>
                      <button
                        onClick={handleFilters}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-magic-line"></i>
                        <span>Filters</span>
                      </button>
                      <button
                        onClick={handleNormalization}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-equalizer-line"></i>
                        <span>Normalization</span>
                      </button>
                      <button
                        onClick={handleBinarization}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-contrast-2-line"></i>
                        <span>Binarization</span>
                      </button>
                      <button
                        onClick={handleMorphology}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-shape-line"></i>
                        <span>Morphological Filters</span>
                      </button>
                      <button
                        onClick={handleColorDetection}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center space-x-2 cursor-pointer"
                      >
                        <i className="ri-eye-line"></i>
                        <span>Color Detection</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-6">
          {projectName && (
            <div className="text-sm mx-3 text-zinc-300">
              {projectName}
            </div>
          )}

        </div>
      </div>

  {/* PointTransformationsModal is managed in the main page, not here */}
    </div>
  );
}