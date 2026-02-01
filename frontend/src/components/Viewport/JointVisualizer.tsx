/**
 * Visualizes joints between links.
 * Shows the connection between parent and child with joint type indicators.
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Joint } from '../../types/urdf';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';

interface JointVisualizerProps {
  joint: Joint;
  parentPosition?: THREE.Vector3;
  parentQuaternion?: THREE.Quaternion;
}

// Colors for different joint types
const JOINT_COLORS = {
  revolute: '#ff5555',
  prismatic: '#55ff55',
  fixed: '#5555ff',
  continuous: '#ffaa00',
  floating: '#aa55ff',
  planar: '#55ffff',
};

export function JointVisualizer({ joint, parentPosition, parentQuaternion }: JointVisualizerProps) {
  const robot = useEditorStore((state) => state.robot);
  const selectedJointId = useEditorStore((state) => state.selectedJointId);
  const selectJoint = useEditorStore((state) => state.selectJoint);
  const showJointAxes = useUIStore((state) => state.viewportSettings.showJointAxes);

  const isSelected = selectedJointId === joint.name;

  // Find parent and child links
  const parentLink = robot.links.find((l) => l.name === joint.parent);
  const childLink = robot.links.find((l) => l.name === joint.child);

  // Use computed parent position or fallback
  const parentPos = useMemo(() => {
    if (parentPosition) return parentPosition.clone();
    if (!parentLink) return new THREE.Vector3();
    return new THREE.Vector3(...parentLink.editor_position);
  }, [parentPosition, parentLink]);

  // Joint origin position (relative to parent, rotated by parent quaternion)
  const jointPos = useMemo(() => {
    const originOffset = new THREE.Vector3(
      joint.origin.xyz[0],
      joint.origin.xyz[1],
      joint.origin.xyz[2]
    );

    // Rotate offset by parent's rotation
    if (parentQuaternion) {
      originOffset.applyQuaternion(parentQuaternion);
    }

    return parentPos.clone().add(originOffset);
  }, [parentPos, parentQuaternion, joint.origin]);

  // Joint axis direction (rotated by parent and joint origin rotation)
  const axisDirection = useMemo(() => {
    const axis = new THREE.Vector3(...joint.axis).normalize();

    // Apply joint origin rotation
    const originQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(joint.origin.rpy[0], joint.origin.rpy[1], joint.origin.rpy[2], 'XYZ')
    );
    axis.applyQuaternion(originQuat);

    // Apply parent rotation
    if (parentQuaternion) {
      axis.applyQuaternion(parentQuaternion);
    }

    return axis;
  }, [joint.axis, joint.origin.rpy, parentQuaternion]);

  // Rotation for the joint indicator to align with axis
  const jointRotation = useMemo(() => {
    // Create rotation to align the indicator with the axis
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, axisDirection);
    return new THREE.Euler().setFromQuaternion(quaternion);
  }, [axisDirection]);

  const color = JOINT_COLORS[joint.type] || '#ffffff';

  if (!parentLink || !childLink) {
    return null;
  }

  return (
    <group name={`joint-${joint.name}`}>
      {/* Joint indicator at joint position */}
      <group position={jointPos}>
        {/* Joint type indicator */}
        {joint.type === 'revolute' && (
          <mesh
            onClick={() => selectJoint(joint.name)}
            rotation={jointRotation}
          >
            <torusGeometry args={[0.08, 0.02, 16, 32]} />
            <meshStandardMaterial
              color={color}
              emissive={isSelected ? '#ff6600' : color}
              emissiveIntensity={isSelected ? 0.5 : 0.2}
            />
          </mesh>
        )}

        {joint.type === 'prismatic' && (
          <mesh
            onClick={() => selectJoint(joint.name)}
            rotation={jointRotation}
          >
            <boxGeometry args={[0.04, 0.12, 0.04]} />
            <meshStandardMaterial
              color={color}
              emissive={isSelected ? '#ff6600' : color}
              emissiveIntensity={isSelected ? 0.5 : 0.2}
            />
          </mesh>
        )}

        {joint.type === 'fixed' && (
          <mesh onClick={() => selectJoint(joint.name)}>
            <octahedronGeometry args={[0.05]} />
            <meshStandardMaterial
              color={color}
              emissive={isSelected ? '#ff6600' : color}
              emissiveIntensity={isSelected ? 0.5 : 0.2}
            />
          </mesh>
        )}

        {/* Axis indicator arrow */}
        {showJointAxes && joint.type !== 'fixed' && (
          <arrowHelper
            args={[
              axisDirection,
              new THREE.Vector3(0, 0, 0),
              0.25,
              color,
              0.06,
              0.04,
            ]}
          />
        )}
      </group>

      {/* Joint label on selection */}
      {isSelected && (
        <Html position={[jointPos.x, jointPos.y + 0.2, jointPos.z]} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            <div className="font-medium">{joint.name}</div>
            <div className="text-gray-300">
              {joint.type === 'revolute' && `${(joint.current_value * 180 / Math.PI).toFixed(1)}°`}
              {joint.type === 'prismatic' && `${joint.current_value.toFixed(3)} m`}
              {joint.type === 'fixed' && 'Fest'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
