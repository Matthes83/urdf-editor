/**
 * Preview line shown when creating a connection between two points.
 */

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';

export function ConnectionPreviewLine() {
  const connection = useUIStore((state) => state.connection);
  const robot = useEditorStore((state) => state.robot);

  // Find source point position
  const sourcePosition = useMemo(() => {
    if (!connection.sourcePoint) return null;

    const link = robot.links.find((l) => l.name === connection.sourcePoint!.linkId);
    if (!link) return null;

    const point = link.connection_points.find((p) => p.id === connection.sourcePoint!.pointId);
    if (!point) return null;

    return new THREE.Vector3(
      link.editor_position[0] + point.position[0],
      link.editor_position[1] + point.position[1],
      link.editor_position[2] + point.position[2]
    );
  }, [connection.sourcePoint, robot.links]);

  // Target position (mouse position or preview)
  const targetPosition = useMemo(() => {
    if (!connection.previewPosition) return null;
    return new THREE.Vector3(...connection.previewPosition);
  }, [connection.previewPosition]);

  if (!connection.isConnecting || !sourcePosition || !targetPosition) {
    return null;
  }

  return (
    <Line
      points={[sourcePosition, targetPosition]}
      color="#ff00ff"
      lineWidth={2}
      dashed
      dashSize={0.05}
      dashScale={20}
    />
  );
}
