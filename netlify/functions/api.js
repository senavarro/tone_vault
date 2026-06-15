const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    }
  }

  // Grab everything after /api/ regardless of how Netlify passes the path
  const splat = event.path.split('/api/').pop()
  const query = event.rawQuery ? `?${event.rawQuery}` : ''
  const url = `${SUPABASE_URL}/rest/v1/${splat}${query}`

  try {
    const res = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        event.headers?.prefer ?? 'return=representation',
      },
      body: ['POST', 'PATCH', 'PUT'].includes(event.httpMethod)
        ? event.body
        : undefined,
    })

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: await res.text(),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer',
  }
}
