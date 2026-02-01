/**
 * Clean properties panel - shows context-sensitive content.
 */

import { useEditorStore } from '../../stores/editorStore';
import { LinkEditor } from './LinkEditor';
import { JointEditor } from './JointEditor';
import { ConnectionPointEditor } from './ConnectionPointEditor';
import { NewLinkForm } from './NewLinkForm';
import { useUIStore } from '../../stores/uiStore';
import { Box, Link2, CircleDot, MousePointer2 } from 'lucide-react';

export function PropertiesPanel() {
  const selectedLinkId = useEditorStore((state) => state.selectedLinkId);
  const selectedJointId = useEditorStore((state) => state.selectedJointId);
  const activeTool = useUIStore((state) => state.activeTool);

  // New Link Form
  if (activeTool === 'add-link') {
    return (
      <div className="h-full flex flex-col">
        <PanelHeader icon={<Box className="w-4 h-4" />} title="Neuer Link" />
        <div className="flex-1 overflow-y-auto p-4">
          <NewLinkForm />
        </div>
      </div>
    );
  }

  // Link Editor
  if (selectedLinkId) {
    return (
      <div className="h-full flex flex-col">
        <PanelHeader icon={<Box className="w-4 h-4" />} title="Link bearbeiten" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <LinkEditor />
          </div>
          <div className="border-t border-gray-800">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <CircleDot className="w-4 h-4" />
                Verbindungspunkte
              </h3>
              <ConnectionPointEditor />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Joint Editor
  if (selectedJointId) {
    return (
      <div className="h-full flex flex-col">
        <PanelHeader icon={<Link2 className="w-4 h-4" />} title="Gelenk bearbeiten" />
        <div className="flex-1 overflow-y-auto p-4">
          <JointEditor />
        </div>
      </div>
    );
  }

  // Empty State
  return (
    <div className="h-full flex flex-col">
      <PanelHeader icon={<MousePointer2 className="w-4 h-4" />} title="Eigenschaften" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-500">
          <MousePointer2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Waehlen Sie ein Element aus</p>
          <p className="text-xs mt-1">oder erstellen Sie einen neuen Link (L)</p>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
      <span className="text-blue-400">{icon}</span>
      <h2 className="text-sm font-medium text-white">{title}</h2>
    </div>
  );
}
