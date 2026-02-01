/**
 * Renders the URDF robot with proper kinematic chain.
 * Child links are positioned based on joint transforms and connection points.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useEditorStore } from '../../stores/editorStore';
import { LinkMesh } from './LinkMesh';
import { JointVisualizer } from './JointVisualizer';
import type { Joint } from '../../types/urdf';

interface LinkTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
}

export function URDFRenderer() {
  const robot = useEditorStore((state) => state.robot);

  // Compute world transforms for all links based on kinematic chain
  const linkTransforms = useMemo(() => {
    const transforms = new Map<string, LinkTransform>();

    // Find root links (not children of any joint)
    const childLinks = new Set(robot.joints.map((j) => j.child));
    const rootLinks = robot.links.filter((l) => !childLinks.has(l.name));

    // Helper to compute joint transform
    const computeJointTransform = (joint: Joint): { position: THREE.Vector3; quaternion: THREE.Quaternion } => {
      // Joint origin position (this is typically the parent's connection point)
      const position = new THREE.Vector3(
        joint.origin.xyz[0],
        joint.origin.xyz[1],
        joint.origin.xyz[2]
      );

      // Joint origin rotation (rpy)
      const originQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(joint.origin.rpy[0], joint.origin.rpy[1], joint.origin.rpy[2], 'XYZ')
      );

      // Joint axis rotation based on current_value
      let jointRotation = new THREE.Quaternion();

      if (joint.type === 'revolute' || joint.type === 'continuous') {
        const axis = new THREE.Vector3(joint.axis[0], joint.axis[1], joint.axis[2]).normalize();
        jointRotation.setFromAxisAngle(axis, joint.current_value);
      } else if (joint.type === 'prismatic') {
        // For prismatic, add translation along axis
        const axis = new THREE.Vector3(joint.axis[0], joint.axis[1], joint.axis[2]).normalize();
        position.add(axis.multiplyScalar(joint.current_value));
      }

      // Combine origin rotation with joint rotation
      const finalQuaternion = originQuaternion.clone().multiply(jointRotation);

      return { position, quaternion: finalQuaternion };
    };

    // Recursively compute transforms through the kinematic chain
    const computeTransform = (linkName: string, parentTransform: LinkTransform | null) => {
      const link = robot.links.find((l) => l.name === linkName);
      if (!link) return;

      let worldPosition: THREE.Vector3;
      let worldQuaternion: THREE.Quaternion;

      if (parentTransform === null) {
        // Root link - use editor_position directly
        worldPosition = new THREE.Vector3(
          link.editor_position[0],
          link.editor_position[1],
          link.editor_position[2]
        );
        worldQuaternion = new THREE.Quaternion();
      } else {
        // Child link - position is determined by parent transform
        worldPosition = parentTransform.position.clone();
        worldQuaternion = parentTransform.quaternion.clone();
      }

      const worldRotation = new THREE.Euler().setFromQuaternion(worldQuaternion, 'XYZ');

      transforms.set(linkName, {
        position: worldPosition,
        rotation: worldRotation,
        quaternion: worldQuaternion,
      });

      // Find joints where this link is the parent
      const childJoints = robot.joints.filter((j) => j.parent === linkName);

      for (const joint of childJoints) {
        const jointTransform = computeJointTransform(joint);

        // Joint position in world space
        const jointWorldPos = worldPosition.clone();
        const rotatedJointOffset = jointTransform.position.clone().applyQuaternion(worldQuaternion);
        jointWorldPos.add(rotatedJointOffset);

        // Combined rotation (parent rotation * joint rotation)
        const childQuaternion = worldQuaternion.clone().multiply(jointTransform.quaternion);

        // Find the child link and its connection point
        const childLink = robot.links.find((l) => l.name === joint.child);
        let childConnectionPointOffset = new THREE.Vector3(0, 0, 0);

        if (childLink && joint.child_connection_point_id) {
          const childPoint = childLink.connection_points.find(
            (p) => p.id === joint.child_connection_point_id
          );
          if (childPoint) {
            // The child's connection point offset, rotated by the child's final rotation
            childConnectionPointOffset = new THREE.Vector3(
              childPoint.position[0],
              childPoint.position[1],
              childPoint.position[2]
            );
            // Rotate the offset by the child's rotation
            childConnectionPointOffset.applyQuaternion(childQuaternion);
          }
        }

        // Child link position = joint world position - rotated child connection point offset
        // This ensures the child's connection point is at the joint position
        const childPosition = jointWorldPos.clone().sub(childConnectionPointOffset);

        const childTransform: LinkTransform = {
          position: childPosition,
          rotation: new THREE.Euler().setFromQuaternion(childQuaternion, 'XYZ'),
          quaternion: childQuaternion,
        };

        computeTransform(joint.child, childTransform);
      }
    };

    // Compute transforms starting from each root link
    for (const rootLink of rootLinks) {
      computeTransform(rootLink.name, null);
    }

    // Also compute for orphan links (not connected to anything)
    for (const link of robot.links) {
      if (!transforms.has(link.name)) {
        transforms.set(link.name, {
          position: new THREE.Vector3(
            link.editor_position[0],
            link.editor_position[1],
            link.editor_position[2]
          ),
          rotation: new THREE.Euler(),
          quaternion: new THREE.Quaternion(),
        });
      }
    }

    return transforms;
  }, [robot]);

  return (
    <group name="urdf-robot">
      {/* Render all links with computed transforms */}
      {robot.links.map((link) => {
        const transform = linkTransforms.get(link.name);
        return (
          <LinkMesh
            key={link.name}
            link={link}
            worldPosition={transform?.position}
            worldRotation={transform?.rotation}
          />
        );
      })}

      {/* Render all joints */}
      {robot.joints.map((joint) => {
        const parentTransform = linkTransforms.get(joint.parent);
        return (
          <JointVisualizer
            key={joint.name}
            joint={joint}
            parentPosition={parentTransform?.position}
            parentQuaternion={parentTransform?.quaternion}
          />
        );
      })}
    </group>
  );
}
