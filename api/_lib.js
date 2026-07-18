import { kv } from '@vercel/kv';
import crypto from 'crypto';

const ARRAY_RESOURCES = ['reservations', 'rooms', 'services', 'events', 'clients', 'pets', 'messages'];
const OBJECT_RESOURCES = ['settings'];

async function ensureDefaults() {
  const settings = await kv.get('settings');
  if (!settings) {
    await kv.set('settings', {
      hotelName: 'Refuge de la Tendresse',
      address: 'Casablanca, Maroc',
      phone: '+212 5 22 00 00 00',
      email: 'contact@refuge-tendresse.fr',
      hours: '7h - 21h tous les jours',
      currency: 'MAD',
      currencySymbol: 'DH'
    });
  }

  const services = await kv.get('services');
  if (!services) {
    await kv.set('services', [
      { id: crypto.randomUUID(), key: 'boarding', name: 'Hebergement', icon: 'H', price: 250, unit: 'nuit', description: 'Chambres confortables 24/7' },
      { id: crypto.randomUUID(), key: 'grooming', name: 'Toilettage', icon: 'T', price: 200, unit: 'seance', description: 'Bain, coupe, brushing' },
      { id: crypto.randomUUID(), key: 'daycare', name: 'Garderie', icon: 'G', price: 150, unit: 'jour', description: 'Journees activites' },
      { id: crypto.randomUUID(), key: 'transport', name: 'Transport', icon: 'X', price: 100, unit: 'trajet', description: 'Navette porte-a-porte' },
      { id: crypto.randomUUID(), key: 'vet', name: 'Veterinaire', icon: 'V', price: 400, unit: 'consultation', description: 'Soins medicaux' }
    ]);
  }

  const rooms = await kv.get('rooms');
  if (!rooms) {
    await kv.set('rooms', [
      { id: crypto.randomUUID(), name: 'Suite Confort 1', type: 'comfort', price: 250, capacity: '8m2', description: 'Lit orthopedique, 2 promenades/jour', occupied: false, occupantName: '', photo: '', status: 'available', blockedDates: [] },
      { id: crypto.randomUUID(), name: 'Suite Royale 1', type: 'royal', price: 400, capacity: '15m2', description: 'Canape, menu gastronomique', occupied: false, occupantName: '', photo: '', status: 'available', blockedDates: [] },
      { id: crypto.randomUUID(), name: 'Nid Felin 1', type: 'cat', price: 180, capacity: '5m2', description: 'Arbre a chat, hamac', occupied: false, occupantName: '', photo: '', status: 'available', blockedDates: [] }
    ]);
  }
}

export async function handleResource(req, res, resourceName, isObject) {
  if (isObject === undefined) isObject = false;

  try {
    await ensureDefaults();

    // Parse ID from URL if present
    function getIdFromUrl() {
      const url = req.url || '';
      const cleanUrl = url.split('?')[0];
      const parts = cleanUrl.split('/').filter(Boolean);
      // For /api/messages/xyz -> parts = ['api', 'messages', 'xyz']
      if (parts.length >= 3 && parts[0] === 'api') {
        return parts[2];
      }
      return null;
    }

    if (req.method === 'GET') {
      const data = await kv.get(resourceName);
      if (isObject) return res.status(200).json(data || {});

      let list = data || [];
      const id = getIdFromUrl();

      if (id) {
        const item = list.find(x => x.id === id);
        if (item) return res.status(200).json(item);
        return res.status(404).json({ error: 'Not found' });
      }

      // Filter pets by ownerId query
      if (resourceName === 'pets' && req.query.ownerId) {
        list = list.filter(p => p.ownerId === req.query.ownerId);
      }

      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      if (isObject) {
        await kv.set(resourceName, req.body);
        return res.status(200).json({ success: true });
      }

      const list = (await kv.get(resourceName)) || [];
      const item = Object.assign({}, req.body, {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      });
      if (resourceName === 'reservations' && !item.status) item.status = 'pending';
      if (resourceName === 'messages' && item.read === undefined) item.read = false;

      list.push(item);
      await kv.set(resourceName, list);
      return res.status(201).json({ success: true, id: item.id });
    }

    if (req.method === 'PUT') {
      if (isObject) {
        await kv.set(resourceName, req.body);
        return res.status(200).json({ success: true });
      }
      const id = getIdFromUrl();
      if (!id) return res.status(400).json({ error: 'ID required' });

      const list = (await kv.get(resourceName)) || [];
      const idx = list.findIndex(x => x.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });

      list[idx] = Object.assign({}, list[idx], req.body);
      await kv.set(resourceName, list);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const id = getIdFromUrl();
      if (!id) return res.status(400).json({ error: 'ID required' });

      const list = (await kv.get(resourceName)) || [];
      const filtered = list.filter(x => x.id !== id);
      await kv.set(resourceName, filtered);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(resourceName + ' error:', err);
    return res.status(500).json({ error: err.message });
  }
}