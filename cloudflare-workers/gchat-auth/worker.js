/**
 * G-Chat Authentication Worker
 * Cloudflare Worker for password hashing and session management
 * Replaces Firebase Cloud Functions (works on Spark plan!)
 */

// Import bcrypt-edge (Cloudflare-compatible bcrypt)
import bcrypt from 'bcryptjs';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route requests
      if (path === '/signup' && request.method === 'POST') {
        return await handleSignup(request, env);
      } else if (path === '/login' && request.method === 'POST') {
        return await handleLogin(request, env);
      } else if (path === '/validate' && request.method === 'POST') {
        return await handleValidate(request, env);
      } else if (path === '/change-password' && request.method === 'POST') {
        return await handleChangePassword(request, env);
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Internal server error', details: error.message }, 500);
    }
  }
};

/**
 * Handle signup
 */
async function handleSignup(request, env) {
  const data = await request.json();
  const { username, displayName, password, email } = data;

  // Validation
  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400);
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
    return jsonResponse({ error: 'Username must be 3-20 characters (alphanumeric and underscore)' }, 400);
  }

  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate IDs
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  // Calculate expiration (7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Store in KV (Cloudflare Workers KV)
  // Account data
  await env.GCHAT_ACCOUNTS.put(
    `account:${username.toLowerCase()}`,
    JSON.stringify({
      username: username.toLowerCase(),
      displayName: displayName || username,
      passwordHash,
      userId,
      email: email || null,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      bannedUntil: null
    })
  );

  // Session data
  await env.GCHAT_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify({
      userId,
      username: username.toLowerCase(),
      createdAt: new Date().toISOString(),
      expiresAt,
      lastActive: new Date().toISOString()
    }),
    { expirationTtl: 7 * 24 * 60 * 60 } // Auto-delete after 7 days
  );

  // User profile (stored in Firestore by client)
  // We just return the data for client to write

  return jsonResponse({
    success: true,
    sessionId,
    userId,
    username: username.toLowerCase(),
    displayName: displayName || username,
    isAdmin: false
  });
}

/**
 * Handle login
 */
async function handleLogin(request, env) {
  const data = await request.json();
  const { username, password } = data;

  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400);
  }

  // Get account
  const accountData = await env.GCHAT_ACCOUNTS.get(`account:${username.toLowerCase()}`);

  if (!accountData) {
    return jsonResponse({ error: 'Invalid credentials' }, 401);
  }

  const account = JSON.parse(accountData);

  // Check ban
  if (account.bannedUntil && new Date(account.bannedUntil) > new Date()) {
    return jsonResponse({ error: `Account banned until ${account.bannedUntil}` }, 403);
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, account.passwordHash);

  if (!passwordMatch) {
    return jsonResponse({ error: 'Invalid credentials' }, 401);
  }

  // Create session
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await env.GCHAT_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify({
      userId: account.userId,
      username: account.username,
      createdAt: new Date().toISOString(),
      expiresAt,
      lastActive: new Date().toISOString()
    }),
    { expirationTtl: 7 * 24 * 60 * 60 }
  );

  return jsonResponse({
    success: true,
    sessionId,
    userId: account.userId,
    username: account.username,
    displayName: account.displayName,
    isAdmin: account.isAdmin || false
  });
}

/**
 * Handle session validation
 */
async function handleValidate(request, env) {
  const data = await request.json();
  const { sessionId } = data;

  if (!sessionId) {
    return jsonResponse({ valid: false }, 200);
  }

  // Get session
  const sessionData = await env.GCHAT_SESSIONS.get(`session:${sessionId}`);

  if (!sessionData) {
    return jsonResponse({ valid: false }, 200);
  }

  const session = JSON.parse(sessionData);

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await env.GCHAT_SESSIONS.delete(`session:${sessionId}`);
    return jsonResponse({ valid: false }, 200);
  }

  // Update heartbeat
  session.lastActive = new Date().toISOString();
  await env.GCHAT_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(session),
    { expirationTtl: 7 * 24 * 60 * 60 }
  );

  return jsonResponse({
    valid: true,
    userId: session.userId,
    username: session.username
  });
}

/**
 * Handle password change
 */
async function handleChangePassword(request, env) {
  const data = await request.json();
  const { sessionId, oldPassword, newPassword } = data;

  if (!sessionId || !oldPassword || !newPassword) {
    return jsonResponse({ error: 'All fields are required' }, 400);
  }

  if (newPassword.length < 8) {
    return jsonResponse({ error: 'New password must be at least 8 characters' }, 400);
  }

  // Validate session
  const sessionData = await env.GCHAT_SESSIONS.get(`session:${sessionId}`);

  if (!sessionData) {
    return jsonResponse({ error: 'Invalid session' }, 401);
  }

  const session = JSON.parse(sessionData);

  // Get account
  const accountData = await env.GCHAT_ACCOUNTS.get(`account:${session.username}`);

  if (!accountData) {
    return jsonResponse({ error: 'Account not found' }, 404);
  }

  const account = JSON.parse(accountData);

  // Verify old password
  const passwordMatch = await bcrypt.compare(oldPassword, account.passwordHash);

  if (!passwordMatch) {
    return jsonResponse({ error: 'Current password is incorrect' }, 401);
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update account
  account.passwordHash = newPasswordHash;
  await env.GCHAT_ACCOUNTS.put(`account:${session.username}`, JSON.stringify(account));

  return jsonResponse({ success: true });
}

/**
 * Helper: JSON response with CORS
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
