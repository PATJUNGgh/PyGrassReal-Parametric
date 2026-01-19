
import { createClient } from '@supabase/supabase-js';

// Helper to safely access process.env without crashing if process is undefined
const getEnv = (key: string): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    // Fallback for browser environments where window.process might be shimmed
    // @ts-ignore
    if (typeof window !== 'undefined' && window.process && window.process.env) {
      // @ts-ignore
      return window.process.env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const getSupabaseConfig = () => {
  let envUrl = getEnv('SUPABASE_URL');
  let envKey = getEnv('SUPABASE_ANON_KEY');

  // CHECK LOCAL STORAGE OVERRIDE
  // If env vars are missing or contain placeholder text, try to use localStorage
  const isPlaceholder = (val: string | undefined) => !val || val.includes('ใส่_') || val.includes('PLACEHOLDER');
  
  if (typeof window !== 'undefined') {
      // Check if user has manually configured via UI
      if (isPlaceholder(envUrl)) {
          const localUrl = localStorage.getItem('VITE_SUPABASE_URL');
          if (localUrl) envUrl = localUrl;
      }
      if (isPlaceholder(envKey)) {
          const localKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY');
          if (localKey) envKey = localKey;
      }
  }

  const isValidUrl = (url: string | undefined) => {
    try {
      if (!url) return false;
      // Attempt to construct a URL object to validate format (must include protocol)
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isConfigured = isValidUrl(envUrl) && !!envKey && !isPlaceholder(envKey);

  // If no valid URL is provided, use a dummy one to satisfy the library constructor
  // This prevents "Failed to construct 'URL'" errors on startup.
  const url = isConfigured ? envUrl! : 'https://placeholder-project.supabase.co';
  const key = isConfigured ? envKey! : 'placeholder-key';

  return { url, key, isConfigured };
};

const { url, key, isConfigured } = getSupabaseConfig();

export const supabase = createClient(url, key);
export const isSupabaseConfigured = isConfigured;
