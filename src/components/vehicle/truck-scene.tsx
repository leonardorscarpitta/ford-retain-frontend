"use client";

import { Billboard, ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { createContext, use, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { Zone } from "@/lib/api";
import type { Tone } from "@/lib/format";

// A stylised 2022 F-150 SuperCrew (Lariat PowerBoost, Rapid Red), built from
// primitives and extruded side profiles. Units are roughly metres: the truck
// points down +x, +z is its right-hand side, y is up.

export type TruckSceneProps = {
  selected: Zone | null;
  onSelect: (zone: Zone | null) => void;
  tones: Partial<Record<Zone, Tone>>;
  reducedMotion: boolean;
};

const TONE_HEX: Record<Tone, string> = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
  info: "#066fef",
};

const PAINT = "#b0121f"; // Rapid Red metallic
const FORD_BLUE = "#00095b";
const ACCENT = "#066fef";
const LED = "#eaf4ff";

// Key dimensions
const FRONT_AXLE = 1.85;
const REAR_AXLE = -1.83;
const WHEEL_R = 0.5; // lifted, on 34" all-terrains
const TRACK = 0.86; // wheel centre distance from the middle, per side
const SILL = 0.68; // bottom of the body
const BELT = 1.42; // top of doors / hood / bed rails
const ROOF = 2.06;
const HALF_W = 1.0;
const BED_FLOOR = SILL + 0.24;
const GRILLE_Y = (BELT + SILL) / 2 + 0.08;
const LAMP_Y = BELT - 0.2;
const ARCH_R = 0.61;

// Where the hotspot sits (and the camera leans toward) for each zone.
const FOCUS: Record<Zone, [number, number, number]> = {
  "engine-bay": [2.1, BELT + 0.3, 0],
  "front-wheel": [FRONT_AXLE, WHEEL_R, 1.22],
  "rear-wheel": [REAR_AXLE, WHEEL_R, 1.22],
  cabin: [0.4, BELT + 0.35, 1.05],
  underbody: [-0.2, SILL - 0.28, 0.7],
};
const HOME_TARGET = new THREE.Vector3(0, 0.95, 0);
const LIFT = new THREE.Vector3(0, 0.35, 0);

type SceneState = TruckSceneProps & { speed: number };
const SceneContext = createContext<SceneState | null>(null);
const useScene = () => use(SceneContext)!;

export default function TruckScene(props: TruckSceneProps) {
  const state = { ...props, speed: props.reducedMotion ? 60 : 5 };
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [6.6, 2.3, 5.4], fov: 34 }}
      gl={{ alpha: true, antialias: true }}
      onPointerMissed={() => props.onSelect(null)}
      fallback={<p className="webgl-fallback">3D view needs WebGL. Use the zone buttons below.</p>}
    >
      <SceneContext value={state}>
        <Lights />
        <Truck />
        <Hotspots />
        <GroundRing />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.7} scale={13} blur={2.2} far={3} color="#000314" />
        <CameraRig />
      </SceneContext>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/* Lighting: local light-formers only (no HDR downloads).              */
/* ------------------------------------------------------------------ */

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 4]} intensity={1.8} />
      <directionalLight position={[-6, 3, -4]} intensity={0.7} color="#6caaff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[0, 2, 7]} scale={[10, 0.5, 1]} />
        <Lightformer form="rect" intensity={2} position={[0, 2, -7]} rotation-y={Math.PI} scale={[10, 0.5, 1]} />
        <Lightformer form="rect" intensity={2} position={[8, 2, 0]} rotation-y={-Math.PI / 2} scale={[6, 1, 1]} />
        <Lightformer form="rect" intensity={4} color={ACCENT} position={[-8, 1.5, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
      </Environment>
    </>
  );
}

