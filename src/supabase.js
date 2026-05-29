import { createClient } from "@supabase/supabase-js";

// These come from your Netlify environment variables (set in deploy guide).
// Vite exposes vars prefixed with VITE_ to the browser.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);
