import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

// Cliente estándar para el panel de administración (maneja la sesión del usuario)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente público que NUNCA persiste la sesión.
// Se usa para todas las partes públicas del sitio para evitar conflictos con el token de un admin logueado.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
