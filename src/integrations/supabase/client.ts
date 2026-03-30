import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsqotkpntctyompcxjfj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzcW90a3BudGN0eW9tcGN4amZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzgxODEsImV4cCI6MjA5MDQ1NDE4MX0.IniI_U4EP1eQZ92lgALApeXQmiaDFAJ_Xm1UAnrtsy8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
