/**
 * Editor for link properties including size and mass.
 */

import { useSelectedLink, useEditorStore } from '../../stores/editorStore';
import { Input, Slider, Button } from '../ui';
import { Trash2 } from 'lucide-react';
import type { BoxGeometry, CylinderGeometry, SphereGeometry } from '../../types/urdf';

export function LinkEditor() {
  const link = useSelectedLink();
  const updateLink = useEditorStore((state) => state.updateLink);
  const deleteLink = useEditorStore((state) => state.deleteLink);

  if (!link) return null;

  const geometry = link.visual?.geometry;
  const material = link.visual?.material;

  const handlePositionChange = (axis: 0 | 1 | 2, value: number) => {
    const newPosition = [...link.editor_position] as [number, number, number];
    newPosition[axis] = value;
    updateLink(link.name, { editor_position: newPosition });
  };

  const handleColorChange = (colorHex: string) => {
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;

    if (link.visual) {
      updateLink(link.name, {
        visual: {
          ...link.visual,
          material: {
            ...link.visual.material,
            name: link.visual.material?.name || 'material',
            color: [r, g, b, 1.0],
          },
        },
      });
    }
  };

  // Update box geometry
  const handleBoxChange = (size: [number, number, number]) => {
    if (!link.visual || !geometry || geometry.type !== 'box') return;

    const newGeometry: BoxGeometry = { type: 'box', size };

    updateLink(link.name, {
      visual: { ...link.visual, geometry: newGeometry },
      collision: link.collision ? { ...link.collision, geometry: newGeometry } : null,
    });

    // Recalculate inertia
    if (link.inertial) {
      const mass = link.inertial.mass;
      const [x, y, z] = size;
      updateLink(link.name, {
        inertial: {
          ...link.inertial,
          inertia: {
            ixx: (mass / 12) * (y * y + z * z),
            ixy: 0,
            ixz: 0,
            iyy: (mass / 12) * (x * x + z * z),
            iyz: 0,
            izz: (mass / 12) * (x * x + y * y),
          },
        },
      });
    }
  };

  // Update cylinder geometry
  const handleCylinderChange = (radius: number, length: number) => {
    if (!link.visual || !geometry || geometry.type !== 'cylinder') return;

    const newGeometry: CylinderGeometry = { type: 'cylinder', radius, length };

    updateLink(link.name, {
      visual: { ...link.visual, geometry: newGeometry },
      collision: link.collision ? { ...link.collision, geometry: newGeometry } : null,
    });

    // Recalculate inertia
    if (link.inertial) {
      const mass = link.inertial.mass;
      updateLink(link.name, {
        inertial: {
          ...link.inertial,
          inertia: {
            ixx: (mass / 12) * (3 * radius * radius + length * length),
            ixy: 0,
            ixz: 0,
            iyy: (mass / 12) * (3 * radius * radius + length * length),
            iyz: 0,
            izz: (mass / 2) * radius * radius,
          },
        },
      });
    }
  };

  // Update sphere geometry
  const handleSphereChange = (radius: number) => {
    if (!link.visual || !geometry || geometry.type !== 'sphere') return;

    const newGeometry: SphereGeometry = { type: 'sphere', radius };

    updateLink(link.name, {
      visual: { ...link.visual, geometry: newGeometry },
      collision: link.collision ? { ...link.collision, geometry: newGeometry } : null,
    });

    // Recalculate inertia
    if (link.inertial) {
      const mass = link.inertial.mass;
      const i = (2 / 5) * mass * radius * radius;
      updateLink(link.name, {
        inertial: {
          ...link.inertial,
          inertia: { ixx: i, ixy: 0, ixz: 0, iyy: i, iyz: 0, izz: i },
        },
      });
    }
  };

  // Update mass and recalculate inertia
  const handleMassChange = (mass: number) => {
    if (!link.inertial || !geometry) return;

    let inertia = link.inertial.inertia;

    if (geometry.type === 'box') {
      const [x, y, z] = geometry.size;
      inertia = {
        ixx: (mass / 12) * (y * y + z * z),
        ixy: 0,
        ixz: 0,
        iyy: (mass / 12) * (x * x + z * z),
        iyz: 0,
        izz: (mass / 12) * (x * x + y * y),
      };
    } else if (geometry.type === 'cylinder') {
      const r = geometry.radius;
      const h = geometry.length;
      inertia = {
        ixx: (mass / 12) * (3 * r * r + h * h),
        ixy: 0,
        ixz: 0,
        iyy: (mass / 12) * (3 * r * r + h * h),
        iyz: 0,
        izz: (mass / 2) * r * r,
      };
    } else if (geometry.type === 'sphere') {
      const i = (2 / 5) * mass * geometry.radius * geometry.radius;
      inertia = { ixx: i, ixy: 0, ixz: 0, iyy: i, iyz: 0, izz: i };
    }

    updateLink(link.name, {
      inertial: { ...link.inertial, mass, inertia },
    });
  };

  const handleDelete = () => {
    if (confirm(`"${link.name}" loeschen? Verbundene Gelenke werden ebenfalls geloescht.`)) {
      deleteLink(link.name);
    }
  };

  const colorHex = material?.color
    ? `#${Math.round(material.color[0] * 255).toString(16).padStart(2, '0')}${Math.round(material.color[1] * 255).toString(16).padStart(2, '0')}${Math.round(material.color[2] * 255).toString(16).padStart(2, '0')}`
    : link.editor_color;

  return (
    <div className="space-y-4">
      {/* Name */}
      <Input
        label="Name"
        value={link.name}
        onChange={(e) => updateLink(link.name, { name: e.target.value })}
      />

      {/* Position */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Position (m)</label>
        <div className="grid grid-cols-3 gap-2">
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <Input
              key={axis}
              label={axis}
              type="number"
              step="0.1"
              value={link.editor_position[i]}
              onChange={(e) => handlePositionChange(i as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
            />
          ))}
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
                step="0.05"
                min="0.01"
                value={geometry.size[0]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.1;
                  handleBoxChange([val, geometry.size[1], geometry.size[2]]);
                }}
              />
              <Input
                label="Tiefe"
                type="number"
                step="0.05"
                min="0.01"
                value={geometry.size[1]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.1;
                  handleBoxChange([geometry.size[0], val, geometry.size[2]]);
                }}
              />
              <Input
                label="Hoehe"
                type="number"
                step="0.05"
                min="0.01"
                value={geometry.size[2]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.1;
                  handleBoxChange([geometry.size[0], geometry.size[1], val]);
                }}
              />
            </div>
          )}

          {geometry.type === 'cylinder' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Radius (m)"
                type="number"
                step="0.05"
                min="0.01"
                value={geometry.radius}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.1;
                  handleCylinderChange(val, geometry.length);
                }}
              />
              <Input
                label="Laenge (m)"
                type="number"
                step="0.05"
                min="0.01"
                value={geometry.length}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.1;
                  handleCylinderChange(geometry.radius, val);
                }}
              />
            </div>
          )}

          {geometry.type === 'sphere' && (
            <Input
              label="Radius (m)"
              type="number"
              step="0.05"
              min="0.01"
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
            step="0.1"
            min="0.01"
            value={link.inertial.mass}
            onChange={(e) => handleMassChange(parseFloat(e.target.value) || 0.1)}
          />
          <Slider
            label=""
            value={link.inertial.mass}
            onChange={handleMassChange}
            min={0.01}
            max={100}
            step={0.1}
          />
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
