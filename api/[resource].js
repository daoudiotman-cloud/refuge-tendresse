import { handleResource } from './_lib.js';

const OBJECT_RESOURCES = ['settings'];
const VALID = ['reservations', 'rooms', 'services', 'events', 'clients', 'pets', 'messages', 'settings'];

export default async function handler(req, res) {
  const resource = req.query.resource;

  if (!resource || !VALID.includes(resource)) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const isObject = OBJECT_RESOURCES.includes(resource);
  return handleResource(req, res, resource, isObject);
}