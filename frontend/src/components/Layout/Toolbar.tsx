/**
 * Clean, minimal toolbar with essential tools.
 */

import {
  MousePointer2,
  Move,
  RotateCcw,
  Box,
  CircleDot,
  Link2,
  Undo2,
  Redo2,
  Download,
  Upload,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore, useTemporalStore } from '../../stores/editorStore';
import type { EditorTool } from '../../types/editor';
import { cn } from '../../utils/cn';

interface ToolButtonProps {
  tool?: EditorTool;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

function ToolButton({ tool, icon, label, shortcut, active, onClick, disabled }: ToolButtonProps) {
  const activeTool = useUIStore((state) => state.activeTool);
  const setActiveTool = useUIStore((state) => state.setActiveTool);

  const isActive = active ?? (tool ? activeTool === tool : false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (tool) {
      setActiveTool(tool);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm',
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function IconButton({
  icon,
  onClick,
  disabled,
  title
}: {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-white',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-400'
      )}
      title={title}
    >
      {icon}
    </button>
  );
}

export function Toolbar() {
  const openDialog = useUIStore((state) => state.openDialog);
  const temporal = useTemporalStore();
  const robot = useEditorStore((state) => state.robot);

  const canUndo = temporal.pastStates.length > 0;
  const canRedo = temporal.futureStates.length > 0;

  return (
    <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 pr-4 mr-2 border-r border-gray-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
          U
        </div>
        <span className="text-sm font-medium text-white hidden sm:inline">{robot.name}</span>
      </div>

      {/* File Operations */}
      <div className="flex items-center gap-1 pr-2 mr-2 border-r border-gray-700">
        <IconButton
          icon={<Upload className="w-4 h-4" />}
          onClick={() => openDialog('importDialog')}
          title="Import (URDF laden)"
        />
        <IconButton
          icon={<Download className="w-4 h-4" />}
          onClick={() => openDialog('exportDialog')}
          title="Export (URDF speichern)"
        />
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 pr-2 mr-2 border-r border-gray-700">
        <IconButton
          icon={<Undo2 className="w-4 h-4" />}
          onClick={() => temporal.undo()}
          disabled={!canUndo}
          title="Rueckgaengig (Cmd+Z)"
        />
        <IconButton
          icon={<Redo2 className="w-4 h-4" />}
          onClick={() => temporal.redo()}
          disabled={!canRedo}
          title="Wiederholen (Cmd+Shift+Z)"
        />
      </div>

      {/* Selection & Transform Tools */}
      <div className="flex items-center gap-1 pr-2 mr-2 border-r border-gray-700">
        <ToolButton
          tool="select"
          icon={<MousePointer2 className="w-4 h-4" />}
          label="Auswahl"
          shortcut="V"
        />
        <ToolButton
          tool="move"
          icon={<Move className="w-4 h-4" />}
          label="Bewegen"
          shortcut="G"
        />
        <ToolButton
          tool="rotate"
          icon={<RotateCcw className="w-4 h-4" />}
          label="Drehen"
          shortcut="R"
        />
      </div>

      {/* Creation Tools */}
      <div className="flex items-center gap-1">
        <ToolButton
          tool="add-link"
          icon={<Box className="w-4 h-4" />}
          label="+ Link"
          shortcut="L"
        />
        <ToolButton
          tool="add-connection-point"
          icon={<CircleDot className="w-4 h-4" />}
          label="+ Punkt"
          shortcut="P"
        />
        <ToolButton
          icon={<Link2 className="w-4 h-4" />}
          label="Verbinden"
          shortcut="C"
          onClick={() => openDialog('connectionDialog')}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <div className="text-xs text-gray-500 hidden md:flex items-center gap-4">
        <span>{robot.links.length} Links</span>
        <span>{robot.joints.length} Gelenke</span>
      </div>
    </div>
  );
}
