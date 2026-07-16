import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { resource, id } = req.query;

  try {
    const list = (await kv.get(resource)) || [];

    if (req.method === 'PUT') {
      const idx = list.findIndex(x => x.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      list[idx] = { ...list[idx], ...req.body };
      await kv.set(resource, list);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const filtered = list.filter(x => x.id !== id);
      await kv.set(resource, filtered);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const item = list.find(x => x.id === id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(item);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}