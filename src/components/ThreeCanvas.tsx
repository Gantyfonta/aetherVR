import React, { useEffect, useRef, useState, useTransition } from "react";
import * as THREE from "three";
import { Stroke, BrushType, StrokePoint, PhysicalState } from "../types";

interface ThreeCanvasProps {
  strokes: Stroke[];
  onStrokeAdded: (stroke: Stroke) => void;
  onStrokeDeleted: (id: string) => void;
  currentDrawingStroke: Stroke | null;
  setCurrentDrawingStroke: (stroke: Stroke | null) => void;
  currentBrush: BrushType;
  brushColor: string;
  brushSize: number;
  drawingDepth: number;
  drawOnSurfaces: boolean;
  activeTab: string;
  environment: "space" | "neon_grid" | "matrix" | "warm_sunset" | "ocean_depths";
  physicsActive: boolean;
  micVolume: number; // 0.0 to 1.0 multiplier
  selectedTool: "brush" | "magnet" | "eraser" | "boids";
  vrMode: boolean;
  simulatedTilt: { x: number; y: number };
  physicsMass: number;
  physicsGravity: number;
  physicsBuoyancy: number;
  physicsRestitution: number;
  physicsDrag: number;
  physicsWaterLevel: number;
  showWaterPlane: boolean;
}

