import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get initial values from localStorage or env if available
const getStoredConfig = () => {
  const stored = localStorage.getItem('reobote_settings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        url: parsed.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '',
        key: parsed.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      };
    } catch (e) {
      // ignore
    }
  }
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };
};

const config = getStoredConfig();

let supabaseInstance: SupabaseClient | null = null;

if (config.url && config.key && config.url.startsWith('http')) {
  try {
    supabaseInstance = createClient(config.url, config.key);
  } catch (e) {
    console.warn('Failed to initialize Supabase client:', e);
  }
}

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;
  const current = getStoredConfig();
  if (current.url && current.key && current.url.startsWith('http')) {
    try {
      supabaseInstance = createClient(current.url, current.key);
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client on demand:', e);
    }
  }
  return null;
};

export const resetSupabaseClient = (url: string, key: string) => {
  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  supabaseInstance = null;
  return false;
};
