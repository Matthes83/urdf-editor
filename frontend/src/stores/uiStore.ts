/**
 * UI state store for viewport settings, dialogs, and tool selection.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  EditorTool,
  TransformMode,
  ViewportSettings,
  EditorSettings,
  DialogState,
  ConnectionState,
} from '../types/editor';
import { defaultViewportSettings, defaultEditorSettings } from '../types/editor';

interface UIState {
  // Current tool
  activeTool: EditorTool;
  transformMode: TransformMode;

  // Viewport settings
  viewportSettings: ViewportSettings;

  // Editor settings
  editorSettings: EditorSettings;

  // Dialog states
  dialogs: DialogState;

  // Connection state (for drag-and-drop joint creation)
  connection: ConnectionState;

  // Hover state
  hoveredLinkId: string | null;
  hoveredConnectionPointId: string | null;

  // Actions
  setActiveTool: (tool: EditorTool) => void;
  setTransformMode: (mode: TransformMode) => void;
  updateViewportSettings: (settings: Partial<ViewportSettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;

  // Dialog actions
  openDialog: (dialog: keyof DialogState) => void;
  closeDialog: (dialog: keyof DialogState) => void;
  closeAllDialogs: () => void;

  // Connection actions
  startConnection: (linkId: string, pointId: string) => void;
  updateConnectionPreview: (position: [number, number, number]) => void;
  cancelConnection: () => void;
  completeConnection: () => { linkId: string; pointId: string } | null;

  // Hover actions
  setHoveredLink: (linkId: string | null) => void;
  setHoveredConnectionPoint: (pointId: string | null) => void;
}

export const useUIStore = create<UIState>()(
  immer((set, get) => ({
    activeTool: 'select',
    transformMode: 'translate',
    viewportSettings: defaultViewportSettings,
    editorSettings: defaultEditorSettings,
    dialogs: {
      newLinkDialog: false,
      importDialog: false,
      exportDialog: false,
      settingsDialog: false,
      connectionDialog: false,
    },
    connection: {
      isConnecting: false,
      sourcePoint: null,
      previewPosition: null,
    },
    hoveredLinkId: null,
    hoveredConnectionPointId: null,

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
        // Set appropriate transform mode for transform tools
        if (tool === 'move') state.transformMode = 'translate';
        if (tool === 'rotate') state.transformMode = 'rotate';
        if (tool === 'scale') state.transformMode = 'scale';
      }),

    setTransformMode: (mode) =>
      set((state) => {
        state.transformMode = mode;
      }),

    updateViewportSettings: (settings) =>
      set((state) => {
        Object.assign(state.viewportSettings, settings);
      }),

    updateEditorSettings: (settings) =>
      set((state) => {
        Object.assign(state.editorSettings, settings);
      }),

    openDialog: (dialog) =>
      set((state) => {
        state.dialogs[dialog] = true;
      }),

    closeDialog: (dialog) =>
      set((state) => {
        state.dialogs[dialog] = false;
      }),

    closeAllDialogs: () =>
      set((state) => {
        state.dialogs = {
          newLinkDialog: false,
          importDialog: false,
          exportDialog: false,
          settingsDialog: false,
          connectionDialog: false,
        };
      }),

    startConnection: (linkId, pointId) =>
      set((state) => {
        state.connection = {
          isConnecting: true,
          sourcePoint: { linkId, pointId },
          previewPosition: null,
        };
        state.activeTool = 'connect';
      }),

    updateConnectionPreview: (position) =>
      set((state) => {
        state.connection.previewPosition = position;
      }),

    cancelConnection: () =>
      set((state) => {
        state.connection = {
          isConnecting: false,
          sourcePoint: null,
          previewPosition: null,
        };
        state.activeTool = 'select';
      }),

    completeConnection: () => {
      const { connection } = get();
      if (connection.sourcePoint) {
        set((state) => {
          state.connection = {
            isConnecting: false,
            sourcePoint: null,
            previewPosition: null,
          };
          state.activeTool = 'select';
        });
        return connection.sourcePoint;
      }
      return null;
    },

    setHoveredLink: (linkId) =>
      set((state) => {
        state.hoveredLinkId = linkId;
      }),

    setHoveredConnectionPoint: (pointId) =>
      set((state) => {
        state.hoveredConnectionPointId = pointId;
      }),
  }))
);

// Keyboard shortcut hook
export const useKeyboardShortcuts = () => {
  const { setActiveTool } = useUIStore();
  const temporal = useTemporalStore();

  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // Tool shortcuts
    switch (e.key.toLowerCase()) {
      case 'v':
      case 'escape':
        setActiveTool('select');
        break;
      case 'g':
        setActiveTool('move');
        break;
      case 'r':
        setActiveTool('rotate');
        break;
      case 's':
        if (!e.metaKey && !e.ctrlKey) {
          setActiveTool('scale');
        }
        break;
      case 'l':
        setActiveTool('add-link');
        break;
      case 'p':
        setActiveTool('add-connection-point');
        break;
      case 'c':
        // Open connection dialog
        useUIStore.getState().openDialog('connectionDialog');
        break;
    }

    // Undo/Redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        temporal.redo();
      } else {
        temporal.undo();
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
      e.preventDefault();
      temporal.redo();
    }
  };

  return { handleKeyDown };
};

// Import temporal store hook
const useTemporalStore = () => {
  return useEditorStore.temporal.getState();
};

import { useEditorStore } from './editorStore';
