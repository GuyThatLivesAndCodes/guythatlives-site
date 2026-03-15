/**
 * Cloudflare Worker - Hyperbeam Proxy
 *
 * This worker securely proxies Hyperbeam API requests to keep your API key hidden.
 *
 * Setup:
 * 1. Go to Cloudflare Dashboard → Workers & Pages
 * 2. Create a new Worker named "hyperbeam-proxy"
 * 3. Paste this code
 * 4. Add Environment Variable:
 *    - Name: HYPERBEAM_API_KEY
 *    - Value: hb_your_actual_key_here
 *    - Type: Secret (encrypted)
 * 5. Deploy!
 */

export default {
  async fetch(request, env) {
    // CORS headers - Allow requests from your site
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Change to 'https://guythatlives.com' for production
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    try {
      // Parse request body
      const { gameId, action, sessionId } = await request.json();

      // Route to appropriate handler
      if (action === 'create' || !action) {
        return await createSession(gameId, env, corsHeaders);
      } else if (action === 'end') {
        return await endSession(sessionId, env, corsHeaders);
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
};

/**
 * Create a new Hyperbeam session
 */
async function createSession(gameId, env, corsHeaders) {
  // Validate API key exists
  if (!env.HYPERBEAM_API_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Hyperbeam API key not configured'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Call Hyperbeam API to create VM
    const hyperbeamResponse = await fetch('https://engine.hyperbeam.com/v0/vm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.HYPERBEAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Optional: Auto-launch a URL when VM starts
        // start_url: 'https://now.gg/play/epic-games/4804/fortnite',

        timeout: {
          absolute: 3600, // 1 hour max session
          inactive: 300   // 5 minutes of inactivity
        },

        // Optional: Set screen resolution
        // width: 1920,
        // height: 1080,
      })
    });

    if (!hyperbeamResponse.ok) {
      const errorData = await hyperbeamResponse.text();
      console.error('Hyperbeam API error:', errorData);

      return new Response(JSON.stringify({
        success: false,
        error: `Hyperbeam API error: ${hyperbeamResponse.status}`
      }), {
        status: hyperbeamResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await hyperbeamResponse.json();

    // Return session info (WITHOUT exposing the API key!)
    return new Response(JSON.stringify({
      success: true,
      status: 'active',
      sessionId: data.session_id,
      embedUrl: data.embed_url,
      adminToken: data.admin_token,
      gameId: gameId
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error creating Hyperbeam session:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * End a Hyperbeam session (optional - sessions auto-expire)
 */
async function endSession(sessionId, env, corsHeaders) {
  // For now, just acknowledge the request
  // Hyperbeam sessions will auto-timeout based on inactivity
  return new Response(JSON.stringify({
    success: true,
    message: 'Session will expire automatically'
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
