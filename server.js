import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  try {
    const message =
      typeof req.body?.message === 'string'
        ? req.body.message.trim()
        : '';

    if (!message) {
      return res.status(400).json({
        error: 'اكتب سؤالك أولًا.'
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        error: 'السؤال طويل جدًا، اختصره قليلًا.'
      });
    }

    const token = process.env.HF_TOKEN;

    if (!token) {
      return res.status(503).json({
        error: 'لم يتم إعداد محرك الذكاء الاصطناعي بعد.'
      });
    }

    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b:fastest',
          messages: [
            {
              role: 'system',
              content:
                'أنت J.H AI، مساعد عربي ودود ودقيق. أجب بلغة المستخدم، ولا تخترع معلومات عند عدم التأكد.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 800,
          stream: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        'Hugging Face API error:',
        response.status,
        data?.error || data?.message || 'Unknown error'
      );

      return res.status(502).json({
        error:
          'تعذّر الحصول على جواب. قد يكون السبب نفاد الرصيد المجاني أو عدم توفر النموذج. حاول لاحقًا.'
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim();

    return res.json({
      answer:
        answer ||
        'لم يصلني جواب هذه المرة. جرّب سؤالًا آخر.'
    });
  } catch (error) {
    console.error('Server error:', error);

    return res.status(500).json({
      error: 'حدث خطأ غير متوقع. حاول مرة أخرى.'
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`J.H AI running on port ${port}`);
});
