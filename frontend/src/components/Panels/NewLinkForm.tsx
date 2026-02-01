/**
 * Clean form for creating new links.
 */

import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { Input, Select, Button } from '../ui';
import type { Link, BoxGeometry, CylinderGeometry, SphereGeometry, Visual, Material, Inertial, Collision } from '../../types/urdf';
import { createDefaultOrigin, createDefaultInertiaMatrix } from '../../types/urdf';

const GEOMETRY_OPTIONS = [
  { value: 'box', label: 'Box' },
  { value: 'cylinder', label: 'Zylinder' },
  { value: 'sphere', label: 'Kugel' },
];

export function NewLinkForm() {
  const addLink = useEditorStore((state) => state.addLink);
  const robot = useEditorStore((state) => state.robot);
  const setActiveTool = useUIStore((state) => state.setActiveTool);
  const selectLink = useEditorStore((state) => state.selectLink);

  const [name, setName] = useState(`link_${robot.links.length + 1}`);
  const [geometryType, setGeometryType] = useState<'box' | 'cylinder' | 'sphere'>('box');
  const [boxSize, setBoxSize] = useState<[number, number, number]>([0.5, 0.5, 0.5]);
  const [cylinderRadius, setCylinderRadius] = useState(0.25);
  const [cylinderLength, setCylinderLength] = useState(0.5);
  const [sphereRadius, setSphereRadius] = useState(0.25);
  const [color, setColor] = useState('#4a9eff');
  const [mass, setMass] = useState(1.0);

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Bitte einen Namen eingeben');
      return;
    }
    if (robot.links.some((l) => l.name === name.trim())) {
      alert('Ein Link mit diesem Namen existiert bereits');
      return;
    }

    let geometry: BoxGeometry | CylinderGeometry | SphereGeometry;
    switch (geometryType) {
      case 'box':
        geometry = { type: 'box', size: boxSize };
        break;
      case 'cylinder':
        geometry = { type: 'cylinder', radius: cylinderRadius, length: cylinderLength };
        break;
      case 'sphere':
        geometry = { type: 'sphere', radius: sphereRadius };
        break;
    }

    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    const material: Material = { name: `${name}_material`, color: [r, g, b, 1.0] };
    const visual: Visual = { origin: createDefaultOrigin(), geometry, material };
    const collision: Collision = { origin: createDefaultOrigin(), geometry };

    let inertia = createDefaultInertiaMatrix();
    if (geometryType === 'box') {
      const [x, y, z] = boxSize;
      inertia = {
        ixx: (mass / 12) * (y * y + z * z), ixy: 0, ixz: 0,
        iyy: (mass / 12) * (x * x + z * z), iyz: 0,
        izz: (mass / 12) * (x * x + y * y),
      };
    } else if (geometryType === 'cylinder') {
      const r = cylinderRadius, h = cylinderLength;
      inertia = {
        ixx: (mass / 12) * (3 * r * r + h * h), ixy: 0, ixz: 0,
        iyy: (mass / 12) * (3 * r * r + h * h), iyz: 0,
        izz: (mass / 2) * r * r,
      };
    } else {
      const i = (2 / 5) * mass * sphereRadius * sphereRadius;
      inertia = { ixx: i, ixy: 0, ixz: 0, iyy: i, iyz: 0, izz: i };
    }

    const inertial: Inertial = { origin: createDefaultOrigin(), mass, inertia };

    const link: Link = {
      name: name.trim(),
      visual,
      collision,
      inertial,
      connection_points: [],
      editor_position: [0, 0, 0],
      editor_color: color,
    };

    addLink(link);
    selectLink(link.name);
    setActiveTool('select');
    setName(`link_${robot.links.length + 2}`);
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z.B. base_link"
      />

      {/* Geometry Type */}
      <Select
        label="Geometrie"
        value={geometryType}
        onChange={(v) => setGeometryType(v as 'box' | 'cylinder' | 'sphere')}
        options={GEOMETRY_OPTIONS}
      />

      {/* Box */}
      {geometryType === 'box' && (
        <div>
          <label className="text-xs text-gray-400 block mb-2">Groesse (m)</label>
          <div className="grid grid-cols-3 gap-2">
            {['Breite', 'Tiefe', 'Hoehe'].map((label, i) => (
              <Input
                key={label}
                label={label}
                type="number"
                step="0.1"
                min="0.01"
                value={boxSize[i]}
                onChange={(e) => {
                  const size = [...boxSize] as [number, number, number];
                  size[i] = parseFloat(e.target.value) || 0.1;
                  setBoxSize(size);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cylinder */}
      {geometryType === 'cylinder' && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Radius (m)"
            type="number"
            step="0.05"
            min="0.01"
            value={cylinderRadius}
            onChange={(e) => setCylinderRadius(parseFloat(e.target.value) || 0.1)}
          />
          <Input
            label="Laenge (m)"
            type="number"
            step="0.1"
            min="0.01"
            value={cylinderLength}
            onChange={(e) => setCylinderLength(parseFloat(e.target.value) || 0.1)}
          />
        </div>
      )}

      {/* Sphere */}
      {geometryType === 'sphere' && (
        <Input
          label="Radius (m)"
          type="number"
          step="0.05"
          min="0.01"
          value={sphereRadius}
          onChange={(e) => setSphereRadius(parseFloat(e.target.value) || 0.1)}
        />
      )}

      {/* Color */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Farbe</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-gray-700"
          />
          <span className="text-sm text-gray-400 font-mono">{color}</span>
        </div>
      </div>

      {/* Mass */}
      <Input
        label="Masse (kg)"
        type="number"
        step="0.1"
        min="0.01"
        value={mass}
        onChange={(e) => setMass(parseFloat(e.target.value) || 1)}
      />

      {/* Buttons */}
      <div className="pt-4 space-y-2">
        <Button variant="primary" onClick={handleCreate} className="w-full">
          Link erstellen
        </Button>
        <Button variant="ghost" onClick={() => setActiveTool('select')} className="w-full">
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
