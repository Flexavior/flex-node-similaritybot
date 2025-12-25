import express from 'express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import moment from 'moment';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pipeline } from '@xenova/transformers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { franc } from 'franc-min';

const app = express();
const PORT = 80;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:"],
        },
    },
}));


// ISO639-3 → internal codes
const langMap = {
    eng: 'en',
    mya: 'my',
    jpn: 'ja',
    tha: 'th'
};

app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: true, limit: '1kb' }));
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(cors({ origin: ['http://localhost:80'], methods: ['GET', 'POST'] }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(helmet());

// Load FAQ
const customerSupportData = JSON.parse(
    fs.readFileSync('./customer_support.json', 'utf8')
);

// Embeddings
let featureExtractor;
const questionEmbeddings = {};

async function initializeAI() {
    featureExtractor = await pipeline(
        'feature-extraction',
        'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
    );

    for (const item of customerSupportData) {
        const emb = await featureExtractor(item.question, {
            pooling: 'mean',
            normalize: true
        });
        if (!questionEmbeddings[item.lang]) {
            questionEmbeddings[item.lang] = [];
        }
        questionEmbeddings[item.lang].push(Array.from(emb.data));
    }
}

// Language detection (short text safe)
function detectLanguage(text) {
    if (/[\u1000-\u109F]/.test(text)) return 'my';

    if (text.length <= 5) {
        const t = text.toLowerCase();
        if (['hi', 'hello', 'hey'].includes(t)) return 'en';
        return 'en';
    }

    const raw = franc(text, { minLength: 3 });
    return langMap[raw] || 'en';
}

function cosineSimilarity(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function logConversation(entry) {
    const dir = path.join(__dirname, 'conversation_logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${moment().format('YYYY-MM-DD')}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
}

app.post('/ask', async (req, res) => {
    const userQuery = req.body.question?.trim();
    if (!userQuery) return res.status(400).json({ error: 'Missing question' });

    const detectedLang = detectLanguage(userQuery);

    console.log(`🌏 Detected Language: ${detectedLang}`);
    console.log(`💬 User Query: ${userQuery}`);

    try {
        // Exact match (short greetings)
        const exact = customerSupportData.find(
            f =>
                f.lang === detectedLang &&
                f.question.toLowerCase() === userQuery.toLowerCase()
        );

        if (exact) {
            logConversation({
                timestamp: moment().format(),
                userQuery,
                detectedLanguage: detectedLang,
                faqId: exact.id,
                similarityScore: 1,
                answer: exact.answer
            });

            return res.json({
                reply: exact.answer,
                image: exact.image,
                thinking_time: Math.random() * 500 + 300
            });
        }

        // Embedding similarity
        const qEmb = await featureExtractor(userQuery, {
            pooling: 'mean',
            normalize: true
        });
        const qVec = Array.from(qEmb.data);

        const faqLang = customerSupportData.filter(f => f.lang === detectedLang);
        const embLang = questionEmbeddings[detectedLang] || [];

        let maxSim = -1;
        let bestIdx = -1;

        embLang.forEach((vec, i) => {
            const sim = cosineSimilarity(qVec, vec);
            if (sim > maxSim) {
                maxSim = sim;
                bestIdx = i;
            }
        });

        let replyObj;

        if (maxSim > 0.6 && faqLang[bestIdx]) {
            const matched = faqLang[bestIdx];

            replyObj = {
                reply: matched.answer,
                image: matched.image,
                thinking_time: Math.random() * 500 + 300
            };

            logConversation({
                timestamp: moment().format(),
                userQuery,
                detectedLanguage: detectedLang,
                faqId: matched.id,
                similarityScore: maxSim,
                answer: matched.answer
            });
        } else {
            const noMsg = {
                en: "I'm sorry, I couldn't find an answer.",
                my: "စိတ်မရှိပါနဲ့ နီးစပ်သောအဖြေမတွေ့ပါ",
                ja: "申し訳ありません、回答が見つかりません。",
                th: "ขออภัย ไม่พบคำตอบ"
            };

            const msg = noMsg[detectedLang] || noMsg.en;

            replyObj = {
                reply: msg,
                thinking_time: Math.random() * 500 + 300
            };

            logConversation({
                timestamp: moment().format(),
                userQuery,
                detectedLanguage: detectedLang,
                faqId: null,
                similarityScore: maxSim,
                answer: msg
            });
        }

        res.json(replyObj);
    } catch (err) {
        console.error(' /ask error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


initializeAI().then(() => {
    app.listen(PORT, () =>
        console.log(` Server running at http://localhost:${PORT}`)
    );
});
