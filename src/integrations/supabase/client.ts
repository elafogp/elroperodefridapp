import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsqotkpntctyompcxjfj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vB56QstU-pn0L0sXTTQCyA_dzE7MJak';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