export default function ThreeCanvas({
  strokes,
  onStrokeAdded,
  onStrokeDeleted,
  currentDrawingStroke,
  setCurrentDrawingStroke,
  currentBrush,
  brushColor,
  brushSize,
  drawingDepth,
  drawOnSurfaces,
  activeTab,
  environment,
  physicsActive,
  micVolume,
  selectedTool,
  vrMode,
  simulatedTilt,
  physicsMass,
  physicsGravity,
  physicsBuoyancy,
  physicsRestitution,
  physicsDrag,
  physicsWaterLevel,
  showWaterPlane,
}: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useTransition()[0];
  
  const [xrSupported, setXrSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as any).xr) {
      (navigator as any).xr.isSessionSupported("immersive-vr").then((supported: boolean) => {
        setXrSupported(supported);
      });
    }
  }, []);

  // WebGL references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraMainRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraLeftRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraRightRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Interaction references
  const drawingPlaneRef = useRef<THREE.Plane | null>(null);
  const pointerIntersectionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const waterPlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const boundaryCageRef = useRef<THREE.LineSegments | null>(null);
  const grabbedStrokeIdRef = useRef<string | null>(null);
  const prevGrabbedWorldPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const grabVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // 3D Objects & Meshes in scene mapped by stroke ID
  const strokeMeshesRef = useRef<Map<string, THREE.Line | THREE.Points | THREE.Mesh>>(new Map());
  const dummyPlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const controllerLine1Ref = useRef<THREE.Line | null>(null);
  const controllerLine2Ref = useRef<THREE.Line | null>(null);

  // Dynamic physics and boids coordinate runtime data mapped by stroke ID
  const runtimeStrokeDataMapRef = useRef<Map<string, {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    angularVelocity: { x: number; y: number; z: number };
    bounces: number;
  }>>(new Map());

  // Dynamic Scene Assets (stars, rain particles, custom structures)
  const environmentDecorationsRef = useRef<THREE.Points | THREE.Group | null>(null);

  // Controls variables
  const [cameraOrbit, setCameraOrbit] = useState({ theta: -Math.PI / 4, phi: Math.PI / 3, radius: 15 });
  const [isRotatingScene, setIsRotatingScene] = useState(false);
  const [depthVisualizerPos, setDepthVisualizerPos] = useState<THREE.Vector3 | null>(null);

  const prevMousePosition = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const pointerCoordRef = useRef({ x: 0, y: 0 }); // normalized -1 to 1

  // Keep live references to state/props to avoid re-binding loops
  const mutablePropsRef = useRef({
    currentBrush,
    brushColor,
    brushSize,
    drawingDepth,
    drawOnSurfaces,
    physicsActive,
    micVolume,
    selectedTool,
    vrMode,
    simulatedTilt,
    strokes,
    physicsMass,
    physicsGravity,
    physicsBuoyancy,
    physicsRestitution,
    physicsDrag,
    physicsWaterLevel,
    showWaterPlane,
  });

  useEffect(() => {
    mutablePropsRef.current = {
      currentBrush,
      brushColor,
      brushSize,
      drawingDepth,
      drawOnSurfaces,
      physicsActive,
      micVolume,
      selectedTool,
      vrMode,
      simulatedTilt,
      strokes,
      physicsMass,
      physicsGravity,
      physicsBuoyancy,
      physicsRestitution,
      physicsDrag,
      physicsWaterLevel,
      showWaterPlane,
    };
  }, [
    currentBrush,
    brushColor,
    brushSize,
    drawingDepth,
    drawOnSurfaces,
    physicsActive,
    micVolume,
    selectedTool,
    vrMode,
    simulatedTilt,
    strokes,
    physicsMass,
    physicsGravity,
    physicsBuoyancy,
    physicsRestitution,
    physicsDrag,
    physicsWaterLevel,
    showWaterPlane,
  ]);

  // ----------------- ENVIRONMENT GENERATION -----------------
  const setupEnvironmentDecorations = (scene: THREE.Scene, type: string) => {
    // Clear old additions
    if (environmentDecorationsRef.current) {
      scene.remove(environmentDecorationsRef.current);
      environmentDecorationsRef.current = null;
    }

    if (type === "space") {
      // Celestial stars particles
      const starCount = 600;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        // Spherical distribution
        const radius = 25 + Math.random() * 20;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        // Twinkling white, blue, yellow colors
        const r = 0.8 + Math.random() * 0.2;
        const g = 0.8 + Math.random() * 0.2;
        const b = 0.9 + Math.random() * 0.1;
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }

      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      });

      const stars = new THREE.Points(geom, mat);
      scene.add(stars);
      environmentDecorationsRef.current = stars;
    } else if (type === "neon_grid") {
      // Tron neon towers / wireframe cubes
      const neonGroup = new THREE.Group();
      const towerCount = 6;
      for (let i = 0; i < towerCount; i++) {
        const height = 4 + Math.random() * 6;
        const cubeGeom = new THREE.BoxGeometry(2, height, 2);
        const edges = new THREE.EdgesGeometry(cubeGeom);
        const lineMat = new THREE.LineBasicMaterial({
          color: i % 2 === 0 ? 0xff00cc : 0x00ffff,
          linewidth: 2,
        });
        const wireframe = new THREE.LineSegments(edges, lineMat);

        const x = (Math.random() - 0.5) * 30;
        const z = (Math.random() - 0.5) * 30;
        // Keep away from center drawing zone
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

        wireframe.position.set(x, height / 2 - 5, z);
        neonGroup.add(wireframe);
      }
      scene.add(neonGroup);
      environmentDecorationsRef.current = neonGroup;
    } else if (type === "matrix") {
      // Cascade digital stream falling code
      const codeCount = 800;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(codeCount * 3);

      for (let i = 0; i < codeCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = -5 + Math.random() * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }

      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x00ff41,
        size: 0.12,
        transparent: true,
        opacity: 0.75,
      });

      const pointCloud = new THREE.Points(geom, mat);
      scene.add(pointCloud);
      environmentDecorationsRef.current = pointCloud;
    } else if (type === "warm_sunset") {
      // Golden floating ash particles
      const dustCount = 300;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(dustCount * 3);

      for (let i = 0; i < dustCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = -5 + Math.random() * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }

      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.2,
        transparent: true,
        opacity: 0.6,
      });

      const goldDust = new THREE.Points(geom, mat);
      scene.add(goldDust);
      environmentDecorationsRef.current = goldDust;
    } else if (type === "ocean_depths") {
      // Sub-aquatic floating bubbles
      const bubbleCount = 400;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(bubbleCount * 3);

      for (let i = 0; i < bubbleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 25;
        positions[i * 3 + 1] = -5 + Math.random() * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
      }

      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xe0ffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
      });

      const bubbleCloud = new THREE.Points(geom, mat);
      scene.add(bubbleCloud);
      environmentDecorationsRef.current = bubbleCloud;
    }
  };

  // ----------------- UPDATE SCENE BACKGROUNDS & LIGHTS -----------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Apply specific color palettes to ambient background
    let bgHex = 0x06060c; // Default Space
    if (environment === "neon_grid") bgHex = 0x05010a;
    else if (environment === "matrix") bgHex = 0x011403;
    else if (environment === "warm_sunset") bgHex = 0x1c102b;
    else if (environment === "ocean_depths") bgHex = 0x02162e;

    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.04);

    // Swap ambient/grid helper settings
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
    }

    let gridColor1 = 0x242444;
    let gridColor2 = 0x121222;
    if (environment === "neon_grid") {
      gridColor1 = 0x00ffff;
      gridColor2 = 0xff00cc;
    } else if (environment === "matrix") {
      gridColor1 = 0x00ff41;
      gridColor2 = 0x003300;
    } else if (environment === "warm_sunset") {
      gridColor1 = 0xff4500;
      gridColor2 = 0x4b0082;
    } else if (environment === "ocean_depths") {
      gridColor1 = 0x00ffff;
      gridColor2 = 0x0b325c;
    }

    const grid = new THREE.GridHelper(30, 30, gridColor1, gridColor2);
    grid.position.y = -5;
    scene.add(grid);
    gridHelperRef.current = grid;

    setupEnvironmentDecorations(scene, environment);
  }, [environment]);

  // ----------------- INITIAL WEBGL INIT BOOTSTRAP -----------------
  useEffect(() => {
    if (!containerRef.current) return;

    // Dimensions
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    // Create Scene with fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060c);
    scene.fog = new THREE.FogExp2(0x06060c, 0.04);
    sceneRef.current = scene;

    // Setup Main Camera
    const mainCamera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    cameraMainRef.current = mainCamera;

    // Stereoscopic Dual VR Cameras
    const leftCamera = new THREE.PerspectiveCamera(65, (width / 2) / height, 0.1, 100);
    const rightCamera = new THREE.PerspectiveCamera(65, (width / 2) / height, 0.1, 100);
    cameraLeftRef.current = leftCamera;
    cameraRightRef.current = rightCamera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enable WebXR
    renderer.xr.enabled = true;

    // Initialize temporary drawing lines for VR wands
    const vrLineMat1 = new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 3 });
    const vrLineMat2 = new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 3 });
    const vrLineGeom1 = new THREE.BufferGeometry();
    const vrLineGeom2 = new THREE.BufferGeometry();
    const ctrlLine1 = new THREE.Line(vrLineGeom1, vrLineMat1);
    const ctrlLine2 = new THREE.Line(vrLineGeom2, vrLineMat2);
    ctrlLine1.visible = false;
    ctrlLine2.visible = false;
    scene.add(ctrlLine1);
    scene.add(ctrlLine2);
    controllerLine1Ref.current = ctrlLine1;
    controllerLine2Ref.current = ctrlLine2;

    // WebXR Hand Controllers & Event Handling
    const onSelectStart = (event: any) => {
      const controller = event.target;
      controller.userData.isDrawing = true;
      controller.userData.points = [];
    };

    const onSelectEnd = (event: any) => {
      const controller = event.target;
      controller.userData.isDrawing = false;
      
      const pts = controller.userData.points;
      if (pts && pts.length >= 2) {
        const currentProps = mutablePropsRef.current;
        const randomHexId = Math.random().toString(36).substr(2, 9);
        const initiatedStroke: Stroke = {
          id: randomHexId,
          points: [...pts],
          color: currentProps.brushColor,
          brushSize: currentProps.brushSize,
          brushType: currentProps.currentBrush,
          timestamp: Date.now(),
          physics: {
            velocity: { x: 0, y: 0, z: 0 },
            position: { x: 0, y: 0, z: 0 },
            angularVelocity: {
              x: (Math.random() - 0.5) * 0.4,
              y: (Math.random() - 0.5) * 0.4,
              z: (Math.random() - 0.5) * 0.4
            },
            rotationOffset: { x: 0, y: 0, z: 0 },
            active: true,
            bounces: 0,
            mass: currentProps.physicsMass,
            buoyancy: currentProps.physicsBuoyancy,
            restitution: currentProps.physicsRestitution,
          }
        };
        onStrokeAdded(initiatedStroke);
      }
      controller.userData.points = [];
    };

    const onSqueezeStart = (event: any) => {
      const controller = event.target;
      controller.userData.isSqueezing = true;
    };

    const onSqueezeEnd = (event: any) => {
      const controller = event.target;
      controller.userData.isSqueezing = false;
    };

    const controller1 = renderer.xr.getController(0);
    controller1.addEventListener("selectstart", onSelectStart);
    controller1.addEventListener("selectend", onSelectEnd);
    controller1.addEventListener("squeezestart", onSqueezeStart);
    controller1.addEventListener("squeezeend", onSqueezeEnd);
    scene.add(controller1);

    const controller2 = renderer.xr.getController(1);
    controller2.addEventListener("selectstart", onSelectStart);
    controller2.addEventListener("selectend", onSelectEnd);
    controller2.addEventListener("squeezestart", onSqueezeStart);
    controller2.addEventListener("squeezeend", onSqueezeEnd);
    scene.add(controller2);

    // Add lovely pointer/lightwands to controllers
    const selectLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2)
    ]);
    const selectLineMat1 = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
    const selectLineMat2 = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
    
    const coneGeom = new THREE.CylinderGeometry(0.002, 0.01, 0.15, 8);
    coneGeom.rotateX(Math.PI / 2);
    const coneMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const coneMat2 = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

    const wand1 = new THREE.Mesh(coneGeom, coneMat1);
    wand1.add(new THREE.Line(selectLineGeom, selectLineMat1));
    controller1.add(wand1);

    const wand2 = new THREE.Mesh(coneGeom, coneMat2);
    wand2.add(new THREE.Line(selectLineGeom, selectLineMat2));
    controller2.add(wand2);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const floorLight = new THREE.PointLight(0x00ffff, 1.5, 20);
    floorLight.position.set(0, -4.5, 0);
    scene.add(floorLight);

    // Initial Drawing Plane facing camera
    drawingPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // Add a visual drawing grid backing mesh at depth for feedback
    const planeGeom = new THREE.PlaneGeometry(20, 20);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const depthMesh = new THREE.Mesh(planeGeom, planeMat);
    scene.add(depthMesh);
    dummyPlaneMeshRef.current = depthMesh;

    // Initial environment decoration
    setupEnvironmentDecorations(scene, "space");

    // Grid Floor
    const grid = new THREE.GridHelper(30, 30, 0x242444, 0x121222);
    grid.position.y = -5;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Add physical wireframe containment box (bounds)
    const boxGeom = new THREE.BoxGeometry(24, 17, 24);
    const boxEdges = new THREE.EdgesGeometry(boxGeom);
    const boxMat = new THREE.LineBasicMaterial({
      color: 0x4f46e5, // indigo / purple
      transparent: true,
      opacity: 0.25,
    });
    const cage = new THREE.LineSegments(boxEdges, boxMat);
    cage.position.set(0, 3.5, 0); // floor is -5, height is 17: center is -5 + 17/2 = 3.5
    scene.add(cage);
    boundaryCageRef.current = cage;

    // Add fluid water level plane
    const waterGeom = new THREE.PlaneGeometry(24, 24);
    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff, // neon cyber cyan fluid
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false, 
    });
    const waterPlane = new THREE.Mesh(waterGeom, waterMat);
    waterPlane.rotation.x = -Math.PI / 2; // lie flat
    waterPlane.position.y = physicsWaterLevel;
    scene.add(waterPlane);
    waterPlaneMeshRef.current = waterPlane;

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      rendererRef.current.setSize(w, h);

      if (cameraMainRef.current) {
        cameraMainRef.current.aspect = w / h;
        cameraMainRef.current.updateProjectionMatrix();
      }

      if (cameraLeftRef.current && cameraRightRef.current) {
        cameraLeftRef.current.aspect = (w / 2) / h;
        cameraLeftRef.current.updateProjectionMatrix();

        rightCamera.aspect = (w / 2) / h;
        rightCamera.updateProjectionMatrix();
      }
    };

    window.addEventListener("resize", handleResize);

    // ----------------- ANIMATION FRAME TICKER LOOP -----------------
    let clock = new THREE.Clock();

    // Local runtime list of dynamic physics/boids mutations
    const runtimeStrokeDataMap = runtimeStrokeDataMapRef.current;

    // Star/bubble background drifting timer
    let runtimeElapsedTime = 0;

    const animate = () => {
      const dt = Math.min(0.03, clock.getDelta());
      runtimeElapsedTime += dt;

      // Pull current props variables from the synchronized ref
      const currentProps = mutablePropsRef.current;
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const mainCamera = cameraMainRef.current;

      if (!scene || !renderer || !mainCamera) return;

      // ----------------- WEBXR CONTROLLER PROCESSING FOR DRAWS/GRABS -----------------
      if (renderer.xr.isPresenting) {
        [controller1, controller2].forEach((c, idx) => {
          if (!c) return;

          // Update laser light colors (Wands color indicators matching brush color selection)
          c.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
              child.material.color.set(currentProps.brushColor);
            }
          });

          // 1. SELECT/TRIGGER: PAINT IN 3D SPACE
          if (c.userData.isDrawing) {
            if (!c.userData.points) {
              c.userData.points = [];
            }

            const rawWorldPos = new THREE.Vector3();
            // get position at tip of wand (wand is slightly forward)
            rawWorldPos.setFromMatrixPosition(c.matrixWorld);
            // Move rawWorldPos forward in direction of controller pointing vector
            const dirVec = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
            rawWorldPos.add(dirVec.multiplyScalar(0.15));

            let shouldAdd = false;
            if (c.userData.points.length === 0) {
              shouldAdd = true;
            } else {
              const last = c.userData.points[c.userData.points.length - 1];
              const dist = rawWorldPos.distanceTo(new THREE.Vector3(last.x, last.y, last.z));
              if (dist > 0.02) {
                shouldAdd = true;
              }
            }

            if (shouldAdd) {
              c.userData.points.push({
                x: rawWorldPos.x,
                y: rawWorldPos.y,
                z: rawWorldPos.z,
                time: Date.now()
              });

              // Dynamic drawing lines feedback
              const ctrlLine = idx === 0 ? controllerLine1Ref.current : controllerLine2Ref.current;
              if (ctrlLine) {
                const drawPts: number[] = [];
                c.userData.points.forEach((p: any) => drawPts.push(p.x, p.y, p.z));
                ctrlLine.geometry.setAttribute("position", new THREE.Float32BufferAttribute(drawPts, 3));
                ctrlLine.geometry.attributes.position.needsUpdate = true;
                ctrlLine.geometry.computeBoundingSphere();
                if (ctrlLine.material instanceof THREE.LineBasicMaterial) {
                  ctrlLine.material.color.set(currentProps.brushColor);
                }
                ctrlLine.visible = true;
              }
            }
          } else {
            const ctrlLine = idx === 0 ? controllerLine1Ref.current : controllerLine2Ref.current;
            if (ctrlLine) {
              ctrlLine.visible = false;
            }
          }

          // 2. SQUEEZE/GRIP: INTERACT (Eraser / Magnet / Boids Flocking)
          if (c.userData.isSqueezing) {
            const controllerPos = new THREE.Vector3();
            controllerPos.setFromMatrixPosition(c.matrixWorld);

            if (currentProps.selectedTool === "eraser") {
              let targetId: string | null = null;
              for (const [sid, mesh] of strokeMeshesRef.current.entries()) {
                const meshPos = new THREE.Vector3();
                meshPos.setFromMatrixPosition(mesh.matrixWorld);
                if (controllerPos.distanceTo(meshPos) < 0.6) {
                  targetId = sid;
                  break;
                }
              }
              if (targetId) {
                onStrokeDeleted(targetId);
              }
            } else if (currentProps.selectedTool === "magnet") {
              if (!c.userData.grabbedStrokeId) {
                let closestStrokeId: string | null = null;
                let minDist = 1.5;
                for (const [sid, mesh] of strokeMeshesRef.current.entries()) {
                  const meshPos = new THREE.Vector3();
                  meshPos.setFromMatrixPosition(mesh.matrixWorld);
                  const dist = controllerPos.distanceTo(meshPos);
                  if (dist < minDist) {
                    minDist = dist;
                    closestStrokeId = sid;
                  }
                }
                if (closestStrokeId) {
                  c.userData.grabbedStrokeId = closestStrokeId;
                }
              } else {
                const grabbedId = c.userData.grabbedStrokeId;
                const d = runtimeStrokeDataMap.get(grabbedId);
                const mesh = strokeMeshesRef.current.get(grabbedId);
                if (d && mesh) {
                  const targetPoint = new THREE.Vector3();
                  targetPoint.setFromMatrixPosition(c.matrixWorld);
                  
                  d.position.x = targetPoint.x;
                  d.position.y = targetPoint.y;
                  d.position.z = targetPoint.z;
                  mesh.position.copy(targetPoint);

                  const controllerQuat = new THREE.Quaternion();
                  c.getWorldQuaternion(controllerQuat);
                  mesh.quaternion.copy(controllerQuat);
                  
                  d.velocity = { x: 0, y: 0, z: 0 };
                  d.angularVelocity = {
                    x: (Math.random() - 0.5) * 1.5,
                    y: (Math.random() - 0.5) * 1.5,
                    z: (Math.random() - 0.5) * 1.5
                  };
                }
              }
            }
          } else {
            c.userData.grabbedStrokeId = null;
          }
        });
      }

      // ----------------- ANIMATE AMBIENT DECORATIONS -----------------
      if (environmentDecorationsRef.current) {
        if (environment === "space") {
          environmentDecorationsRef.current.rotation.y = runtimeElapsedTime * 0.02;
        } else if (environment === "matrix") {
          const posAttribute = environmentDecorationsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
          if (posAttribute) {
            for (let i = 0; i < posAttribute.count; i++) {
              let y = posAttribute.getY(i);
              y -= dt * 2.5; // fall speed
              if (y < -5) {
                y = 10; // wrap to top
              }
              posAttribute.setY(i, y);
            }
            posAttribute.needsUpdate = true;
          }
        } else if (environment === "warm_sunset" || environment === "ocean_depths") {
          // drift upwards gently
          const posAttribute = environmentDecorationsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
          if (posAttribute) {
            for (let i = 0; i < posAttribute.count; i++) {
              let y = posAttribute.getY(i);
              let x = posAttribute.getX(i);
              y += dt * 0.4;
              x += Math.sin(runtimeElapsedTime + i) * dt * 0.2;
              if (y > 10) {
                y = -5; // wrap to bottom
              }
              posAttribute.setY(i, y);
              posAttribute.setX(i, x);
            }
            posAttribute.needsUpdate = true;
          }
        }
      }

      // ----------------- SYNC CAMERA POSITION & TILT -----------------
      // Apply orbital head tracking + simulated tilt variables to camera target look ratio
      const angleTheta = cameraOrbit.theta + (currentProps.simulatedTilt.x * Math.PI * 0.08);
      const anglePhi = THREE.MathUtils.clamp(
        cameraOrbit.phi + (currentProps.simulatedTilt.y * Math.PI * 0.06),
        0.05,
        Math.PI - 0.05
      );

      const targetCamPos = new THREE.Vector3(
        cameraOrbit.radius * Math.sin(anglePhi) * Math.sin(angleTheta),
        cameraOrbit.radius * Math.cos(anglePhi),
        cameraOrbit.radius * Math.sin(anglePhi) * Math.cos(angleTheta)
      );

      mainCamera.position.copy(targetCamPos);
      mainCamera.lookAt(0, 0, 0);

      // ----------------- SYNC VISUAL PHYSICS GUIDES -----------------
      if (waterPlaneMeshRef.current) {
        waterPlaneMeshRef.current.position.y = currentProps.physicsWaterLevel + Math.sin(runtimeElapsedTime * 2.0) * 0.04;
        waterPlaneMeshRef.current.visible = currentProps.showWaterPlane && currentProps.physicsActive;
      }
      if (boundaryCageRef.current) {
        boundaryCageRef.current.visible = currentProps.physicsActive;
      }

      // Adjust drawing depth grid plane to look/be perpendicular to Camera
      const camLookDir = new THREE.Vector3();
      mainCamera.getWorldDirection(camLookDir);
      camLookDir.normalize();

      // Align backing visualization mesh
      if (dummyPlaneMeshRef.current) {
        dummyPlaneMeshRef.current.position.copy(mainCamera.position).addScaledVector(camLookDir, currentProps.drawingDepth);
        dummyPlaneMeshRef.current.lookAt(mainCamera.position);
      }

      // Update drawingPlane normal & offset
      if (drawingPlaneRef.current) {
        drawingPlaneRef.current.setFromNormalAndCoplanarPoint(
          camLookDir.clone().negate(),
          mainCamera.position.clone().addScaledVector(camLookDir, currentProps.drawingDepth)
        );
      }

      // ----------------- UPDATE AND SIMULATE STROKES -----------------
      currentProps.strokes.forEach((stroke) => {
        const mesh = strokeMeshesRef.current.get(stroke.id);
        if (!mesh) return;

        // Initialize runtime dynamic states for physics if not already built in mapping
        if (!runtimeStrokeDataMap.has(stroke.id)) {
          runtimeStrokeDataMap.set(stroke.id, {
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            angularVelocity: {
              x: (Math.random() - 0.5) * 0.4,
              y: (Math.random() - 0.5) * 0.4,
              z: (Math.random() - 0.5) * 0.4
            },
            bounces: 0,
          });
        }

        const data = runtimeStrokeDataMap.get(stroke.id)!;

        // 1. Core Physics Simulation (Gravity + Fluids Buoyancy + Wind Sandbox)
        if (currentProps.physicsActive) {
          if (grabbedStrokeIdRef.current === stroke.id) {
            // Grabbed stroke is manipulated by wand drag interactions. Let's lock values to drag state
            mesh.position.set(data.position.x, data.position.y, data.position.z);
            mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
          } else {
            // Apply customized physical characteristics
            const strokeMass = stroke.physics?.mass || currentProps.physicsMass || 1.0;
            const strokeBuoyancy = stroke.physics?.buoyancy || currentProps.physicsBuoyancy || 1.2;
            const strokeRestitution = stroke.physics?.restitution || currentProps.physicsRestitution || 0.75;

            // Gather acceleration forces
            let gravityScalar = currentProps.physicsGravity; // standard -9.8
            let windForce = { x: 0, y: 0, z: 0 };

            // Newtonian gravity
            data.velocity.y += gravityScalar * dt;

            // Wind gusts
            data.velocity.x += windForce.x * dt * 5.0;
            data.velocity.y += windForce.y * dt * 5.0;
            data.velocity.z += windForce.z * dt * 5.0;

            // Fluid submersion checks
            if (data.position.y < currentProps.physicsWaterLevel) {
              const submergedDepth = Math.max(0, currentProps.physicsWaterLevel - data.position.y);
              
              // Lift force = depth * coefficient (Buoyancy)
              const buoyantForceY = submergedDepth * strokeBuoyancy * 8.5;
              const buoyantAccY = buoyantForceY / strokeMass;
              data.velocity.y += buoyantAccY * dt;

              // Apply powerful viscous drag inside fluids.
              const viscousDragFactor = 1.0 - (Math.min(0.9, currentProps.physicsDrag * 10.0 * submergedDepth) * dt * 6.0);
              data.velocity.x *= viscousDragFactor;
              data.velocity.y *= viscousDragFactor;
              data.velocity.z *= viscousDragFactor;

              // Gentle sub-surface drift waves
              data.velocity.x += Math.sin(runtimeElapsedTime * 1.5 + stroke.timestamp % 50) * 0.15 * dt;
              data.velocity.z += Math.cos(runtimeElapsedTime * 1.5) * 0.15 * dt;
            }

            // Normal atmosphere fluid/air friction
            const airDragMultiplier = 1.0 - (currentProps.physicsDrag * dt);
            data.velocity.x *= airDragMultiplier;
            data.velocity.y *= airDragMultiplier;
            data.velocity.z *= airDragMultiplier;

            // Translate velocity vectors to positions on grid coordinates
            data.position.x += data.velocity.x * dt;
            data.position.y += data.velocity.y * dt;
            data.position.z += data.velocity.z * dt;

            mesh.position.set(data.position.x, data.position.y, data.position.z);

            // Rotate floating lines
            data.rotation.x += data.angularVelocity.x * dt;
            data.rotation.y += data.angularVelocity.y * dt;
            data.rotation.z += data.angularVelocity.z * dt;
            mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);

            // Dampen spins
            data.angularVelocity.x *= 0.985;
            data.angularVelocity.y *= 0.985;
            data.angularVelocity.z *= 0.985;

            // --- 3D BOUNDING CAGE ENVELOPE COLLISION CHECKING ---
            // Width limit is 12, Height limit is -5 to 12, Depth limit is 12
            const limitX = 12.0;
            const limitZ = 12.0;
            const limitFloorY = -5.0;
            const limitCeilY = 12.0;

            // Floor boundary
            if (data.position.y < limitFloorY) {
              data.position.y = limitFloorY;
              mesh.position.y = limitFloorY;
              data.velocity.y = -data.velocity.y * strokeRestitution;
              data.velocity.x *= 0.85; // floor contact drag
              data.velocity.z *= 0.85;
              data.angularVelocity.x *= 0.70;
              data.bounces += 1;
              if (Math.abs(data.velocity.y) < 0.2) data.velocity.y = 0.0;
            }

            // Ceiling boundary
            if (data.position.y > limitCeilY) {
              data.position.y = limitCeilY;
              mesh.position.y = limitCeilY;
              data.velocity.y = -data.velocity.y * strokeRestitution;
              data.velocity.x *= 0.9;
              data.velocity.z *= 0.9;
            }

            // Left / Right bounds
            if (data.position.x < -limitX) {
              data.position.x = -limitX;
              mesh.position.x = -limitX;
              data.velocity.x = -data.velocity.x * strokeRestitution;
              data.angularVelocity.y = -data.angularVelocity.y * 0.8;
            } else if (data.position.x > limitX) {
              data.position.x = limitX;
              mesh.position.x = limitX;
              data.velocity.x = -data.velocity.x * strokeRestitution;
              data.angularVelocity.y = -data.angularVelocity.y * 0.8;
            }

            // Front / Back bounds
            if (data.position.z < -limitZ) {
              data.position.z = -limitZ;
              mesh.position.z = -limitZ;
              data.velocity.z = -data.velocity.z * strokeRestitution;
              data.angularVelocity.x = -data.angularVelocity.x * 0.8;
            } else if (data.position.z > limitZ) {
              data.position.z = limitZ;
              mesh.position.z = limitZ;
              data.velocity.z = -data.velocity.z * strokeRestitution;
              data.angularVelocity.x = -data.angularVelocity.x * 0.8;
            }
          }
        } else {
          // Physics is disabled, let's keep positions normalized at origin or clear
          mesh.position.set(0, 0, 0);
          mesh.rotation.set(0, 0, 0);
          mesh.scale.set(1, 1, 1);
          data.position = { x: 0, y: 0, z: 0 };
          data.velocity = { x: 0, y: 0, z: 0 };
          data.rotation = { x: 0, y: 0, z: 0 };
        }

        // Apply mic loudness scale animation feedback
        if (currentProps.micVolume > 0.01) {
          const audioAmp = 1.0 + currentProps.micVolume * 1.4;
          // Apply on mesh scaling
          mesh.scale.set(audioAmp, audioAmp, audioAmp);
        }
      });

      // ----------------- ERASER RAY COLLISIONS (SENSING HOVER) -----------------
      if (selectedTool === "eraser" && isDrawingRef.current) {
        // cast cursor line intersects
        raycasterRef.current.setFromCamera(
          new THREE.Vector2(pointerCoordRef.current.x, pointerCoordRef.current.y),
          mainCamera
        );

        // find closest stroke lines
        const meshesArray = Array.from(strokeMeshesRef.current.values());
        const intersects = raycasterRef.current.intersectObjects(meshesArray);
        if (intersects.length > 0) {
          const hitObj = intersects[0].object;
          // find who this belongs to
          for (const [id, value] of strokeMeshesRef.current.entries()) {
            if (value === hitObj) {
              onStrokeDeleted(id);
              break;
            }
          }
        }
      }

      // ----------------- MAGNET POINTER STRETCH & PULL -----------------
      if (selectedTool === "magnet" && isDrawingRef.current) {
        raycasterRef.current.setFromCamera(
          new THREE.Vector2(pointerCoordRef.current.x, pointerCoordRef.current.y),
          mainCamera
        );
        const intersectPoints = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(drawingPlaneRef.current!, intersectPoints);

        // Pull vertices of nearby strokes
        currentProps.strokes.forEach((stroke) => {
          const mesh = strokeMeshesRef.current.get(stroke.id);
          if (!mesh) return;

          const data = runtimeStrokeDataMap.get(stroke.id);
          const worldPos = mesh.position.clone();

          // Calculate distance to cursor project plane
          const localCursorPoint = intersectPoints.clone().sub(worldPos);

          const geometry = mesh.geometry as THREE.BufferGeometry;
          const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
          if (posAttr) {
            let changeMade = false;
            for (let i = 0; i < posAttr.count; i++) {
              const px = posAttr.getX(i);
              const py = posAttr.getY(i);
              const pz = posAttr.getZ(i);

              const vertexWorld = new THREE.Vector3(px, py, pz).applyMatrix4(mesh.matrixWorld);
              const dist = vertexWorld.distanceTo(intersectPoints);

              if (dist < 4.0) { // pull radius
                const pullStrength = (4.0 - dist) * 0.12; // rate of morph
                const targetDelta = intersectPoints.clone().sub(vertexWorld).multiplyScalar(pullStrength);

                // apply to raw buffers
                posAttr.setX(i, px + targetDelta.x);
                posAttr.setY(i, py + targetDelta.y);
                posAttr.setZ(i, pz + targetDelta.z);
                changeMade = true;
              }
            }
            if (changeMade) {
              posAttr.needsUpdate = true;
              geometry.computeBoundingSphere();
              geometry.computeBoundingBox();
            }
          }
        });
      }

      // ----------------- BOIDS FLOCKING ATTRACT TO POINTER -----------------
      if (selectedTool === "boids") {
        raycasterRef.current.setFromCamera(
          new THREE.Vector2(pointerCoordRef.current.x, pointerCoordRef.current.y),
          mainCamera
        );
        const mouse3D = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(drawingPlaneRef.current!, mouse3D);

        currentProps.strokes.forEach((stroke) => {
          const mesh = strokeMeshesRef.current.get(stroke.id);
          if (!mesh) return;

          const geometry = mesh.geometry as THREE.BufferGeometry;
          const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
          if (posAttr) {
            let changed = false;
            for (let i = 0; i < posAttr.count; i++) {
              const px = posAttr.getX(i);
              const py = posAttr.getY(i);
              const pz = posAttr.getZ(i);

              const vertWorld = new THREE.Vector3(px, py, pz).applyMatrix4(mesh.matrixWorld);
              // attract force
              const dir = mouse3D.clone().sub(vertWorld);
              const len = dir.length();
              if (len > 0.1) {
                dir.normalize();
                // move slightly with noise perturbation
                const speed = 3.0 * dt;
                positionsBufferChangeY(posAttr, i, py, dir.y * speed + (Math.sin(runtimeElapsedTime + i) * dt * 0.5));
                positionsBufferChangeX(posAttr, i, px, dir.x * speed + (Math.cos(runtimeElapsedTime * 1.5 + i) * dt * 0.5));
                positionsBufferChangeZ(posAttr, i, pz, dir.z * speed + (Math.sin(runtimeElapsedTime * 0.8 + i) * dt * 0.5));
                changed = true;
              }
            }
            if (changed) {
              posAttr.needsUpdate = true;
              geometry.computeBoundingSphere();
            }
          }
        });
      }

      // Helper helper block functions to support TS types safe checks inside render loop:
      function positionsBufferChangeX(attr: THREE.BufferAttribute, i: number, current: number, delta: number) {
        attr.setX(i, current + delta);
      }
      function positionsBufferChangeY(attr: THREE.BufferAttribute, i: number, current: number, delta: number) {
        attr.setY(i, current + delta);
      }
      function positionsBufferChangeZ(attr: THREE.BufferAttribute, i: number, current: number, delta: number) {
        attr.setZ(i, current + delta);
      }

      // ----------------- RENDER OUTPUT -----------------
      if (currentProps.vrMode) {
        // VR Stereoscopic Split Render Output
        const halfW = width / 2;

        // Render Left Eye (offset main target x slightly left)
        renderer.setScissorTest(true);

        renderer.setViewport(0, 0, halfW, height);
        renderer.setScissor(0, 0, halfW, height);
        if (cameraLeftRef.current) {
          cameraLeftRef.current.position.copy(mainCamera.position);
          cameraLeftRef.current.rotation.copy(mainCamera.rotation);
          cameraLeftRef.current.translateX(-0.28); // inter-ocular distance translation offset
          renderer.render(scene, cameraLeftRef.current);
        }

        // Render Right Eye (offset main target x slightly right)
        renderer.setViewport(halfW, 0, halfW, height);
        renderer.setScissor(halfW, 0, halfW, height);
        if (cameraRightRef.current) {
          cameraRightRef.current.position.copy(mainCamera.position);
          cameraRightRef.current.rotation.copy(mainCamera.rotation);
          cameraRightRef.current.translateX(0.28);
          renderer.render(scene, cameraRightRef.current);
        }

        renderer.setScissorTest(false);
      } else {
        // Normal Single Viewport
        renderer.render(scene, mainCamera);
      }
    };

    // Start main animation loop of Threejs compatible with WebXR
    renderer.setAnimationLoop(animate);

    return () => {
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
      }
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (_) {}
      }
    };
  }, [cameraOrbit]);

  // ----------------- UPDATE STROKES COLLECTION IN 3D SCENE -----------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Acknowledge new strokes created, delete stale values
    const currentStrokeIds = new Set(strokes.map((s) => s.id));
    if (currentDrawingStroke) {
      currentStrokeIds.add(currentDrawingStroke.id);
    }

    // 1. Remove meshes from scene that are no longer in props list
    for (const [id, mesh] of strokeMeshesRef.current.entries()) {
      if (!currentStrokeIds.has(id)) {
        scene.remove(mesh);
        // dispose of buffers safely
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
        strokeMeshesRef.current.delete(id);
      }
    }

    // Helper to process a Stroke model into a WebGL mesh
    const renderStrokeMesh = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;

      let existingMesh = strokeMeshesRef.current.get(stroke.id);

      // Extract points
      const positions: number[] = [];
      const colors: number[] = [];

      stroke.points.forEach((pt, ptIdx) => {
        positions.push(pt.x, pt.y, pt.z);

        // Rainbow shader points interpolation
        if (stroke.brushType === "rainbow") {
          const ratio = ptIdx / stroke.points.length;
          const rColor = new THREE.Color().setHSL(ratio, 0.9, 0.5);
          colors.push(rColor.r, rColor.g, rColor.b);
        } else {
          const stemColor = new THREE.Color(stroke.color);
          colors.push(stemColor.r, stemColor.g, stemColor.b);
        }
      });

      if (existingMesh) {
        // Update existing geometry buffer values without rebuilding object
        const geometry = existingMesh.geometry as THREE.BufferGeometry;
        const posAttribute = new THREE.Float32BufferAttribute(positions, 3);
        geometry.setAttribute("position", posAttribute);

        if (stroke.brushType === "rainbow") {
          geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        }

        posAttribute.needsUpdate = true;
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      } else {
        // Create new mesh geometry structure
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

        if (stroke.brushType === "rainbow") {
          geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        }

        let material: THREE.Material;

        // Custom creative material shader presets based on brush styles
        if (stroke.brushType === "neon") {
          material = new THREE.LineBasicMaterial({
            color: new THREE.Color(stroke.color),
            linewidth: stroke.brushSize * 3, // custom draw size
            transparent: true,
            opacity: 0.95,
          });
        } else if (stroke.brushType === "rainbow") {
          material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: stroke.brushSize * 2,
            transparent: true,
            opacity: 0.9,
          });
        } else if (stroke.brushType === "dotted") {
          material = new THREE.PointsMaterial({
            color: new THREE.Color(stroke.color),
            size: stroke.brushSize * 0.15,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
          });
        } else if (stroke.brushType === "rope") {
          // Dynamic Rope Waves
          material = new THREE.LineBasicMaterial({
            color: new THREE.Color(stroke.color),
            linewidth: stroke.brushSize * 1.5,
            transparent: true,
            opacity: 0.8,
          });
        } else {
          // Ribbon
          material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(stroke.color),
            side: THREE.DoubleSide,
            wireframe: true,
          });
        }

        let newMesh: THREE.Line | THREE.Points;
        if (stroke.brushType === "dotted") {
          newMesh = new THREE.Points(geometry, material);
        } else {
          newMesh = new THREE.Line(geometry, material);
        }

        scene.add(newMesh);
        strokeMeshesRef.current.set(stroke.id, newMesh);
      }
    };

    // Render active saved strokes
    strokes.forEach(renderStrokeMesh);

    // Render client's current active drawing stream
    if (currentDrawingStroke) {
      renderStrokeMesh(currentDrawingStroke);
    }
  }, [strokes, currentDrawingStroke]);

  // ----------------- CAMERA ORBIT NAVIGATION MOUSE LISTENERS -----------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();

    const currentProps = mutablePropsRef.current;

    // Right mouse button (or left mouse with Shift key held down) rotates the scene orbit
    if (e.button === 2 || e.shiftKey || (selectedTool !== "brush" && selectedTool !== "magnet" && selectedTool !== "eraser")) {
      setIsRotatingScene(true);
      prevMousePosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Capture draw/manipulate coordinates
    if (selectedTool === "brush" || selectedTool === "eraser" || selectedTool === "magnet") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerCoordRef.current = { x: px, y: py };

      if (selectedTool === "brush") {
        isDrawingRef.current = true;
        // Start stroke structure
        raycasterRef.current.setFromCamera(new THREE.Vector2(px, py), cameraMainRef.current!);
        const hitPoint = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(drawingPlaneRef.current!, hitPoint);

        const newPoint: StrokePoint = {
          x: hitPoint.x,
          y: hitPoint.y,
          z: hitPoint.z,
          time: Date.now(),
        };

        const randomHexId = Math.random().toString(36).substr(2, 9);
        const initiatedStroke: Stroke = {
          id: randomHexId,
          points: [newPoint],
          color: brushColor,
          brushSize: brushSize,
          brushType: currentBrush,
          timestamp: Date.now(),
          physics: {
            velocity: { x: 0, y: 0, z: 0 },
            position: { x: 0, y: 0, z: 0 },
            angularVelocity: {
              x: (Math.random() - 0.5) * 0.4,
              y: (Math.random() - 0.5) * 0.4,
              z: (Math.random() - 0.5) * 0.4
            },
            rotationOffset: { x: 0, y: 0, z: 0 },
            active: true,
            bounces: 0,
            mass: physicsMass,
            buoyancy: physicsBuoyancy,
            restitution: physicsRestitution,
          }
        };

        setCurrentDrawingStroke(initiatedStroke);
      } else if (selectedTool === "magnet") {
        // Find closest stroke to ray
        raycasterRef.current.setFromCamera(new THREE.Vector2(px, py), cameraMainRef.current!);
        const hitPoint = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(drawingPlaneRef.current!, hitPoint);

        let closestId: string | null = null;
        let minDistance = 5.0; // max interaction reach
        const intersectPos = new THREE.Vector3();

        // Check distance to all stroke center offsets
        currentProps.strokes.forEach((stroke) => {
          const data = runtimeStrokeDataMapRef.current.get(stroke.id);
          if (!data) return;

          const strokePos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
          const dist = hitPoint.distanceTo(strokePos);
          if (dist < minDistance) {
            minDistance = dist;
            closestId = stroke.id;
            intersectPos.copy(strokePos);
          }
        });

        if (closestId) {
          grabbedStrokeIdRef.current = closestId;
          prevGrabbedWorldPosRef.current.copy(intersectPos);
          grabVelocityRef.current.set(0, 0, 0);
          isDrawingRef.current = true;
        }
      } else if (selectedTool === "eraser") {
        isDrawingRef.current = true;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const currentProps = mutablePropsRef.current;

    if (isRotatingScene) {
      // Delta orbit calculations
      const deltaX = e.clientX - prevMousePosition.current.x;
      const deltaY = e.clientY - prevMousePosition.current.y;

      setCameraOrbit((prev) => ({
        ...prev,
        theta: prev.theta - deltaX * 0.007,
        phi: THREE.MathUtils.clamp(prev.phi - deltaY * 0.007, 0.1, Math.PI - 0.1),
      }));

      prevMousePosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawingRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerCoordRef.current = { x: px, y: py };

      if (selectedTool === "brush" && currentDrawingStroke) {
        raycasterRef.current.setFromCamera(new THREE.Vector2(px, py), cameraMainRef.current!);
        const hitPoint = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(drawingPlaneRef.current!, hitPoint);

        // Discard points that are too tiny of an increment to prevent redundant vertex bloating
        const lastPt = currentDrawingStroke.points[currentDrawingStroke.points.length - 1];
        const dist = Math.hypot(hitPoint.x - lastPt.x, hitPoint.y - lastPt.y, hitPoint.z - lastPt.z);

        if (dist > 0.08) {
          const appendedPoint: StrokePoint = {
            x: hitPoint.x,
            y: hitPoint.y,
            z: hitPoint.z,
            time: Date.now(),
          };

          setCurrentDrawingStroke({
            ...currentDrawingStroke,
            points: [...currentDrawingStroke.points, appendedPoint],
          });
        }
      } else if (selectedTool === "magnet" && grabbedStrokeIdRef.current) {
        raycasterRef.current.setFromCamera(new THREE.Vector2(px, py), cameraMainRef.current!);
        const hitPoint = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(drawingPlaneRef.current!, hitPoint);

        const data = runtimeStrokeDataMapRef.current.get(grabbedStrokeIdRef.current);
        if (data) {
          // Instantaneous delta velocity formula for throwing with momentum
          const delta = new THREE.Vector3().subVectors(hitPoint, prevGrabbedWorldPosRef.current);
          
          // Smoothly track current cursor ray
          data.position.x += (hitPoint.x - data.position.x) * 0.35;
          data.position.y += (hitPoint.y - data.position.y) * 0.35;
          data.position.z += (hitPoint.z - data.position.z) * 0.35;

          // Convert coordinates delta to speed vectors
          data.velocity.x = delta.x / 0.016; 
          data.velocity.y = delta.y / 0.016;
          data.velocity.z = delta.z / 0.016;

          // Cap throw speed limit
          const speed = Math.hypot(data.velocity.x, data.velocity.y, data.velocity.z);
          const limit = 32.0;
          if (speed > limit) {
            data.velocity.x = (data.velocity.x / speed) * limit;
            data.velocity.y = (data.velocity.y / speed) * limit;
            data.velocity.z = (data.velocity.z / speed) * limit;
          }

          // Induce heavy spinning
          data.angularVelocity.x = (Math.random() - 0.5) * 5.0;
          data.angularVelocity.y = (Math.random() - 0.5) * 5.0;
          data.angularVelocity.z = (Math.random() - 0.5) * 5.0;

          prevGrabbedWorldPosRef.current.copy(new THREE.Vector3(data.position.x, data.position.y, data.position.z));
        }
      }
    }
  };

  const handlePointerUp = () => {
    if (isRotatingScene) {
      setIsRotatingScene(false);
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;

      if (selectedTool === "brush" && currentDrawingStroke && currentDrawingStroke.points.length >= 2) {
        onStrokeAdded(currentDrawingStroke);
      }
      
      setCurrentDrawingStroke(null);
      grabbedStrokeIdRef.current = null;
    }
  };

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full h-full select-none" id="webgl-canvas-container">
      {/* 3D WebGL Canvas Injection */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={preventContextMenu}
        className="w-full h-full cursor-crosshair bg-slate-950 touch-none"
      />

      {/* Floating 3D Navigation Tutorial overlay helper */}
      <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-slate-300 pointer-events-none font-mono flex gap-x-4">
        <span>🖱️ <b className="text-white">Left-click</b> to Draw</span>
        <span>🌌 <b className="text-white">Shift + Drag / Right-click</b> to Rotate Scene</span>
        <span>🎨 Tool Selected: <b className="text-emerald-400 capitalize">{selectedTool}</b></span>
      </div>

      {/* Premium WebXR Immersive Entrance Button for Oculus Quest 2 */}
      {xrSupported && (
        <button
          onClick={async () => {
            if (typeof navigator !== "undefined" && (navigator as any).xr && rendererRef.current) {
              try {
                const session = await (navigator as any).xr.requestSession("immersive-vr", {
                  optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
                });
                await rendererRef.current.xr.setSession(session);
              } catch (err: any) {
                alert("Oculus Quest 2 VR Activation Failed: " + err.message);
              }
            }
          }}
          className="absolute bottom-16 right-4 z-30 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:scale-105 text-slate-950 text-xs font-black uppercase tracking-[0.15em] flex items-center gap-x-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer transition border border-emerald-400/30 animate-pulse"
          id="enter-quest2-vr-btn"
        >
          <span>🥽 Start Immersive Quest 2 VR</span>
        </button>
      )}

      {/* Loading state visual indicator for responsive canvas changes */}
      {isTransitioning && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 border-r-2" />
        </div>
      )}
    </div>
  );
}
