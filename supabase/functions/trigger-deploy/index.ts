import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const githubPat = Deno.env.get('GITHUB_PAT');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubPat || !githubRepo) {
      console.error('Missing GitHub configuration');
      return new Response(
        JSON.stringify({ error: 'GitHub configuration not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse repo format: owner/repo
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      console.error('Invalid GITHUB_REPO format, expected owner/repo');
      return new Response(
        JSON.stringify({ error: 'Invalid repository format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Triggering deployment for ${owner}/${repo}`);

    // Trigger repository dispatch event
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubPat}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'deploy-production',
          client_payload: {
            triggered_at: new Date().toISOString(),
            triggered_by: 'admin-panel',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to trigger deployment', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deployment triggered successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deployment triggered successfully',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error triggering deployment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
