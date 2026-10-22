import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  const apiKey = request.headers.get('apikey')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!authorization || !token || !apiKey) return json({ error: 'Authentication required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
  const cloudinaryApiKey = Deno.env.get('CLOUDINARY_API_KEY')
  const cloudinaryApiSecret = Deno.env.get('CLOUDINARY_API_SECRET')
  if (!supabaseUrl || !cloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    return json({ error: 'Upload service is not configured' }, 503)
  }

  const supabase = createClient(supabaseUrl, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData.user) return json({ error: 'Invalid session' }, 401)

  const { data: role, error: roleError } = await supabase.rpc('current_app_role')
  if (roleError) return json({ error: 'Could not verify account role' }, 403)
  if (role !== 'organizer' && role !== 'admin') return json({ error: 'Organizer access required' }, 403)

  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `trip-${crypto.randomUUID()}`
  const allowedFormats = 'jpg,png,webp'
  const signedParameters = [
    `allowed_formats=${allowedFormats}`,
    'overwrite=false',
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].join('&')
  const bytes = new TextEncoder().encode(`${signedParameters}${cloudinaryApiSecret}`)
  const digest = await crypto.subtle.digest('SHA-1', bytes)

  return json({
    cloudName,
    apiKey: cloudinaryApiKey,
    timestamp,
    publicId,
    signature: toHex(digest),
  })
})
