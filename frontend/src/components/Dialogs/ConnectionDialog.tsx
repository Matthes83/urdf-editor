/**
 * Dialog for creating connections (joints) between links.
 * Provides an interactive way to select source and target connection points.
 */

import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link2, X, ArrowRight, AlertCircle } from 'lucide-react';
import { Button, Select } from '../ui';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import type { JointType } from '../../types/urdf';
import { createDefaultJointLimit } from '../../types/urdf';

const JOINT_TYPE_OPTIONS = [
  { value: 'revolute', label: 'Revolute (Drehgelenk)' },
  { value: 'prismatic', label: 'Prismatic (Schubgelenk)' },
  { value: 'fixed', label: 'Fixed (Fest)' },
];

export function ConnectionDialog() {
  const isOpen = useUIStore((state) => state.dialogs.connectionDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);

  const robot = useEditorStore((state) => state.robot);
  const addJoint = useEditorStore((state) => state.addJoint);
  const updateConnectionPoint = useEditorStore((state) => state.updateConnectionPoint);
  const updateLink = useEditorStore((state) => state.updateLink);
  const selectJoint = useEditorStore((state) => state.selectJoint);

  // Form state
  const [sourceLinkId, setSourceLinkId] = useState<string>('');
  const [sourcePointId, setSourcePointId] = useState<string>('');
  const [targetLinkId, setTargetLinkId] = useState<string>('');
  const [targetPointId, setTargetPointId] = useState<string>('');
  const [jointType, setJointType] = useState<JointType>('revolute');
  const [error, setError] = useState<string | null>(null);

  // Get links with available (unconnected) connection points
  const linksWithPoints = useMemo(() => {
    return robot.links.filter((link) => link.connection_points.length > 0);
  }, [robot.links]);

  // Get available source points for selected source link
  const availableSourcePoints = useMemo(() => {
    const link = robot.links.find((l) => l.name === sourceLinkId);
    if (!link) return [];
    return link.connection_points.filter((p) => !p.attached_joint_id);
  }, [robot.links, sourceLinkId]);

  // Get available target links (not the same as source)
  const availableTargetLinks = useMemo(() => {
    return linksWithPoints.filter((link) => link.name !== sourceLinkId);
  }, [linksWithPoints, sourceLinkId]);

  // Get available target points for selected target link
  const availableTargetPoints = useMemo(() => {
    const link = robot.links.find((l) => l.name === targetLinkId);
    if (!link) return [];
    return link.connection_points.filter((p) => !p.attached_joint_id);
  }, [robot.links, targetLinkId]);

  // Link options for dropdowns
  const sourceLinkOptions = useMemo(() => {
    return linksWithPoints.map((link) => ({
      value: link.name,
      label: `${link.name} (${link.connection_points.filter((p) => !p.attached_joint_id).length} frei)`,
    }));
  }, [linksWithPoints]);

  const targetLinkOptions = useMemo(() => {
    return availableTargetLinks.map((link) => ({
      value: link.name,
      label: `${link.name} (${link.connection_points.filter((p) => !p.attached_joint_id).length} frei)`,
    }));
  }, [availableTargetLinks]);

  const sourcePointOptions = useMemo(() => {
    return availableSourcePoints.map((point) => ({
      value: point.id,
      label: point.name,
    }));
  }, [availableSourcePoints]);

  const targetPointOptions = useMemo(() => {
    return availableTargetPoints.map((point) => ({
      value: point.id,
      label: point.name,
    }));
  }, [availableTargetPoints]);

  // Reset form when source link changes
  const handleSourceLinkChange = (linkId: string) => {
    setSourceLinkId(linkId);
    setSourcePointId('');
    setError(null);
  };

  // Reset target point when target link changes
  const handleTargetLinkChange = (linkId: string) => {
    setTargetLinkId(linkId);
    setTargetPointId('');
    setError(null);
  };

  const handleConnect = () => {
    setError(null);

    // Validation
    if (!sourceLinkId || !sourcePointId || !targetLinkId || !targetPointId) {
      setError('Bitte alle Felder ausfuellen.');
      return;
    }

    const sourceLink = robot.links.find((l) => l.name === sourceLinkId);
    const targetLink = robot.links.find((l) => l.name === targetLinkId);
    const sourcePoint = sourceLink?.connection_points.find((p) => p.id === sourcePointId);
    const targetPoint = targetLink?.connection_points.find((p) => p.id === targetPointId);

    if (!sourceLink || !targetLink || !sourcePoint || !targetPoint) {
      setError('Ungueltige Auswahl.');
      return;
    }

    if (sourcePoint.attached_joint_id || targetPoint.attached_joint_id) {
      setError('Ein oder mehrere Verbindungspunkte sind bereits verbunden.');
      return;
    }

    // Generate unique joint name
    const baseName = `${sourceLinkId}_to_${targetLinkId}_joint`;
    let jointName = baseName;
    let counter = 1;
    while (robot.joints.some((j) => j.name === jointName)) {
      jointName = `${baseName}_${counter}`;
      counter++;
    }

    // Calculate joint origin (at source connection point, relative to parent)
    const originXyz: [number, number, number] = [
      sourcePoint.position[0],
      sourcePoint.position[1],
      sourcePoint.position[2],
    ];

    // Create the joint
    const newJoint = {
      name: jointName,
      type: jointType,
      parent: sourceLinkId,
      child: targetLinkId,
      origin: {
        xyz: originXyz,
        rpy: [0, 0, 0] as [number, number, number],
      },
      axis: [0, 0, 1] as [number, number, number],
      limit: jointType !== 'fixed' ? createDefaultJointLimit(jointType) : null,
      dynamics: null,
      parent_connection_point_id: sourcePointId,
      child_connection_point_id: targetPointId,
      current_value: 0,
    };

    addJoint(newJoint);

    // Mark connection points as used
    updateConnectionPoint(sourceLinkId, sourcePointId, {
      attached_joint_id: jointName,
    });
    updateConnectionPoint(targetLinkId, targetPointId, {
      attached_joint_id: jointName,
    });

    // Dock the child link to the parent link
    const parentWorldPos: [number, number, number] = [
      sourceLink.editor_position[0] + sourcePoint.position[0],
      sourceLink.editor_position[1] + sourcePoint.position[1],
      sourceLink.editor_position[2] + sourcePoint.position[2],
    ];

    const newChildPos: [number, number, number] = [
      parentWorldPos[0] - targetPoint.position[0],
      parentWorldPos[1] - targetPoint.position[1],
      parentWorldPos[2] - targetPoint.position[2],
    ];

    updateLink(targetLinkId, { editor_position: newChildPos });

    // Select the new joint
    selectJoint(jointName);

    // Close dialog
    handleClose();
  };

  const handleClose = () => {
    setSourceLinkId('');
    setSourcePointId('');
    setTargetLinkId('');
    setTargetPointId('');
    setJointType('revolute');
    setError(null);
    closeDialog('connectionDialog');
  };

  const canConnect = sourceLinkId && sourcePointId && targetLinkId && targetPointId;

  // Check if there are enough links and points to make a connection
  const hasEnoughLinks = linksWithPoints.length >= 2;
  const totalAvailablePoints = robot.links.reduce(
    (sum, link) => sum + link.connection_points.filter((p) => !p.attached_joint_id).length,
    0
  );
  const hasEnoughPoints = totalAvailablePoints >= 2;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-lg p-6 w-[500px] max-h-[85vh] overflow-y-auto border border-gray-700 z-50">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Verbindung erstellen
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Warning if not enough links/points */}
          {(!hasEnoughLinks || !hasEnoughPoints) && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded text-yellow-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                {!hasEnoughLinks && (
                  <p>Es werden mindestens 2 Links mit Verbindungspunkten benoetigt.</p>
                )}
                {hasEnoughLinks && !hasEnoughPoints && (
                  <p>Es werden mindestens 2 freie Verbindungspunkte benoetigt.</p>
                )}
                <p className="mt-1 text-yellow-400">
                  Erstellen Sie Links und fuegen Sie Verbindungspunkte hinzu (Taste P).
                </p>
              </div>
            </div>
          )}

          {/* Source Selection */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Quelle (Parent)</h3>
              <div className="space-y-3">
                <Select
                  label="Link"
                  value={sourceLinkId}
                  onChange={handleSourceLinkChange}
                  options={sourceLinkOptions}
                  placeholder="Link auswaehlen..."
                />
                {sourceLinkId && (
                  <Select
                    label="Verbindungspunkt"
                    value={sourcePointId}
                    onChange={setSourcePointId}
                    options={sourcePointOptions}
                    placeholder="Punkt auswaehlen..."
                    disabled={sourcePointOptions.length === 0}
                  />
                )}
                {sourceLinkId && sourcePointOptions.length === 0 && (
                  <p className="text-sm text-yellow-400">
                    Keine freien Verbindungspunkte auf diesem Link.
                  </p>
                )}
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-500" />
            </div>

            {/* Target Selection */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Ziel (Child)</h3>
              <div className="space-y-3">
                <Select
                  label="Link"
                  value={targetLinkId}
                  onChange={handleTargetLinkChange}
                  options={targetLinkOptions}
                  placeholder="Link auswaehlen..."
                  disabled={!sourceLinkId}
                />
                {targetLinkId && (
                  <Select
                    label="Verbindungspunkt"
                    value={targetPointId}
                    onChange={setTargetPointId}
                    options={targetPointOptions}
                    placeholder="Punkt auswaehlen..."
                    disabled={targetPointOptions.length === 0}
                  />
                )}
                {targetLinkId && targetPointOptions.length === 0 && (
                  <p className="text-sm text-yellow-400">
                    Keine freien Verbindungspunkte auf diesem Link.
                  </p>
                )}
              </div>
            </div>

            {/* Joint Type Selection */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Gelenktyp</h3>
              <Select
                label="Typ"
                value={jointType}
                onChange={(v) => setJointType(v as JointType)}
                options={JOINT_TYPE_OPTIONS}
              />
              <p className="text-xs text-gray-400 mt-2">
                {jointType === 'revolute' && 'Drehbewegung um eine Achse (z.B. Scharniergelenk)'}
                {jointType === 'prismatic' && 'Lineare Bewegung entlang einer Achse (z.B. Teleskop)'}
                {jointType === 'fixed' && 'Keine Bewegung - feste Verbindung'}
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Preview info */}
          {canConnect && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded text-green-300 text-sm">
              <strong>Verbindung:</strong> {sourceLinkId} &rarr; {targetLinkId} ({jointType})
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={!canConnect}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Verbinden
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
