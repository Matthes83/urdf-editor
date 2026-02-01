/**
 * Clean editor for connection points.
 */

import { useSelectedLink, useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../ui';
import { Trash2, Link2 } from 'lucide-react';

export function ConnectionPointEditor() {
  const link = useSelectedLink();
  const robot = useEditorStore((state) => state.robot);
  const deleteConnectionPoint = useEditorStore((state) => state.deleteConnectionPoint);
  const selectedConnectionPointId = useEditorStore((state) => state.selectedConnectionPointId);
  const selectConnectionPoint = useEditorStore((state) => state.selectConnectionPoint);
  const openDialog = useUIStore((state) => state.openDialog);
  const setActiveTool = useUIStore((state) => state.setActiveTool);

  if (!link) return null;

  const points = link.connection_points;
  const hasOtherFreePoints = robot.links.some(
    (l) => l.name !== link.name && l.connection_points.some((p) => !p.attached_joint_id)
  );

  if (points.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500 mb-3">Keine Verbindungspunkte</p>
        <Button
          variant="default"
          size="sm"
          onClick={() => setActiveTool('add-connection-point')}
          className="w-full"
        >
          Punkt hinzufuegen (P)
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {points.map((point) => {
        const isSelected = selectedConnectionPointId === point.id;
        const isConnected = !!point.attached_joint_id;

        return (
          <div
            key={point.id}
            onClick={() => selectConnectionPoint(point.id)}
            className={`
              p-2 rounded border cursor-pointer transition-colors
              ${isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                />
                <span className="text-sm">{point.name}</span>
              </div>

              {!isConnected && (
                <div className="flex gap-1">
                  {hasOtherFreePoints && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog('connectionDialog');
                      }}
                      className="p-1 text-gray-400 hover:text-blue-400"
                      title="Verbinden"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConnectionPoint(link.name, point.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-400"
                    title="Loeschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {isConnected && (
              <div className="text-xs text-gray-500 mt-1 ml-4">
                → {point.attached_joint_id}
              </div>
            )}
          </div>
        );
      })}

      <Button
        variant="default"
        size="sm"
        onClick={() => setActiveTool('add-connection-point')}
        className="w-full mt-2"
      >
        + Punkt hinzufuegen
      </Button>
    </div>
  );
}
