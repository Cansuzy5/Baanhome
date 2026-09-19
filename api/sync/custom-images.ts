import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db';

const CONFIG_ID = 'customImages';
const FALLBACK_FILE = 'persistent_custom_images.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const images = await getCentralConfig<Record<string, string>>(CONFIG_ID, FALLBACK_FILE, {});
      return res.status(200).json({ images: images && typeof images === 'object' ? images : {} });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch custom images' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { images } = req.body || {};
      if (!images || typeof images !== 'object') {
        return res.status(400).json({ error: 'Invalid payload: images must be an object' });
      }
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, images);
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save custom images' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
