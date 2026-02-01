/**
 * Editor for link properties including size and mass.
 */

import { useSelectedLink, useEditorStore } from '../../stores/editorStore';
import { Input, Slider, Button } from '../ui';
import { Trash2 } from 'lucide-react';
import type { BoxGeometry, CylinderGeometry, SphereGeometry, InertiaMatrix } from '../../types/urdf';

// Calculate inertia for different geometry types
function calculateInertia(geometryType: string, mass: number, dimensions: number[]): InertiaMatrix {
  if (geometryType === 'box') {
    const [x, y, z] = dimensions;
    return {
      ixx: (mass / 12) * (y * y + z * z),
      ixy: 0, ixz: 0,
      iyy: (mass / 12) * (x * x + z * z),
      iyz: 0,
      izz: (mass / 12) * (x * x + y * y),
    };
  } else if (geometryType === 'cylinder') {
    const [r, h] = dimensions;
    return {
      ixx: (mass / 12) * (3 * r * r + h * h),
      ixy: 0, ixz: 0,
      iyy: (mass / 12) * (3 * r * r + h * h),
      iyz: 0,
      izz: (mass / 2) * r * r,
    };
  } else {
    // sphere
    const r = dimensions[0];
    const i = (2 / 5) * mass * r * r;
    return { ixx: i, ixy: 0, ixz: 0, iyy: i, iyz: 0, izz: i };
  }
}

