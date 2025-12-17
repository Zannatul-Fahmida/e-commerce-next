/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let cachedUser: any | null = null;
let lastUserFetch = 0;
let cachedSession: any | null = null;
let lastSessionFetch = 0;

export async function getUserCached(maxAgeMs = 5000) {
  const now = Date.now();
  if (cachedUser && now - lastUserFetch < maxAgeMs) {
    return { data: { user: cachedUser }, error: null };
  }
  const res = await supabase.auth.getUser();
  cachedUser = res.data?.user || null;
  lastUserFetch = now;
  return res;
}

export async function getSessionCached(maxAgeMs = 5000) {
  const now = Date.now();
  if (cachedSession && now - lastSessionFetch < maxAgeMs) {
    return { data: { session: cachedSession }, error: null };
  }
  const res = await supabase.auth.getSession();
  cachedSession = res.data?.session || null;
  lastSessionFetch = now;
  return res;
}
