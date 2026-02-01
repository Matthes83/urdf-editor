/**
 * Clean main layout with toolbar, viewport, and panels.
 */

import { Viewport3D } from '../Viewport';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from '../Panels/PropertiesPanel';
import { HierarchyPanel } from '../Panels/HierarchyPanel';
import { ImportDialog, ExportDialog, ConnectionDialog } from '../Dialogs';

export function MainLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Hierarchy */}
        <div className="w-56 border-r border-gray-800 flex-shrink-0">
          <HierarchyPanel />
        </div>

        {/* Center - 3D Viewport */}
        <div className="flex-1 relative">
          <Viewport3D />
        </div>

        {/* Right Panel - Properties */}
        <div className="w-72 border-l border-gray-800 flex-shrink-0 bg-gray-900">
          <PropertiesPanel />
        </div>
      </div>

      {/* Dialogs */}
      <ImportDialog />
      <ExportDialog />
      <ConnectionDialog />
    </div>
  );
}
