import React from 'react';

export default function WorkspaceLoading() {
  return (
    <div className="h-screen w-screen bg-[#000000] flex flex-col items-center justify-center space-y-4 select-none">
      <div className="flex items-center space-x-0.5">
        <span className="font-inconsolata font-black text-3xl tracking-tighter text-white">fri</span>
        <span className="w-2 h-2 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD] mt-1" />
      </div>
      <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-zinc-300 animate-spin" />
    </div>
  );
}
