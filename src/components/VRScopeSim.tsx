import React, { useState, useRef, useEffect } from "react";
import { Maximize, Rotate3d, HelpCircle, Gamepad, BatteryCharging } from "lucide-react";

interface VRScopeSimProps {
  vrMode: boolean;
  setVrMode: (mode: boolean) => void;
  simulatedTilt: { x: number; y: number };
  setSimulatedTilt: (tilt: { x: number; y: number }) => void;
  setSelectedTool: (tool: "brush" | "magnet" | "eraser" | "boids") => void;
  selectedTool: "brush" | "magnet" | "eraser" | "boids";
}

export default function VRScopeSim({
  vrMode,
  setVrMode,
  simulatedTilt,
  setSimulatedTilt,
  setSelectedTool,
  selectedTool,
}: VRScopeSimProps) {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const trackpadRef = useRef<HTMLDivElement>(null);
  const dragActiveRef = useRef(false);

  // Mouse tilt tracking over the trackpad area
  const handleTrackpadPointerDown = (e: React.PointerEvent) => {
    dragActiveRef.current = true;
    updateTilt(e);
  };

  const handleTrackpadPointerMove = (e: any) => {
    if (!dragActiveRef.current) return;
    updateTilt(e);
  };

  const handleTrackpadPointerUp = () => {
    dragActiveRef.current = false;
  };

  const updateTilt = (e: React.PointerEvent | MouseEvent) => {
    const rect = trackpadRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Normalize coordinates to range [-1, 1] relative to center
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    setSimulatedTilt({
      x: Math.max(-1.5, Math.min(1.5, dx)),
      y: Math.max(-1.5, Math.min(1.5, -dy)), // flip y to align with standard pitch
    });
  };

  const handleCenteredRecenter = () => {
    setIsCalibrating(true);
    setSimulatedTilt({ x: 0, y: 0 });
    setTimeout(() => setIsCalibrating(false), 800);
  };

  // Keyboard shortcut keys to steer head look as secondary accessibility options
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 0.15;
      if (e.key === "ArrowLeft" || e.key === "a") {
        setSimulatedTilt({ ...simulatedTilt, x: Math.max(-1.5, simulatedTilt.x - step) });
      } else if (e.key === "ArrowRight" || e.key === "d") {
        setSimulatedTilt({ ...simulatedTilt, x: Math.min(1.5, simulatedTilt.x + step) });
      } else if (e.key === "ArrowUp" || e.key === "w") {
        setSimulatedTilt({ ...simulatedTilt, y: Math.min(1.5, simulatedTilt.y + step) });
      } else if (e.key === "ArrowDown" || e.key === "s") {
        setSimulatedTilt({ ...simulatedTilt, y: Math.max(-1.5, simulatedTilt.y - step) });
      } else if (e.key === "R" || e.key === "r") {
        handleCenteredRecenter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [simulatedTilt]);

  return (
    <div className="absolute top-20 right-6 z-20 flex flex-col gap-y-2 opacity-95 select-none" id="vr-scope-sim-container">
      {/* Scope Sim Dashboard Header Tag */}
      <div className="p-3.5 rounded-2xl bg-[#0c0c12]/90 border border-white/10 backdrop-blur-md text-xs w-64 space-y-3.5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <div className="flex items-center gap-x-1.5 font-sans font-bold text-slate-100 uppercase tracking-widest text-[9px]">
            <Rotate3d size={13} className="text-cyan-400 animate-pulse" />
            Head-Look Visor Sim
          </div>
          <div className="flex items-center gap-x-2 font-mono text-[9px] text-white/40">
            <span className="flex items-center gap-0.5 text-cyan-400">
              <BatteryCharging size={10} /> 94%
            </span>
            <span className="flex items-center gap-0.5 text-purple-400">
              <Gamepad size={10} /> Connected
            </span>
          </div>
        </div>

        {/* Live trackpad analogue looking joystick simulation */}
        <div className="space-y-2 text-center">
          <div className="text-[10px] text-white/50 leading-tight">
            Drag the tracker joystick or press <kbd className="px-1 text-white bg-white/10 rounded font-mono text-[9px]">WASD</kbd> to steer eye camera view:
          </div>

          <div
            ref={trackpadRef}
            onPointerDown={handleTrackpadPointerDown}
            onPointerMove={handleTrackpadPointerMove}
            onPointerUp={handleTrackpadPointerUp}
            onPointerLeave={handleTrackpadPointerUp}
            className="relative w-36 h-36 mx-auto rounded-full bg-[#08080c] border border-white/10 flex items-center justify-center cursor-move"
            id="tilt-visual-trackpad"
          >
            {/* Visual Crosshair center markers */}
            <div className="absolute w-[1px] h-full bg-white/5 pointer-events-none" />
            <div className="absolute h-[1px] w-full bg-white/5 pointer-events-none" />

            {/* Simulated Joystick Node */}
            <div
              className={`absolute w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 border border-cyan-400 pointer-events-none shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center ${
                dragActiveRef.current ? "scale-110" : ""
              }`}
              style={{
                transform: `translate(${simulatedTilt.x * 45}px, ${-simulatedTilt.y * 45}px)`,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
            </div>
          </div>

          {/* Recenter triggers */}
          <div className="flex gap-x-2 pt-1 font-sans text-[10px]">
            <button
              onClick={handleCenteredRecenter}
              className="flex-1 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer font-bold border border-white/10"
              id="recenter-btn"
            >
              {isCalibrating ? "Aligning..." : "🔄 Recenter [R]"}
            </button>
            <button
              onClick={() => {
                setSimulatedTilt({ x: 0, y: 0 });
                setVrMode(!vrMode);
              }}
              className="px-2.5 py-1.5 rounded bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 cursor-pointer transition font-bold"
              id="visor-vr-toggle"
            >
              👁️ {vrMode ? "Mono" : "VR Mode"}
            </button>
          </div>
        </div>
      </div>

      {/* VR Cardboard goggles cardboard outline overlays displayed when Stereoscopic is on */}
      {vrMode && (
        <div className="absolute -inset-4 pointer-events-none z-0 border-[6px] border-black/80 rounded-3xl" />
      )}
    </div>
  );
}
