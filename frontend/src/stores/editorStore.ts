/**
 * Main editor state store with undo/redo support.
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import type {
  URDFRobot,
  Link,
  Joint,
  ConnectionPoint,
} from '../types/urdf';

// State that should be tracked for undo/redo
interface UndoableState {
  robot: URDFRobot;
}

interface EditorState extends UndoableState {
  // Selection state (not undoable)
  selectedLinkId: string | null;
  selectedJointId: string | null;
  selectedConnectionPointId: string | null;

  // Link actions
  addLink: (link: Link) => void;
  updateLink: (name: string, updates: Partial<Link>) => void;
  deleteLink: (name: string) => void;
  getLink: (name: string) => Link | undefined;

  // Connection point actions
  addConnectionPoint: (linkName: string, point: ConnectionPoint) => void;
  updateConnectionPoint: (linkName: string, pointId: string, updates: Partial<ConnectionPoint>) => void;
  deleteConnectionPoint: (linkName: string, pointId: string) => void;

  // Joint actions
  addJoint: (joint: Joint) => void;
  updateJoint: (name: string, updates: Partial<Joint>) => void;
  deleteJoint: (name: string) => void;
  getJoint: (name: string) => Joint | undefined;

  // Selection actions
  selectLink: (name: string | null) => void;
  selectJoint: (name: string | null) => void;
  selectConnectionPoint: (pointId: string | null) => void;
  clearSelection: () => void;

  // Robot actions
  setRobot: (robot: URDFRobot) => void;
  updateRobotName: (name: string) => void;
  clearRobot: () => void;

  // Batch operations
  batchUpdate: (updater: (state: UndoableState) => void) => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    immer((set, get) => ({
      robot: {
        name: 'new_robot',
        links: [],
        joints: [],
      },
      selectedLinkId: null,
      selectedJointId: null,
      selectedConnectionPointId: null,

      // Link actions
      addLink: (link) =>
        set((state) => {
          state.robot.links.push(link);
        }),

      updateLink: (name, updates) =>
        set((state) => {
          const link = state.robot.links.find((l) => l.name === name);
          if (link) {
            Object.assign(link, updates);
          }
        }),

      deleteLink: (name) =>
        set((state) => {
          state.robot.links = state.robot.links.filter((l) => l.name !== name);
          // Also delete joints connected to this link
          state.robot.joints = state.robot.joints.filter(
            (j) => j.parent !== name && j.child !== name
          );
          if (state.selectedLinkId === name) {
            state.selectedLinkId = null;
          }
        }),

      getLink: (name) => {
        return get().robot.links.find((l) => l.name === name);
      },

      // Connection point actions
      addConnectionPoint: (linkName, point) =>
        set((state) => {
          const link = state.robot.links.find((l) => l.name === linkName);
          if (link) {
            link.connection_points.push(point);
          }
        }),

      updateConnectionPoint: (linkName, pointId, updates) =>
        set((state) => {
          const link = state.robot.links.find((l) => l.name === linkName);
          if (link) {
            const point = link.connection_points.find((p) => p.id === pointId);
            if (point) {
              Object.assign(point, updates);
            }
          }
        }),

      deleteConnectionPoint: (linkName, pointId) =>
        set((state) => {
          const link = state.robot.links.find((l) => l.name === linkName);
          if (link) {
            link.connection_points = link.connection_points.filter((p) => p.id !== pointId);
          }
          // Also remove reference from joints
          state.robot.joints.forEach((joint) => {
            if (joint.parent_connection_point_id === pointId) {
              joint.parent_connection_point_id = null;
            }
            if (joint.child_connection_point_id === pointId) {
              joint.child_connection_point_id = null;
            }
          });
        }),

      // Joint actions
      addJoint: (joint) =>
        set((state) => {
          state.robot.joints.push(joint);
        }),

      updateJoint: (name, updates) =>
        set((state) => {
          const joint = state.robot.joints.find((j) => j.name === name);
          if (joint) {
            Object.assign(joint, updates);
          }
        }),

      deleteJoint: (name) =>
        set((state) => {
          const joint = state.robot.joints.find((j) => j.name === name);
          if (joint) {
            // Clear connection point references
            state.robot.links.forEach((link) => {
              link.connection_points.forEach((cp) => {
                if (cp.attached_joint_id === name) {
                  cp.attached_joint_id = null;
                }
              });
            });
          }
          state.robot.joints = state.robot.joints.filter((j) => j.name !== name);
          if (state.selectedJointId === name) {
            state.selectedJointId = null;
          }
        }),

      getJoint: (name) => {
        return get().robot.joints.find((j) => j.name === name);
      },

      // Selection actions
      selectLink: (name) =>
        set((state) => {
          state.selectedLinkId = name;
          state.selectedJointId = null;
          state.selectedConnectionPointId = null;
        }),

      selectJoint: (name) =>
        set((state) => {
          state.selectedJointId = name;
          state.selectedLinkId = null;
          state.selectedConnectionPointId = null;
        }),

      selectConnectionPoint: (pointId) =>
        set((state) => {
          state.selectedConnectionPointId = pointId;
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedLinkId = null;
          state.selectedJointId = null;
          state.selectedConnectionPointId = null;
        }),

      // Robot actions
      setRobot: (robot) =>
        set((state) => {
          state.robot = robot;
          state.selectedLinkId = null;
          state.selectedJointId = null;
          state.selectedConnectionPointId = null;
        }),

      updateRobotName: (name) =>
        set((state) => {
          state.robot.name = name;
        }),

      clearRobot: () =>
        set((state) => {
          state.robot = {
            name: 'new_robot',
            links: [],
            joints: [],
          };
          state.selectedLinkId = null;
          state.selectedJointId = null;
          state.selectedConnectionPointId = null;
        }),

      batchUpdate: (updater) =>
        set((state) => {
          updater(state);
        }),
    })),
    {
      limit: 100,
      partialize: (state) => ({
        robot: state.robot,
      }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
);

// Hook for accessing temporal (undo/redo) controls
export const useTemporalStore = () => useEditorStore.temporal.getState();

// Selector hooks for common selections - directly access state for proper reactivity
export const useSelectedLink = () => {
  return useEditorStore((state) => {
    if (!state.selectedLinkId) return null;
    return state.robot.links.find((l) => l.name === state.selectedLinkId) || null;
  });
};

export const useSelectedJoint = () => {
  return useEditorStore((state) => {
    if (!state.selectedJointId) return null;
    return state.robot.joints.find((j) => j.name === state.selectedJointId) || null;
  });
};
