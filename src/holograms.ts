/**
 * Hologram pieces, reproduced from the Iron Man films:
 *  - wireframe look for real objects (IM2 workshop: cars rendered as cyan lines)
 *  - lock-on reticle: concentric rings, tick marks, a turning arc (IM3 HUD)
 *  - diagnostics pad: the model standing on rings, parts tinted by state
 *    (IM3 suit diagnostics)
 * plus the dotted line from the step card to the work spot
 * (Dynamics 365 Guides).
 */

import {
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  type Object3D,
  Vector3,
} from '@iwsdk/core';

/** Palette: IM3 HUD cyan, Mark III white base, amber for attention, red for danger. */
export const HOLO = {
  cyan: 0x00d4ff,
  white: 0xe8f7ff,
  amber: 0xffb020,
  red: 0xff4040,
} as const;

const EDGE_THRESHOLD_DEG = 28;

/** One hologram instance: every named part with its line and fill materials. */
export type Hologram = {
  readonly root: Object3D;
  readonly parts: ReadonlyMap<string, PartLook>;
};

type PartLook = {
  readonly object: Object3D;
  readonly lines: LineBasicMaterial;
  readonly fill: MeshBasicMaterial;
};

/**
 * Turn a loaded model into a line hologram. Each mesh keeps a faint fill and
 * gets its own edge lines, so parts can be tinted one by one.
 */
export function toHologram(root: Object3D): Hologram {
  const parts = new Map<string, PartLook>();
  const meshes: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  for (const mesh of meshes) {
    const lines = new LineBasicMaterial({ color: HOLO.cyan, transparent: true, opacity: 0.85 });
    const fill = new MeshBasicMaterial({
      color: HOLO.cyan,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: DoubleSide,
    });
    mesh.material = fill;
    mesh.add(new LineSegments(new EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_DEG), lines));
    parts.set(mesh.name, { object: mesh, lines, fill });
  }
  return { root, parts };
}

export function tintPart(hologram: Hologram, name: string, color: number, strength: number): void {
  const part = hologram.parts.get(name);
  if (part == null) return;
  part.lines.color.setHex(color);
  part.lines.opacity = strength;
  part.fill.color.setHex(color);
  part.fill.opacity = strength * 0.12;
}

function ring(inner: number, outer: number, color: number, opacity: number, arc = Math.PI * 2): Mesh {
  return new Mesh(
    new RingGeometry(inner, outer, 64, 1, 0, arc),
    new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: DoubleSide }),
  );
}

function ticks(radius: number, length: number, count: number, color: number): LineSegments {
  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const inner = i % 6 === 0 ? radius - length * 1.8 : radius - length;
    points.push(Math.cos(a) * inner, Math.sin(a) * inner, 0, Math.cos(a) * radius, Math.sin(a) * radius, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return new LineSegments(geometry, new LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
}

export type LockOn = {
  readonly root: Group;
  /** Turns slowly while locked. */
  readonly arc: Mesh;
  readonly materials: readonly (MeshBasicMaterial | LineBasicMaterial)[];
};

/** Lock-on reticle; faces +Z, billboard it toward the viewer. Radius in metres. */
export function makeLockOn(radius: number): LockOn {
  const root = new Group();
  const inner = ring(radius * 0.18, radius * 0.24, HOLO.cyan, 0.9);
  const outer = ring(radius * 0.94, radius, HOLO.cyan, 0.7);
  const arc = ring(radius * 1.1, radius * 1.16, HOLO.cyan, 0.9, Math.PI * 0.6);
  const tickMarks = ticks(radius * 0.9, radius * 0.08, 48, HOLO.cyan);
  root.add(inner, outer, arc, tickMarks);
  const materials = [inner, outer, arc].map((m) => m.material as MeshBasicMaterial);
  return { root, arc, materials: [...materials, tickMarks.material as LineBasicMaterial] };
}

export function setLockOnColor(lockOn: LockOn, color: number): void {
  for (const material of lockOn.materials) material.color.setHex(color);
}

/** Rings lying flat (normal +Y) under the diagnostics model. */
export function makePad(radius: number): Group {
  const pad = new Group();
  for (const [inner, outer, opacity] of [
    [radius * 0.96, radius, 0.8],
    [radius * 0.7, radius * 0.72, 0.5],
    [radius * 0.3, radius * 0.31, 0.4],
  ] as const) {
    const r = ring(inner, outer, HOLO.cyan, opacity);
    r.rotation.x = -Math.PI / 2;
    pad.add(r);
  }
  const tickMarks = ticks(radius * 0.94, radius * 0.06, 72, HOLO.cyan);
  tickMarks.rotation.x = -Math.PI / 2;
  pad.add(tickMarks);
  return pad;
}

/** Dotted line between two points, updated every frame without allocation. */
export class DottedLink {
  readonly line: Line;
  private readonly positions: Float32BufferAttribute;

  constructor() {
    const geometry = new BufferGeometry();
    this.positions = new Float32BufferAttribute(new Float32Array(6), 3);
    geometry.setAttribute('position', this.positions);
    this.line = new Line(
      geometry,
      new LineDashedMaterial({ color: HOLO.cyan, dashSize: 0.008, gapSize: 0.006, transparent: true, opacity: 0.9 }),
    );
    this.line.frustumCulled = false;
  }

  set(from: Vector3, to: Vector3): void {
    this.positions.setXYZ(0, from.x, from.y, from.z);
    this.positions.setXYZ(1, to.x, to.y, to.z);
    this.positions.needsUpdate = true;
    this.line.computeLineDistances();
  }

  setColor(color: number): void {
    (this.line.material as LineDashedMaterial).color.setHex(color);
  }
}
