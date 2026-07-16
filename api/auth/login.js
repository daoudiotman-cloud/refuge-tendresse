import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clients = (await kv.get('clients')) || [];
    const found = clients.find(
      c => c.email === req.body.email && c.password === req.body.password
    );

    if (!found) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const { password, ...safeUser } = found;
    return res.status(200).json({ success: true, user: safeUser });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}