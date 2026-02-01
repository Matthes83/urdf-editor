/**
 * Visual marker for connection points on links.
 * Follows link position and rotation.
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ConnectionPoint } from '../../types/urdf';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';

interface ConnectionPointMarkerProps {
  point: ConnectionPoint;
  linkPosition: THREE.Vector3;
  linkRotation?: THREE.Euler;
  linkId: string;
}

const COLORS = {
  available: '#00ff88',
  hovered: '#ffff00',
  selected: '#ff6600',
  connected: '#0088ff',
  connecting: '#ff00ff',
  dragging: '#ffffff',
};

export function ConnectionPointMarker({ point, linkPosition, linkRotation, linkId }: ConnectionPointMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedConnectionPointId = useEditorStore((state) => state.selectedConnectionPointId);
  const selectConnectionPoint = useEditorStore((state) => state.selectConnectionPoint);
  const updateConnectionPoint = useEditorStore((state) => state.updateConnectionPoint);
  const selectLink = useEditorStore((state) => state.selectLink);

  const connection = useUIStore((state) => state.connection);
  const startConnection = useUIStore((state) => state.startConnection);
  const activeTool = useUIStore((state) => state.activeTool);

  const isSelected = selectedConnectionPointId === point.id;
  const isConnected = point.attached_joint_id !== null;
  const isSourcePoint = connection.sourcePoint?.pointId === point.id;

  const showTransformControls = isSelected &&
    (activeTool === 'select' || activeTool === 'move' || activeTool === 'add-connection-point') &&
    !isConnected;

  const color = isDragging
    ? COLORS.dragging
    : isSourcePoint
    ? COLORS.connecting
    : isConnected
    ? COLORS.connected
    : isSelected
    ? COLORS.selected
    : hovered
    ? COLORS.hovered
    : COLORS.available;

  // Pulsing animation for available points
  useFrame((state) => {
    if (meshRef.current && !isConnected && !isDragging) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Calculate world position: linkPosition + rotated local offset
  const worldPosition = useMemo(() => {
    const localOffset = new THREE.Vector3(
      point.position[0],
      point.position[1],
      point.position[2]
    );

    // Apply link rotation to the offset
    if (linkRotation) {
      const quaternion = new THREE.Quaternion().setFromEuler(linkRotation);
      localOffset.applyQuaternion(quaternion);
    }

    return new THREE.Vector3(
      linkPosition.x + localOffset.x,
      linkPosition.y + localOffset.y,
      linkPosition.z + localOffset.z
    );
  }, [linkPosition, linkRotation, point.position]);

  // Calculate world orientation
  const worldOrientation = useMemo(() => {
    const pointEuler = new THREE.Euler(
      point.orientation[0],
      point.orientation[1],
      point.orientation[2],
      'XYZ'
    );

    if (linkRotation) {
      const linkQuat = new THREE.Quaternion().setFromEuler(linkRotation);
      const pointQuat = new THREE.Quaternion().setFromEuler(pointEuler);
      const combinedQuat = linkQuat.multiply(pointQuat);
      return new THREE.Euler().setFromQuaternion(combinedQuat, 'XYZ');
    }

    return pointEuler;
  }, [linkRotation, point.orientation]);

  const handleTransformChange = () => {
    if (groupRef.current && isSelected) {
      const newWorldPos = groupRef.current.position;

      // Convert world position back to local
      let localPos = new THREE.Vector3(
        newWorldPos.x - linkPosition.x,
        newWorldPos.y - linkPosition.y,
        newWorldPos.z - linkPosition.z
      );

      // Inverse rotate to get local offset
      if (linkRotation) {
        const quaternion = new THREE.Quaternion().setFromEuler(linkRotation);
        quaternion.invert();
        localPos.applyQuaternion(quaternion);
      }

      updateConnectionPoint(linkId, point.id, {
        position: [localPos.x, localPos.y, localPos.z],
      });
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (activeTool === 'connect' || connection.isConnecting) {
      if (connection.sourcePoint && connection.sourcePoint.linkId !== linkId && !isConnected) {
        selectConnectionPoint(point.id);
      }
    } else if (activeTool === 'add-connection-point') {
      selectLink(linkId);
      selectConnectionPoint(point.id);
    } else {
      selectLink(linkId);
      selectConnectionPoint(point.id);
    }
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isConnected) {
      startConnection(linkId, point.id);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = isConnected ? 'not-allowed' : 'grab';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'default';
  };

  // Arrow direction for orientation indicator
  const arrowDirection = useMemo(() => {
    const dir = new THREE.Vector3(0, 0, 1);
    dir.applyEuler(worldOrientation);
    return dir;
  }, [worldOrientation]);

  return (
    <>
      {showTransformControls && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode="translate"
          size={0.5}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => {
            setIsDragging(false);
            handleTransformChange();
          }}
          onChange={handleTransformChange}
        />
      )}

      <group ref={groupRef} position={worldPosition}>
        {/* Main sphere */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          userData={{ type: 'connectionPoint', pointId: point.id, linkId }}
        >
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered || isSelected ? 0.6 : 0.3}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Direction indicator */}
        <arrowHelper
          args={[
            arrowDirection,
            new THREE.Vector3(0, 0, 0),
            0.08,
            color,
            0.03,
            0.02,
          ]}
        />

        {/* Outer glow ring */}
        {(hovered || isSelected) && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.07, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Label on hover */}
        {(hovered || isSelected) && (
          <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {point.name}
              {isConnected && ' (verbunden)'}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