function GroundRing() {
  const ref = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useScene();
  useFrame((_, dt) => {
    if (ref.current && !reducedMotion) ref.current.rotation.z += dt * 0.15;
  });
  return (
    <group rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
      <mesh ref={ref}>
        <ringGeometry args={[3.65, 3.7, 96, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[3.9, 3.91, 96]} />
        <meshBasicMaterial color="#6caaff" transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera: auto-orbit when idle, glide the target to the chosen zone. */
/* ------------------------------------------------------------------ */

function CameraRig() {
  const { selected, reducedMotion, speed } = useScene();
  const goal = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const controls = state.controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (!controls) return;
    if (selected) {
      // Lean toward the zone, and aim to the right of it so the truck sits
      // left of the details panel that covers the right side of the stage.
      goal.set(...FOCUS[selected]).multiplyScalar(0.5).add(LIFT);
      right.setFromMatrixColumn(state.camera.matrixWorld, 0).setY(0).normalize();
      goal.addScaledVector(right, 0.75);
    } else goal.copy(HOME_TARGET);
    controls.target.x = THREE.MathUtils.damp(controls.target.x, goal.x, speed * 0.6, dt);
    controls.target.y = THREE.MathUtils.damp(controls.target.y, goal.y, speed * 0.6, dt);
    controls.target.z = THREE.MathUtils.damp(controls.target.z, goal.z, speed * 0.6, dt);
    controls.update();
  });
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={5.5}
      maxDistance={13}
      maxPolarAngle={Math.PI / 2.05}
      autoRotate={!selected && !reducedMotion}
      autoRotateSpeed={0.6}
      enableDamping
    />
  );
}

/* ------------------------------------------------------------------ */
/* Interaction helpers                                                 */
/* ------------------------------------------------------------------ */

/** A clickable part: highlights on hover, selects its zone on click. */
function Part({ zone, onClick, children }: { zone?: Zone; onClick?: () => void; children: (lit: boolean) => ReactNode }) {
  const { selected, onSelect } = useScene();
  const [hovered, setHovered] = useState(false);
  const lit = hovered || (zone !== undefined && selected === zone);
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (onClick) onClick();
        else if (zone) onSelect(selected === zone ? null : zone);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      {children(lit)}
    </group>
  );
}

