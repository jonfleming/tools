// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

let supabaseInstance = null;

export const getSupabaseClient = (supabaseUrl, supabaseAnonKey) => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};