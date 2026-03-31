export async function GET(request) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!base || !key) {
    return Response.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY on the server.' },
      { status: 500 }
    );
  }

  const url = `${base}/rest/v1/project_os_state?id=eq.singleton&select=payload,updated_at`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return Response.json(
        { error: 'Supabase GET failed', details: text },
        { status: 500 }
      );
    }

    const rows = await resp.json();
    const row = Array.isArray(rows) ? rows[0] : null;

    return Response.json({
      state: row?.payload || null,
      updatedAt: row?.updated_at || null
    });
  } catch (err) {
    return Response.json(
      { error: 'Unexpected GET failure', details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!base || !key) {
    return Response.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY on the server.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }

  const state = body?.state;
  if (!state || typeof state !== 'object') {
    return Response.json({ error: 'Body must include a state object.' }, { status: 400 });
  }

  const url = `${base}/rest/v1/project_os_state`;
  const payload = [{
    id: 'singleton',
    payload: state,
    updated_at: new Date().toISOString()
  }];

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return Response.json(
        { error: 'Supabase POST failed', details: text },
        { status: 500 }
      );
    }

    const rows = await resp.json().catch(() => []);
    return Response.json({
      ok: true,
      updatedAt: rows?.[0]?.updated_at || new Date().toISOString()
    });
  } catch (err) {
    return Response.json(
      { error: 'Unexpected POST failure', details: String(err) },
      { status: 500 }
    );
  }
}
