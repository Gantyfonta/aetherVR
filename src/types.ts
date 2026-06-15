export type BrushType = "neon" | "ribbon" | "dotted" | "rope" | "rainbow";

export interface StrokePoint {
  x: number;
  y: number;
  z: number;
  color?: string; // For rainbow brush, points can have custom individual colors
  time: number;
}

export interface PhysicalState {
  velocity: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number }; // Relative displacement offset
  angularVelocity: { x: number; y: number; z: number };
  rotationOffset: { x: number; y: number; z: number };
  active: boolean;
  bounces: number;
  mass?: number;
  buoyancy?: number;
  restitution?: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  brushSize: number;
  brushType: BrushType;
  timestamp: number;
  physics?: PhysicalState;
  isBoidGroup?: boolean;
}

export interface AIBehavior {
  effectName: string;
  gravity: number;
  wind: { x: number; y: number; z: number };
  oscillationFrequency: number;
  oscillationAmplitude: number;
  rotation: { x: number; y: number; z: number };
  scaleSpeed: number;
  colorMode: "static" | "pulse" | "rainbow" | "cycle" | "audioReactive";
  colorPalette: string[];
  glowIntensity: number;
  particleSpawnRate: number;
  description: string;
}

export interface SavedWorld {
  id: string;
  name: string;
  strokes: Stroke[];
  behaviorPreset: AIBehavior | null;
  environment: "space" | "neon_grid" | "matrix" | "warm_sunset" | "ocean_depths";
  createdAt: number;
}

export interface Boid {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  strokeId: string;
  pointIndex: number; // Anchor node index
}
