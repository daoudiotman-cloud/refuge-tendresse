import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clients = (await kv.get('clients')) || [];

    if (clients.find(c => c.email === req.body.email)) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    const user = {
      ...req.body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: 'registration'
    };
    clients.push(user);
    await kv.set('clients', clients);

    const { password, ...safeUser } = user;
    return res.status(201).json({ success: true, user: safeUser });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}