/** Rotates its children about a hinge toward `angle` when open. */
function Hinge({
  position,
  axis,
  angle,
  open,
  children,
}: {
  position: [number, number, number];
  axis: "x" | "y" | "z";
  angle: number;
  open: boolean;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const { speed } = useScene();
  useFrame((_, dt) => {
    const g = ref.current;
    if (g) g.rotation[axis] = THREE.MathUtils.damp(g.rotation[axis], open ? angle : 0, speed * 0.8, dt);
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

function Paint({ lit }: { lit?: boolean }) {
  return (
    <meshPhysicalMaterial
      color={PAINT}
      metalness={0.55}
      roughness={0.26}
      clearcoat={1}
      clearcoatRoughness={0.06}
      emissive="#ff5a5a"
      emissiveIntensity={lit ? 0.22 : 0}
      side={THREE.DoubleSide}
    />
  );
}
const Black = () => <meshStandardMaterial color="#08090c" roughness={0.55} metalness={0.3} />;
const GlossBlack = () => <meshPhysicalMaterial color="#050507" roughness={0.15} metalness={0.4} clearcoat={1} />;
const Plastic = () => <meshStandardMaterial color="#121418" roughness={0.85} />;
const Chrome = () => <meshStandardMaterial color="#d6dcea" roughness={0.12} metalness={1} />;
const Glass = () => <meshPhysicalMaterial color="#050a18" roughness={0.04} metalness={0.4} transparent opacity={0.55} side={THREE.DoubleSide} />;
const Emissive = ({ color, intensity = 2.5 }: { color: string; intensity?: number }) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
);
function Glow({ tone, on }: { tone?: Tone; on: boolean }) {
  return <Emissive color={TONE_HEX[tone ?? "info"]} intensity={on ? 2.4 : 0.6} />;
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Adds a wheel-arch cut-out (the upper arc over a wheel) to a side profile.
 * `forward` = the outline is being traced toward +x; otherwise toward -x.
 */
function arch(shape: THREE.Shape, axle: number, forward: boolean) {
  const a = Math.asin((SILL - WHEEL_R) / ARCH_R);
  if (forward) shape.absarc(axle, WHEEL_R, ARCH_R, Math.PI - a, a, true);
  else shape.absarc(axle, WHEEL_R, ARCH_R, a, Math.PI - a, false);
}

/** Extrudes a side profile (x/y) into a panel of the given thickness, centred on z. */
function profile(build: (s: THREE.Shape) => void, depth: number) {
  const s = new THREE.Shape();
  build(s);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/* ------------------------------------------------------------------ */
/* The truck                                                           */
/* ------------------------------------------------------------------ */

function Truck() {
  const { selected, speed } = useScene();
  const body = useRef<THREE.Group>(null);
  const [tailgateOpen, setTailgateOpen] = useState(false);

  // Selecting the underbody lifts the body off the frame.
  useFrame((_, dt) => {
    if (body.current) body.current.position.y = THREE.MathUtils.damp(body.current.position.y, selected === "underbody" ? 0.95 : 0, speed * 0.7, dt);
  });

  return (
    <group>
      <Frame />
      {[TRACK, -TRACK].map((z) => (
        <group key={z}>
          <Wheel position={[FRONT_AXLE, WHEEL_R, z]} front />
          <Wheel position={[REAR_AXLE, WHEEL_R, z]} />
        </group>
      ))}

      <group ref={body}>
        <FrontEnd />
        <Cab />
        <Bed tailgateOpen={tailgateOpen} onTailgate={() => setTailgateOpen((o) => !o)} />
        <WheelWells />
      </group>
    </group>
  );
}

function WheelWells() {
  return (
    <>
      {[FRONT_AXLE, REAR_AXLE].map((x) => (
        <mesh key={x} position={[x, WHEEL_R, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[ARCH_R - 0.01, ARCH_R - 0.01, HALF_W * 2 - 0.08, 32, 1, true, Math.PI / 2, Math.PI]} />
          <meshStandardMaterial color="#050506" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/* ---------- Front: fenders, engine bay, hood, grille, lights, bumper ---------- */

function FrontEnd() {
  const { selected, tones } = useScene();
  const open = selected === "engine-bay";

  // Fender side profile, from the firewall to the front fascia, with the front arch.
  const fender = useMemo(
    () =>
      profile((s) => {
        s.moveTo(1.2, SILL);
        arch(s, FRONT_AXLE, true);
        s.lineTo(2.84, SILL);
        s.lineTo(2.86, BELT - 0.06);
        s.lineTo(2.8, BELT);
        s.lineTo(1.2, BELT);
        s.closePath();
      }, 0.1),
    [],
  );

  return (
    <group>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh geometry={fender} position={[0, 0, (HALF_W - 0.05) * side]}>
            <Paint />
          </mesh>
          {/* Fender vent behind the wheel */}
          <mesh position={[1.42, BELT - 0.3, (HALF_W + 0.005) * side]}>
            <boxGeometry args={[0.14, 0.2, 0.02]} />
            <Black />
          </mesh>
        </group>
      ))}

      {/* Engine bay floor and firewall */}
      <mesh position={[2.05, SILL + 0.18, 0]}>
        <boxGeometry args={[1.6, 0.36, 1.2]} />
        <Plastic />
      </mesh>
      <mesh position={[1.24, SILL + 0.36, 0]}>
        <boxGeometry args={[0.06, 0.7, HALF_W * 2 - 0.1]} />
        <Plastic />
      </mesh>

      {/* PowerBoost engine: block, twin valve covers, hybrid module, reservoirs */}
      <group position={[2.0, SILL + 0.36, 0]}>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.95, 0.2, 0.8]} />
          <meshStandardMaterial color="#1a1d26" metalness={0.8} roughness={0.35} />
        </mesh>
        {[-0.24, 0.24].map((z) => (
          <RoundedBox key={z} args={[0.85, 0.08, 0.2]} radius={0.03} position={[0, 0.23, z]}>
            <Chrome />
          </RoundedBox>
        ))}
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.86, 0.03, 0.05]} />
          <Glow tone={tones["engine-bay"]} on={open} />
        </mesh>
        <mesh position={[-0.55, 0.12, 0]}>
          <boxGeometry args={[0.2, 0.22, 0.5]} />
          <meshStandardMaterial color={FORD_BLUE} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.35, 0.16, 0.66]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
          <meshStandardMaterial color="#e6efff" transparent opacity={0.75} />
        </mesh>
        <mesh position={[0.3, 0.2, -0.66]}>
          <boxGeometry args={[0.24, 0.16, 0.18]} />
          <Black />
        </mesh>
      </group>

      {/* Hood with raised power dome, hinged at the cowl */}
      <Part zone="engine-bay">
        {(lit) => (
          <Hinge position={[1.24, BELT, 0]} axis="z" angle={0.95} open={open}>
            <RoundedBox args={[1.62, 0.06, HALF_W * 2 - 0.04]} radius={0.025} position={[0.81, 0.02, 0]}>
              <Paint lit={lit} />
            </RoundedBox>
            <RoundedBox args={[1.3, 0.05, 1.0]} radius={0.025} position={[0.72, 0.065, 0]}>
              <Paint lit={lit} />
            </RoundedBox>
          </Hinge>
        )}
      </Part>

      {/* Big black grille: three thick bars and the blue oval */}
      <mesh position={[2.87, GRILLE_Y, 0]}>
        <boxGeometry args={[0.04, 0.5, 1.26]} />
        <meshStandardMaterial color="#020203" roughness={0.9} />
      </mesh>
      {[-0.17, 0, 0.17].map((dy) => (
        <RoundedBox key={dy} args={[0.06, 0.09, 1.22]} radius={0.025} position={[2.89, GRILLE_Y + dy, 0]}>
          <meshPhysicalMaterial color="#1a1c22" roughness={0.3} metalness={0.6} clearcoat={1} />
        </RoundedBox>
      ))}
      <group position={[2.93, GRILLE_Y, 0]} rotation-z={Math.PI / 2} scale={[0.55, 1, 1]}>
        <mesh>
          <cylinderGeometry args={[0.19, 0.19, 0.03, 40]} />
          <meshPhysicalMaterial color="#1f4fc4" emissive="#0a2a8a" emissiveIntensity={0.4} metalness={0.4} roughness={0.12} clearcoat={1} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, 0.016, 0]}>
          <torusGeometry args={[0.19, 0.014, 8, 40]} />
          <Chrome />
        </mesh>
      </group>

      {/* C-clamp LED headlights */}
      {[1, -1].map((side) => (
        <group key={side}>
          <RoundedBox args={[0.06, 0.26, 0.3]} radius={0.02} position={[2.86, LAMP_Y, 0.78 * side]}>
            <meshStandardMaterial color="#2a2f3a" metalness={0.9} roughness={0.2} />
          </RoundedBox>
          <mesh position={[2.9, LAMP_Y, 0.8 * side]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 24]} />
            <meshPhysicalMaterial color="#cfe3ff" roughness={0} metalness={0.2} transmission={0.4} />
          </mesh>
          {/* the "C": outer vertical, top, and a bottom stroke running into the grille */}
          <mesh position={[2.9, LAMP_Y, 0.94 * side]}>
            <boxGeometry args={[0.02, 0.28, 0.025]} />
            <Emissive color={LED} />
          </mesh>
          <mesh position={[2.9, LAMP_Y + 0.14, 0.8 * side]}>
            <boxGeometry args={[0.02, 0.025, 0.3]} />
            <Emissive color={LED} />
          </mesh>
          <mesh position={[2.9, LAMP_Y - 0.14, 0.72 * side]}>
            <boxGeometry args={[0.02, 0.025, 0.46]} />
            <Emissive color={LED} />
          </mesh>
        </group>
      ))}

      {/* Body-colour bumper over a black valence with fog lights and skid plate */}
      <RoundedBox args={[0.22, 0.24, HALF_W * 2 + 0.04]} radius={0.05} position={[2.93, SILL + 0.14, 0]}>
        <Paint />
      </RoundedBox>
      <RoundedBox args={[0.2, 0.16, HALF_W * 2 - 0.1]} radius={0.04} position={[2.9, SILL - 0.06, 0]}>
        <Black />
      </RoundedBox>
      <mesh position={[3.0, SILL - 0.05, 0]}>
        <boxGeometry args={[0.02, 0.08, 0.9]} />
        <meshStandardMaterial color="#020203" roughness={1} />
      </mesh>
      {[0.72, -0.72].map((z) => (
        <mesh key={z} position={[3.0, SILL - 0.05, z]}>
          <boxGeometry args={[0.02, 0.05, 0.18]} />
          <Emissive color={LED} intensity={1.2} />
        </mesh>
      ))}
      <mesh position={[2.7, SILL - 0.2, 0]} rotation-z={0.25}>
        <boxGeometry args={[0.4, 0.03, 1.1]} />
        <meshStandardMaterial color="#3a3f4a" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Antenna */}
      <mesh position={[1.3, BELT + 0.42, -0.9]} rotation-z={-0.08}>
        <cylinderGeometry args={[0.006, 0.006, 0.85, 6]} />
        <Black />
      </mesh>
    </group>
  );
}

