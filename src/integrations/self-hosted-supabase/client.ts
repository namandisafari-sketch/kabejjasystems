import { createClient } from '@supabase/supabase-js';

// Self-hosted Supabase configuration (HTTPS via Nginx)
const SELF_HOSTED_SUPABASE_URL = 'https://kabejjasystems.store';
const SELF_HOSTED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

export const selfHostedSupabase = createClient(
  SELF_HOSTED_SUPABASE_URL,
  SELF_HOSTED_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const SELF_HOSTED_CONFIG = {
  url: SELF_HOSTED_SUPABASE_URL,
  anonKey: SELF_HOSTED_SUPABASE_ANON_KEY,
};
