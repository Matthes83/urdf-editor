/**
 * Clean hierarchy panel showing robot structure.
 */

import { useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ChevronRight, Box, Link2, Layers } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Link, Joint } from '../../types/urdf';

interface TreeNode {
  type: 'link' | 'joint';
  name: string;
  children: TreeNode[];
  data: Link | Joint;
}

export function HierarchyPanel() {
  const robot = useEditorStore((state) => state.robot);
  const selectedLinkId = useEditorStore((state) => state.selectedLinkId);
  const selectedJointId = useEditorStore((state) => state.selectedJointId);
  const selectLink = useEditorStore((state) => state.selectLink);
  const selectJoint = useEditorStore((state) => state.selectJoint);
  const updateRobotName = useEditorStore((state) => state.updateRobotName);

  // Build hierarchy tree
  const tree = useMemo(() => {
    const childLinks = new Set(robot.joints.map((j) => j.child));
    const rootLinks = robot.links.filter((l) => !childLinks.has(l.name));

    const buildSubtree = (linkName: string): TreeNode | null => {
      const link = robot.links.find((l) => l.name === linkName);
      if (!link) return null;

      const childJoints = robot.joints.filter((j) => j.parent === linkName);
      const children: TreeNode[] = [];

      for (const joint of childJoints) {
        const childNode = buildSubtree(joint.child);
        if (childNode) {
          children.push({
            type: 'joint',
            name: joint.name,
            data: joint,
            children: [childNode],
          });
        }
      }

      return {
        type: 'link',
        name: link.name,
        data: link,
        children,
      };
    };

    return rootLinks.map((link) => buildSubtree(link.name)).filter(Boolean) as TreeNode[];
  }, [robot]);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isLink = node.type === 'link';
    const isSelected = isLink
      ? selectedLinkId === node.name
      : selectedJointId === node.name;
    const hasChildren = node.children.length > 0;

    return (
      <div key={`${node.type}-${node.name}`}>
        <button
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors',
            'hover:bg-gray-800',
            isSelected && 'bg-blue-600/20 text-blue-400'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => isLink ? selectLink(node.name) : selectJoint(node.name)}
        >
          {hasChildren ? (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          ) : (
            <span className="w-3" />
          )}

          {isLink ? (
            <Box className="w-4 h-4 text-blue-400" />
          ) : (
            <Link2 className="w-4 h-4 text-orange-400" />
          )}

          <span className={cn(
            'flex-1 truncate',
            isSelected ? 'text-white font-medium' : 'text-gray-300'
          )}>
            {node.name}
          </span>
        </button>

        {hasChildren && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-medium text-white">Struktur</h2>
      </div>

      {/* Robot Name */}
      <div className="px-4 py-2 border-b border-gray-800">
        <input
          type="text"
          value={robot.name}
          onChange={(e) => updateRobotName(e.target.value)}
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          placeholder="Robot Name"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {tree.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Box className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">Keine Links vorhanden</p>
            <p className="text-xs text-gray-600 mt-1">Druecken Sie L um einen Link zu erstellen</p>
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
        <span>{robot.links.length} Links</span>
        <span>{robot.joints.length} Gelenke</span>
      </div>
    </div>
  );
}
