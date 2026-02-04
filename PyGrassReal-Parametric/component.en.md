# Component Analysis: `CustomNode.tsx`

This document provides a detailed summary of the `CustomNode` React component. This component is a flexible and feature-rich element for rendering individual nodes within a node-based editor interface.

## Overview

`CustomNode` is a functional React component that serves as the main visual representation of a node on a canvas. It is highly configurable through props and has been refactored into a compositional structure, using several sub-components to handle specific parts of its functionality.

The component's core responsibilities include:
*   Acting as a container that orchestrates the `NodeHeader`, `NodeBody`, and other UI elements.
*   Handling top-level user interactions like dragging, selecting, and hover states.
*   Applying dynamic styling based on states like `selected`, `isPaused`, and `isInfected`.
*   Managing the node's position and size through the `useNodeDragV2` and `useNodeResizeV2` hooks.

This refactoring makes the main component a cleaner wrapper, delegating rendering and logic to specialized children.

## Component Composition

The `CustomNode` is composed of the following key sub-components:

*   **`NodeHeader`**: Renders the top part of the node, including the title, pause/resume button, duplicate button, delete button, and group-related actions. It also handles the logic for editing the node's name.
*   **`NodeBody`**: Renders the main content area of the node. This area is highly versatile and can display:
    *   Lists of input and output ports.
    *   A 3D material preview (`MaterialPreviewSphere`).
    *   Any custom `children` passed to the `CustomNode`.
    It also manages all interactions related to ports (adding, removing, editing, connecting).
*   **`NodeErrorOverlay`**: Displays a prominent error/alert message over the node when the `isInfected` prop is true.
*   **`NodeResizeHandle`**: Renders the handle that allows users to resize the node's width and encapsulates the `onMouseDown` logic to initiate resizing.

## Props (`CustomNodeProps`)

The component accepts a large number of props to control its appearance and behavior.

