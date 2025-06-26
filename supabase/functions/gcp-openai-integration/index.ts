// Deno runtime import
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDynamicRecommendations, RecommendationRequestData } from './handlers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { action, data } = await req.json() as { action: string, data: RecommendationRequestData };
    console.log('GCP integration request:', {
      action,
      data
    });
    switch (action) {
      case 'get_dynamic_recommendations':
        return await getDynamicRecommendations(data);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error: unknown) {
    console.error('Error in GCP-OpenAI integration:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    } else {
      console.error('Error (stringified):', JSON.stringify(error));
    }
    let message = 'Unknown error';
    if (typeof error === 'object' && error && 'message' in error) {
      message = (error as { message: string }).message;
    }
    return new Response(JSON.stringify({
      error: message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