export function LinkEditor() {
  const link = useSelectedLink();
  const updateLink = useEditorStore((state) => state.updateLink);
  const deleteLink = useEditorStore((state) => state.deleteLink);
  // Get fresh link data directly from store to avoid stale closures
  const getLink = useEditorStore((state) => state.getLink);

  if (!link) return null;

  const geometry = link.visual?.geometry;
  const material = link.visual?.material;
  const linkName = link.name;

  const handlePositionChange = (axis: 0 | 1 | 2, value: number) => {
    // Get fresh link data
    const currentLink = getLink(linkName);
    if (!currentLink) return;
    const newPosition = [...currentLink.editor_position] as [number, number, number];
    newPosition[axis] = value;
    updateLink(linkName, { editor_position: newPosition });
  };

  const handleColorChange = (colorHex: string) => {
    const currentLink = getLink(linkName);
    if (!currentLink?.visual) return;

    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;

    updateLink(linkName, {
      visual: {
        ...currentLink.visual,
        material: {
          ...currentLink.visual.material,
          name: currentLink.visual.material?.name || 'material',
          color: [r, g, b, 1.0],
        },
      },
    });
  };

  // Update box geometry - get fresh data to avoid stale closures
  const handleBoxDimensionChange = (axis: 0 | 1 | 2, value: number) => {
    const currentLink = getLink(linkName);
    if (!currentLink?.visual?.geometry || currentLink.visual.geometry.type !== 'box') return;

    const currentSize = currentLink.visual.geometry.size;
    const newSize: [number, number, number] = [...currentSize];
    newSize[axis] = value;

    const currentMass = currentLink.inertial?.mass ?? 1;
    const newGeometry: BoxGeometry = { type: 'box', size: newSize };
    const inertia = calculateInertia('box', currentMass, newSize);

    updateLink(linkName, {
      visual: { ...currentLink.visual, geometry: newGeometry },
      collision: currentLink.collision ? { ...currentLink.collision, geometry: newGeometry } : null,
      inertial: currentLink.inertial ? { ...currentLink.inertial, inertia } : null,
    });
  };

  // Update cylinder geometry - get fresh data
  const handleCylinderDimensionChange = (field: 'radius' | 'length', value: number) => {
    const currentLink = getLink(linkName);
    if (!currentLink?.visual?.geometry || currentLink.visual.geometry.type !== 'cylinder') return;

    const current = currentLink.visual.geometry;
    const radius = field === 'radius' ? value : current.radius;
    const length = field === 'length' ? value : current.length;

    const currentMass = currentLink.inertial?.mass ?? 1;
    const newGeometry: CylinderGeometry = { type: 'cylinder', radius, length };
    const inertia = calculateInertia('cylinder', currentMass, [radius, length]);

    updateLink(linkName, {
      visual: { ...currentLink.visual, geometry: newGeometry },
      collision: currentLink.collision ? { ...currentLink.collision, geometry: newGeometry } : null,
      inertial: currentLink.inertial ? { ...currentLink.inertial, inertia } : null,
    });
  };

  // Update sphere geometry - get fresh data
  const handleSphereChange = (radius: number) => {
    const currentLink = getLink(linkName);
    if (!currentLink?.visual?.geometry || currentLink.visual.geometry.type !== 'sphere') return;

    const currentMass = currentLink.inertial?.mass ?? 1;
    const newGeometry: SphereGeometry = { type: 'sphere', radius };
    const inertia = calculateInertia('sphere', currentMass, [radius]);

    updateLink(linkName, {
      visual: { ...currentLink.visual, geometry: newGeometry },
      collision: currentLink.collision ? { ...currentLink.collision, geometry: newGeometry } : null,
      inertial: currentLink.inertial ? { ...currentLink.inertial, inertia } : null,
    });
  };

  // Update mass - get fresh data
  const handleMassChange = (newMass: number) => {
    const currentLink = getLink(linkName);
    if (!currentLink?.inertial || !currentLink.visual?.geometry) return;

    const geo = currentLink.visual.geometry;
    let dimensions: number[];
    if (geo.type === 'box') {
      dimensions = geo.size;
    } else if (geo.type === 'cylinder') {
      dimensions = [geo.radius, geo.length];
    } else if (geo.type === 'sphere') {
      dimensions = [geo.radius];
    } else {
      // mesh - just update mass without recalculating inertia
      updateLink(linkName, {
        inertial: { ...currentLink.inertial, mass: newMass },
      });
      return;
    }

    const inertia = calculateInertia(geo.type, newMass, dimensions);

    updateLink(linkName, {
      inertial: { ...currentLink.inertial, mass: newMass, inertia },
    });
  };

  const handleDelete = () => {
    if (confirm(`"${linkName}" loeschen? Verbundene Gelenke werden ebenfalls geloescht.`)) {
      deleteLink(linkName);
    }
  };

  const colorHex = material?.color
    ? `#${Math.round(material.color[0] * 255).toString(16).padStart(2, '0')}${Math.round(material.color[1] * 255).toString(16).padStart(2, '0')}${Math.round(material.color[2] * 255).toString(16).padStart(2, '0')}`
    : link.editor_color;

  return (
    <div className="space-y-4" key={linkName}>
      {/* Name */}
      <Input
        label="Name"
        value={linkName}
        onChange={(e) => updateLink(linkName, { name: e.target.value })}
      />

      {/* Position */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Position (m)</label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            label="X"
            type="number"
            step={0.1}
            value={link.editor_position[0]}
            onChange={(e) => handlePositionChange(0, parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Y"
            type="number"
            step={0.1}
            value={link.editor_position[1]}
            onChange={(e) => handlePositionChange(1, parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Z"
            type="number"
            step={0.1}
            value={link.editor_position[2]}
            onChange={(e) => handlePositionChange(2, parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Geometry Size */}
      {geometry && (
        <div className="border-t border-gray-700 pt-4">
          <label className="text-xs text-gray-400 block mb-2">
            Geometrie: {geometry.type === 'box' ? 'Box' : geometry.type === 'cylinder' ? 'Zylinder' : 'Kugel'}
          </label>

          {geometry.type === 'box' && (
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Breite"
                type="number"
                step={0.05}
                min={0.01}
                value={geometry.size[0]}
                onChange={(e) => handleBoxDimensionChange(0, parseFloat(e.target.value) || 0.1)}
              />
              <Input
                label="Tiefe"
                type="number"
                step={0.05}
                min={0.01}
                value={geometry.size[1]}
                onChange={(e) => handleBoxDimensionChange(1, parseFloat(e.target.value) || 0.1)}
              />
              <Input
                label="Hoehe"
                type="number"
                step={0.05}
                min={0.01}
                value={geometry.size[2]}
                onChange={(e) => handleBoxDimensionChange(2, parseFloat(e.target.value) || 0.1)}
              />
            </div>
          )}

          {geometry.type === 'cylinder' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Radius (m)"
                type="number"
                step={0.05}
                min={0.01}
                value={geometry.radius}
                onChange={(e) => handleCylinderDimensionChange('radius', parseFloat(e.target.value) || 0.1)}
              />
              <Input
                label="Laenge (m)"
                type="number"
                step={0.05}
                min={0.01}
                value={geometry.length}
                onChange={(e) => handleCylinderDimensionChange('length', parseFloat(e.target.value) || 0.1)}
              />
            </div>
          )}

          {geometry.type === 'sphere' && (
            <Input
              label="Radius (m)"
              type="number"
              step={0.05}
              min={0.01}
              value={geometry.radius}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0.1;
                handleSphereChange(val);
              }}
            />
          )}
        </div>
      )}

      {/* Color */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Farbe</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorHex}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-gray-700"
          />
          <span className="text-sm text-gray-400 font-mono">{colorHex}</span>
        </div>
      </div>

      {/* Mass */}
      {link.inertial && (
        <div className="border-t border-gray-700 pt-4">
          <Input
            label="Masse (kg)"
            type="number"
            step={0.1}
            min={0.01}
            value={link.inertial.mass}
            onChange={(e) => handleMassChange(parseFloat(e.target.value) || 0.1)}
          />
          <div className="mt-2">
            <Slider
              label=""
              value={link.inertial.mass}
              onChange={handleMassChange}
              min={0.01}
              max={100}
              step={0.1}
            />
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="pt-4 border-t border-gray-700">
        <Button variant="danger" onClick={handleDelete} className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          Link loeschen
        </Button>
      </div>
    </div>
  );
}
