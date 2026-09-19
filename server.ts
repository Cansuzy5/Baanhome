import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Resilient model invocation with automatic fallbacks for 503 (high demand) / 429 (rate limits)
function cleanCustomerResponse(text: string): string {
  if (!text) return '';
  return text
    // Remove lines like "อ้างอิงจากรหัสข้อมูล: KH-040", "(อ้างอิง: KH-040)"
    .replace(/(?:\r?\n)*\s*(?:\(|\[)?\s*(?:อ้างอิงจากรหัสข้อมูล|อ้างอิงจากข้อมูล|อ้างอิงรหัสข้อมูล|อ้างอิงรหัส|อ้างอิงข้อมูล|อ้างอิง|Reference|Ref\.?)\s*[:：]?\s*[\w\-\s,]+(?:\)|\])?/gi, '')
    // Remove any trailing lines that are just standalone item IDs like "KH-040"
    .replace(/(?:\r?\n)+\s*(?:\(|\[)?\s*(?:BH|KH|KB|RM|REST|MICE|PROMO)-\d+(?:\)|\])?\s*$/gi, '')
    .trim();
}

async function generateAiContentWithFallback(
  ai: GoogleGenAI,
  contents: any,
  config?: any
): Promise<string> {
  // Ordered from best primary to high-availability lightweight backup
  const models = [
    process.env.GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ].filter(Boolean) as string[];

  // Deduplicate
  const candidateModels = Array.from(new Set(models));
  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config: config || { temperature: 0.2 },
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.code;
      const errorMsg = String(err?.message || '');

      // Check if transient unavailable (503), rate-limited (429), or 404
      const isTransient =
        statusCode === 503 ||
        statusCode === 429 ||
        statusCode === 404 ||
        errorMsg.includes('503') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('NOT_FOUND') ||
        errorMsg.includes('404');

      if (isTransient && i < candidateModels.length - 1) {
        // Brief exponential backoff before attempting next resilient candidate
        await new Promise((resolve) => setTimeout(resolve, 350 * (i + 1)));
        continue;
      }

      if (i < candidateModels.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error('All AI models unavailable');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI API Route
  app.post('/api/ask', async (req, res) => {
    const { query, contextItems } = req.body || {};
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: 'Missing GEMINI_API_KEY', 
          fallbackMessage: 'ไม่สามารถติดต่อผู้ช่วย AI ได้เนื่องจากไม่ได้ตั้งค่า API Key' 
        });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Construct Prompt
      const contextText = Array.isArray(contextItems)
        ? contextItems.map((item: any) => `
ID: ${item.id}
หมวดหมู่: ${item.category}
หัวข้อ: ${item.title}
ข้อความสำหรับตอบลูกค้า: ${item.customerMessage || item.customerScript || item.summary || ''}
        `).join('\n\n')
        : '';

      const systemInstruction = `คุณคือ "น้องโฮม" ผู้ช่วย AI ของพนักงาน "บ้านโฮม" (บริการสวนอาหาร รีสอร์ท พูลวิลล่า และจัดเลี้ยง)
บุคลิกภาพ: เป็นผู้หญิง สุภาพ อบอุ่น เป็นมืออาชีพ ใช้คำลงท้ายว่า "ค่ะ/นะคะ" และใช้อีโมจิอย่างพอดี (1-2 ตัวต่อข้อความ)

หน้าที่ของคุณคือตอบคำถามจากพนักงาน โดยใช้ข้อมูลในฐานความรู้ (Context) ที่ให้มาเท่านั้น
กฎเหล็ก:
1. ให้ใช้ข้อมูลจาก "ข้อความสำหรับตอบลูกค้า" เป็นหลัก
2. ห้ามแต่งเติมราคา ส่วนลด เวลา เงื่อนไข นโยบาย หรือบริการที่ไม่มีในฐานความรู้เด็ดขาด
3. หากมีข้อมูลไม่ครบถ้วน หรือมีเงื่อนไขขัดแย้ง ให้แจ้งว่า: "ข้อมูลส่วนนี้ขออนุญาตตรวจสอบกับเจ้าหน้าที่ก่อนนะคะ เพื่อแจ้งรายละเอียดให้ถูกต้องค่ะ 💚"
4. หากเป็นการเข้าพักก่อนเวลา (Early Check-in) ต้องแยกแยะระหว่างรีสอร์ทกับพูลวิลล่า ห้ามเอาเงื่อนไขรีสอร์ทไปตอบแทนพูลวิลล่า หากไม่มีข้อมูลที่เจาะจง ให้แจ้งว่าต้องตรวจสอบก่อน
5. ข้อความตอบกลับต้องเป็นข้อความสำหรับส่งให้ลูกค้าโดยตรงเท่านั้น ห้ามใส่คำว่า "อ้างอิงจากรหัสข้อมูล:", "รหัส:", "ID:" หรือระบุรหัสข้อมูล (เช่น BH-001, KH-040) ปะปนในข้อความเด็ดขาด เพื่อให้พนักงานกดคัดลอกส่งให้ลูกค้าได้ทันที

ฐานความรู้ (Context):
${contextText}

คำถามจากพนักงาน: ${query}`;

      const answerText = await generateAiContentWithFallback(ai, systemInstruction, {
        temperature: 0.2,
      });

      const cleanAnswer = cleanCustomerResponse(answerText);
      const referenceIds = Array.isArray(contextItems) ? contextItems.map((c: any) => c.id) : [];

      res.json({ answer: cleanAnswer, referenceIds });
    } catch (error: any) {
      // Graceful smart context fallback without throwing unhandled exceptions
      let fallbackText = '';
      if (Array.isArray(contextItems) && contextItems.length > 0) {
        const topItem = contextItems[0];
        if (topItem.customerScript) {
          fallbackText = topItem.customerScript;
        } else if (topItem.customerMessage) {
          fallbackText = topItem.customerMessage;
        } else if (topItem.summary) {
          fallbackText = `สวัสดีค่ะ สำหรับเรื่อง${topItem.title} ${topItem.summary} ค่ะ 💚`;
        }
      }

      if (!fallbackText) {
        fallbackText = 'ขณะนี้ระบบน้องโฮม AI อยู่ระหว่างอัปเดตข้อมูล กรุณาใช้ข้อความจากผลการค้นหาด้านล่างส่งให้ลูกค้าได้โดยตรงเลยนะคะ 💚';
      }

      res.json({ 
        answer: cleanCustomerResponse(fallbackText),
        referenceIds: Array.isArray(contextItems) ? contextItems.map((c: any) => c.id) : [],
        isFallback: true 
      });
    }
  });

  // Intent parsing route with fallback
  app.post('/api/parse-intent', async (req, res) => {
    const query = req.body?.query || '';
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Missing API Key' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `วิเคราะห์คำถามนี้: "${query}"
คืนค่าเป็น JSON เท่านั้นในรูปแบบ:
{
  "intent": "เรื่องที่ถาม",
  "serviceType": "resort | pool-villa | restaurant | catering | unknown",
  "hasCondition": boolean,
  "needsClarification": boolean
}`;

      const answerJson = await generateAiContentWithFallback(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.1,
      });

      res.json(JSON.parse(answerJson));
    } catch (error: any) {
      // Safe fallback intent
      res.json({
        intent: query || 'ทั่วไป',
        serviceType: 'unknown',
        hasCondition: false,
        needsClarification: false,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
