
import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2, FileText, Loader2, Clock, HardDrive, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { IObject3D, Layer } from '../types';

interface Project {
  id: string;
  name: string;
  description: string;
  updated_at: string;
  thumbnail_url?: string;
}

interface ProjectsManagerProps {
  isOpen: boolean;
  mode: 'save' | 'load' | 'manage';
  currentData: { objects: IObject3D[], layers: Layer[] };
  onClose: () => void;
  onLoad: (data: { objects: IObject3D[], layers: Layer[] }, projectId: string) => void;
  onSaveSuccess: (projectId: string, name: string) => void;
  user: any;
}

// Local Storage Key
const LOCAL_STORAGE_KEY = 'pygrass_local_projects';

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({ 
  isOpen, 
  mode, 
  currentData, 
  onClose, 
  onLoad, 
  onSaveSuccess,
  user 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  
  const isLocalMode = !user;

  // Fetch projects on mount
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, user]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      if (isLocalMode) {
          // Local Storage Fetch
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
              const localProjects = JSON.parse(raw);
              // Sort by updated_at desc
              localProjects.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              setProjects(localProjects);
          } else {
              setProjects([]);
          }
      } else {
          // Supabase Fetch
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, description, updated_at, thumbnail_url')
            .order('updated_at', { ascending: false });
          
          if (error) throw error;
          setProjects(data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    
    setLoading(true);
    try {
      const projectData = {
        objects: currentData.objects,
        layers: currentData.layers
      };

      if (isLocalMode) {
          // Local Storage Save
          const newProject = {
              id: `local_${Date.now()}`,
              name: saveName,
              description: saveDesc,
              updated_at: new Date().toISOString(),
              data: projectData
          };

          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          const currentProjects = raw ? JSON.parse(raw) : [];
          const updatedProjects = [newProject, ...currentProjects];
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjects));
          
          onSaveSuccess(newProject.id, newProject.name);
          onClose();
      } else {
          // Supabase Save
          const { data, error } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              name: saveName,
              description: saveDesc,
              data: projectData,
              is_public: false
            })
            .select()
            .single();

          if (error) throw error;
          
          if (data) {
            onSaveSuccess(data.id, data.name);
            onClose();
          }
      }
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (projectId: string) => {
    setLoading(true);
    try {
      if (isLocalMode) {
           // Local Storage Load
           const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
           if (raw) {
               const localProjects = JSON.parse(raw);
               const project = localProjects.find((p: any) => p.id === projectId);
               if (project && project.data) {
                   onLoad(project.data, projectId);
                   onClose();
               }
           }
      } else {
          // Supabase Load
          const { data, error } = await supabase
            .from('projects')
            .select('data')
            .eq('id', projectId)
            .single();

          if (error) throw error;
          
          if (data && data.data) {
            // @ts-ignore
            onLoad(data.data, projectId);
            onClose();
          }
      }
    } catch (err) {
      console.error('Error loading project:', err);
      alert('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      if (isLocalMode) {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
              const localProjects = JSON.parse(raw);
              const updated = localProjects.filter((p: any) => p.id !== projectId);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
              setProjects(updated);
          }
      } else {
          const { error } = await supabase.from('projects').delete().eq('id', projectId);
          if (error) throw error;
          setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[600px] max-h-[80vh] bg-[#2d2d2d] border border-[#555] shadow-2xl text-gray-200 flex flex-col rounded-sm animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="h-10 bg-[#0078d7] flex items-center justify-between px-4 select-none shrink-0">
          <span className="font-bold text-sm text-white flex items-center gap-2">
            {mode === 'save' ? <Save size={16} /> : <FolderOpen size={16} />}
            {mode === 'save' ? 'Save Project As...' : 'Open Project'}
            {isLocalMode && <span className="bg-yellow-600 text-[10px] px-1.5 py-0.5 rounded ml-2">LOCAL STORAGE</span>}
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 rounded p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          
          {isLocalMode && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded flex items-start gap-3">
                  <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-300">
                      <span className="font-bold text-yellow-400 block mb-0.5">Guest Mode Active</span>
                      Projects are saved to your browser's Local Storage. If you clear browser data, these files will be lost. Log in to save to the cloud.
                  </div>
              </div>
          )}

          {mode === 'save' && (
            <form onSubmit={handleSave} className="space-y-4 mb-6">
               <div className="space-y-1">
                 <label className="text-xs uppercase font-bold text-gray-400">Project Name</label>
                 <input 
                   value={saveName}
                   onChange={(e) => setSaveName(e.target.value)}
                   className="w-full bg-[#1a1a1a] border border-[#454545] rounded p-2 text-white focus:border-[#0078d7] outline-none"
                   placeholder="My Awesome Model"
                   autoFocus
                   required
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs uppercase font-bold text-gray-400">Description (Optional)</label>
                 <textarea 
                   value={saveDesc}
                   onChange={(e) => setSaveDesc(e.target.value)}
                   className="w-full bg-[#1a1a1a] border border-[#454545] rounded p-2 text-white focus:border-[#0078d7] outline-none h-20 resize-none"
                   placeholder="Architecture concept..."
                 />
               </div>
               <button 
                 type="submit" 
                 disabled={loading}
                 className="bg-[#0078d7] hover:bg-[#005a9e] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50"
               >
                 {loading && <Loader2 size={14} className="animate-spin" />}
                 {isLocalMode ? 'Save to Browser' : 'Save to Cloud'}
               </button>
            </form>
          )}

          <div className="flex-1 overflow-hidden flex flex-col">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase">
                    {isLocalMode ? 'Local Projects' : 'Cloud Projects'}
                </h3>
                {loading && <Loader2 size={14} className="animate-spin text-[#0078d7]" />}
             </div>
             
             <div className="flex-1 overflow-y-auto border border-[#454545] bg-[#1a1a1a] rounded">
                {projects.length === 0 && !loading ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    {isLocalMode ? <HardDrive size={32} opacity={0.2} /> : <FileText size={32} opacity={0.2} />}
                    <span className="text-sm">No projects found</span>
                  </div>
                ) : (
                  <div className="divide-y divide-[#333]">
                    {projects.map(p => (
                      <div 
                        key={p.id} 
                        className="p-3 hover:bg-[#333] cursor-pointer group flex items-center justify-between transition-colors"
                        onClick={() => handleLoad(p.id)}
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-[#252525] rounded flex items-center justify-center text-gray-600">
                             <FileText size={20} />
                           </div>
                           <div>
                             <div className="text-sm font-medium text-gray-200">{p.name}</div>
                             <div className="text-[10px] text-gray-500 flex items-center gap-2">
                               <span className="flex items-center gap-1"><Clock size={10} /> {new Date(p.updated_at).toLocaleDateString()}</span>
                               {p.description && <span className="truncate max-w-[200px]">- {p.description}</span>}
                             </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={(e) => handleDelete(p.id, e)}
                             className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#444] rounded"
                             title="Delete Project"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
