/**
 * Bottom status bar showing robot stats and validation status.
 */

import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export function StatusBar() {
  const robot = useEditorStore((state) => state.robot);
  const selectedLinkId = useEditorStore((state) => state.selectedLinkId);
  const selectedJointId = useEditorStore((state) => state.selectedJointId);
  const activeTool = useUIStore((state) => state.activeTool);
  const connection = useUIStore((state) => state.connection);

  const linkCount = robot.links.length;
  const jointCount = robot.joints.length;
  const connectionPointCount = robot.links.reduce(
    (acc, link) => acc + link.connection_points.length,
    0
  );

  // Simple validation
  const hasRootLink = robot.links.length > 0 &&
    robot.links.some((link) => !robot.joints.some((j) => j.child === link.name));

  const allJointsValid = robot.joints.every((joint) => {
    if (joint.type === 'revolute' || joint.type === 'prismatic') {
      return joint.limit !== null;
    }
    return true;
  });

  const isValid = hasRootLink && allJointsValid;

  // Status message
  let statusMessage = 'Ready';
  if (connection.isConnecting) {
    statusMessage = 'Connecting... Click on another connection point to create a joint';
  } else if (selectedLinkId) {
    statusMessage = `Selected: Link "${selectedLinkId}"`;
  } else if (selectedJointId) {
    statusMessage = `Selected: Joint "${selectedJointId}"`;
  } else if (activeTool === 'add-link') {
    statusMessage = 'Click in viewport to add a new link';
  } else if (activeTool === 'add-connection-point') {
    statusMessage = 'Select a link, then click to add connection points';
  }

  return (
    <div className="h-8 bg-surface border-t border-gray-700 flex items-center px-4 text-xs text-gray-400">
      {/* Status message */}
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4" />
        <span>{statusMessage}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-4">
        <span>Links: {linkCount}</span>
        <span>Joints: {jointCount}</span>
        <span>Connection Points: {connectionPointCount}</span>
      </div>

      <div className="w-px h-4 bg-gray-700 mx-4" />

      {/* Validation status */}
      <div className="flex items-center gap-2">
        {isValid ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-green-500">Valid</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500">
              {!hasRootLink ? 'No root link' : 'Missing joint limits'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
