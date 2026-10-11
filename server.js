import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));

// عرض الصفحة الرئيسية الموجودة بجانب server.js
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// عرض الملفات الثابتة إن وجدت
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  try {
    const message =
      typeof req.body?.message === 'string'
        ? req.body.message.trim()
        : '';

    if (!message) {
      return res.status(400).json({ error: 'اكتب سؤالك أولًا.' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'السؤال طويل جدًا، اختصره قليلًا.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'الموقع جاهز، لكن لم يتم ربط محرك الذكاء الاصطناعي بعد.'
      });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: 'أنت J.H AI، مساعد عربي واضح وودود. كن دقيقًا قدر الإمكان. لا تخترع معلومات أو مصادر. إذا لم تكن متأكدًا، صرّح بعدم التأكد. أجب بلغة المستخدم.',
        input: message,
        max_output_tokens: 800
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AI API error:', data?.error?.message || response.status);
      return res.status(502).json({
        error: 'تعذّر الحصول على جواب الآن. جرّب مرة ثانية لاحقًا.'
      });
    }

    const answer = (data.output || [])
      .filter(item => item.type === 'message')
      .flatMap(item => item.content || [])
      .filter(part => part.type === 'output_text')
      .map(part => part.text)
      .join('\n')
      .trim();

    return res.json({
      answer: answer || 'ما قدرت أجهّز جوابًا هذه المرة. جرّب صياغة السؤال بطريقة أخرى.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'صار خطأ غير متوقع. جرّب مرة ثانية.'
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`J.H AI running on port ${port}`));
