/**
 * Editor-specific type definitions.
 */

export type EditorTool =
  | 'select'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'add-link'
  | 'add-connection-point'
  | 'connect';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface ViewportSettings {
  showGrid: boolean;
  showAxes: boolean;
  showConnectionPoints: boolean;
  showJointAxes: boolean;
  gridSize: number;
  backgroundColor: string;
}

export interface EditorSettings {
  autoSave: boolean;
  autoValidate: boolean;
  snapToGrid: boolean;
  gridSnapSize: number;
}

export interface SelectionState {
  selectedLinkId: string | null;
  selectedJointId: string | null;
  selectedConnectionPointId: string | null;
  hoveredLinkId: string | null;
  hoveredConnectionPointId: string | null;
}

export interface ConnectionState {
  isConnecting: boolean;
  sourcePoint: {
    linkId: string;
    pointId: string;
  } | null;
  previewPosition: [number, number, number] | null;
}

export interface DialogState {
  newLinkDialog: boolean;
  importDialog: boolean;
  exportDialog: boolean;
  settingsDialog: boolean;
  connectionDialog: boolean;
}

export const defaultViewportSettings: ViewportSettings = {
  showGrid: true,
  showAxes: true,
  showConnectionPoints: true,
  showJointAxes: true,
  gridSize: 10,
  backgroundColor: '#1a1a2e',
};

export const defaultEditorSettings: EditorSettings = {
  autoSave: false,
  autoValidate: true,
  snapToGrid: false,
  gridSnapSize: 0.1,
};
