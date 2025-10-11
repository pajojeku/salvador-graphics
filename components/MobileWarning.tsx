
'use client';

import { useState, useEffect } from 'react';

export default function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsLoading(false);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isLoading) {
    return null;
  }

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-zinc-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mb-8">
          <i className="ri-computer-line text-6xl text-blue-400 mb-4"></i>
          <h1 className="text-2xl font-bold text-white mb-4">Salvador</h1>
          <p className="text-zinc-300 mb-6">
            Profesjonalny edytor graficzny inspirowany Photoshopem
          </p>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <i className="ri-smartphone-line text-4xl text-orange-400 mb-4"></i>
          <h2 className="text-xl font-semibold text-white mb-3">
            Użyj komputera dla najlepszego doświadczenia
          </h2>
          <p className="text-zinc-400 mb-4">
            Salvador został zaprojektowany do pracy na komputerach stacjonarnych i laptopach. 
            Dla pełnej funkcjonalności i wygody użytkowania, prosimy o przejście na urządzenie z większym ekranem.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-zinc-500">
            <div className="flex items-center">
              <i className="ri-computer-line mr-1"></i>
              <span>Desktop</span>
            </div>
            <div className="flex items-center">
              <i className="ri-laptop-line mr-1"></i>
              <span>Laptop</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-zinc-500">
          <p>Minimalna rozdzielczość: 1024px szerokości</p>
        </div>
      </div>
    </div>
  );
}