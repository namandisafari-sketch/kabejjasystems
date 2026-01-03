import { useMemo } from 'react';
import { supabase as lovableSupabase } from '@/integrations/supabase/client';
import { selfHostedSupabase } from '@/integrations/self-hosted-supabase/client';

// Toggle this to switch between Lovable Cloud and self-hosted Supabase
// HTTPS configured via Nginx + Let's Encrypt on kabejjasystems.store
const USE_SELF_HOSTED = true;

export const useDatabase = () => {
  const client = useMemo(() => {
    return USE_SELF_HOSTED ? selfHostedSupabase : lovableSupabase;
  }, []);

  return {
    client,
    isSelfHosted: USE_SELF_HOSTED,
  };
};

// Direct export for non-hook usage
export const getDatabase = () => {
  return USE_SELF_HOSTED ? selfHostedSupabase : lovableSupabase;
};

// Export the active client directly for database operations
export const db = USE_SELF_HOSTED ? selfHostedSupabase : lovableSupabase;

// IMPORTANT: Also export as 'supabase' for backward compatibility
// This allows existing code importing 'supabase' to use the correct client
export const supabase = USE_SELF_HOSTED ? selfHostedSupabase : lovableSupabase;

// Export Lovable Cloud client specifically for edge functions
// Edge functions are ONLY deployed to Lovable Cloud, not self-hosted
export const lovableClient = lovableSupabase;
