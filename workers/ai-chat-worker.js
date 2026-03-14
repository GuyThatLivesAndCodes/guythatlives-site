/**
 * Cloudflare Worker for AI Chat
 * Handles AI requests from the frontend and proxies them to Workers AI
 */

export default {
  async fetch(request, env) {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const { messages, model, temperature, max_tokens } = await request.json();

      // Validate input
      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Default model if not specified
      const selectedModel = model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

      // Call Workers AI
      const response = await env.AI.run(selectedModel, {
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2048,
        stream: false
      });

      // Extract text from AI response
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response.response) {
        responseText = response.response;
      } else if (response.text) {
        responseText = response.text;
      } else if (response.generated_text) {
        responseText = response.generated_text;
      } else {
        responseText = JSON.stringify(response);
      }

      // Return the AI response
      return new Response(JSON.stringify({
        success: true,
        response: String(responseText),
        model: selectedModel
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('AI Worker Error:', error);

      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Failed to process AI request'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
