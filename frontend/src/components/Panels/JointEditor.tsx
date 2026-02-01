/**
 * Clean editor for joint properties with angle control.
 */

import { useState } from 'react';
import { useSelectedJoint, useEditorStore } from '../../stores/editorStore';
import { Input, Select, Slider, Button } from '../ui';
import { Trash2, RotateCcw } from 'lucide-react';
import type { JointType } from '../../types/urdf';

const JOINT_TYPES = [
  { value: 'revolute', label: 'Drehgelenk (1 DOF)' },
  { value: 'prismatic', label: 'Schubgelenk (1 DOF)' },
  { value: 'fixed', label: 'Fest (0 DOF)' },
];

const AXIS_PRESETS: { label: string; value: [number, number, number] }[] = [
  { label: 'X', value: [1, 0, 0] },
  { label: 'Y', value: [0, 1, 0] },
  { label: 'Z', value: [0, 0, 1] },
];

const radToDeg = (rad: number) => rad * 180 / Math.PI;
const degToRad = (deg: number) => deg * Math.PI / 180;

export function JointEditor() {
  const joint = useSelectedJoint();
  const updateJoint = useEditorStore((state) => state.updateJoint);
  const deleteJoint = useEditorStore((state) => state.deleteJoint);
  const [useDegrees, setUseDegrees] = useState(true);

  if (!joint) return null;

  const isRevolute = joint.type === 'revolute';
  const isPrismatic = joint.type === 'prismatic';
  const hasLimits = joint.limit && (isRevolute || isPrismatic);

  const handleTypeChange = (type: string) => {
    const newType = type as JointType;
    const updates: Partial<typeof joint> = { type: newType };

    if ((newType === 'revolute' || newType === 'prismatic') && !joint.limit) {
      updates.limit = {
        lower: newType === 'revolute' ? -Math.PI : -1.0,
        upper: newType === 'revolute' ? Math.PI : 1.0,
        effort: 100.0,
        velocity: 1.0,
      };
    }
    if (newType === 'fixed') {
      updates.limit = undefined;
    }
    updateJoint(joint.name, updates);
  };

  const handleDelete = () => {
    if (confirm(`"${joint.name}" loeschen?`)) {
      deleteJoint(joint.name);
    }
  };

  const isAxisSelected = (preset: [number, number, number]) =>
    joint.axis[0] === preset[0] && joint.axis[1] === preset[1] && joint.axis[2] === preset[2];

  // Get display value for angle/position
  const getDisplayValue = (radValue: number) => {
    if (isRevolute && useDegrees) {
      return radToDeg(radValue);
    }
    return radValue;
  };

  // Convert display value back to radians
  const toStoredValue = (displayValue: number) => {
    if (isRevolute && useDegrees) {
      return degToRad(displayValue);
    }
    return displayValue;
  };

  const currentAngle = getDisplayValue(joint.current_value);
  const minLimit = joint.limit ? getDisplayValue(joint.limit.lower) : -180;
  const maxLimit = joint.limit ? getDisplayValue(joint.limit.upper) : 180;

  return (
    <div className="space-y-4">
      {/* Name */}
      <Input
        label="Name"
        value={joint.name}
        onChange={(e) => updateJoint(joint.name, { name: e.target.value })}
      />

      {/* Parent / Child */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">Parent</label>
          <div className="text-sm bg-gray-800 px-3 py-2 rounded truncate">{joint.parent}</div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Child</label>
          <div className="text-sm bg-gray-800 px-3 py-2 rounded truncate">{joint.child}</div>
        </div>
      </div>

      {/* Type */}
      <Select
        label="Gelenktyp"
        value={joint.type}
        onChange={handleTypeChange}
        options={JOINT_TYPES}
      />

      {/* ANGLE CONTROL - Main feature for revolute/prismatic joints */}
      {hasLimits && joint.limit && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                {isRevolute ? 'Winkel' : 'Position'}
              </span>
            </div>
            {isRevolute && (
              <Button
                size="sm"
                variant={useDegrees ? 'primary' : 'default'}
                onClick={() => setUseDegrees(!useDegrees)}
              >
                {useDegrees ? '°' : 'rad'}
              </Button>
            )}
          </div>

          {/* Large angle display */}
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-white">
              {currentAngle.toFixed(useDegrees ? 0 : 2)}
            </span>
            <span className="text-lg text-gray-400 ml-1">
              {isRevolute ? (useDegrees ? '°' : 'rad') : 'm'}
            </span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={isRevolute && useDegrees ? 1 : 0.01}
            value={currentAngle}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateJoint(joint.name, { current_value: toStoredValue(val) });
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          {/* Min/Max labels */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{minLimit.toFixed(useDegrees ? 0 : 2)}{isRevolute ? (useDegrees ? '°' : '') : 'm'}</span>
            <span>{maxLimit.toFixed(useDegrees ? 0 : 2)}{isRevolute ? (useDegrees ? '°' : '') : 'm'}</span>
          </div>

          {/* Direct input */}
          <div className="mt-3">
            <Input
              label={`Wert eingeben (${isRevolute ? (useDegrees ? '°' : 'rad') : 'm'})`}
              type="number"
              step={isRevolute && useDegrees ? 1 : 0.01}
              value={currentAngle}
              onChange={(e) => {
                let val = parseFloat(e.target.value) || 0;
                // Clamp to limits
                val = Math.max(minLimit, Math.min(maxLimit, val));
                updateJoint(joint.name, { current_value: toStoredValue(val) });
              }}
            />
          </div>

          {/* Quick angle buttons for revolute */}
          {isRevolute && useDegrees && (
            <div className="flex gap-1 mt-3">
              {[-90, -45, 0, 45, 90].map((angle) => (
                <Button
                  key={angle}
                  size="sm"
                  variant={Math.abs(currentAngle - angle) < 1 ? 'primary' : 'default'}
                  onClick={() => {
                    const clampedAngle = Math.max(minLimit, Math.min(maxLimit, angle));
                    updateJoint(joint.name, { current_value: degToRad(clampedAngle) });
                  }}
                  className="flex-1 text-xs"
                  disabled={angle < minLimit || angle > maxLimit}
                >
                  {angle}°
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Axis */}
      {joint.type !== 'fixed' && (
        <div>
          <label className="text-xs text-gray-400 block mb-2">Rotationsachse</label>
          <div className="flex gap-2">
            {AXIS_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={isAxisSelected(preset.value) ? 'primary' : 'default'}
                size="sm"
                onClick={() => updateJoint(joint.name, { axis: preset.value })}
                className="flex-1"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Limits */}
      {hasLimits && joint.limit && (
        <div className="border-t border-gray-700 pt-4">
          <label className="text-xs text-gray-400 block mb-3">Grenzen</label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={`Min (${isRevolute ? (useDegrees ? '°' : 'rad') : 'm'})`}
              type="number"
              step={isRevolute && useDegrees ? 1 : 0.1}
              value={getDisplayValue(joint.limit.lower)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updateJoint(joint.name, {
                  limit: { ...joint.limit!, lower: toStoredValue(val) },
                });
              }}
            />
            <Input
              label={`Max (${isRevolute ? (useDegrees ? '°' : 'rad') : 'm'})`}
              type="number"
              step={isRevolute && useDegrees ? 1 : 0.1}
              value={getDisplayValue(joint.limit.upper)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updateJoint(joint.name, {
                  limit: { ...joint.limit!, upper: toStoredValue(val) },
                });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Input
              label={`Kraft (${isRevolute ? 'Nm' : 'N'})`}
              type="number"
              step="1"
              value={joint.limit.effort}
              onChange={(e) =>
                updateJoint(joint.name, {
                  limit: { ...joint.limit!, effort: parseFloat(e.target.value) || 0 },
                })
              }
            />
            <Input
              label={`Max Geschw.`}
              type="number"
              step="0.1"
              value={getDisplayValue(joint.limit.velocity)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updateJoint(joint.name, {
                  limit: { ...joint.limit!, velocity: toStoredValue(val) },
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Origin */}
      <div className="border-t border-gray-700 pt-4">
        <label className="text-xs text-gray-400 block mb-2">Ursprung (m)</label>
        <div className="grid grid-cols-3 gap-2">
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <Input
              key={axis}
              label={axis}
              type="number"
              step="0.01"
              value={joint.origin.xyz[i]}
              onChange={(e) => {
                const xyz = [...joint.origin.xyz] as [number, number, number];
                xyz[i] = parseFloat(e.target.value) || 0;
                updateJoint(joint.name, { origin: { ...joint.origin, xyz } });
              }}
            />
          ))}
        </div>
      </div>

      {/* Dynamics */}
      <div className="border-t border-gray-700 pt-4">
        <label className="text-xs text-gray-400 block mb-3">Dynamik</label>
        <div className="space-y-3">
          <Slider
            label="Daempfung"
            value={joint.dynamics?.damping || 0}
            onChange={(v) =>
              updateJoint(joint.name, {
                dynamics: { damping: v, friction: joint.dynamics?.friction || 0 },
              })
            }
            min={0}
            max={100}
            step={0.1}
          />
          <Slider
            label="Reibung"
            value={joint.dynamics?.friction || 0}
            onChange={(v) =>
              updateJoint(joint.name, {
                dynamics: { damping: joint.dynamics?.damping || 0, friction: v },
              })
            }
            min={0}
            max={100}
            step={0.1}
          />
        </div>
      </div>

      {/* Delete */}
      <div className="pt-4 border-t border-gray-700">
        <Button variant="danger" onClick={handleDelete} className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          Gelenk loeschen
        </Button>
      </div>
    </div>
  );
}
