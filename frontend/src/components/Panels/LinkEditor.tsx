/**
 * Clean editor for link properties.
 */

import { useSelectedLink, useEditorStore } from '../../stores/editorStore';
import { Input, Slider, Button } from '../ui';
import { Trash2 } from 'lucide-react';

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

  const handleDelete = () => {
    if (confirm(`"${link.name}" loeschen? Verbundene Gelenke werden ebenfalls geloescht.`)) {
      deleteLink(link.name);
    }
  };

  const colorHex = material?.color
    ? `#${Math.round(material.color[0] * 255).toString(16).padStart(2, '0')}${Math.round(material.color[1] * 255).toString(16).padStart(2, '0')}${Math.round(material.color[2] * 255).toString(16).padStart(2, '0')}`
    : link.editor_color;

  const geometryInfo = () => {
    if (!geometry) return null;
    switch (geometry.type) {
      case 'box':
        return `Box (${geometry.size.map(s => s.toFixed(2)).join(' × ')})`;
      case 'cylinder':
        return `Zylinder (r: ${geometry.radius.toFixed(2)}, h: ${geometry.length.toFixed(2)})`;
      case 'sphere':
        return `Kugel (r: ${geometry.radius.toFixed(2)})`;
    }
  };

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

      {/* Geometry */}
      {geometry && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Geometrie</label>
          <div className="text-sm bg-gray-800 px-3 py-2 rounded">
            {geometryInfo()}
          </div>
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
        <Slider
          label="Masse (kg)"
          value={link.inertial.mass}
          onChange={(mass) =>
            updateLink(link.name, { inertial: { ...link.inertial!, mass } })
          }
          min={0.01}
          max={100}
          step={0.1}
        />
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
