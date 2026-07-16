import { kv } from '@vercel/kv';
import crypto from 'crypto';

const ARRAY_RESOURCES = ['reservations', 'rooms', 'services', 'events', 'clients', 'pets'];
const OBJECT_RESOURCES = ['settings'];
const ALL = [...ARRAY_RESOURCES, ...OBJECT_RESOURCES];

async function ensureDefaults() {
  const settings = await kv.get('settings');
  if (!settings) {
    await kv.set('settings', {
      hotelName: 'Refuge de la Tendresse',
      address: '123 Rue des Animaux, 75001 Paris',
      phone: '+33 1 23 45 67 89',
      email: 'contact@refuge-tendresse.fr',
      hours: '7h - 21h tous les jours',
      currency: 'EUR',
      currencySymbol: 'EUR'
    });
  }

  const services = await kv.get('services');
  if (!services) {
    await kv.set('services', [
      { id: crypto.randomUUID(), key: 'boarding', name: 'Hebergement', icon: 'H', price: 35, unit: 'nuit', description: 'Chambres confortables avec surveillance 24/7' },
      { id: crypto.randomUUID(), key: 'grooming', name: 'Toilettage', icon: 'T', price: 25, unit: 'seance', description: 'Bain, coupe, brushing par des professionnels' },
      { id: crypto.randomUUID(), key: 'training', name: 'Formation', icon: 'F', price: 40, unit: 'session', description: 'Cours d obeissance et sociabilisation' },
      { id: crypto.randomUUID(), key: 'daycare', name: 'Garderie', icon: 'G', price: 20, unit: 'jour', description: 'Journees d activites et de jeux' },
      { id: crypto.randomUUID(), key: 'transport', name: 'Transport', icon: 'X', price: 15, unit: 'trajet', description: 'Navette securisee porte-a-porte' },
      { id: crypto.randomUUID(), key: 'vet', name: 'Veterinaire', icon: 'V', price: 50, unit: 'consultation', description: 'Soins medicaux professionnels' }
    ]);
  }

  const rooms = await kv.get('rooms');
  if (!rooms) {
    await kv.set('rooms', [
      { id: crypto.randomUUID(), name: 'Suite Confort 1', type: 'comfort', price: 35, capacity: '8m2', description: 'Lit orthopedique', occupied: false, occupantName: '', photo: '', status: 'available', blockedDates: [] },
      { id: crypto.randomUUID(), name: 'Suite Royale 1', type: 'royal', price: 55, capacity: '15m2', description: 'Canape, menu gastronomique', occupied: false, occupantName: '', photo: '', status: 'available', blockedDates: [] },
      { id: crypto.randomUUID(), name: 'Nid Felin 1', type: 'cat', price: 30, capacity: '5m2', description: 'Arbre a chat, hamac', occupied: false, occupantName: '', photo: '', status: 'available', blockedDates: [] }
    ]);
  }
}

export default async function handler(req, res) {
  const { resource } = req.query;

  if (!ALL.includes(resource)) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  try {
    await ensureDefaults();
    const isObject = OBJECT_RESOURCES.includes(resource);

    if (req.method === 'GET') {
      const data = await kv.get(resource);
      if (isObject) return res.status(200).json(data || {});

      let list = data || [];
      if (resource === 'pets' && req.query.ownerId) {
        list = list.filter(p => p.ownerId === req.query.ownerId);
      }
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      if (isObject) {
        await kv.set(resource, req.body);
        return res.status(200).json({ success: true });
      }

      const list = (await kv.get(resource)) || [];
      const item = {
        ...req.body,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      if (resource === 'reservations' && !item.status) item.status = 'pending';

      list.push(item);
      await kv.set(resource, list);
      return res.status(201).json({ success: true, id: item.id });
    }

    if (req.method === 'PUT') {
      if (isObject) {
        await kv.set(resource, req.body);
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: 'Use /api/resource/id for updates' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}