/* ---------- Cab: floor, greenhouse, roof, interior, four doors ---------- */

function Cab() {
  const { selected } = useScene();
  const open = selected === "cabin";

  // Glass greenhouse: windshield rake at the front, near-vertical back glass.
  const greenhouse = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(1.24, BELT);
    s.lineTo(0.72, ROOF - 0.04);
    s.lineTo(-0.38, ROOF - 0.04);
    s.lineTo(-0.44, BELT);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.78, bevelEnabled: false });
    g.translate(0, 0, -0.89);
    return g;
  }, []);

  return (
    <group>
      {/* Floor pan and cowl */}
      <mesh position={[0.4, SILL + 0.1, 0]}>
        <boxGeometry args={[1.66, 0.2, HALF_W * 2 - 0.12]} />
        <Plastic />
      </mesh>
      <mesh geometry={greenhouse}>
        <Glass />
      </mesh>
      {/* Roof (body colour) and pillars */}
      <RoundedBox args={[1.2, 0.07, 1.84]} radius={0.03} position={[0.16, ROOF - 0.02, 0]}>
        <Paint />
      </RoundedBox>
      {[1, -1].map((side) => (
        <group key={side}>
          {/* A-pillar along the windshield edge */}
          <mesh position={[0.98, (BELT + ROOF) / 2 - 0.02, 0.9 * side]} rotation-z={-0.856}>
            <boxGeometry args={[0.78, 0.06, 0.06]} />
            <Paint />
          </mesh>
          {/* Black B- and C-pillars */}
          <mesh position={[0.42, (BELT + ROOF) / 2, 0.9 * side]}>
            <boxGeometry args={[0.08, ROOF - BELT, 0.05]} />
            <GlossBlack />
          </mesh>
          <mesh position={[-0.41, (BELT + ROOF) / 2, 0.9 * side]}>
            <boxGeometry args={[0.1, ROOF - BELT, 0.05]} />
            <Paint />
          </mesh>
        </group>
      ))}

      {/* Interior */}
      <mesh position={[1.05, BELT - 0.21, 0]}>
        <boxGeometry args={[0.35, 0.3, 1.7]} />
        <Plastic />
      </mesh>
      <mesh position={[0.92, BELT, 0]} rotation-z={-0.5}>
        <boxGeometry args={[0.02, 0.2, 0.34]} />
        <Emissive color={ACCENT} intensity={open ? 1.8 : 0.5} />
      </mesh>
      <mesh position={[0.9, BELT - 0.03, -0.42]} rotation={[0, Math.PI / 2, 0.45]}>
        <torusGeometry args={[0.15, 0.022, 8, 28]} />
        <Black />
      </mesh>
      {[0.62, -0.12].flatMap((x) =>
        [0.42, -0.42].map((z) => (
          <group key={`${x}${z}`} position={[x, SILL + 0.2, z]}>
            <RoundedBox args={[0.46, 0.14, 0.5]} radius={0.05} position={[0, 0.07, 0]}>
              <meshStandardMaterial color="#6b4a33" roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[0.12, 0.62, 0.5]} radius={0.05} position={[-0.22, 0.4, 0]} rotation-z={0.12}>
              <meshStandardMaterial color="#6b4a33" roughness={0.7} />
            </RoundedBox>
          </group>
        )),
      )}

      {/* Four doors (front hinged at the A-pillar, rear at the B-pillar), mirrors, running boards */}
      {[1, -1].map((side) => (
        <group key={side}>
          <Door hinge={[1.22, 0, (HALF_W - 0.03) * side]} length={0.8} side={side} open={open} front />
          <Door hinge={[0.42, 0, (HALF_W - 0.03) * side]} length={0.84} side={side} open={open} />
          <group position={[1.14, BELT + 0.09, (HALF_W + 0.1) * side]}>
            <RoundedBox args={[0.2, 0.2, 0.18]} radius={0.04}>
              <Paint />
            </RoundedBox>
            <mesh position={[0.01, -0.02, 0.02 * side]}>
              <boxGeometry args={[0.02, 0.15, 0.14]} />
              <meshStandardMaterial color="#9fb3cc" metalness={1} roughness={0.05} />
            </mesh>
          </group>
          <RoundedBox args={[1.72, 0.05, 0.2]} radius={0.02} position={[0.4, SILL - 0.12, (HALF_W + 0.06) * side]}>
            <Black />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

function Door({ hinge, length, side, open, front }: { hinge: [number, number, number]; length: number; side: number; open: boolean; front?: boolean }) {
  // Lower panel plus a black-framed window; the front door's window follows the windshield rake.
  const frame = useMemo(
    () =>
      profile((s) => {
        s.moveTo(0, BELT);
        if (front) {
          s.lineTo(-0.18, BELT);
          s.lineTo(-0.5, ROOF - 0.07);
        } else s.lineTo(0, ROOF - 0.07);
        s.lineTo(-length, ROOF - 0.07);
        s.lineTo(-length, BELT);
        s.closePath();
      }, 0.02),
    [front, length],
  );

  return (
    <Part zone="cabin">
      {(lit) => (
        <Hinge position={hinge} axis="y" angle={(front ? 1.15 : 1.0) * side} open={open}>
          <RoundedBox args={[length - 0.02, BELT - SILL, 0.06]} radius={0.02} position={[-length / 2, (BELT + SILL) / 2, 0]}>
            <Paint lit={lit} />
          </RoundedBox>
          <mesh geometry={frame}>
            <meshPhysicalMaterial color="#050a18" roughness={0.04} metalness={0.5} transparent opacity={0.7} />
          </mesh>
          <mesh position={[-length / 2, BELT + 0.01, 0]}>
            <boxGeometry args={[length, 0.03, 0.07]} />
            <GlossBlack />
          </mesh>
          {/* Handle, and the PowerBoost badge on the front door */}
          <mesh position={[-length + 0.2, BELT - 0.14, 0.035 * side]}>
            <boxGeometry args={[0.16, 0.04, 0.02]} />
            <Paint lit={lit} />
          </mesh>
          {front && (
            <mesh position={[-0.2, SILL + 0.1, 0.035 * side]}>
              <boxGeometry args={[0.16, 0.025, 0.01]} />
              <Chrome />
            </mesh>
          )}
        </Hinge>
      )}
    </Part>
  );
}

/* ---------- Bed: sides with rear arch, liner, front wall, tailgate, lights ---------- */

function Bed({ tailgateOpen, onTailgate }: { tailgateOpen: boolean; onTailgate: () => void }) {
  const side = useMemo(
    () =>
      profile((s) => {
        s.moveTo(-0.46, SILL);
        arch(s, REAR_AXLE, false);
        s.lineTo(-3.02, SILL);
        s.lineTo(-3.02, BELT + 0.03);
        s.lineTo(-0.46, BELT + 0.03);
        s.closePath();
      }, 0.1),
    [],
  );

  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={side} position={[0, 0, (HALF_W - 0.05) * s]}>
            <Paint />
          </mesh>
          <mesh position={[-1.74, BELT + 0.06, (HALF_W - 0.05) * s]}>
            <boxGeometry args={[2.56, 0.03, 0.14]} />
            <Black />
          </mesh>
          {/* Vertical LED tail lamps */}
          <RoundedBox args={[0.05, 0.42, 0.13]} radius={0.015} position={[-3.04, BELT - 0.26, (HALF_W - 0.08) * s]}>
            <Emissive color="#ff1f2a" intensity={2.2} />
          </RoundedBox>
        </group>
      ))}
      <mesh position={[-1.74, BED_FLOOR, 0]}>
        <boxGeometry args={[2.5, 0.06, HALF_W * 2 - 0.2]} />
        <Plastic />
      </mesh>
      <mesh position={[-0.5, (BELT + SILL) / 2 + 0.1, 0]}>
        <boxGeometry args={[0.08, BELT - SILL - 0.1, HALF_W * 2 - 0.1]} />
        <Paint />
      </mesh>
      <Part onClick={onTailgate}>
        {(lit) => (
          <Hinge position={[-3.0, BED_FLOOR, 0]} axis="z" angle={Math.PI / 2} open={tailgateOpen}>
            <RoundedBox args={[0.07, BELT - BED_FLOOR + 0.03, HALF_W * 2 - 0.12]} radius={0.02} position={[0, (BELT - BED_FLOOR) / 2, 0]}>
              <Paint lit={lit} />
            </RoundedBox>
            <mesh position={[-0.04, BELT - BED_FLOOR - 0.08, 0]}>
              <boxGeometry args={[0.01, 0.04, 0.3]} />
              <Chrome />
            </mesh>
          </Hinge>
        )}
      </Part>
      <RoundedBox args={[0.2, 0.18, HALF_W * 2]} radius={0.04} position={[-3.08, SILL + 0.04, 0]}>
        <Chrome />
      </RoundedBox>
    </group>
  );
}

