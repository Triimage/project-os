module.exports = async (req, res) => {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (!base || !key) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY on the server.'
    });
  }

  const url = `${base}/rest/v1/project_os_state?id=eq.singleton&select=payload,updated_at`;

  if (req.method === 'GET') {
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json'
        }
      });

      if (!resp.ok) {
        const text = await resp.text();
        return res.status(500).json({ error: 'Supabase GET failed', details: text });
      }

      const rows = await resp.json();
      const row = Array.isArray(rows) ? rows[0] : null;

      return res.status(200).json({
        state: row?.payload || null,
        updatedAt: row?.updated_at || null
      });
    } catch (err) {
      return res.status(500).json({ error: 'Unexpected GET failure', details: String(err) });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }

    const state = body?.state;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Body must include a state object.' });
    }

    try {
      const resp = await fetch(`${base}/rest/v1/project_os_state`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([{
          id: 'singleton',
          payload: state,
          updated_at: new Date().toISOString()
        }])
      });

      if (!resp.ok) {
        const text = await resp.text();
        return res.status(500).json({ error: 'Supabase POST failed', details: text });
      }

      const rows = await resp.json().catch(() => []);
      return res.status(200).json({
        ok: true,
        updatedAt: rows?.[0]?.updated_at || new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ error: 'Unexpected POST failure', details: String(err) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
