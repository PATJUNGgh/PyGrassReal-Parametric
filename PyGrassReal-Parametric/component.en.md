# Component Analysis: `CustomNode.tsx`

This document provides a detailed summary of the `CustomNode` React component. This component is a flexible and feature-rich element for rendering individual nodes within a node-based editor interface.

## Overview

`CustomNode` is a functional React component that serves as the visual representation of a node on a canvas. It is highly configurable through props and is designed to handle a wide variety of states and interactions, including:

*   Dragging and resizing.
*   Selection and hover states.
*   Dynamic styling based on themes and states (e.g., `paused`, `infected`).
*   Editable titles and configurable icons.
*   Dynamic input and output ports for creating connections.
*   Conditional rendering of internal content, which can be standard ports, a `LayerPanel` widget, a 3D `MaterialPreviewSphere`, or custom child components.
*   Context-sensitive UI elements like menus and group management buttons.

It uses custom hooks (`useNodeDrag`, `useNodeResize`) to manage complex user interactions and a combination of CSS classes and inline styles for its appearance.

## Props (`CustomNodeProps`)

The component accepts a large number of props to control its appearance and behavior.

### Core Props

| Prop                 | Type                               | Description                                                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`                           | A unique identifier for the node.                                                                       |
| `data`               | `object`                           | An object containing the node's specific configuration and state. See "Data Object Props" below.        |
| `position`           | `{ x: number; y: number }`         | The node's coordinates on the canvas.                                                                   |
| `selected`           | `boolean`                          | If `true`, the node is rendered in a "selected" state.                                                  |
| `onPositionChange`   | `(id, pos) => void`                | Callback invoked when the node's position changes.                                                      |
| `onDataChange`       | `(id, data) => void`               | Callback to update the node's `data` object.                                                            |
| `onDelete`           | `(id) => void`                     | Callback invoked when the user clicks the delete button.                                                |
| `onDuplicate`        | `(id) => void`                     | Callback for duplicating the node via the header menu.                                                  |
| `children`           | `React.ReactNode`                  | Optional. Renders custom content inside the node body, replacing the default port lists.                |

### Interaction & Connection Props

| Prop                 | Type                               | Description                                                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `onConnectionStart`  | `(nodeId, portId, pos) => void`    | Triggered when a user starts dragging a connection from a port.                                         |
| `onConnectionComplete`| `(nodeId, portId) => void`         | Triggered when a user completes a connection.                                                           |
| `connections`        | `Array<Connection>`                | An array of all connections on the canvas.                                                              |
| `onDeleteConnection` | `(connectionId) => void`           | Callback for deleting a connection.                                                                     |
| `interactionMode`    | `'node' \| '3d' \| 'wire'`         | The global interaction mode, passed to child components.                                                |
| `scale`              | `number`                           | The current zoom level of the canvas.                                                                   |

### State & Grouping Props

| Prop                 | Type                               | Description                                                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `isShaking`          | `boolean`                          | If `true`, applies a shaking animation.                                                                 |
| `isInfected`         | `boolean`                          | If `true`, the node enters a red "infected" alert state.                                                |
| `parentGroupId`      | `string`                           | The ID of the group this node belongs to.                                                               |
| `overlappingGroupId` | `string`                           | The ID of a group the node is being dragged over.                                                       |
| `onJoinGroup`        | `(nodeId, groupId) => void`        | Callback for joining a group.                                                                           |
| `onLeaveGroup`       | `(nodeId) => void`                 | Callback for leaving a group.                                                                           |

### Data Object Props (`data`)

The `data` prop is a flexible object that fine-tunes the node's specific features:

*   `customName`: The display name of the node.
*   `inputs`, `outputs`: Arrays of `Port` objects defining connection points.
*   `isPaused`: If `true`, the node is rendered in a grayed-out "paused" state.
*   `isNameEditable`: If `false`, the node's name cannot be changed.
*   `resizable`: If `true`, a resize handle is shown.
*   `icon`: An emoji or character to display next to the node name.
*   `theme`: Applies a specific visual theme (`'default'`, `'antivirus'`, `'layer-source'`).
*   **Visibility Toggles**: A set of boolean props to hide parts of the UI (e.g., `hideInputs`, `hideOutputsAdd`, `hidePortControls`).
*   **Layer Panel**: Props like `showLayerPanel`, `layersData`, and `onLayer...` callbacks are used when the node functions as a layer management widget.
*   **Material Preview**: `showMaterialPreview`, `materialPreviewStyle`, `materialPreviewUrl`, and `materialParams` are used to display a 3D material preview sphere and manage its properties.

## Internal State

*   `isEditingName`: Toggles the header title between a `<span>` and an `<input>`.
*   `isHovered`, `isMenuOpen`: Manage the visibility of the header menu on hover.
*   `showErrorDetails`: Controls the visibility of the "Security Alert" modal when `isInfected` is `true`.
*   `showMaterialPicker`: Toggles the `MaterialPicker` modal, which is rendered in a portal.
*   `hasMounted`: A flag to trigger a one-time mount animation.
*   Port editing state (`editingPortId`, `editingPortValue`) is managed for port label modifications.

## Custom Hooks

*   **`useNodeDrag`**: Encapsulates the logic for dragging the node.
*   **`useNodeResize`**: Handles logic for resizing the node's width via a handle.

## Core Logic & Functionality

### 1. Dynamic Styling (`computeNodeStyle`)

A helper function `computeNodeStyle` dynamically generates the `className` string and inline `style` object for the node's root element. It combines base classes with state-dependent classes for selection (`.custom-node-selected`), theme (`.custom-node-antivirus`), and status (`.custom-node-paused`, `.custom-node-infected`). It also applies animations for mounting, shaking, and alerts. Inline styles are used for position (`left`, `top`), `width`, and `zIndex`.

### 2. Sizing and Layout

The node's width is calculated dynamically based on its content, including the length of its name and port labels, to ensure content fits correctly. The width can also be overridden by `data.width` and is user-resizable if `data.resizable` is true.

### 3. Header and Interactions

The header contains:
*   An **icon** and an **editable name**.
*   A **delete button**.
*   A **menu button** that appears on hover, revealing a popup menu with actions like "Duplicate", "Stop/Resume", and "Info".
*   Contextual **grouping buttons** ("Join Group" or "Leave Group") appear based on the node's position relative to groups.

### 4. Conditional Body Content

The body of the node is highly modular and renders different content based on props:
1.  **Default Port View**: Renders `NodePortList` components for inputs and outputs.
2.  **Layer Panel View**: If `data.showLayerPanel` is `true`, it renders the `LayerPanel` component.
3.  **Material Preview**: If `data.showMaterialPreview` is `true`, it displays a `MaterialPreviewSphere`. Clicking this sphere opens the `MaterialPicker` modal.
4.  **Custom Children**: If `children` are passed as a prop, they are rendered in the body. This allows for creating specialized nodes like sliders or other widgets.

### 5. Material Editor Integration

A key feature is the ability to edit 3D material properties.
*   When enabled, a `MaterialPreviewSphere` (a small `react-three-fiber` canvas) is shown in the node body for instant visual feedback.
*   Clicking the sphere opens the `MaterialPicker` modal (via a React Portal).
*   Changes made in the picker are applied back to the node's `data` via the `onDataChange` callback, updating the preview and any connected 3D scene elements.

### 6. Event Handling

The component uses `e.stopPropagation()` extensively on its internal interactive elements (buttons, inputs) to prevent unwanted side effects like dragging the node when clicking a button. Callbacks like `onSelect`, `onDelete`, and connection handlers connect the node's UI to the parent canvas logic.
---

# Component Analysis: `group/GroupNode.tsx`

This document provides a detailed summary of the `GroupNode` React component. This component serves as a visual and organizational container for other nodes on the canvas.

## Overview

`GroupNode` is a standalone component designed to visually wrap a selection of other nodes. Unlike most other node types, it **does not** wrap the base `CustomNode` component. Instead, it implements its own rendering, styling, and interaction logic to function as a container. Its primary purpose is to help users organize their node graphs by creating visually distinct sections.

Its core functionality, such as creation and auto-resizing, is managed by the `useGroupLogic` hook, while this component handles the user-facing presentation and interactions.

## Props (`GroupNodeProps`)

| Prop | Type | Description |
| --- | --- | --- |
| `node` | `NodeData` | The data object for the group, containing its `id`, `position`, and `data` (like `width`, `height`, `customName`). |
| `onPositionChange` | `(id, pos) => void` | Callback invoked when the group is dragged, reporting its new position. |
| `onDelete` | `(id, deleteChildren?) => void` | Callback for deleting the group. The optional second argument specifies whether to also delete the nodes inside it. |
| `selected` | `boolean` | If `true`, the group is rendered with a more prominent selection style. |
| `onSelect` | `() => void` | Callback invoked when the group is clicked, to integrate with the canvas selection system. |
| `onNameChange` | `(id, newName) => void` | Callback for updating the group's name. |
| `onCluster` | `(groupId) => void` | Optional callback to trigger the "clustering" logic, which converts the group into a reusable component. |
| `scale` | `number` | The current zoom level of the canvas, used to correctly calculate drag movement. |

## Internal State

*   `isDragging`: A boolean flag that tracks if the user is currently dragging the group node.
*   `isDeleting`: A boolean flag used to trigger the node's exit animation before it is removed.
*   `showDeleteOptions`: Toggles the visibility of the secondary delete menu ("Delete group only" vs. "Delete group + children").
*   `showColorPicker`: Toggles the visibility of the color swatch pop-up menu.
*   `showOutsideLabel`: Toggles the rendering of the `<ExternalLabel>` component.
*   `isEditing`, `currentName`: Manage the state for inline editing of the group's name in the header.
*   `colorIndex`: Tracks the currently selected color theme from a predefined array.

## Core Logic & Functionality

### 1. Rendering and Styling
-   The component renders a `div` with absolute positioning based on `node.position`. Its dimensions are set by `node.data.width` and `node.data.height`.
-   Styling is managed via CSS Modules (`GroupNode.module.css`). It has a semi-transparent background and a dashed border.
-   **Color Themes**: It contains a predefined array of color objects. The user can cycle through these via the UI, which changes the `background`, `border`, and `accent` color of the entire group and its header elements.
-   The selection state is visually represented by a thicker, more prominent border and a `box-shadow`.

### 2. Dragging
-   The component implements its own drag-and-drop logic.
-   An `onMouseDown` handler on the main element initiates the drag, capturing the start position of the mouse and the node.
-   A `useEffect` hook attaches `mousemove` and `mouseup` listeners to the `window` when `isDragging` is true.
-   The `mousemove` handler calculates the delta based on the current canvas `scale` and calls the `onPositionChange` prop to update the node's position in the parent state. This automatically moves child nodes as well, as their positions are updated by the `useNodeOperations` hook in response.

### 3. Header Interactions
The group's header is a rich interactive area:
-   **Name Display/Input**: The group's name is displayed. Double-clicking it toggles an `<input>` field for renaming.
-   **Color Picker**: A "🎨" button toggles a pop-up menu with swatches, allowing the user to change the group's color theme.
-   **External Label Toggle**: A "📦" button toggles the visibility of a large, external title rendered by the `<ExternalLabel>` sub-component. This label has its own extensive customization options (font size, style, background).
-   **Cluster Button**: If the `onCluster` prop is provided, this button appears. It allows the user to convert the group and its contents into an encapsulated, reusable component (a feature handled by the `useComponentLogic` hook).
-   **Delete Menu**: A trash icon button toggles a confirmation menu with two distinct options:
    1.  Delete only the group container, leaving the child nodes on the canvas.
    2.  Delete both the group and all the nodes inside it.

## How To Use

The `GroupNode` is not intended to be used directly in the application. It is rendered by the `NodeRenderer` when it finds a node with `type: 'group'` in the nodes array.

Groups are created dynamically through user interaction on the `NodeCanvas`. Typically:
1.  The user selects two or more nodes.
2.  A "Group" button (rendered by `GroupButtonOverlay`) appears.
3.  Clicking this button calls the `createGroupNode` function from the `useGroupLogic` hook.
4.  `createGroupNode` calculates the bounding box of the selected nodes and adds a new `NodeData` object with `type: 'group'` to the main `nodes` state, which then causes the `NodeRenderer` to render a `GroupNode`.
