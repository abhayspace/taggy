import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple Agora token generation (for development)
// In production, you should use proper Agora token generation with authentication
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelName, uid, role } = await req.json();
    
    const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID');
    
    if (!AGORA_APP_ID) {
      throw new Error('AGORA_APP_ID not configured');
    }

    // For development: return app ID and null token (requires Agora project to allow null tokens)
    // In production: implement proper token generation using Agora's token generation library
    console.log('Generating token for:', { channelName, uid, role });

    return new Response(
      JSON.stringify({
        appId: AGORA_APP_ID,
        token: null, // Set to null for development (enable in Agora console)
        uid: uid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
