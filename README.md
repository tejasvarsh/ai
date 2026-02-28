# ✨ AURA AI — Your Own AI Chat App
### 100% Free Forever · 5 AI Personalities · Multiple Free AI Providers

---

## ⚡ Run in 3 Steps

```bash
# Step 1 - Install packages
npm install

# Step 2 - Start the server
node server.js

# Step 3 - Open browser
# → http://localhost:3000
```

Works immediately in **DEMO mode** — no API key needed!

---

## 🤖 Add Free AI (Real Responses)

### Option A — Google Gemini (BEST - Free Forever)
1. Go to https://aistudio.google.com
2. Sign in with Google
3. Click "Get API Key" → "Create API Key"
4. Copy the key

### Option B — Groq (Fastest - Free Forever)
1. Go to https://console.groq.com
2. Sign up free
3. Click "API Keys" → "Create"
4. Copy the key

### Add key to your app:
1. Find the file `.env.example` in this folder
2. Rename it to `.env`
3. Open with Notepad
4. Replace `your_gemini_api_key_here` with your key
5. Save the file
6. Restart: `node server.js`

You will see **REAL AI** badge in the app! ✅

---

## 🎭 5 AI Personalities

| Name | Role | Best For |
|------|------|---------|
| 🤖 AURA | General Assistant | Everything |
| ⚡ CODE | Software Engineer | Coding help |
| 🔭 SAGE | Deep Researcher | Research & analysis |
| 🎨 MUSE | Creative Writer | Stories, content |
| 📚 TUTOR | Patient Teacher | Learning & explaining |

---

## 🔄 3 AI Providers (Switch Anytime)

| Provider | Cost | Speed | Quality |
|----------|------|-------|---------|
| 🌟 Gemini | FREE forever | Fast | ⭐⭐⭐⭐⭐ |
| ⚡ Groq | FREE forever | Fastest | ⭐⭐⭐⭐ |
| 🧠 Claude | Paid (upgrade later) | Fast | ⭐⭐⭐⭐⭐ |

Switch providers in the sidebar anytime!

---

## 🚀 Deploy Online FREE

### Render.com (Recommended)
1. Push code to GitHub
2. Go to https://render.com
3. New → Web Service → Connect GitHub
4. Build: `npm install` | Start: `node server.js`
5. Add environment variables (your API keys)
6. Deploy! Get free URL: `yourapp.onrender.com`

### Railway
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add env vars → Deploy!

---

## 📁 File Structure

```
aura-ai/
├── server.js          ← Main server + AI routing
├── package.json       ← Dependencies
├── .env.example       ← Config template
└── public/
    ├── index.html     ← UI
    ├── style.css      ← Beautiful dark theme
    └── app.js         ← Frontend WebSocket + chat
```

---

## 💡 Features

- ✅ Real-time WebSocket chat
- ✅ 5 AI personalities
- ✅ Switch between 3 AI providers
- ✅ Markdown rendering (code blocks, lists, etc.)
- ✅ Chat history per conversation
- ✅ Multiple conversations
- ✅ Mobile responsive
- ✅ Beautiful dark UI
- ✅ Typing indicators
- ✅ Demo mode (no key needed)

---

## 🔮 Upgrade Later (When Earning Money)

When your app grows and you start earning:
1. Open `.env`
2. Add: `ANTHROPIC_API_KEY=your_claude_key`
3. Change: `AI_PROVIDER=claude`
4. Restart → Now using Claude!

---

Built with Node.js, WebSockets, and love ❤️
