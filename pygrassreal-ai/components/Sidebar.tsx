
import React, { useState, useEffect, useRef } from 'react';
import { Layers, Settings, Info, Palette, Eye, EyeOff, Lock, Unlock, Check, Plus, Trash2, GripVertical, MessageSquare, Send, Loader2, Globe, Cpu, ShieldCheck, Sparkles, Bot, ChevronRight } from 'lucide-react';
import { IObject3D, Layer, UnitType } from '../types';
import { GoogleGenAI } from "@google/genai";

interface SidebarProps {
  selectedObject: IObject3D | undefined;
  layers?: Layer[];
  onToggleLayer?: (id: string) => void;
  onLockLayer?: (id: string) => void;
  onSetCurrentLayer?: (id: string) => void;
  onAddLayer?: () => void;
  onDeleteLayer?: (id: string) => void;
  onRenameLayer?: (id: string, newName: string) => void;
  onReorderLayers?: (fromIndex: number, toIndex: number) => void;
  currentUnit?: UnitType;
  onSetUnit?: (unit: UnitType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  selectedObject, 
  layers = [], 
  onToggleLayer,
  onLockLayer,
  onSetCurrentLayer,
  onAddLayer,
  onDeleteLayer,
  onRenameLayer,
  onReorderLayers,
  currentUnit = 'mm',
  onSetUnit
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'layers' | 'settings' | 'info' | 'chat'>('layers');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Hello! I represent the integrated AI Assistant. How can I help you model today?' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Construct context about the current scene
      let contextInfo = "System Context:\n";
      if (selectedObject) {
        contextInfo += `[SELECTION] Type=${selectedObject.type}, ID=${selectedObject.id}, Layer=${selectedObject.layerId}, Pos=[${selectedObject.position.map(n=>n.toFixed(2)).join(',')}]\n`;
      } else {
        contextInfo += "[SELECTION] None\n";
      }
      contextInfo += `[SCENE] Layers=${layers.length}, Active Layer=${layers.find(l => l.isCurrent)?.name || 'None'}, Units=${currentUnit}\n`;
      
      const n8nWebhook = process.env.N8N_CHAT_WEBHOOK;

      if (n8nWebhook && n8nWebhook.startsWith('http')) {
          const payload = {
              message: userMsg,
              context: contextInfo,
              history: messages.slice(-10)
          };

          const response = await fetch(n8nWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`Connection Failed`);
          const data = await response.json();
          const responseText = data.output || data.text || data.response || JSON.stringify(data);
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      } else {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Role: Expert 3D CAD Assistant. 
${contextInfo}
User: ${userMsg}`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          setMessages(prev => [...prev, { role: 'model', text: response.text || "No response." }]);
      }

    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Connection Error: ${error.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const TabButton = ({ id, icon: Icon, title, isActive }: { id: string, icon: any, title: string, isActive: boolean }) => (
    <div 
      onClick={() => setActiveTab(id as any)}
      className={`flex-1 py-3 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 relative ${
        isActive 
          ? 'text-[#0078d7] bg-[#1e1e1e]' 
          : 'text-gray-500 hover:text-gray-300 hover:bg-[#252525]'
      }`} 
      title={title}
    >
      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[9px] font-bold uppercase tracking-wider">{title}</span>
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0078d7]" />}
    </div>
  );

  const handleAddLayerClick = () => onAddLayer && onAddLayer();
  const handleDeleteLayerClick = (id: string, name: string) => {
    if (onDeleteLayer && confirm(`Delete layer "${name}"?`)) onDeleteLayer(id);
  };
  
  const handleStartEdit = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditName(layer.name);
  };

  const handleSaveEdit = () => {
    if (editingLayerId && onRenameLayer) {
      if (editName.trim() !== "") onRenameLayer(editingLayerId, editName.trim());
      setEditingLayerId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    else if (e.key === 'Escape') setEditingLayerId(null);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: Set drag image if needed
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault(); // Allows drop
    if (draggedIndex === null || draggedIndex === index) return;
    
    if (dragOverIndex !== index) {
        setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorderLayers?.(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  
  const handleDragEnd = () => {
      setDraggedIndex(null);
      setDragOverIndex(null);
  };

  return (
    <div className="w-80 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col text-xs text-gray-300 shadow-2xl z-30">
      {/* Tabs */}
      <div className="flex border-b border-[#2a2a2a] bg-[#181818]">
        <TabButton id="properties" icon={Palette} title="Props" isActive={activeTab === 'properties'} />
        <TabButton id="layers" icon={Layers} title="Layers" isActive={activeTab === 'layers'} />
        <TabButton id="chat" icon={Sparkles} title="AI" isActive={activeTab === 'chat'} />
        <TabButton id="settings" icon={Settings} title="Settings" isActive={activeTab === 'settings'} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
        
        {/* PROPERTIES TAB */}
        {activeTab === 'properties' && (
          <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            {selectedObject ? (
              <>
                <div className="flex items-center gap-3 border-b border-[#333] pb-3">
                   <div className="w-10 h-10 bg-[#252525] rounded flex items-center justify-center border border-[#333]">
                      <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: selectedObject.color }}></div>
                   </div>
                   <div>
                      <h3 className="text-sm font-bold text-white">{selectedObject.id}</h3>
                      <span className="text-[10px] text-[#0078d7] font-bold uppercase tracking-wider bg-blue-900/20 px-1.5 py-0.5 rounded">{selectedObject.type} Object</span>
                   </div>
                </div>
                
                <div className="space-y-4">
                  {/* General Section */}
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase font-bold text-gray-500">General</label>
                     
                     <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-gray-400 text-right pr-2">Name</label>
                        <input className="col-span-2 px-2 py-1.5 bg-black/20 rounded border border-white/10 text-white focus:border-[#0078d7] focus:outline-none text-xs" defaultValue={selectedObject.id} />
                     </div>
                     
                     <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-gray-400 text-right pr-2">Layer</label>
                        <select 
                          className="col-span-2 px-2 py-1.5 bg-black/20 rounded border border-white/10 text-white focus:border-[#0078d7] focus:outline-none text-xs appearance-none"
                          value={selectedObject.layerId}
                          onChange={() => {}}
                        >
                          {layers.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                     </div>
                  </div>

                  <div className="w-full h-[1px] bg-[#333]" />

                  {/* Transform Section */}
                  <div className="space-y-3">
                     <label className="text-[10px] uppercase font-bold text-gray-500">Transform</label>
                     
                     {['Position', 'Rotation', 'Scale'].map((label, idx) => (
                        <div key={label} className="space-y-1">
                           <div className="flex justify-between text-[10px] text-gray-500 px-1">
                              <span>{label}</span>
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                              {[0, 1, 2].map(axis => (
                                <div key={axis} className="relative">
                                   <span className="absolute left-2 top-1.5 text-[9px] font-bold text-gray-500">
                                      {axis === 0 ? 'X' : axis === 1 ? 'Y' : 'Z'}
                                   </span>
                                   <input 
                                     className="w-full pl-5 pr-1 py-1.5 bg-black/20 rounded border border-white/10 text-white text-right focus:border-[#0078d7] focus:outline-none font-mono text-[11px]" 
                                     value={
                                        idx === 0 ? selectedObject.position[axis].toFixed(2) :
                                        idx === 1 ? selectedObject.rotation[axis].toFixed(1) :
                                        selectedObject.scale[axis].toFixed(2)
                                     } 
                                     readOnly 
                                   />
                                </div>
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-3 border border-dashed border-[#333] rounded m-4">
                <Palette size={32} opacity={0.2} />
                <div className="text-center">
                    <p className="font-medium text-gray-400">No Selection</p>
                    <p className="text-[10px]">Select an object to edit properties</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LAYERS TAB */}
        {activeTab === 'layers' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-200">
             {/* Layer Actions */}
             <div className="bg-[#1e1e1e] border-b border-[#2a2a2a] p-2 flex items-center gap-2 sticky top-0 z-20">
               <button 
                 className="bg-[#0078d7] hover:bg-[#0060ac] text-white p-1.5 rounded-sm transition-colors flex items-center gap-1.5 text-[10px] font-bold pr-2.5 shadow-sm" 
                 onClick={handleAddLayerClick}
               >
                 <Plus size={12} /> NEW LAYER
               </button>
               <div className="h-5 w-[1px] bg-[#333] mx-1"></div>
               <div className="relative flex-1">
                  <input placeholder="Filter..." className="w-full bg-black/20 border border-white/10 rounded-sm pl-2 pr-2 py-1 text-[10px] focus:border-[#0078d7] outline-none text-white" />
               </div>
             </div>
             
             {/* Layer List */}
             <div className="flex-1 overflow-auto bg-[#181818]">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-[#252525] sticky top-0 z-10 text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                    <tr>
                      <th className="w-8 px-1 py-2 border-b border-[#333] text-center">Stat</th>
                      <th className="px-2 py-2 border-b border-[#333]">Layer Name</th>
                      <th className="w-8 px-1 py-2 border-b border-[#333] text-center">Vis</th>
                      <th className="w-8 px-1 py-2 border-b border-[#333] text-center">Lock</th>
                      <th className="w-8 px-1 py-2 border-b border-[#333] text-center">Col</th>
                      <th className="w-8 px-1 py-2 border-b border-[#333] text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layers.map((layer, index) => {
                      const isMovingDown = draggedIndex !== null && draggedIndex < index;
                      const isMovingUp = draggedIndex !== null && draggedIndex > index;
                      const isDraggingOver = dragOverIndex === index;

                      return (
                        <tr 
                            key={layer.id} 
                            className={`
                            group transition-colors cursor-move
                            ${layer.isCurrent ? 'bg-[#2a2a2a]' : 'hover:bg-[#222]'}
                            ${isDraggingOver && isMovingDown ? 'border-b-2 border-[#0078d7]' : (isDraggingOver && isMovingUp ? 'border-t-2 border-[#0078d7]' : 'border-b border-[#222]')}
                            ${draggedIndex === index ? 'opacity-50 bg-[#111]' : ''}
                            `}
                            draggable={editingLayerId !== layer.id}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <td className="text-center cursor-pointer py-2" onClick={() => onSetCurrentLayer?.(layer.id)}>
                            {layer.isCurrent ? (
                                <div className="w-4 h-4 bg-[#0078d7] rounded-full mx-auto flex items-center justify-center shadow-[0_0_8px_rgba(0,120,215,0.6)]">
                                    <Check size={10} className="text-white" strokeWidth={3} />
                                </div>
                            ) : (
                                <div className="w-4 h-4 rounded-full border border-gray-600 mx-auto hover:border-gray-400"></div>
                            )}
                            </td>
                            
                            <td className="px-2 py-2" onDoubleClick={() => handleStartEdit(layer)}>
                            <div className="flex items-center gap-2">
                                {editingLayerId === layer.id ? (
                                    <input 
                                    autoFocus
                                    className="w-full bg-[#111] text-white border border-[#0078d7] px-1 py-0.5 rounded text-xs outline-none"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className={`text-xs font-medium truncate ${layer.isCurrent ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{layer.name}</span>
                                )}
                            </div>
                            </td>

                            <td className="text-center cursor-pointer py-2" onClick={() => onToggleLayer?.(layer.id)}>
                            {layer.visible ? 
                                <Eye size={13} className="mx-auto text-gray-400 hover:text-white" /> : 
                                <EyeOff size={13} className="mx-auto text-gray-600" />
                            }
                            </td>
                            <td className="text-center cursor-pointer py-2" onClick={() => onLockLayer?.(layer.id)}>
                            {layer.locked ? 
                                <Lock size={12} className="mx-auto text-yellow-600" /> : 
                                <div className="w-3 h-3 mx-auto rounded-sm border border-transparent group-hover:border-gray-700"></div> 
                            }
                            </td>
                            <td className="text-center py-2">
                            <div className="w-3 h-3 mx-auto rounded-sm shadow-sm ring-1 ring-white/10" style={{ backgroundColor: layer.color }}></div>
                            </td>
                            <td className="text-center py-2">
                            <Trash2 
                                size={12} 
                                className="text-gray-600 hover:text-red-500 cursor-pointer mx-auto opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => handleDeleteLayerClick(layer.id, layer.name)}
                            />
                            </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-[#181818] animate-in fade-in slide-in-from-right-4 duration-200">
             <div className="bg-[#252525] p-3 flex items-center gap-2 border-b border-[#333]">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles size={14} className="text-white" />
                </div>
                <div>
                    <div className="text-xs font-bold text-white">AI Assistant</div>
                    <div className="text-[9px] text-green-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online</div>
                </div>
             </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'model' && (
                        <div className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center shrink-0 border border-[#444]">
                            <Bot size={12} className="text-gray-400" />
                        </div>
                    )}
                    <div 
                        className={`max-w-[85%] p-2.5 rounded-lg text-xs leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-[#0078d7] text-white rounded-br-none' 
                            : 'bg-[#2a2a2a] text-gray-200 border border-[#333] rounded-bl-none'
                        }`}
                    >
                        {msg.text}
                    </div>
                </div>
              ))}
              {isChatLoading && (
                 <div className="flex gap-2">
                    <div className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center shrink-0 border border-[#444]">
                        <Bot size={12} className="text-gray-400" />
                    </div>
                    <div className="bg-[#2a2a2a] p-2.5 rounded-lg rounded-bl-none border border-[#333]">
                       <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                       </div>
                    </div>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-3 bg-[#252525] border-t border-[#333]">
               <div className="relative">
                 <input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Ask about your model..." 
                    className="w-full bg-[#111] border border-[#333] rounded-full pl-4 pr-10 py-2.5 text-xs text-white focus:border-[#0078d7] outline-none shadow-inner"
                    disabled={isChatLoading}
                 />
                 <button 
                   onClick={handleSendMessage}
                   disabled={isChatLoading || !chatInput.trim()}
                   className="absolute right-1 top-1 p-1.5 bg-[#0078d7] hover:bg-[#0060ac] text-white rounded-full disabled:opacity-50 disabled:bg-[#333] transition-all shadow-md"
                 >
                   {isChatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {(activeTab === 'settings') && (
            <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="space-y-3">
                     <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-[#333] pb-1">
                         <Settings size={10} /> Global Config
                     </div>
                     
                     <div className="space-y-3 bg-[#252525] p-3 rounded border border-[#333]">
                        <div className="flex items-center justify-between">
                            <label className="text-gray-300 text-xs font-medium">System Units</label>
                            <select 
                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#0078d7]"
                                value={currentUnit}
                                onChange={(e) => onSetUnit && onSetUnit(e.target.value as UnitType)}
                            >
                                <option value="mm">Millimeters (mm)</option>
                                <option value="cm">Centimeters (cm)</option>
                                <option value="m">Meters (m)</option>
                                <option value="in">Inches (in)</option>
                                <option value="ft">Feet (ft)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-gray-300 text-xs font-medium">Grid Display</label>
                            <div className="w-8 h-4 bg-[#0078d7] rounded-full relative cursor-pointer">
                                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>
                     </div>
                </div>

                <div className="bg-[#252525] p-4 rounded border border-[#333] text-center space-y-3">
                    <div className="w-12 h-12 bg-[#333] rounded-full flex items-center justify-center mx-auto">
                        <Cpu size={20} className="text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">PyGrassReal AI</h3>
                        <p className="text-xs text-gray-500">Version 2.0.1 Pro</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-green-500 bg-green-500/10 py-1 px-2 rounded-full border border-green-500/20">
                        <ShieldCheck size={10} /> Verified System
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
