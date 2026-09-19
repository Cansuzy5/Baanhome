import { GoogleGenAI } from '@google/genai';
import { setCorsHeaders } from './_db.ts';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const query = req.body?.query || '';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      intent: query || 'ทั่วไป',
      serviceType: 'unknown',
      hasCondition: false,
      needsClarification: false,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `วิเคราะห์คำถามนี้: "${query}"
คืนค่าเป็น JSON เท่านั้นในรูปแบบ:
{
  "intent": "เรื่องที่ถาม",
  "serviceType": "resort | pool-villa | restaurant | catering | unknown",
  "hasCondition": boolean,
  "needsClarification": boolean
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    if (response && response.text) {
      return res.status(200).json(JSON.parse(response.text));
    }
  } catch (error) {
    // Graceful fallback
  }

  return res.status(200).json({
    intent: query || 'ทั่วไป',
    serviceType: 'unknown',
    hasCondition: false,
    needsClarification: false,
  });
}
