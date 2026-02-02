# Component Summaries

This document summarizes the functionality of the React components located in the `src/components/` directory.

## Core Canvas & Rendering

-   **`NodeCanvas.tsx`**: The main canvas component that displays the entire Node Graph. It manages the state for nodes, connections, panning, and zooming. It also handles user interactions such as dragging new nodes onto the canvas, marquee selection, and controls the rendering of all other layers.
-   **`NodeRenderer.tsx`**: Responsible for iterating through the `nodes` array and rendering the correct component for each node based on its `type` (e.g., `CustomNode`, `GroupNode`, `InspectorNode`). It passes down all necessary props for interaction.
-   **`ConnectionLayer.tsx`**: An SVG overlay responsible for drawing the connections (wires) between nodes as Bézier curves. It also manages connection styling, such as dashing or color changes for "infected" states, and renders the wire being dragged by the user to create a new connection.

## Main Node Components

-   **`CustomNode.tsx`**: The primary, highly-configurable "template" component for most nodes. It serves as the base frame, providing a header (with a name, icon, and menu), lists for input/output ports, and the logic for dragging, resizing, and state-based styling (e.g., `selected`, `paused`, `infected`). Other nodes wrap this component to add their own specific UI and logic.
-   **`group/GroupNode.tsx`**: A component used to create a container around other nodes to group them. It is not based on `CustomNode` but is a standalone component that can be displayed as a group, have its name and color changed, and automatically resizes to fit its child nodes. It also includes buttons for deletion and for converting the group into a reusable component.

## Specialized Node Wrappers

These components are "wrappers" that enclose `CustomNode` to add special functionality.

-   **`BackgroundColorNode.tsx`**: A widget node with a UI for controlling the canvas background style, including a color picker, a toggle for solid/gradient color, and a slider for adjusting the gradient angle.
-   **`InspectorNode.tsx`**: A resizable "panel" that acts as a real-time data inspector. When another node is connected to its input, it displays detailed information about that node, such as values from a `SeriesNode`, raw JSON data, or X,Y,Z values from a `VectorXYZNode`.
-   **`LayerSourceNode.tsx`**: A node for defining a set of layers. Each input on this node represents a single layer, and it combines all this data into a single output.
-   **`LayerViewNode.tsx`**: A "viewer" node that connects to `LayerSourceNode`s to collect all defined layers and display them in a hierarchical list using the `LayerPanel` widget.
-   **`NodePromptNode.tsx`**: A node with a `textarea` for user input (e.g., prompts for an AI). A "Submit" button appears when its output is connected.
-   **`NumberSliderNode.tsx`**: An input node with a slider and number fields for setting a numerical value within a defined min/max range.
-   **`PrimitiveNode.tsx`**: Not a direct node type, but a "base component" that `NodeRenderer` uses to create basic geometric nodes like 'box' and 'sphere'. It retrieves initial data (like ports, name, icon) from `nodeDefinitions`.
-   **`SeriesNode.tsx`**: A node for generating a numerical series based on three parameters: `Start`, `Step`, and `Count`.
-   **`VectorXYZNode.tsx`**: A node for creating or deconstructing a 3D vector from its X, Y, and Z components.
-   **`ViewportNode.tsx`**: A widget node with a dropdown for controlling the rendering style of the 3D viewport (e.g., 'Rendered', 'Wireframe', 'Depth').
-   **`WidgetWindowNode.tsx`**: A generic frame for other widget components, providing a distinct style from standard nodes in the editor.

## Node-Internal Components

-   **`NodePortList.tsx`**: Manages the list of input or output ports for a node. It displays a header, a list of `NodePortItem`s, and an "Add Port" button.
-   **`NodePortItem.tsx`**: Displays a single port (the colored dot), its label, and various controls like the disconnect button and the circular `PortModifierMenu`.
-   **`PortModifierMenu.tsx`**: A circular menu that appears when clicking the `ƒsT` icon on a port, allowing users to apply data structure modifiers like 'Flatten' or 'Graft'.
-   **`widgets/LayerPanel.tsx`**: A reusable UI panel for displaying and managing a list of layers. It supports renaming, deleting, reordering (drag-and-drop), and multi-selection. It is used within `LayerViewNode`.

## 3D Scene & Transform Components

-   **`scene/SceneInner.tsx`**: The core of the 3D display area within the `react-three-fiber` `Canvas`. It controls `OrbitControls` (camera rotation), `TransformControls` (the gumball), object selection logic, and the rendering of all 3D objects.
-   **`scene/SceneContents.tsx`**: Iterates over the `sceneObjects` and renders the `Model` component for each one. It is also responsible for determining where to display the `TransformControls`.
-   **`scene/Model.tsx`**: Renders a single 3D object (a box or sphere) and handles color changes for selection highlights.
-   **`scene/SelectionBox.tsx`**: Displays the selection frame and transform handles around a selected 3D object. This includes `CornerHandle` (for rotation), `CornerScaleHandle` (for uniform scaling), and `FaceScaleHandle` (for axial scaling).
-   **`GumballObserver.tsx`**: A small helper component that uses `useFrame` to monitor the dragging state of the `TransformControls` (gumball).
-   **`RotationRingFeedback.tsx`**: Displays the colored ring and numbers while the user is rotating an object.
-   **`scene/transform-handles/...`**: A group of components used to build the different parts of the 3D selection handles:
    - **`CornerHandle.tsx`**: The handles at the corners of the `SelectionBox` for rotation.
    - **`CornerScaleHandle.tsx`**: The small cube handles at the corners for scaling.
    - **`FaceScaleHandle.tsx`**: The small cube handles on the center of each face for single-axis scaling.
    - **`WireframeBox.tsx`**: The wireframe outline of the `SelectionBox` itself.
    - **`constants.ts`**: A file containing constants such as the colors and positions of the handles.

## UI & Overlay Components

-   **`ui/UIToolbar.tsx`**: The main toolbar at the top of the screen. It includes buttons for switching editors (Node/Widget), selecting interaction modes (3D, Node, Wire), and a list of nodes that can be dragged onto the canvas.
-   **`ui/GroupButtonOverlay.tsx`**: A floating "Group" button with an animation that appears when multiple nodes are selected.
-   **`ui/LayersSidebar.tsx`**: A collapsible sidebar on the left that displays a list of all layers when a `WidgetWindow` is connected to a `LayerView`.
-   **`ui/NodeSearchBox.tsx`**: A search box that appears when double-clicking on the canvas, allowing users to quickly search for and create new nodes.
-   **`ui/SelectionSnapToggle.tsx`**: A UI element that floats above a selected 3D object, allowing the user to enable/disable rotation snapping.
-   **`ui/WireActionMenu.tsx`**: A small pop-up menu that appears when a connection (wire) is selected, allowing for deletion or style changes.

## Effects

-   **`effects/FireEffect.tsx`**: A CSS particle-based fire effect used when a node is deleted.
-   **`effects/LightningEffect.tsx`**: An SVG-based effect that displays when a connection between nodes is successfully made.
-   **`effects/MagicParticles.tsx`**: A circular burst particle effect used for visual feedback.
