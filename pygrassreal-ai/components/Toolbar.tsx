
import React from 'react';
import { MousePointer2, Box, Circle, Cylinder, Trash2, Move, RotateCw, Scaling, Dot, Activity, Spline } from 'lucide-react';
import { ToolType, TransformMode } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  transformMode: TransformMode;
  onSelectTool: (tool: ToolType) => void;
  onSelectTransformMode: (mode: TransformMode) => void;
  onDelete?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  transformMode, 
  onSelectTool, 
  onSelectTransformMode, 
  onDelete 
}) => {
  const createTools: { id: ToolType; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select (Esc)' },
    { id: 'box', icon: Box, label: 'Box' },
    { id: 'sphere', icon: Circle, label: 'Sphere' },
    { id: 'cylinder', icon: Cylinder, label: 'Cylinder' },
  ];

  const curveTools: { id: ToolType; icon: any; label: string }[] = [
    { id: 'point', icon: Dot, label: 'Point' },
    { id: 'polyline', icon: Activity, label: 'Polyline' },
    { id: 'curve', icon: Spline, label: 'Control Curve' },
  ];

  const transformTools: { id: TransformMode; icon: any; label: string }[] = [
    { id: 'translate', icon: Move, label: 'Move' },
    { id: 'rotate', icon: RotateCw, label: 'Rotate' },
    { id: 'scale', icon: Scaling, label: 'Scale' },
  ];

  return (
    <div className="w-14 bg-[#181818] border-r border-[#2a2a2a] flex flex-col items-center py-4 z-20 shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
      
      {/* Selection Tool - Prominent */}
      <button
          onClick={() => onSelectTool('select')}
          title="Selection Tool"
          className={`w-10 h-10 mb-3 rounded-lg flex items-center justify-center transition-all duration-200 group ${
            activeTool === 'select'
              ? 'bg-[#0078d7] text-white shadow-[0_0_10px_rgba(0,120,215,0.5)] scale-105'
              : 'text-gray-400 hover:bg-[#333] hover:text-gray-100'
          }`}
      >
          <MousePointer2 size={20} strokeWidth={activeTool === 'select' ? 2.5 : 2} />
      </button>

      <div className="w-6 h-[1px] bg-[#333] mb-3" />
      
      {/* Creation Tools */}
      <div className="flex flex-col gap-1.5 w-full items-center">
        {createTools.filter(t => t.id !== 'select').map((tool) => (
            <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
            className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
                activeTool === tool.id
                ? 'bg-[#333] text-[#0078d7] border-l-2 border-[#0078d7]'
                : 'text-gray-500 hover:bg-[#2a2a2a] hover:text-gray-200'
            }`}
            >
            <tool.icon size={18} strokeWidth={activeTool === tool.id ? 2.5 : 1.5} />
            </button>
        ))}
      </div>

      <div className="w-6 h-[1px] bg-[#333] my-3" />

      {/* Curve Tools */}
      <div className="flex flex-col gap-1.5 w-full items-center">
        {curveTools.map((tool) => (
            <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
            className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
                activeTool === tool.id
                ? 'bg-[#333] text-[#0078d7] border-l-2 border-[#0078d7]'
                : 'text-gray-500 hover:bg-[#2a2a2a] hover:text-gray-200'
            }`}
            >
            <tool.icon size={18} strokeWidth={activeTool === tool.id ? 2.5 : 1.5} />
            </button>
        ))}
      </div>
      
      <div className="w-6 h-[1px] bg-[#333] my-3" />

      {/* Transform Tools */}
      <div className="flex flex-col gap-1.5 w-full items-center">
        {transformTools.map((mode) => (
            <button
            key={mode.id}
            onClick={() => {
                onSelectTool('select');
                onSelectTransformMode(mode.id);
            }}
            title={mode.label}
            className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
                activeTool === 'select' && transformMode === mode.id
                ? 'bg-[#333] text-[#f6e05e] border-l-2 border-[#f6e05e]'
                : 'text-gray-500 hover:bg-[#2a2a2a] hover:text-gray-200'
            }`}
            >
            <mode.icon size={18} strokeWidth={activeTool === 'select' && transformMode === mode.id ? 2.5 : 1.5} />
            </button>
        ))}
      </div>

      <div className="mt-auto mb-2 w-full flex flex-col items-center">
         <div className="w-6 h-[1px] bg-[#333] my-3" />
         <button 
            onClick={onDelete}
            className="w-9 h-9 rounded flex items-center justify-center text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-colors" 
            title="Delete Selection (Del)"
        >
            <Trash2 size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