/* ---------- Frame (underbody zone): rails, crossmembers, driveline, exhaust ---------- */

function Frame() {
  const { selected, tones } = useScene();
  const on = selected === "underbody";
  const steel = <meshStandardMaterial color="#1a1f2b" metalness={0.7} roughness={0.45} />;
  return (
    <Part zone="underbody">
      {() => (
        <group>
          {[0.52, -0.52].map((z) => (
            <mesh key={z} position={[-0.1, SILL - 0.14, z]}>
              <boxGeometry args={[5.7, 0.16, 0.1]} />
              {steel}
            </mesh>
          ))}
          {[-2.6, -1.2, 0.1, 1.2, 2.5].map((x) => (
            <mesh key={x} position={[x, SILL - 0.14, 0]}>
              <boxGeometry args={[0.1, 0.12, 1.04]} />
              {steel}
            </mesh>
          ))}
          <mesh position={[1.05, SILL - 0.08, 0]}>
            <boxGeometry args={[0.75, 0.28, 0.44]} />
            <meshStandardMaterial color="#2a3350" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[-0.35, SILL - 0.16, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.05, 0.05, 2.9, 12]} />
            <Glow tone={tones.underbody} on={on} />
          </mesh>
          <mesh position={[-0.9, SILL - 0.24, 0.32]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.045, 0.045, 3.8, 12]} />
            <Chrome />
          </mesh>
          {[FRONT_AXLE, REAR_AXLE].map((x) => (
            <mesh key={x} position={[x, WHEEL_R, 0]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.07, TRACK * 2 - 0.2, 12]} />
              <meshStandardMaterial color="#2a3350" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          {/* Rear differential */}
          <mesh position={[REAR_AXLE, WHEEL_R, 0]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color="#2a3350" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )}
    </Part>
  );
}

/* ---------- Wheels: A/T tyres with tread blocks, black multi-spoke wheels ---------- */

const TREAD = Array.from({ length: 28 }, (_, i) => (i / 28) * Math.PI * 2);
const SPOKES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

function Wheel({ position, front }: { position: [number, number, number]; front?: boolean }) {
  const zone: Zone = front ? "front-wheel" : "rear-wheel";
  const { selected, tones, speed, reducedMotion } = useScene();
  const active = selected === zone;
  const steer = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (steer.current) steer.current.rotation.y = THREE.MathUtils.damp(steer.current.rotation.y, front && active ? 0.5 : 0, speed * 0.6, dt);
    if (spin.current && active && !reducedMotion) spin.current.rotation.z -= dt * 4;
  });
  const out = position[2] > 0 ? 1 : -1;
  const rubber = <meshStandardMaterial color="#141416" roughness={0.95} />;

  return (
    <Part zone={zone}>
      {(lit) => (
        <group position={position}>
          <group ref={steer}>
            <group ref={spin}>
              {/* Tyre carcass with rounded shoulders */}
              <mesh rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[WHEEL_R - 0.03, WHEEL_R - 0.03, 0.3, 40]} />
                {rubber}
              </mesh>
              {[0.15, -0.15].map((z) => (
                <mesh key={z} position={[0, 0, z]}>
                  <torusGeometry args={[WHEEL_R - 0.06, 0.05, 10, 40]} />
                  <meshStandardMaterial color="#141416" roughness={0.95} emissive="#ffffff" emissiveIntensity={lit ? 0.06 : 0} />
                </mesh>
              ))}
              {/* Chunky tread blocks */}
              {TREAD.map((a, i) => (
                <mesh key={a} position={[Math.cos(a) * (WHEEL_R - 0.015), Math.sin(a) * (WHEEL_R - 0.015), i % 2 ? 0.07 : -0.07]} rotation-z={a}>
                  <boxGeometry args={[0.04, 0.07, 0.15]} />
                  {rubber}
                </mesh>
              ))}
              {/* Gloss-black wheel */}
              <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.02 * out]}>
                <cylinderGeometry args={[0.27, 0.27, 0.31, 32]} />
                <GlossBlack />
              </mesh>
              {SPOKES.map((a) => (
                <mesh key={a} rotation-z={a} position={[0, 0, 0.165 * out]}>
                  <boxGeometry args={[0.46, 0.06, 0.03]} />
                  <meshStandardMaterial color="#0c0d10" metalness={0.8} roughness={0.25} />
                </mesh>
              ))}
              <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.18 * out]}>
                <cylinderGeometry args={[0.07, 0.07, 0.03, 20]} />
                <Chrome />
              </mesh>
              {/* Status ring on the sidewall */}
              <mesh position={[0, 0, 0.19 * out]}>
                <torusGeometry args={[0.33, 0.012, 8, 48]} />
                <Glow tone={tones[zone]} on={active || lit} />
              </mesh>
            </group>
          </group>
        </group>
      )}
    </Part>
  );
}

