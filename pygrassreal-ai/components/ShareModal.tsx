
import React, { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle, Mail, Link, Copy, Globe, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  projectId?: string | null;
  projectName?: string;
}

// Mock collaborators for demonstration
const INITIAL_MOCK_COLLABORATORS = [
  { email: 'alex@design.studio', role: 'Editor', avatar: 'A', status: 'Active' }
];

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, currentUser, projectId, projectName = "Untitled Project" }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Update collaborators list with current user on open
  useEffect(() => {
     if (isOpen) {
         const ownerEmail = currentUser?.email || 'guest@demo.com';
         // Reset to mock + current user
         const userCollab = { 
             email: ownerEmail, 
             role: 'Owner', 
             avatar: ownerEmail.charAt(0).toUpperCase(),
             status: 'Active'
         };
         // Combine with initial mocks
         setCollaborators([userCollab, ...INITIAL_MOCK_COLLABORATORS]);
         setEmail('');
         setStatus({ type: null, message: '' });
     }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus({ type: null, message: '' });

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      if (email.includes('@')) {
        setStatus({ type: 'success', message: `Invite sent to ${email}` });
        
        // Add to list visually (Simulation)
        setCollaborators(prev => [...prev, { 
          email: email, 
          role: 'Editor', 
          avatar: email.charAt(0).toUpperCase(),
          status: 'Pending'
        }]);
        
        setEmail('');
      } else {
        setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      }
    }, 600);
  };

  const handleCopyLink = () => {
      const id = projectId || `proj_${Math.floor(Math.random() * 1000)}`;
      const url = `${window.location.origin}/project/${id}?invite=true`;
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] bg-[#1e1e1e] border border-[#444] shadow-2xl rounded-xl overflow-hidden flex flex-col font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-[#333] flex items-center justify-between bg-[#252525]">
          <div>
             <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-[#0078d7]" />
                Share Project
             </h2>
             <p className="text-xs text-gray-400 mt-0.5 font-medium">"{projectName}"</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 bg-[#1e1e1e]">
          
          {/* Invite Section */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invite by Email</label>
             <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1 group">
                <Mail size={16} className="absolute left-3 top-3 text-gray-500 group-focus-within:text-[#0078d7] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg py-2.5 pl-10 pr-3 text-sm text-white focus:border-[#0078d7] focus:ring-1 focus:ring-[#0078d7] focus:outline-none placeholder-gray-600 transition-all"
                  placeholder="colleague@company.com"
                />
              </div>
              <select className="bg-[#121212] border border-[#333] text-gray-300 text-xs rounded-lg px-3 outline-none focus:border-[#0078d7]">
                  <option>Can Edit</option>
                  <option>Can View</option>
              </select>
              <button
                type="submit"
                disabled={loading || !email}
                className="bg-[#0078d7] hover:bg-[#0060ac] text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
              >
                {loading ? 'Sending...' : 'Invite'}
                {!loading && <Send size={14} />}
              </button>
            </form>
            
            {status.message && (
              <div className={`text-xs flex items-center gap-1.5 p-2 rounded animate-in fade-in slide-in-from-top-1 duration-200 ${status.type === 'success' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-red-400 bg-red-400/10 border border-red-400/20'}`}>
                {status.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                {status.message}
              </div>
            )}
          </div>

          {/* Copy Link Section */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">General Access</label>
             <div className="flex items-center gap-3 bg-[#121212] p-2 pl-4 rounded-lg border border-[#333]">
                <div className="w-8 h-8 bg-[#252525] rounded-full flex items-center justify-center shrink-0">
                   <Globe size={16} className="text-gray-400" />
                </div>
                <div className="flex-1">
                    <div className="text-sm text-gray-200 font-medium">Anyone with the link</div>
                    <div className="text-[10px] text-gray-500">Can view this project</div>
                </div>
                <div className="h-8 w-[1px] bg-[#333]"></div>
                <button 
                   onClick={handleCopyLink}
                   className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-colors text-xs font-bold mr-1 ${linkCopied ? 'bg-green-500/10 text-green-400' : 'text-[#0078d7] hover:bg-[#0078d7]/10'}`}
                >
                   {linkCopied ? <Check size={14} /> : <Link size={14} />}
                   {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
             </div>
          </div>

          {/* Collaborators List */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Team Members</label>
                <span className="text-[10px] text-gray-600 bg-[#252525] px-2 py-0.5 rounded-full">{collaborators.length} users</span>
             </div>
             
             <div className="border border-[#333] rounded-lg overflow-hidden bg-[#121212]">
                 <div className="max-h-40 overflow-y-auto divide-y divide-[#2a2a2a]">
                    {collaborators.map((collab, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/10
                                    ${collab.role === 'Owner' ? 'bg-purple-600' : (collab.status === 'Pending' ? 'bg-gray-600' : 'bg-blue-600')}`}>
                                    {collab.avatar}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                        {collab.email}
                                        {collab.email === currentUser?.email && <span className="text-[9px] bg-[#252525] text-gray-400 px-1.5 rounded">You</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-500">{collab.role === 'Owner' ? 'Workspace Owner' : (collab.status === 'Pending' ? 'Invitation Pending' : 'Editor')}</div>
                                </div>
                            </div>
                            <div className="text-xs">
                                <span className={`px-2 py-1 rounded border text-[10px] font-bold ${
                                    collab.role === 'Owner' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 
                                    'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                }`}>
                                    {collab.role}
                                </span>
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#252525] p-4 border-t border-[#333] flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm font-medium transition-colors border border-[#444]"
           >
             Done
           </button>
        </div>
      </div>
    </div>
  );
};
