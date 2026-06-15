import { useState } from "react";
import { HelpCircle, X, Move3d } from "lucide-react";

export default function InstructionsOverlay() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 backdrop-blur-md text-emerald-400 shadow-lg cursor-pointer transition-all duration-200"
        title="Open User Guide"
        id="open-guide-btn"
      >
        <HelpCircle size={22} />
      </button>
    );
  }

  return (
    <div className="absolute inset-x-4 top-4 md:right-4 md:left-auto md:w-96 z-30 p-5 rounded-2xl bg-slate-950/95 border border-slate-800/80 shadow-2xl backdrop-blur-xl text-sm" id="instructions-guide">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-sans font-semibold text-slate-100 tracking-tight flex items-center gap-x-2">
          <Move3d className="text-emerald-400" size={18} />
          3D VR Painter Guide & Presets
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
          id="close-guide-btn"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3.5 text-slate-300 font-sans text-xs leading-relaxed">
        <p>
          Welcome to an immersive full 3D/VR sandbox canvas. You can sketch, drag, slide and animate creations inside five interactive visual dimensions!
        </p>

        <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg space-y-1.5 font-mono">
          <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-y-1">
            🎮 Control Setup
          </div>
          <p>✍️ <strong className="text-white">Draw:</strong> Left-click & drag anywhere within the canvas depth plane.</p>
          <p>🎥 <strong className="text-white">Rotate Scene:</strong> Shift + Drag OR Right-click dragging anywhere.</p>
          <p>📐 <strong className="text-white">Change Depth:</strong> Slide the paint distance slider to sketch closer or further away!</p>
        </div>
      </div>
    </div>
  );
}
