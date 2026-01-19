
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ArrowRight, Box, Users, Cloud, Zap, HardDrive, CheckCircle, UserPlus, LogIn, User as UserIcon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onContinueGuest?: (mockUser: any) => void;
}

// Google Logo Component for authentic look
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.449 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onContinueGuest }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setSignupSuccess(false);
    setError(null);
    setEmail('');
    setFullName('');
    setPassword('');
    setShowPassword(false);
    onClose();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
       // Simulation for Demo/Preview Mode
       setTimeout(() => {
           setLoading(false);
           if (onContinueGuest) {
               onContinueGuest({ 
                   id: 'google-user-sim', 
                   email: 'demo-user@gmail.com',
                   user_metadata: { full_name: 'Google User' }
               });
           }
       }, 1000);
       return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate Name for Sign Up
    if (!isLogin && !fullName.trim()) {
        setError("Please enter your full name.");
        setLoading(false);
        return;
    }

    // SIMULATION MODE: If Supabase is not configured, we simulate a successful login
    if (!isSupabaseConfigured) {
        setTimeout(() => {
            setLoading(false);
            if (onContinueGuest) {
                onContinueGuest({ 
                    id: `sim-user-${Date.now()}`, 
                    email: email,
                    user_metadata: { full_name: isLogin ? email.split('@')[0] : fullName }
                });
            }
        }, 800);
        return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
        handleClose();
      } else {
        // Sign Up with Metadata (Full Name)
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
                full_name: fullName,
            }
          }
        });
        if (error) throw error;
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
            setSignupSuccess(true);
        } else {
            onSuccess();
            handleClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
      <div className="w-[850px] h-[550px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#333] overflow-hidden flex animate-in zoom-in-95 duration-200 font-sans relative">
        
        {/* Left Side - Promo & Features */}
        <div className="w-[340px] bg-[#111] p-8 flex flex-col justify-between border-r border-[#333] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 pointer-events-none"></div>
             <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#0078d7]/20 blur-[100px] rounded-full"></div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#0078d7] to-[#005a9e] rounded-lg flex items-center justify-center shadow-xl">
                        <Box size={16} className="text-white" strokeWidth={2} />
                    </div>
                    <span className="text-lg font-bold text-white tracking-wide">PyGrass<span className="text-[#3399ff]">Real</span></span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                   Collaborate in <br/> <span className="text-[#0078d7]">Real-Time</span>.
                </h2>
                <p className="text-gray-400 text-xs leading-relaxed">
                   The professional 3D modeling platform that brings your team together.
                </p>
             </div>

             <div className="space-y-5 relative z-10">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center shrink-0 border border-[#333]">
                        <Users size={14} className="text-[#0078d7]" />
                    </div>
                    <div>
                        <h4 className="text-white text-sm font-bold">Team Projects</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Invite colleagues and edit models simultaneously.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center shrink-0 border border-[#333]">
                        <Cloud size={14} className="text-purple-500" />
                    </div>
                    <div>
                        <h4 className="text-white text-sm font-bold">Cloud Storage</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Securely save your designs and access them anywhere.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center shrink-0 border border-[#333]">
                        <Zap size={14} className="text-yellow-500" />
                    </div>
                    <div>
                        <h4 className="text-white text-sm font-bold">Smart Tools</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Powered by advanced geometry algorithms.</p>
                    </div>
                </div>
             </div>

             <div className="relative z-10 pt-4 border-t border-[#333]">
                 <p className="text-[10px] text-gray-600">© 2024 PyGrassReal AI Inc.</p>
             </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex flex-col relative bg-[#1a1a1a]">
            {/* Close Button - Positioned safely in the corner without overlapping tabs */}
            <button 
            onClick={handleClose} 
            className="absolute top-3 right-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg p-2 transition-all z-50"
            title="Close"
            >
            <X size={20} />
            </button>

            {/* Added top padding (pt-12) to create space for the close button above the tabs */}
            <div className="flex-1 overflow-hidden px-8 pb-6 pt-12 flex flex-col">
                {signupSuccess ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30 ring-4 ring-green-500/5">
                            <CheckCircle size={40} className="text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Check your inbox</h3>
                            <p className="text-sm text-gray-400 mt-3 max-w-xs mx-auto leading-relaxed">
                                We've sent a confirmation link to <br/>
                                <span className="text-white font-medium bg-[#252525] px-2 py-0.5 rounded border border-[#333] mt-1 inline-block">{email}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-4">Click the link to activate your account.</p>
                        </div>
                        <button 
                            onClick={() => { setSignupSuccess(false); setIsLogin(true); }}
                            className="w-full max-w-xs bg-[#333] hover:bg-[#444] text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-[#444]"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col justify-center">
                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-[#222] rounded-lg mb-4 border border-[#333] relative shrink-0">
                             <button 
                               onClick={() => { setIsLogin(true); setError(null); }}
                               className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${isLogin ? 'bg-[#333] text-white shadow-sm ring-1 ring-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                             >
                                <LogIn size={14} />
                                Log In
                             </button>
                             <button 
                               onClick={() => { setIsLogin(false); setError(null); }}
                               className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${!isLogin ? 'bg-[#0078d7] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                             >
                                <UserPlus size={14} />
                                Create Account
                             </button>
                        </div>

                        <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="mb-4 text-center shrink-0">
                                <h3 className="text-xl font-bold text-white">
                                    {isLogin ? 'Welcome back' : 'Get started for free'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {isLogin 
                                        ? 'Enter your credentials to access your projects.' 
                                        : 'Join now to invite your team and sync projects.'}
                                </p>
                             </div>

                             {error && (
                                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] rounded-lg flex gap-2 items-center shrink-0">
                                    <span className="shrink-0">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-3">
                                {!isLogin && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label className="text-[9px] uppercase font-bold text-gray-500 ml-1">Full Name</label>
                                        <div className="relative group">
                                            <UserIcon size={14} className="absolute left-3 top-3 text-gray-500 group-focus-within:text-[#0078d7] transition-colors" />
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-[#252525] border border-transparent focus:border-[#0078d7] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:ring-1 focus:ring-[#0078d7] focus:outline-none transition-all placeholder-gray-600"
                                                placeholder="John Doe"
                                                required={!isLogin}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-gray-500 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail size={14} className="absolute left-3 top-3 text-gray-500 group-focus-within:text-[#0078d7] transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-[#252525] border border-transparent focus:border-[#0078d7] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:ring-1 focus:ring-[#0078d7] focus:outline-none transition-all placeholder-gray-600"
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[9px] uppercase font-bold text-gray-500">Password</label>
                                        {isLogin && <a href="#" className="text-[9px] text-[#0078d7] hover:underline">Forgot?</a>}
                                    </div>
                                    <div className="relative group">
                                        <Lock size={14} className="absolute left-3 top-3 text-gray-500 group-focus-within:text-[#0078d7] transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-[#252525] border border-transparent focus:border-[#0078d7] rounded-lg py-2 pl-9 pr-9 text-sm text-white focus:ring-1 focus:ring-[#0078d7] focus:outline-none transition-all placeholder-gray-600"
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 focus:outline-none p-0.5 rounded"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#0078d7] hover:bg-[#006bbd] text-white py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                                    {!loading && <ArrowRight size={16} />}
                                </button>
                            </form>

                            <div className="my-4 flex items-center gap-3 shrink-0">
                                <div className="h-[1px] bg-[#333] flex-1"></div>
                                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Or continue with</span>
                                <div className="h-[1px] bg-[#333] flex-1"></div>
                            </div>

                            {/* Google Button */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading} 
                                className="w-full bg-[#252525] hover:bg-[#2d2d2d] text-gray-200 py-2.5 rounded-lg border border-[#333] hover:border-[#444] text-sm font-medium transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] shrink-0"
                            >
                                <GoogleIcon />
                                Google Account
                            </button>
                        </div>
                        
                        {/* Footer for Demo */}
                        {!isSupabaseConfigured && onContinueGuest && (
                             <div className="mt-3 pt-3 border-t border-[#2a2a2a] text-center shrink-0">
                                  <button
                                     type="button"
                                     onClick={() => onContinueGuest({ id: 'guest', email: 'guest@demo.com', user_metadata: { full_name: 'Guest User' } })}
                                     className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto py-1 px-3 rounded hover:bg-[#222]"
                                  >
                                     <HardDrive size={10} />
                                     <span>Guest Mode (Local Only)</span>
                                  </button>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
