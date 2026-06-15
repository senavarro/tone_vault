// netlify/functions/supabase-songs.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Service key ONLY in Netlify env — never in binary
);

const FREE_LIMIT = 20;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const isPro = await verifyProUser(event.headers.authorization);

  try {
    let query = supabase.from('songs').select('*');

    // Filter pro content if user is not subscribed
    if (!isPro) {
      query = query.eq('is_pro', false).limit(FREE_LIMIT);
    }

    // Filters
    if (params.genre) query = query.eq('genre', params.genre);
    if (params.artist) query = query.ilike('artist', `%${params.artist}%`);
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,artist.ilike.%${params.search}%`);
    }
    if (params.decade) {
      const startYear = parseInt(params.decade);
      query = query.gte('year', startYear).lt('year', startYear + 10);
    }
    if (params.id) {
      query = query.eq('id', params.id).single();
    }

    const { data, error } = await query.order('artist');
    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function verifyProUser(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  // Validate against Supabase auth or your own receipt verification
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return false;
    // Check pro_users table or subscription metadata
    const { data } = await supabase
      .from('pro_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    return !!data;
  } catch {
    return false;
  }
}
