/**
 * URDF TypeScript type definitions matching the backend Pydantic models.
 */

export type GeometryType = 'box' | 'cylinder' | 'sphere' | 'mesh';

export interface BoxGeometry {
  type: 'box';
  size: [number, number, number];
}

export interface CylinderGeometry {
  type: 'cylinder';
  radius: number;
  length: number;
}

export interface SphereGeometry {
  type: 'sphere';
  radius: number;
}

export interface MeshGeometry {
  type: 'mesh';
  filename: string;
  scale: [number, number, number];
}

export type Geometry = BoxGeometry | CylinderGeometry | SphereGeometry | MeshGeometry;

export interface Origin {
  xyz: [number, number, number];
  rpy: [number, number, number];
}

export interface Material {
  name: string;
  color: [number, number, number, number]; // RGBA
  texture?: string | null;
}

export interface Visual {
  name?: string | null;
  origin: Origin;
  geometry: Geometry;
  material?: Material | null;
}

export interface Collision {
  name?: string | null;
  origin: Origin;
  geometry: Geometry;
}

export interface InertiaMatrix {
  ixx: number;
  ixy: number;
  ixz: number;
  iyy: number;
  iyz: number;
  izz: number;
}

export interface Inertial {
  origin: Origin;
  mass: number;
  inertia: InertiaMatrix;
}

export interface ConnectionPoint {
  id: string;
  name: string;
  position: [number, number, number];
  orientation: [number, number, number];
  attached_joint_id?: string | null;
}

export interface Link {
  name: string;
  visual?: Visual | null;
  collision?: Collision | null;
  inertial?: Inertial | null;
  connection_points: ConnectionPoint[];
  editor_position: [number, number, number];
  editor_color: string;
}

export type JointType = 'revolute' | 'prismatic' | 'fixed' | 'continuous' | 'floating' | 'planar';

export interface JointLimit {
  lower: number;
  upper: number;
  effort: number;
  velocity: number;
}

export interface JointDynamics {
  damping: number;
  friction: number;
}

export interface Joint {
  name: string;
  type: JointType;
  parent: string;
  child: string;
  origin: Origin;
  axis: [number, number, number];
  limit?: JointLimit | null;
  dynamics?: JointDynamics | null;
  parent_connection_point_id?: string | null;
  child_connection_point_id?: string | null;
  current_value: number;
}

export interface URDFRobot {
  name: string;
  links: Link[];
  joints: Joint[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Default factory functions
export const createDefaultOrigin = (): Origin => ({
  xyz: [0, 0, 0],
  rpy: [0, 0, 0],
});

export const createDefaultMaterial = (name: string = 'default'): Material => ({
  name,
  color: [0.8, 0.8, 0.8, 1.0],
});

export const createDefaultInertiaMatrix = (): InertiaMatrix => ({
  ixx: 1.0,
  ixy: 0.0,
  ixz: 0.0,
  iyy: 1.0,
  iyz: 0.0,
  izz: 1.0,
});

export const createDefaultJointLimit = (type: JointType): JointLimit => ({
  lower: type === 'revolute' ? -Math.PI : -1.0,
  upper: type === 'revolute' ? Math.PI : 1.0,
  effort: 100.0,
  velocity: 1.0,
});