/* ------------------------------------------------------------------ */
/* Zone markers: pulsing beacons inside the scene. The zone chips under */
/* the canvas are the keyboard-accessible way to open the same zones.   */
/* ------------------------------------------------------------------ */

function Hotspots() {
  const { tones } = useScene();
  return (
    <>
      {(Object.keys(FOCUS) as Zone[])
        .filter((z) => tones[z])
        .map((zone) => (
          <Beacon key={zone} zone={zone} tone={tones[zone]!} />
        ))}
    </>
  );
}

function Beacon({ zone, tone }: { zone: Zone; tone: Tone }) {
  const { selected, reducedMotion } = useScene();
  const ring = useRef<THREE.Mesh>(null);
  const period = tone === "critical" ? 1.1 : 2.2;
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m || reducedMotion) return;
    const t = (clock.elapsedTime % period) / period;
    m.scale.setScalar(1 + t * 1.6);
    (m.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  });
  const hex = TONE_HEX[tone];
  const active = selected === zone;
  return (
    <Part zone={zone}>
      {() => (
        <Billboard position={FOCUS[zone]}>
          <mesh>
            <circleGeometry args={[active ? 0.09 : 0.07, 32]} />
            <meshBasicMaterial color={hex} toneMapped={false} depthTest={false} transparent />
          </mesh>
          <mesh>
            <ringGeometry args={[active ? 0.09 : 0.07, active ? 0.115 : 0.09, 32]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} transparent />
          </mesh>
          <mesh ref={ring}>
            <ringGeometry args={[0.1, 0.115, 32]} />
            <meshBasicMaterial color={hex} toneMapped={false} depthTest={false} transparent />
          </mesh>
        </Billboard>
      )}
    </Part>
  );
}
