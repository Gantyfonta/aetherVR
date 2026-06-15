import React, { useState } from "react";
import {
  Brush,
  Sparkles,
  Play,
  RotateCcw,
  Mic,
  MicOff,
  Save,
  Trash2,
  FolderOpen,
  Compass,
  ArrowRight,
  Magnet,
  Eraser,
  Bird,
  Eye,
  Sliders
} from "lucide-react";
import { BrushType, SavedWorld, Stroke } from "../types";

interface MainMenuProps {
  currentBrush: BrushType;
  setCurrentBrush: (type: BrushType) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  drawingDepth: number;
  setDrawingDepth: (depth: number) => void;
  physicsActive: boolean;
  setPhysicsActive: (active: boolean) => void;
  environment: "space" | "neon_grid" | "matrix" | "warm_sunset" | "ocean_depths";
  setEnvironment: (env: "space" | "neon_grid" | "matrix" | "warm_sunset" | "ocean_depths") => void;
  selectedTool: "brush" | "magnet" | "eraser" | "boids";
  setSelectedTool: (tool: "brush" | "magnet" | "eraser" | "boids") => void;
  vrMode: boolean;
  setVrMode: (mode: boolean) => void;

  // Sound Integration
  microphoneActive: boolean;
  toggleMicrophone: () => void;

  // Storage Persistence Operations
  strokes: Stroke[];
  clearAllStrokes: () => void;
  savedWorlds: SavedWorld[];
  onSaveWorld: (name: string) => void;
  onLoadWorld: (world: SavedWorld) => void;
  onDeleteWorld: (id: string) => void;

  // Advanced Kinematics Parameters
  physicsMass: number;
  setPhysicsMass: (mass: number) => void;
  physicsGravity: number;
  setPhysicsGravity: (gravity: number) => void;
  physicsBuoyancy: number;
  setPhysicsBuoyancy: (buoyancy: number) => void;
  physicsRestitution: number;
  setPhysicsRestitution: (restitution: number) => void;
  physicsDrag: number;
  setPhysicsDrag: (drag: number) => void;
  physicsWaterLevel: number;
  setPhysicsWaterLevel: (level: number) => void;
  showWaterPlane: boolean;
  setShowWaterPlane: (show: boolean) => void;
}

