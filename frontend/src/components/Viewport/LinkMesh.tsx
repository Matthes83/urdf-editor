/**
 * Renders a single URDF link with its geometry.
 * Supports click-to-add connection points on the surface.
 */

import { useRef, useState, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Link, ConnectionPoint } from '../../types/urdf';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { ConnectionPointMarker } from './ConnectionPoint';
import { v4 as uuidv4 } from 'uuid';

interface LinkMeshProps {
  link: Link;
  worldPosition?: THREE.Vector3;
  worldRotation?: THREE.Euler;
}

export function LinkMesh({ link, worldPosition, worldRotation }: LinkMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [previewPoint, setPreviewPoint] = useState<THREE.Vector3 | null>(null);

  const selectedLinkId = useEditorStore((state) => state.selectedLinkId);
  const robot = useEditorStore((state) => state.robot);
  const selectLink = useEditorStore((state) => state.selectLink);
  const updateLink = useEditorStore((state) => state.updateLink);
  const addConnectionPoint = useEditorStore((state) => state.addConnectionPoint);
  const selectConnectionPoint = useEditorStore((state) => state.selectConnectionPoint);

  const activeTool = useUIStore((state) => state.activeTool);
  const transformMode = useUIStore((state) => state.transformMode);
  const showConnectionPoints = useUIStore((state) => state.viewportSettings.showConnectionPoints);

  const isSelected = selectedLinkId === link.name;

  // Check if this link is a child of any joint (connected links shouldn't be moved directly)
  const isChildLink = robot.joints.some((j) => j.child === link.name);
  const showTransformControls = isSelected && ['move', 'rotate', 'scale'].includes(activeTool) && !isChildLink;
  const isAddingConnectionPoint = activeTool === 'add-connection-point';

  // Parse color from hex or RGBA
  const color = useMemo(() => {
    if (link.visual?.material?.color) {
      const [r, g, b] = link.visual.material.color;
      return new THREE.Color(r, g, b);
    }
    return new THREE.Color(link.editor_color);
  }, [link.visual?.material?.color, link.editor_color]);

  // Get geometry args based on type
  const geometryArgs = useMemo(() => {
    if (!link.visual?.geometry) {
      return { type: 'box' as const, args: [0.5, 0.5, 0.5] as [number, number, number] };
    }

    const geo = link.visual.geometry;

    switch (geo.type) {
      case 'box':
        return { type: 'box' as const, args: geo.size };
      case 'cylinder':
        return { type: 'cylinder' as const, args: [geo.radius, geo.radius, geo.length, 32] as [number, number, number, number] };
      case 'sphere':
        return { type: 'sphere' as const, args: [geo.radius, 32, 32] as [number, number, number] };
      default:
        return { type: 'box' as const, args: [0.5, 0.5, 0.5] as [number, number, number] };
    }
  }, [link.visual?.geometry]);

  // Render geometry component
  const renderGeometry = () => {
    switch (geometryArgs.type) {
      case 'box':
        return <boxGeometry args={geometryArgs.args as [number, number, number]} />;
      case 'cylinder':
        return <cylinderGeometry args={geometryArgs.args as [number, number, number, number]} />;
      case 'sphere':
        return <sphereGeometry args={geometryArgs.args as [number, number, number]} />;
    }
  };

  // Use world position/rotation from kinematic chain, or fallback to editor_position
  const position = useMemo(() => {
    if (worldPosition) {
      // Add visual origin offset
      const visualOrigin = link.visual?.origin?.xyz || [0, 0, 0];
      return new THREE.Vector3(
        worldPosition.x + visualOrigin[0],
        worldPosition.y + visualOrigin[1],
        worldPosition.z + visualOrigin[2]
      );
    }
    // Fallback for unconnected links
    const [x, y, z] = link.editor_position;
    const visualOrigin = link.visual?.origin?.xyz || [0, 0, 0];
    return new THREE.Vector3(
      x + visualOrigin[0],
      y + visualOrigin[1],
      z + visualOrigin[2]
    );
  }, [worldPosition, link.editor_position, link.visual?.origin?.xyz]);

  // Use world rotation from kinematic chain
  const rotation = useMemo(() => {
    if (worldRotation) {
      // Combine world rotation with visual origin rotation
      const visualRpy = link.visual?.origin?.rpy || [0, 0, 0];
      const visualQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(visualRpy[0], visualRpy[1], visualRpy[2], 'XYZ')
      );
      const worldQuat = new THREE.Quaternion().setFromEuler(worldRotation);
      const combinedQuat = worldQuat.multiply(visualQuat);
      return new THREE.Euler().setFromQuaternion(combinedQuat, 'XYZ');
    }
    // Fallback
    const rpy = link.visual?.origin?.rpy || [0, 0, 0];
    return new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ');
  }, [worldRotation, link.visual?.origin?.rpy]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (isAddingConnectionPoint && isSelected) {
      const intersectPoint = e.point;

      // Convert world position to local (relative to link)
      const localPos: [number, number, number] = [
        intersectPoint.x - position.x,
        intersectPoint.y - position.y,
        intersectPoint.z - position.z,
      ];

      const newPoint: ConnectionPoint = {
        id: uuidv4(),
        name: `point_${link.connection_points.length + 1}`,
        position: localPos,
        orientation: [0, 0, 0],
        attached_joint_id: null,
      };

      addConnectionPoint(link.name, newPoint);
      selectConnectionPoint(newPoint.id);
      setPreviewPoint(null);
    } else {
      selectLink(link.name);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isAddingConnectionPoint && isSelected) {
      e.stopPropagation();
      setPreviewPoint(e.point.clone());
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);

    if (isAddingConnectionPoint && isSelected) {
      document.body.style.cursor = 'crosshair';
      setPreviewPoint(e.point.clone());
    } else {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    setPreviewPoint(null);
    document.body.style.cursor = 'default';
  };

  const handleTransformChange = () => {
    if (meshRef.current && !isChildLink) {
      const pos = meshRef.current.position;
      updateLink(link.name, {
        editor_position: [pos.x, pos.y, pos.z],
      });
    }
  };

  return (
    <group name={`link-group-${link.name}`}>
      {/* Transform controls (only for root links) */}
      {showTransformControls && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={handleTransformChange}
        />
      )}

      {/* Main mesh */}
      <mesh
        ref={meshRef}
        name={`link-${link.name}`}
        position={position}
        rotation={rotation}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
        userData={{ type: 'link', linkId: link.name }}
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={color}
          emissive={
            isAddingConnectionPoint && isSelected
              ? '#00ff88'
              : isSelected
              ? '#ff6600'
              : hovered
              ? '#4da6ff'
              : '#000000'
          }
          emissiveIntensity={
            isAddingConnectionPoint && isSelected
              ? 0.4
              : isSelected
              ? 0.3
              : hovered
              ? 0.2
              : 0
          }
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Preview point when adding connection points */}
      {previewPoint && isAddingConnectionPoint && isSelected && (
        <group position={previewPoint}>
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={0.5}
              transparent
              opacity={0.7}
            />
          </mesh>
          <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="bg-green-600/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              Klicken zum Hinzufuegen
            </div>
          </Html>
        </group>
      )}

      {/* Connection points */}
      {showConnectionPoints && link.connection_points.map((point) => (
        <ConnectionPointMarker
          key={point.id}
          point={point}
          linkPosition={worldPosition || new THREE.Vector3(...link.editor_position)}
          linkRotation={worldRotation}
          linkId={link.name}
        />
      ))}

      {/* Selection outline effect */}
      {isSelected && (
        <mesh position={position} rotation={rotation}>
          {renderGeometry()}
          <meshBasicMaterial
            color={isAddingConnectionPoint ? '#00ff88' : '#ff9500'}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Info when child link is selected */}
      {isSelected && isChildLink && activeTool === 'move' && (
        <Html position={[position.x, position.y + 0.5, position.z]} style={{ pointerEvents: 'none' }}>
          <div className="bg-orange-600/90 text-white px-3 py-2 rounded text-sm whitespace-nowrap">
            Verbundene Links werden ueber Gelenk bewegt
          </div>
        </Html>
      )}

      {/* Hint when link is selected in add-connection-point mode */}
      {isSelected && isAddingConnectionPoint && !previewPoint && (
        <Html position={[position.x, position.y + 0.5, position.z]} style={{ pointerEvents: 'none' }}>
          <div className="bg-green-600/90 text-white px-3 py-2 rounded text-sm whitespace-nowrap">
            Auf Oberflaeche klicken zum Hinzufuegen
          </div>
        </Html>
      )}
    </group>
  );
}
