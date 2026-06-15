import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Move3d, Compass, HelpCircle, Gamepad, FolderPlus, Sparkles, AlertCircle } from "lucide-react";
import ThreeCanvas from "./components/ThreeCanvas";
import MainMenu from "./components/MainMenu";
import VRScopeSim from "./components/VRScopeSim";
import InstructionsOverlay from "./components/InstructionsOverlay";
import { Stroke, BrushType, SavedWorld, AIBehavior } from "./types";

export default function App() {
  // Painting & Styling State
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentDrawingStroke, setCurrentDrawingStroke] = useState<Stroke | null>(null);
  const [currentBrush, setCurrentBrush] = useState<BrushType>("neon");
  const [brushColor, setBrushColor] = useState("#00ffcc");
  const [brushSize, setBrushSize] = useState(1.5);
  const [drawingDepth, setDrawingDepth] = useState(8.0);
  const [drawOnSurfaces, setDrawOnSurfaces] = useState(false);

  // Extra physics parameters for realistic physics interactions
  const [physicsMass, setPhysicsMass] = useState<number>(1.0);
  const [physicsGravity, setPhysicsGravity] = useState<number>(-9.8);
  const [physicsBuoyancy, setPhysicsBuoyancy] = useState<number>(1.2);
  const [physicsRestitution, setPhysicsRestitution] = useState<number>(0.75);
  const [physicsDrag, setPhysicsDrag] = useState<number>(0.04);
  const [physicsWaterLevel, setPhysicsWaterLevel] = useState<number>(-1.0);
  const [showWaterPlane, setShowWaterPlane] = useState<boolean>(true);

  // Active Tool state
  const [selectedTool, setSelectedTool] = useState<"brush" | "magnet" | "eraser" | "boids">("brush");

  // Physics Workspace State
  const [physicsActive, setPhysicsActive] = useState(false);
  const [environment, setEnvironment] = useState<"space" | "neon_grid" | "matrix" | "warm_sunset" | "ocean_depths">("space");

  // VR Look Orientation & Stereoscopic State
  const [vrMode, setVrMode] = useState(false);
  const [simulatedTilt, setSimulatedTilt] = useState({ x: 0, y: 0 });

  // Saved Sandbox dimensions states
  const [savedWorlds, setSavedWorlds] = useState<SavedWorld[]>([]);

  // Mic integration volume
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0.0);

  // AI Behavior Generator State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBehavior, setAiBehavior] = useState<AIBehavior | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiFeedbackMessage, setAiFeedbackMessage] = useState<string | null>(null);

  // Audio Context tracking refs for clean termination
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // ----------------- LOAD INITIAL WORLD SAVED FILES -----------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aetherpaint_saved_worlds");
      if (stored) {
        setSavedWorlds(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Local storage lookup failed:", e);
    }
  }, []);

  // ----------------- SAVE & PERSIST CHANNELS TO STORAGE -----------------
  const handleSaveWorld = (name: string) => {
    const newWorld: SavedWorld = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      strokes,
      behaviorPreset: aiBehavior,
      environment,
      createdAt: Date.now(),
    };

    const updated = [newWorld, ...savedWorlds];
    setSavedWorlds(updated);
    localStorage.setItem("aetherpaint_saved_worlds", JSON.stringify(updated));
  };

  const handleDeleteWorld = (id: string) => {
    const updated = savedWorlds.filter((w) => w.id !== id);
    setSavedWorlds(updated);
    localStorage.setItem("aetherpaint_saved_worlds", JSON.stringify(updated));
  };

  const handleLoadWorld = (world: SavedWorld) => {
    setStrokes(world.strokes || []);
    setEnvironment(world.environment || "space");
    if (world.behaviorPreset) {
      setAiBehavior(world.behaviorPreset);
      setAiPrompt(world.behaviorPreset.description || "");
    } else {
      setAiBehavior(null);
    }
  };

  // ----------------- PAINT BRUSH LISTENER HANDLERS -----------------
  const handleStrokeAdded = (newStroke: Stroke) => {
    setStrokes((prev) => [...prev, newStroke]);
  };

  const handleStrokeDeleted = (id: string) => {
    setStrokes((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAllStrokes = () => {
    if (window.confirm("Are you sure you want to flush and clear your current 3D sketchbox? This cannot be undone.")) {
      setStrokes([]);
      setAiBehavior(null);
    }
  };

  // ----------------- MICROPHONE VOLUME CAPTURE -----------------
  const toggleMicrophone = async () => {
    if (microphoneActive) {
      // Disconnect cleanly
      setMicrophoneActive(false);
      setMicVolume(0.0);
      if (audioIntervalRef.current) {
        window.clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioStreamRef.current = stream;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        setMicrophoneActive(true);

        // Periodically record decibels amplitude
        audioIntervalRef.current = window.setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          // calculate average
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalize to [0.0, 1.0] multiplier range
          setMicVolume(Math.min(1.0, avg / 128));
        }, 60);
      } catch (err) {
        console.warn("Camera/Mic audio permission blocked:", err);
        alert("Failed to access system microphone for Voice Reactive glow. Verify browser permissions.");
        setMicrophoneActive(false);
      }
    }
  };

  // Cleanup microphones on component unmount
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) window.clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ----------------- EXTEND AI ANIMATION BEHAVIORS (GEMINI) -----------------
  const handleGenerateBehavior = async () => {
    if (!aiPrompt.trim()) return;
    setIsLoadingAI(true);
    setAiFeedbackMessage(null);

    // Sum total point count to provide contextual metrics to Gemini API
    const pointsSum = strokes.reduce((acc, current) => acc + current.points.length, 0);

    try {
      const response = await fetch("/api/ai-behaviors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          drawingCount: strokes.length,
          totalPoints: pointsSum,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gateway connection failed.");
      }

      const parameters: AIBehavior = await response.json();
      setAiBehavior(parameters);
      setAiFeedbackMessage(`AI Controller loaded: Successfully compiled cinematic behavior "${parameters.effectName}"`);

      // Adjust environment atmosphere based on Gemini recommended colors if possible
      if (parameters.colorPalette && parameters.colorPalette.length > 0) {
        setBrushColor(parameters.colorPalette[0]);
      }
      // Automate enabling kinetics if gravity was computed
      if (parameters.gravity !== 0) {
        setPhysicsActive(true);
      }
    } catch (err: any) {
      console.error("AI dynamic compiler retrieval failed:", err);
      setAiFeedbackMessage(`Gemini compiler error: ${err.message || "Failed to retrieve animation sequence. Verify application Secrets."}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleResetAIBehavior = () => {
    setAiBehavior(null);
    setAiPrompt("");
    setAiFeedbackMessage("AI behavior resets completely.");
    setPhysicsActive(false);
  };

  const handleSuggestPrompt = (suggestion: string) => {
    setAiPrompt(suggestion);
  };

  return (
    <div className="w-screen h-screen bg-[#08080c] text-slate-100 font-sans overflow-hidden flex flex-col" id="aether-paint-root">
      {/* Header Navigation in Artistic Flair theme */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 lg:px-8 bg-black/40 backdrop-blur-md z-50 select-none">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-black tracking-tighter text-cyan-400">AETHER <span className="text-purple-500">3D</span></div>
          <nav className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-white/50">
            <span className="text-cyan-400 cursor-default">Workspace</span>
            <span className="hover:text-white transition-colors cursor-pointer">Gallery</span>
            <span className="hover:text-white transition-colors cursor-pointer">Assets</span>
            <span className="hover:text-white transition-colors cursor-pointer">Connect</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono text-cyan-200">
            LATENCY: 12ms | FPS: 90
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-[#08080c] flex items-center justify-center font-bold text-xs italic">JD</div>
          </div>
        </div>
      </header>

      {/* Main VR Editor Interface taking up the remaining space */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* 1. Main Action sidebar menu panel */}
        <MainMenu
          currentBrush={currentBrush}
          setCurrentBrush={setCurrentBrush}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          drawingDepth={drawingDepth}
          setDrawingDepth={setDrawingDepth}
          physicsActive={physicsActive}
          setPhysicsActive={setPhysicsActive}
          environment={environment}
          setEnvironment={setEnvironment}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          vrMode={vrMode}
          setVrMode={setVrMode}
          microphoneActive={microphoneActive}
          toggleMicrophone={toggleMicrophone}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          generateBehavior={handleGenerateBehavior}
          isLoadingAI={isLoadingAI}
          aiBehavior={aiBehavior}
          resetAIBehavior={handleResetAIBehavior}
          strokes={strokes}
          clearAllStrokes={clearAllStrokes}
          savedWorlds={savedWorlds}
          onSaveWorld={handleSaveWorld}
          onLoadWorld={handleLoadWorld}
          onDeleteWorld={handleDeleteWorld}
          physicsMass={physicsMass}
          setPhysicsMass={setPhysicsMass}
          physicsGravity={physicsGravity}
          setPhysicsGravity={setPhysicsGravity}
          physicsBuoyancy={physicsBuoyancy}
          setPhysicsBuoyancy={setPhysicsBuoyancy}
          physicsRestitution={physicsRestitution}
          setPhysicsRestitution={setPhysicsRestitution}
          physicsDrag={physicsDrag}
          setPhysicsDrag={setPhysicsDrag}
          physicsWaterLevel={physicsWaterLevel}
          setPhysicsWaterLevel={setPhysicsWaterLevel}
          showWaterPlane={showWaterPlane}
          setShowWaterPlane={setShowWaterPlane}
        />

        {/* 2. Primary 3D VR WebGL Stage viewport */}
        <div className="flex-1 relative h-full w-full bg-black">
          <ThreeCanvas
            strokes={strokes}
            onStrokeAdded={handleStrokeAdded}
            onStrokeDeleted={handleStrokeDeleted}
            currentDrawingStroke={currentDrawingStroke}
            setCurrentDrawingStroke={setCurrentDrawingStroke}
            currentBrush={currentBrush}
            brushColor={brushColor}
            brushSize={brushSize}
            drawingDepth={drawingDepth}
            drawOnSurfaces={drawOnSurfaces}
            activeTab={selectedTool}
            aiBehavior={aiBehavior}
            environment={environment}
            physicsActive={physicsActive}
            micVolume={micVolume}
            selectedTool={selectedTool}
            vrMode={vrMode}
            simulatedTilt={simulatedTilt}
            physicsMass={physicsMass}
            physicsGravity={physicsGravity}
            physicsBuoyancy={physicsBuoyancy}
            physicsRestitution={physicsRestitution}
            physicsDrag={physicsDrag}
            physicsWaterLevel={physicsWaterLevel}
            showWaterPlane={showWaterPlane}
          />

          {/* 3. VR look visor overlay tracking sim widget */}
          <VRScopeSim
            vrMode={vrMode}
            setVrMode={setVrMode}
            simulatedTilt={simulatedTilt}
            setSimulatedTilt={setSimulatedTilt}
            setSelectedTool={setSelectedTool}
            selectedTool={selectedTool}
          />

          {/* 4. Instructions popup overlay helper */}
          <InstructionsOverlay onSuggestPrompt={handleSuggestPrompt} />

          {/* 5. Glowing alert banner feedback */}
          {aiFeedbackMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-2xl flex items-start gap-x-2.5 animate-in fade-in slide-in-from-top-4 duration-300" id="behavior-compile-toast">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={11} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 leading-normal font-sans">
                  {aiFeedbackMessage}
                </p>
              </div>
              <button
                onClick={() => setAiFeedbackMessage(null)}
                className="text-slate-500 hover:text-slate-300 font-mono text-[10px] cursor-pointer"
              >
                [close]
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer Status Bar in Artistic Flair theme */}
      <footer className="h-8 bg-black border-t border-white/5 px-6 flex items-center justify-between text-[10px] font-mono text-white/30 select-none">
        <div className="flex gap-4">
          <span>MODE: CREATIVE</span>
          <span>SYNC: ACTIVE</span>
        </div>
        <div>NEOSCULPT ENGINE v2.4.0-STABLE</div>
      </footer>
    </div>
  );
}