export default function MainMenu({
  currentBrush,
  setCurrentBrush,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  drawingDepth,
  setDrawingDepth,
  physicsActive,
  setPhysicsActive,
  environment,
  setEnvironment,
  selectedTool,
  setSelectedTool,
  vrMode,
  setVrMode,
  microphoneActive,
  toggleMicrophone,
  strokes,
  clearAllStrokes,
  savedWorlds,
  onSaveWorld,
  onLoadWorld,
  onDeleteWorld,

  // Advanced Kinematics props
  physicsMass,
  setPhysicsMass,
  physicsGravity,
  setPhysicsGravity,
  physicsBuoyancy,
  setPhysicsBuoyancy,
  physicsRestitution,
  setPhysicsRestitution,
  physicsDrag,
  setPhysicsDrag,
  physicsWaterLevel,
  setPhysicsWaterLevel,
  showWaterPlane,
  setShowWaterPlane,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<"brush" | "physics" | "worlds">("brush");
  const [newWorldName, setNewWorldName] = useState("");
  const [storageStatusMessage, setStorageStatusMessage] = useState("");

  const brushTypes: { value: BrushType; label: string; desc: string }[] = [
    { value: "neon", label: "Neon Beam", desc: "Glowing cybernetic stroke" },
    { value: "ribbon", label: "Structured Ribbon", desc: "Flat wireframe ribbon" },
    { value: "dotted", label: "Star Particle Trail", desc: "Twinkling coordinate nodes" },
    { value: "rope", label: "Physics Thread", desc: "Swaying hanging fabric rope" },
    { value: "rainbow", label: "Chromatophore", desc: "RGB HSL shifting gradient" },
  ];

  const tools: { value: "brush" | "magnet" | "eraser" | "boids"; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "brush", label: "3D Drawing Brush", icon: <Brush size={18} />, desc: "Draw segments on dynamic depth plane" },
    { value: "magnet", label: "Magnetic Gravity Warp", icon: <Magnet size={18} />, desc: "Grab and distort vertex positions with elastic stretch" },
    { value: "eraser", label: "Disintegrating Laser", icon: <Eraser size={18} />, desc: "Hover or click to delete stroke segments" },
    { value: "boids", label: "Attractor Flocking", icon: <Bird size={18} />, desc: "Summon swarm creatures to track drawing wand" },
  ];

  const presets = [
    { value: "space", label: "Deep Velvet Space", desc: "Atmospheric purple void with infinite twinkling stars" },
    { value: "neon_grid", label: "Synthwave Grid", desc: "Electrified mesh skyline and wireframe towers" },
    { value: "matrix", label: "Matrix Digital Rain", desc: "Descending green binary code cascading rain" },
    { value: "warm_sunset", label: "Peach Sunset Dust", desc: "Golden hour sand particles with gradient backdrops" },
    { value: "ocean_depths", label: "Bathyal Blue Caves", desc: "Deep aquatic indigo zone with floating bubbles" },
  ];

  const colorPalettes = [
    "#00ffcc", // Cyber green
    "#ff0055", // Neon Pink
    "#0077ff", // Cobalt Blue
    "#ffaa00", // Gold Yellow
    "#aa00ff", // Purple Glow
    "#ffffff", // Crystal White
  ];

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;
    onSaveWorld(newWorldName.trim());
    setNewWorldName("");
    setStorageStatusMessage("World saved to sandbox successfully!");
    setTimeout(() => setStorageStatusMessage(""), 3000);
  };

  return (
    <div className="w-full lg:w-[420px] bg-[#0c0c12]/90 border-r border-white/10 flex flex-col h-full font-sans text-slate-100 z-10 backdrop-blur-md" id="main-panel-sidebar">
      {/* Sidebar Header Title in Artistic Flair */}
      <div className="p-6 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-x-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Compass size={18} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-slate-100 tracking-tight leading-none text-base">
              AetherPaint 3D VR
            </h1>
            <span className="text-[10px] text-purple-400 uppercase tracking-widest font-mono font-bold">
              NEOSCULPT ENGINE v2.4
            </span>
          </div>
        </div>
        <p className="text-xs text-white/50 leading-normal">
          Doodle in 3D, simulate elastic kinematics, and style customized VR artwork designs.
        </p>

        {/* Global Action Toggles (Stereoscopic Split Screen VR Button) */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setVrMode(!vrMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border flex items-center justify-center gap-x-1.5 transition-all ${
              vrMode
                ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
            }`}
            id="vr-toggle-btn"
          >
            <Eye size={14} className={vrMode ? "animate-pulse text-purple-400" : ""} />
            Stereo VR
          </button>
          <button
            onClick={toggleMicrophone}
            className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border flex items-center justify-center gap-x-1.5 transition-all ${
              microphoneActive
                ? "bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
            }`}
            id="mic-toggle-btn"
          >
            {microphoneActive ? <Mic size={14} className="text-cyan-400" /> : <MicOff size={14} />}
            Sound Reactive
          </button>
        </div>
      </div>

      {/* Tabs list with Artistic Flair styling */}
      <div className="flex border-b border-white/10 px-4 text-xs font-medium bg-black/20 select-none">
        {(["brush", "physics", "worlds"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-2 uppercase tracking-widest border-b-2 flex-1 cursor-pointer font-bold font-mono text-[10px] transition-all duration-200 ${
              activeTab === tab
                ? "border-cyan-400 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                : "border-transparent text-white/40 hover:text-white/80"
            }`}
            id={`tab-${tab}-btn`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === "brush" && (
          <div className="space-y-5">
            {/* Tool Selection Section */}
            <div className="space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Drawing & Physics Wands
              </span>
              <div className="grid grid-cols-2 gap-2">
                {tools.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedTool(t.value)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-y-1.5 transition duration-200 cursor-pointer ${
                      selectedTool === t.value
                        ? "bg-cyan-500/10 border-cyan-400 text-white ring-1 ring-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                    title={t.desc}
                    id={`tool-${t.value}-btn`}
                  >
                    <div className="flex items-center gap-x-1.5 font-bold text-xs">
                      <span className={selectedTool === t.value ? "text-cyan-400" : "text-white/60"}>{t.icon}</span>
                      {t.label}
                    </div>
                    <span className="text-[10px] text-white/40 leading-tight">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brush Type Selector */}
            <div className="space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Paint Ink Materials
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto border border-white/10 rounded-xl bg-black/40 p-2">
                {brushTypes.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => setCurrentBrush(type.value)}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer border transition-all duration-200 ${
                      currentBrush === type.value
                        ? "bg-purple-500/10 border-purple-500 text-white"
                        : "bg-transparent border-transparent hover:bg-white/5 text-slate-300"
                    }`}
                    id={`brush-${type.value}-item`}
                  >
                    <div>
                      <div className="text-xs font-bold">{type.label}</div>
                      <div className="text-[10px] text-white/40">{type.desc}</div>
                    </div>
                    <div
                      className="w-1.5 h-6 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: brushColor,
                        boxShadow: `0 0 10px ${brushColor}`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Sizing & Dimension depth sliders */}
            <div className="space-y-4 bg-black/40 border border-white/10 rounded-xl p-4">
              {/* Diameter Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 flex items-center gap-x-1 font-bold font-mono text-[10px] uppercase tracking-wider">
                    <Sliders size={13} className="text-cyan-400" /> Brush Diameter Size
                  </span>
                  <span className="font-mono text-cyan-400 text-xs font-bold">
                    {brushSize.toFixed(1)}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="4.0"
                  step="0.1"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-white/10"
                  id="brush-size-input"
                />
              </div>

              {/* Painting Depth */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 flex items-center gap-x-1 font-bold font-mono text-[10px] uppercase tracking-wider">
                    📏 Depth Distance Plane
                  </span>
                  <span className="font-mono text-purple-400 text-xs font-bold">
                    {drawingDepth.toFixed(1)}m away
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={drawingDepth}
                  onChange={(e) => setDrawingDepth(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-white/10"
                  id="drawing-depth-input"
                />
              </div>
            </div>

            {/* Color Swatches and Pickers */}
            <div className="space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Paint Colors (Glow Material)
              </span>
              <div className="flex items-center gap-x-3.5">
                <div className="flex gap-1.5">
                  {colorPalettes.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-7 h-7 rounded-lg border-2 transition duration-200 ${
                        brushColor.toLowerCase() === color.toLowerCase()
                          ? "border-cyan-400 scale-110 shadow-lg shadow-cyan-500/20"
                          : "border-transparent scale-100 hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                      title={color}
                    />
                  ))}
                </div>
                {/* Custom Hex Color Picker */}
                <div className="flex items-center gap-x-1.5 border border-white/10 rounded-lg p-1 px-2.5 bg-black/40 flex-1">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 mr-1 opacity-90"
                    id="html-color-picker"
                  />
                  <span className="font-mono text-[10px] text-slate-300 flex-1">
                    {brushColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "physics" && (
          <div className="space-y-5">
            {/* Physics Engine Actions */}
            <div className="space-y-3 bg-black/40 border border-white/10 p-4 rounded-xl">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Kinematics Physics Sandbox
              </span>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <div className="text-xs font-bold text-slate-100">Toggle Atmospheric Gravity</div>
                  <div className="text-[10px] text-white/40 max-w-[220px]">
                    Let stroke vertices fall, bounce, and slip under real Newtonian mechanics.
                  </div>
                </div>
                <button
                  onClick={() => setPhysicsActive(!physicsActive)}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-200 focus:outline-none flex cursor-pointer ${
                    physicsActive ? "bg-cyan-500 justify-end shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "bg-white/10 justify-start"
                  }`}
                  id="toggle-physics-btn"
                >
                  <span className="h-4 w-4 rounded-full bg-white shadow-md block" />
                </button>
              </div>

              {/* Conditional Advanced Sliders */}
              <div className="space-y-3 pt-1">
                {/* Gravity Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">Gravity Pull Strength</span>
                    <span className="font-mono text-cyan-400 font-bold">{physicsGravity.toFixed(1)} m/s²</span>
                  </div>
                  <input
                    type="range"
                    min="-20.0"
                    max="0.0"
                    step="0.5"
                    value={physicsGravity}
                    onChange={(e) => setPhysicsGravity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Restitution Elasticity */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">Kinetic Bounciness</span>
                    <span className="font-mono text-cyan-400 font-bold">{(physicsRestitution * 100).toFixed(0)}% elastic</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={physicsRestitution}
                    onChange={(e) => setPhysicsRestitution(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Mass Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">Vertex Mass density</span>
                    <span className="font-mono text-purple-400 font-bold">{physicsMass.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={physicsMass}
                    onChange={(e) => setPhysicsMass(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Air Drag */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">Viscous Air/Fluid Friction</span>
                    <span className="font-mono text-purple-400 font-bold">{(physicsDrag * 100).toFixed(1)}% friction</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.25"
                    step="0.01"
                    value={physicsDrag}
                    onChange={(e) => setPhysicsDrag(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Aquatic Buoyancy Level and Plane visualization control */}
            <div className="space-y-3 bg-black/40 border border-white/10 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                    Aquatic Buoyancy Field
                  </span>
                  <div className="text-[10px] text-white/40 max-w-[220px] mt-0.5">
                    Render an interactive fluid buoyancy grid. Vertices float and bob when submerged.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWaterPlane(!showWaterPlane)}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-200 focus:outline-none flex cursor-pointer ${
                    showWaterPlane ? "bg-cyan-500 justify-end shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "bg-white/10 justify-start"
                  }`}
                  id="toggle-water-plane-btn"
                >
                  <span className="h-4 w-4 rounded-full bg-white shadow-md block" />
                </button>
              </div>

              {showWaterPlane && (
                <div className="space-y-3 pt-2 border-t border-white/5 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-semibold">Buoyancy Floating Constant</span>
                      <span className="font-mono text-cyan-400 font-bold">x{physicsBuoyancy.toFixed(2)} lift</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={physicsBuoyancy}
                      onChange={(e) => setPhysicsBuoyancy(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-semibold">Fluid Surface Elevation Level</span>
                      <span className="font-mono text-cyan-400 font-bold">{physicsWaterLevel.toFixed(1)}m elevation</span>
                    </div>
                    <input
                      type="range"
                      min="-5.0"
                      max="5.0"
                      step="0.2"
                      value={physicsWaterLevel}
                      onChange={(e) => setPhysicsWaterLevel(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Presets and Atmosphere presets */}
            <div className="space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Virtual Atmosphere Dimension
              </span>
              <div className="space-y-2">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setEnvironment(p.value as any)}
                    className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex justify-between items-center ${
                      environment === p.value
                        ? "bg-black/60 border-cyan-400 text-cyan-400 ring-1 ring-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-[#0c0c12]/60 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                    id={`env-${p.value}-btn`}
                  >
                    <div>
                      <div className="text-xs font-bold leading-none mb-1">{p.label}</div>
                      <div className="text-[10px] text-white/40">{p.desc}</div>
                    </div>
                    {environment === p.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}



        {activeTab === "worlds" && (
          <div className="space-y-5">
            {/* Persistence Operations & Local files saving */}
            <form onSubmit={handleSaveSubmit} className="space-y-2.5 bg-black/40 border border-white/10 p-4 rounded-xl">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Save Current 3D Sketchbox
              </span>
              <div className="flex gap-x-2">
                <input
                  type="text"
                  placeholder="Atmosphere World name..."
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="flex-1 p-2 bg-[#08080c] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  id="save-world-name-input"
                />
                <button
                  type="submit"
                  disabled={!strokes.length || !newWorldName.trim()}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-x-1.5 cursor-pointer transition shadow"
                  id="save-world-submit-btn"
                >
                  <Save size={13} className="text-cyan-400" />
                  Save
                </button>
              </div>
              {storageStatusMessage && (
                <div className="text-[10px] text-cyan-400 leading-normal font-mono">
                  {storageStatusMessage}
                </div>
              )}
            </form>

            {/* List of Saved worlds */}
            <div className="space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono tracking-widest block">
                Load Saved Sandbox Dimension
              </span>

              {savedWorlds.length === 0 ? (
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-xs text-slate-400">
                  <FolderOpen size={20} className="mx-auto mb-2 opacity-50" />
                  No worlds saved yet. Sketch some paths and persist them!
                </div>
              ) : (
                <div className="space-y-2">
                  {savedWorlds.map((world) => (
                    <div
                      key={world.id}
                      className="p-3 rounded-xl border border-white/10 bg-black/30 flex justify-between items-center gap-x-3 text-xs"
                      id={`world-${world.id}-item`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-200 truncate">{world.name}</div>
                        <div className="text-[9px] text-white/40 font-mono mt-0.5">
                          {world.strokes?.length || 0} strokes • {world.environment.replace("_", " ")}
                        </div>
                      </div>

                      <div className="flex gap-x-1">
                        <button
                          onClick={() => onLoadWorld(world)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 hover:text-black text-[10px] font-bold cursor-pointer transition"
                          id={`world-${world.id}-load-btn`}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => onDeleteWorld(world.id)}
                          className="p-1.5 rounded-lg border border-white/10 bg-black/40 text-slate-400 hover:text-purple-400 font-bold cursor-pointer transition"
                          title="Delete Saved World"
                          id={`world-${world.id}-delete-btn`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Persistent global flush trigger */}
      <div className="p-4 border-t border-white/10 flex items-center justify-between select-none bg-black/20">
        <span className="text-[10px] font-mono text-white/40">
          Strokes Placed: {strokes.length}
        </span>
        <button
          onClick={clearAllStrokes}
          disabled={!strokes.length}
          className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-purple-950/20 text-white/40 hover:text-purple-400 disabled:opacity-30 text-[11px] font-bold flex items-center gap-x-1 transition cursor-pointer"
          id="clear-all-strokes-btn"
        >
          <Trash2 size={12} />
          Flush Canvas
        </button>
      </div>
    </div>
  );
}
