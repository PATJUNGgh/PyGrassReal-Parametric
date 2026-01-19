
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface CommandBarProps {
  history: string[];
  onCommand: (cmd: string) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ history, onCommand }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      onCommand(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#121212] border-b border-[#2a2a2a] font-mono shadow-sm z-10">
      {/* History Area - Terminal Style */}
      <div 
        ref={scrollRef}
        className="h-[60px] overflow-y-auto p-2 text-[11px] text-gray-400 border-b border-[#222] resize-y min-h-[40px] max-h-[200px] custom-scrollbar bg-[#121212]"
      >
        <div className="text-gray-600 italic mb-1 opacity-50">PyGrassReal AI [Version 2.0.1] - Ready.</div>
        {history.map((line, i) => (
          <div key={i} className="leading-relaxed flex">
            <span className="text-gray-600 mr-2 select-none">{'>'}</span>
            <span className="text-gray-300">{line}</span>
          </div>
        ))}
      </div>
      
      {/* Input Line */}
      <div className="flex items-center px-2 h-9 bg-[#181818]">
        <div className="flex items-center text-[#0078d7] mr-2 select-none">
             <Terminal size={12} className="mr-1.5" />
             <span className="text-xs font-bold tracking-tight">Command:</span>
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder-gray-700 text-xs font-medium"
          placeholder="Type a command (e.g., box, move, help)..."
          autoFocus
          spellCheck={false}
        />
        <div className="text-[10px] text-gray-700 select-none font-bold">CMD</div>
      </div>
    </div>
  );
};
