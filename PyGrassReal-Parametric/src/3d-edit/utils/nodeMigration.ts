import type { NodeData, Connection } from '../types/NodeTypes';
import { NODE_DEFINITIONS } from '../definitions/nodeDefinitions';

const LATEST_BOX_VERSION = 2;
const LATEST_SPHERE_VERSION = 2;

export function migrateGraph(nodes: NodeData[], connections: Connection[]): { nodes: NodeData[], connections: Connection[] } {
  let hasChanges = false;
  
  const migratedNodes = nodes.map(node => {
    if (node.type === 'box') {
      const currentVersion = node.data.version || 1;
      if (currentVersion < LATEST_BOX_VERSION) {
        hasChanges = true;
        
        // Get the latest definition
        const latestDef = NODE_DEFINITIONS['box'];
        
        // Preserve essential data while upgrading the structure
        const upgradedData: NodeData['data'] = {
          ...node.data,
          ...latestDef.initialData, // Apply latest defaults (inputs, hide flags, etc.)
          // Preserve existing values that might be in old data
          width: node.data.width ?? latestDef.initialData.width,
          height: node.data.height ?? latestDef.initialData.height,
          depth: node.data.depth ?? latestDef.initialData.depth,
          location: node.data.location,
          rotation: node.data.rotation,
          scale: node.data.scale,
          customName: node.data.customName,
          color: node.data.color,
          version: LATEST_BOX_VERSION,
        };

        return {
          ...node,
          data: upgradedData
        };
      }
    }

    if (node.type === 'sphere') {
      const currentVersion = node.data.version || 1;
      if (currentVersion < LATEST_SPHERE_VERSION) {
        hasChanges = true;
        const latestDef = NODE_DEFINITIONS['sphere'];
        
        const upgradedData: NodeData['data'] = {
          ...node.data,
          ...latestDef.initialData,
          radius: node.data.radius ?? latestDef.initialData.radius,
          location: node.data.location,
          rotation: node.data.rotation,
          scale: node.data.scale,
          customName: node.data.customName,
          color: node.data.color,
          version: LATEST_SPHERE_VERSION,
        };

        return {
          ...node,
          data: upgradedData
        };
      }
    }

    return node;
  });

  return {
    nodes: migratedNodes,
    connections: connections // For now, connections remain the same as input IDs haven't changed
  };
}
