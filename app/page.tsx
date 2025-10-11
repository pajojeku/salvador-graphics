'use client';

import StartScreen from '@/components/StartScreen';
import MobileWarning from '@/components/MobileWarning';

export default function Home() {
  return (
    <>
      <MobileWarning />
      <div className="h-screen bg-zinc-900 flex flex-col">
        <StartScreen />
      </div>
    </>
  );
}