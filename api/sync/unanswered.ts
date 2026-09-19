import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db';

const CONFIG_ID = 'unanswered';
const FALLBACK_FILE = 'persistent_unanswered.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const questions = await getCentralConfig<any[]>(CONFIG_ID, FALLBACK_FILE, []);
      return res.status(200).json({ questions: Array.isArray(questions) ? questions : [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch unanswered questions' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { questions } = req.body || {};
      if (!Array.isArray(questions)) {
        return res.status(400).json({ error: 'Invalid payload: questions must be an array' });
      }
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, questions);
      return res.status(200).json({ success: true, count: questions.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save unanswered questions' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