| Prop                 | Type                               | Description                                                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`                           | A unique identifier for the node.                                                                       |
| `data`               | `object`                           | An object containing the node's specific configuration and state. See "Data Object Props" below.        |
| `position`           | `{ x: number; y: number }`         | The node's coordinates on the canvas.                                                                   |
| `selected`           | `boolean`                          | If `true`, the node is rendered in a "selected" state.                                                  |
| `onPositionChange`   | `(id, pos) => void`                | Callback invoked when the node's position changes.                                                      |
| `onDataChange`       | `(id, data) => void`               | Callback to update the node's `data` object.                                                            |
| `onDelete`           | `(id) => void`                     | Callback invoked to delete the node.                                                                    |
| `onDuplicate`        | `(id) => void`                     | Callback for duplicating the node.                                                                      |
| `children`           | `React.ReactNode`                  | Optional. Renders custom content inside the `NodeBody`, replacing the default port lists.               |
| `onConnectionStart`  | `(nodeId, portId, pos) => void`    | Triggered when a user starts dragging a connection from a port.                                         |
| `onConnectionComplete`| `(nodeId, portId) => void`         | Triggered when a user completes a connection.                                                           |
| `connections`        | `Array<Connection>`                | An array of all connections on the canvas, passed down to the `NodeBody`.                               |
| `onDeleteConnection` | `(connectionId) => void`           | Callback for deleting a connection.                                                                     |
| `scale`              | `number`                           | The current zoom level of the canvas, used by interaction hooks.                                        |
| `onSelect`           | `() => void`                       | Callback invoked when the node is clicked to mark it as selected.                                       |
| `isShaking`          | `boolean`                          | If `true`, applies a shaking animation.                                                                 |
| `isInfected`         | `boolean`                          | If `true`, the node enters a red "infected" alert state.                                                |
| `parentGroupId`      | `string`                           | The ID of the group this node belongs to.                                                               |
| `overlappingGroupId` | `string`                           | The ID of a group the node is being dragged over.                                                       |
| `onJoinGroup`        | `(nodeId, groupId) => void`        | Callback for joining a group.                                                                           |
| `onLeaveGroup`       | `(nodeId) => void`                 | Callback for leaving a group.                                                                           |
| `onCluster`          | `(nodeId) => void`                 | Callback to trigger component creation from the node.                                                   |
| `onEditMaterial`     | `(id) => void`                     | Callback when the user intends to edit the material.                                                    |
| `nodeType`           | `string`                           | A string identifier for the node's type, used to control certain behaviors like port editing.           |

### Data Object Props (`data`)

The `data` prop is a flexible object that fine-tunes the node's specific features:

*   `customName`: The display name of the node.
*   `inputs`, `outputs`: Arrays of `Port` objects defining connection points.
*   `width`, `minWidth`, `height`: Sizing parameters for the node.
*   `resizable`: If `true`, the `NodeResizeHandle` is shown.
*   `isPaused`: If `true`, the node is rendered in a grayed-out, non-interactive "paused" state.
*   `componentId`: A string indicating the node is an instance of a reusable component.
*   `showMaterialPreview`: If `true`, the `NodeBody` displays the 3D material preview.
*   `materialParams`: The parameters for the `MaterialPreviewSphere`.
*   **Visibility Toggles**: A set of boolean props to hide parts of the UI (e.g., `hideInputs`, `hideInputsAdd`, `hidePortControls`).

## Internal State

*   `showErrorDetails`: Controls the visibility of the modal within the `NodeErrorOverlay`.
*   `isHovered`: Tracks mouse hover state on the node's container div.
*   `hoveredPortId`, `editingPortId`, `tempPortLabel`: State managed within `CustomNode` and passed down to `NodeBody` to control port-specific interactions like hover effects and inline label editing.
*   `hasMounted`: A flag to trigger a one-time mount animation.

## Custom Hooks

*   **`useNodeDragV2`**: Encapsulates the logic for dragging the node. It takes the initial position, scale, and an `onPositionChange` callback, and returns a `handleMouseDown` function to be attached to the draggable element.
*   **`useNodeResizeV2`**: Handles logic for resizing the node's width. It manages the interaction state and calculates the new width and position, calling `onDataChange` and `onPositionChange` with the updated values.

## Core Logic & Functionality

### 1. Drag and Resize

The core drag and resize functionality is almost entirely handled by the `useNodeDragV2` and `useNodeResizeV2` hooks. The main `CustomNode` component simply invokes these hooks and attaches the returned `handleMouseDown` functions to the main `div` and the `NodeResizeHandle` component, respectively. This keeps the main component clean and focused on composition.

### 2. Event Handling and Propagation

The root `div` of the component has `onMouseDown`, `onClick`, and `onContextMenu` handlers. These handlers call `e.stopPropagation()` to prevent events from bubbling up to the main canvas. This is crucial for ensuring that clicking or dragging a node doesn't also trigger canvas-level interactions like the selection box. The `onMouseDown` handler is responsible for both selecting the node (via `onSelect`) and initiating a drag (via `handleDragMouseDown`).

### 3. Dynamic Styling

A large `containerStyle` object is created to apply styles dynamically. This object changes based on several props and states:
*   **Position**: `left` and `top` are set from `props.position`.
*   **Size**: `width` is derived from `data.width` or calculated based on its name length.
*   **State**: The `background`, `border`, `boxShadow`, and `animation` properties all change dramatically based on whether `isInfected` or `selected` are true.
*   **Interaction**: The `cursor` style changes based on `isDragging` and `isNodePaused`.
*   **Paused**: A grayscale `filter` and reduced `opacity` are applied if `isNodePaused` is true.

### 4. Data Flow

The component follows a strict controlled-component pattern. It receives its state (`data`, `position`) via props. Whenever a user interaction requires a state change (e.g., renaming the node, adding a port, pausing), the relevant sub-component calls a callback prop (like `onDataChange` or `onPositionChange`), which updates the state in the parent component. This ensures a unidirectional data flow and a single source of truth.
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
