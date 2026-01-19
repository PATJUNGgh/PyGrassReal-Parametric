
import React from 'react';
import { UnitType } from '../types';
import { Layers, Grid, Crosshair, Magnet } from 'lucide-react';

interface StatusBarProps {
  gumballEnabled?: boolean;
  onToggleGumball?: () => void;
  currentUnit?: UnitType;
  onCycleUnit?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
    gumballEnabled = false, 
    onToggleGumball,
    currentUnit = 'mm',
    onCycleUnit 
}) => {
  const toggles = [
    { label: "Grid Snap", icon: Grid, active: false },
    { label: "Ortho", icon: Crosshair, active: false },
    { label: "Osnap", icon: Magnet, active: false },
    { label: "Gumball", icon: null, active: gumballEnabled, onClick: onToggleGumball },
  ];
  
  return (
    <div className="h-7 bg-[#0078d7] text-white flex items-center px-3 text-[10px] select-none justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-20">
       
       {/* Coordinates & Status */}
       <div className="flex items-center space-x-4 font-mono font-medium">
          <span className="w-36 flex gap-2 opacity-90">
            <span>X: -12.50</span>
            <span>Y: 0.00</span>
          </span>
          
          <div className="h-3 w-[1px] bg-white/30"></div>
          
          <button 
            onClick={onCycleUnit}
            className="hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold"
            title="Click to change units"
          >
            {currentUnit}
          </button>
          
          <div className="h-3 w-[1px] bg-white/30"></div>
          
          <span className="opacity-80">Default Layer</span>
       </div>

       {/* Toggles */}
       <div className="flex h-full items-center gap-1">
          {toggles.map((t, i) => (
            <button 
              key={i} 
              onClick={t.onClick}
              className={`
                px-3 h-5 rounded-sm flex items-center gap-1.5 transition-all border
                ${t.active 
                    ? 'bg-white text-[#0078d7] border-white font-bold shadow-sm' 
                    : 'bg-transparent text-white/70 border-transparent hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {t.icon && <t.icon size={10} />}
              {t.label}
            </button>
          ))}
       </div>

       {/* Filter Status */}
       <div className="flex items-center space-x-2 opacity-80">
          <span className="font-semibold">Filter</span>
          <div className="w-2 h-2 rounded-full bg-green-300 shadow-[0_0_5px_rgba(134,239,172,0.8)]"></div>
       </div>
    </div>
  );
};
