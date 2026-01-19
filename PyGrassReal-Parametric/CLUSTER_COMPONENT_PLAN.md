# Plan: Cluster Button & Convert to Component Feature

## Overview
Implement a "Cluster" button within Group Nodes and a "Convert to Component" function that transforms grouped nodes into reusable custom components, similar to Grasshopper's clustering functionality in Rhino 8.

## Current System Analysis

### Existing Components
- **NodeCanvas.tsx**: Main canvas managing nodes, connections, and groups
- **GroupNode.tsx**: Visual group container with child nodes
- **UIToolbar.tsx**: Top toolbar with node creation buttons
- **CustomNode.tsx**: Reusable custom node component

### Current Group Functionality
- Groups can contain multiple nodes
- Groups have visual boundaries and headers
- Groups support drag-and-drop of child nodes
- Groups can be resized automatically

## Implementation Plan

### Phase 1: Add Cluster Button to Group Nodes

#### 1.1 Modify GroupNode.tsx
- Add "Cluster" button to the group header
- Position next to existing controls (delete, color, etc.)
- Style to match existing UI design
- Add click handler for clustering action

#### 1.2 Cluster Button Design
```typescript
// Button properties
- Icon: 🔄 or ⚡
- Label: "Cluster"
- Color: Gradient blue/purple theme
- Position: Right side of group header
- Tooltip: "Convert group to reusable component"
```

### Phase 2: Implement Convert to Component Logic

#### 2.1 Data Structure Extensions
```typescript
// Extend NodeData interface
interface ComponentData {
  id: string;
  name: string;
  description?: string;
  inputPorts: Array<{ id: string; label: string; type: string }>;
  outputPorts: Array<{ id: string; label: string; type: string }>;
  internalNodes: NodeData[];
  internalConnections: Connection[];
  thumbnail?: string;
  category?: string;
}

// Add component type to NodeData
type: 'box' | 'sphere' | 'custom' | 'antivirus' | 'input' | 'output' | 'group' | 'component';
```

#### 2.2 Component Creation Process
1. **Analyze Group Structure**
   - Identify input/output nodes within the group
   - Map internal connections
   - Determine external interface requirements

2. **Generate Component Definition**
   - Create component metadata
   - Extract internal node structure
   - Preserve connection logic

3. **Create Component Node**
   - Replace group with component node
   - Generate input/output ports based on analysis
   - Maintain external connections

#### 2.3 Component Storage System
```typescript
// Component Library
interface ComponentLibrary {
  components: Map<string, ComponentData>;
  categories: string[];
  saveComponent(component: ComponentData): void;
  loadComponent(id: string): ComponentData | null;
  deleteComponent(id: string): void;
  getComponentsByCategory(category: string): ComponentData[];
}
```

### Phase 3: Component Management UI

#### 3.1 Component Panel
- Add "Components" tab to existing toolbar
- Display saved components as draggable items
- Component preview cards with:
  - Thumbnail/icon
  - Name and description
  - Input/output count
  - Category tags

#### 3.2 Component Editor
- Modal dialog for component properties
- Edit component name, description, category
- Configure input/output port labels
- Set component icon/color

### Phase 4: Advanced Features

#### 4.1 Component Instance Management
- Track all instances of each component
- Update all instances when component definition changes
- Version control for components

#### 4.2 Component Import/Export
- Save components to JSON files
- Load components from files
- Share component libraries

#### 4.3 Component Nesting
- Allow components to contain other components
- Hierarchical component structure
- Recursive component evaluation

## Technical Implementation Details

### File Structure Changes
```
src/
├── components/
│   ├── ComponentNode.tsx          # New component node type
│   ├── ComponentLibrary.tsx       # Component management UI
│   ├── ComponentEditor.tsx        # Component editing modal
│   ├── GroupNode.tsx              # Modified: Add cluster button
│   ├── NodeCanvas.tsx             # Modified: Component logic
│   └── UIToolbar.tsx              # Modified: Components tab
├── types/
│   └── ComponentTypes.ts          # Component-related types
├── utils/
│   ├── ComponentUtils.ts          # Component creation utilities
│   └── ComponentStorage.ts        # Save/load functionality
└── data/
    └── components/                # Saved component files
```

### Key Functions to Implement

#### 1. Cluster Conversion Function
```typescript
const convertGroupToComponent = (groupId: string) => {
  // 1. Get group and child nodes
  // 2. Analyze inputs/outputs
  // 3. Create component definition
  // 4. Replace group with component node
  // 5. Save to component library
};
```

#### 2. Component Instantiation
```typescript
const createComponentInstance = (componentId: string, position: {x, y}) => {
  // 1. Load component definition
  // 2. Create component node instance
  // 3. Set up input/output ports
  // 4. Add to canvas
};
```

#### 3. Component Evaluation
```typescript
const evaluateComponent = (componentNodeId: string) => {
  // 1. Get component definition
  // 2. Execute internal node logic
  // 3. Propagate results to outputs
};
```

## UI/UX Design Considerations

### Visual Design
- Component nodes should look distinct from regular nodes
- Use special border styling or background patterns
- Component icon in corner to indicate type
- Hover effects showing component name/description

### User Workflow
1. **Creating Components**: Select nodes → Group → Click Cluster → Name component
2. **Using Components**: Drag from component panel → Drop on canvas → Connect
3. **Editing Components**: Double-click component → Edit internal logic → Save changes

### Feedback & Validation
- Visual feedback during clustering process
- Error messages for invalid group structures
- Success animations when component is created
- Loading indicators for complex components

## Testing Strategy

### Unit Tests
- Component creation logic
- Port mapping algorithms
- Component storage/retrieval
- Connection preservation

### Integration Tests
- End-to-end clustering workflow
- Component instantiation and execution
- Component editing and updates
- Import/export functionality

### User Testing
- Workflow usability
- Performance with large components
- Error handling and recovery
- Learning curve for new users

## Timeline Estimate

### Phase 1: Cluster Button (2-3 days)
- Add button to GroupNode
- Basic click handler
- UI styling

### Phase 2: Component Logic (5-7 days)
- Data structure implementation
- Conversion algorithm
- Component storage

### Phase 3: Component Management (3-4 days)
- Component library UI
- Component editor
- Toolbar integration

### Phase 4: Advanced Features (5-7 days)
- Instance management
- Import/export
- Component nesting

**Total Estimated Time: 15-21 days**

## Success Criteria

1. ✅ Users can cluster grouped nodes into reusable components
2. ✅ Components appear in a dedicated library panel
3. ✅ Components can be dragged onto canvas like regular nodes
4. ✅ Components maintain their internal logic and connections
5. ✅ Components can be edited and updated across all instances
6. ✅ Component library can be saved and loaded
7. ✅ UI is intuitive and follows existing design patterns

## Potential Challenges & Solutions

### Challenge 1: Complex Internal Logic
**Solution**: Implement proper dependency resolution and evaluation order for internal nodes

### Challenge 2: Performance with Large Components
**Solution**: Use lazy loading and memoization for component evaluation

### Challenge 3: Connection Preservation
**Solution**: Create robust port mapping system that handles edge cases

### Challenge 4: Component Versioning
**Solution**: Implement semantic versioning and migration strategies

## Next Steps

1. **Review and approve this plan**
2. **Set up development environment for component features**
3. **Begin Phase 1 implementation**
4. **Regular progress reviews and adjustments**
5. **User testing and feedback incorporation**

---

*This plan provides a comprehensive roadmap for implementing Grasshopper-like clustering functionality in the PyGrassReal-Parametric application.*
