// Cliente Supabase para o navegador (use a ANON key, nunca a service_role).
// Útil para Auth e Realtime. Retorna null se não estiver configurado.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
