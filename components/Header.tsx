'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  projectName?: string;
  onExportPNG?: () => void;
  onSaveProject?: () => void;
  onLoadProject?: () => void;
}

export default function Header({ projectName, onExportPNG, onSaveProject, onLoadProject }: HeaderProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = [
    { name: 'Salvador', icon: 'ri-home-line', isHome: true, logo: '/icon.png' },
    { name: 'File', hasDropdown: true },
    { name: 'Edit', hasDropdown: true },
  ];

  const handleExportPNG = () => {
    setActiveMenu(null);
    onExportPNG?.();
  };

  const handleSaveProject = () => {
    setActiveMenu(null);
    onSaveProject?.();
  };

  const handleLoadProject = () => {
    setActiveMenu(null);
    onLoadProject?.();
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
    </div>
  );
}