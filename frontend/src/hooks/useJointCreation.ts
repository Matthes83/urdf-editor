/**
 * Hook for creating joints by connecting connection points.
 * Automatically docks links together when a connection is made.
 */

import { useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import type { Joint, JointType } from '../types/urdf';
import { createDefaultJointLimit } from '../types/urdf';

export function useJointCreation() {
  const addJoint = useEditorStore((state) => state.addJoint);
  const updateConnectionPoint = useEditorStore((state) => state.updateConnectionPoint);
  const updateLink = useEditorStore((state) => state.updateLink);
  const getLink = useEditorStore((state) => state.getLink);
  const robot = useEditorStore((state) => state.robot);

  const connection = useUIStore((state) => state.connection);
  const cancelConnection = useUIStore((state) => state.cancelConnection);

  const createJoint = useCallback(
    (
      targetLinkId: string,
      targetPointId: string,
      jointType: JointType = 'revolute'
    ): Joint | null => {
      if (!connection.sourcePoint) {
        return null;
      }

      const { linkId: sourceLinkId, pointId: sourcePointId } = connection.sourcePoint;

      // Prevent self-connection
      if (sourceLinkId === targetLinkId) {
        console.warn('Cannot connect a link to itself');
        cancelConnection();
        return null;
      }

      // Check if connection points are already used
      const sourceLink = getLink(sourceLinkId);
      const targetLink = getLink(targetLinkId);

      if (!sourceLink || !targetLink) {
        cancelConnection();
        return null;
      }

      const sourcePoint = sourceLink.connection_points.find((p) => p.id === sourcePointId);
      const targetPoint = targetLink.connection_points.find((p) => p.id === targetPointId);

      if (!sourcePoint || !targetPoint) {
        cancelConnection();
        return null;
      }

      if (sourcePoint.attached_joint_id || targetPoint.attached_joint_id) {
        console.warn('Connection point is already in use');
        cancelConnection();
        return null;
      }

      // Generate unique joint name
      const baseName = `${sourceLinkId}_to_${targetLinkId}_joint`;
      let jointName = baseName;
      let counter = 1;
      while (robot.joints.some((j) => j.name === jointName)) {
        jointName = `${baseName}_${counter}`;
        counter++;
      }

      // Calculate joint origin based on connection points
      // The joint origin is at the source connection point, relative to parent
      const originXyz: [number, number, number] = [
        sourcePoint.position[0],
        sourcePoint.position[1],
        sourcePoint.position[2],
      ];

      const newJoint: Joint = {
        name: jointName,
        type: jointType,
        parent: sourceLinkId,
        child: targetLinkId,
        origin: {
          xyz: originXyz,
          rpy: [0, 0, 0],
        },
        axis: [0, 0, 1],
        limit: jointType !== 'fixed' ? createDefaultJointLimit(jointType) : null,
        dynamics: null,
        parent_connection_point_id: sourcePointId,
        child_connection_point_id: targetPointId,
        current_value: 0,
      };

      // Add joint
      addJoint(newJoint);

      // Mark connection points as used
      updateConnectionPoint(sourceLinkId, sourcePointId, {
        attached_joint_id: jointName,
      });
      updateConnectionPoint(targetLinkId, targetPointId, {
        attached_joint_id: jointName,
      });

      // Dock the child link to the parent link
      // Calculate the world position of the parent's connection point
      const parentWorldPos: [number, number, number] = [
        sourceLink.editor_position[0] + sourcePoint.position[0],
        sourceLink.editor_position[1] + sourcePoint.position[1],
        sourceLink.editor_position[2] + sourcePoint.position[2],
      ];

      // Calculate new position for child link so its connection point aligns with parent's
      // new_child_pos + target_point_pos = parent_world_pos
      // new_child_pos = parent_world_pos - target_point_pos
      const newChildPos: [number, number, number] = [
        parentWorldPos[0] - targetPoint.position[0],
        parentWorldPos[1] - targetPoint.position[1],
        parentWorldPos[2] - targetPoint.position[2],
      ];

      // Update the child link's position to dock it to the parent
      updateLink(targetLinkId, { editor_position: newChildPos });

      // Clear connection state
      cancelConnection();

      return newJoint;
    },
    [connection, addJoint, updateConnectionPoint, updateLink, getLink, robot.joints, cancelConnection]
  );

  return {
    isConnecting: connection.isConnecting,
    sourcePoint: connection.sourcePoint,
    createJoint,
  };
}
