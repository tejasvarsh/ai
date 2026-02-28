// server.js — AURA AI Chat Server
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── In-memory storage (replace with Supabase later) ───────────────────────
const users = {}; // { sessionId: { name, avatar, conversations } }
const conversations = {}; // { convId: { title, messages[] } }

// ── AI Provider Router ─────────────────────────────────────────────────────
async function askAI(messages, systemPrompt, provider) {
  const p = provider || process.env.AI_PROVIDER || 'gemini';

  // ── Google Gemini (FREE FOREVER) ─────────────────────────────────────────
  if (p === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
      return getDemoResponse(messages[messages.length - 1].content);
    }

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  }

  // ── Groq (FREE FOREVER - fastest) ────────────────────────────────────────
  if (p === 'groq') {
    const key = process.env.GROQ_API_KEY;
    if (!key || key === 'your_groq_api_key_here') {
      return getDemoResponse(messages[messages.length - 1].content);
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 2048
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  }

  // ── Claude API (paid - for when you earn money) ───────────────────────────
  if (p === 'claude') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key || key === 'your_anthropic_key_here') {
      return getDemoResponse(messages[messages.length - 1].content);
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2048,
        system: systemPrompt,
        messages
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  }

  return getDemoResponse(messages[messages.length - 1].content);
}

// ── Demo responses when no API key ────────────────────────────────────────
function getDemoResponse(message) {
  const responses = [
    `Great question! I'm running in **demo mode** right now. To enable real AI responses, add your free Gemini API key to the .env file.\n\nGet your free key at: https://aistudio.google.com\n\nYou asked: "${message}"`,
    `I'd love to help with that! This is a **demo response** — add your free Gemini or Groq API key to get real AI answers.\n\n**Steps:**\n1. Go to https://aistudio.google.com\n2. Click "Get API Key"\n3. Add it to your .env file\n4. Restart the server`,
    `Interesting! I'm in **demo mode** — your question was: "${message}"\n\nTo get real AI responses for FREE:\n- **Gemini**: aistudio.google.com\n- **Groq**: console.groq.com\n\nBoth are 100% free forever! 🎉`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ── AI Personalities ──────────────────────────────────────────────────────
const personalities = {
  assistant: {
    name: 'AURA',
    avatar: '🤖',
    color: '#00f5c4',
    prompt: 'You are AURA, a helpful, friendly, and intelligent AI assistant. You give clear, concise, and accurate answers. You are warm and approachable. Format responses with markdown when helpful.'
  },
  coder: {
    name: 'CODE',
    avatar: '⚡',
    color: '#7c5cfc',
    prompt: 'You are CODE, an expert software engineer AI. You specialize in writing clean, efficient code in any language. Always provide working code examples with explanations. Use markdown code blocks.'
  },
  researcher: {
    name: 'SAGE',
    avatar: '🔭',
    color: '#ffd93d',
    prompt: 'You are SAGE, a deep research AI. You analyze topics thoroughly, cite reasoning, identify patterns, and provide comprehensive insights. Be detailed and academic but accessible.'
  },
  creative: {
    name: 'MUSE',
    avatar: '🎨',
    color: '#ff6b35',
    prompt: 'You are MUSE, a creative AI. You help with writing, storytelling, brainstorming, content creation, and creative projects. Be imaginative, expressive, and inspiring.'
  },
  tutor: {
    name: 'TUTOR',
    avatar: '📚',
    color: '#ff4d6d',
    prompt: 'You are TUTOR, an AI teacher. You explain complex topics simply, use analogies and examples, check understanding, and adapt to the learner\'s level. Be patient and encouraging.'
  }
};

// ── WebSocket ─────────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const sessionId = Math.random().toString(36).slice(2);
  console.log(`[WS] New session: ${sessionId}`);

  // Send welcome
  ws.send(JSON.stringify({
    type: 'welcome',
    sessionId,
    personalities: Object.entries(personalities).map(([id, p]) => ({
      id, name: p.name, avatar: p.avatar, color: p.color
    })),
    provider: process.env.AI_PROVIDER || 'gemini',
    hasKey: !!(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') ||
      (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') ||
      (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_key_here')
    )
  }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // ── Chat message ───────────────────────────────────────────────────
      if (msg.type === 'chat') {
        const { message, personalityId, conversationId, history } = msg;
        const personality = personalities[personalityId] || personalities.assistant;

        // Send typing indicator
        ws.send(JSON.stringify({ type: 'typing', conversationId }));

        try {
          const aiMessages = (history || []).concat([{ role: 'user', content: message }]);
          const response = await askAI(aiMessages, personality.prompt);

          ws.send(JSON.stringify({
            type: 'response',
            conversationId,
            message: response,
            personality: { id: personalityId, name: personality.name, avatar: personality.avatar, color: personality.color },
            timestamp: new Date().toISOString()
          }));
        } catch (err) {
          ws.send(JSON.stringify({
            type: 'error',
            conversationId,
            message: `AI Error: ${err.message}. Please check your API key in .env file.`
          }));
        }
      }

      // ── Switch AI provider ─────────────────────────────────────────────
      if (msg.type === 'switch_provider') {
        process.env.AI_PROVIDER = msg.provider;
        ws.send(JSON.stringify({ type: 'provider_switched', provider: msg.provider }));
      }

    } catch (err) {
      console.error('[WS] Error:', err.message);
    }
  });

  ws.on('close', () => console.log(`[WS] Session ended: ${sessionId}`));
});

// ── REST API ──────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, personalityId, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const personality = personalities[personalityId] || personalities.assistant;
    const msgs = (history || []).concat([{ role: 'user', content: message }]);
    const response = await askAI(msgs, personality.prompt);
    res.json({ success: true, response, personality: personality.name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/personalities', (req, res) => {
  res.json(Object.entries(personalities).map(([id, p]) => ({
    id, name: p.name, avatar: p.avatar, color: p.color
  })));
});

app.get('/api/status', (req, res) => {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  const hasGroq = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
  const hasClaude = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_key_here');
  res.json({ provider, hasGemini, hasGroq, hasClaude, mode: (hasGemini || hasGroq || hasClaude) ? 'REAL AI' : 'DEMO' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         AURA AI — Chat Application       ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  🌐 Open:  http://localhost:${PORT}          ║`);
  console.log(`║  🤖 AI:    ${provider.toUpperCase().padEnd(10)} ${hasKey ? '✅ KEY FOUND' : '⚠️  NO KEY (DEMO)'}   ║`);
  console.log('╚══════════════════════════════════════════╝\n');
  if (!hasKey) {
    console.log('⚠️  No API key found — running in DEMO mode');
    console.log('   Add GEMINI_API_KEY to .env for real AI (free!)');
    console.log('   Get free key: https://aistudio.google.com\n');
  }
});
