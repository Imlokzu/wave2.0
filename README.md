<p align="center">
  <img alt="Wave Logo" src="https://via.placeholder.com/120x120/4F46E5/FFFFFF?text=W" width="120" />
</p>

<h1 align="center">Wave</h1>

<p align="center">
  <strong>Encrypted Messenger for the Modern Era</strong>
</p>

<p align="center">
  <a href="https://github.com/imlokzu/wave"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-imlokzu%2Fwave-blue?logo=github" /></a>
  <a href="https://nodejs.org"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-%5E22.6_%7C_%5E24-green?logo=node.js" /></a>
  <a href="https://react.dev"><img alt="React" src="https://img.shields.io/badge/React-19-blue?logo=react" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-GPL--3.0--or--later-orange" /></a>
</p>

---

Wave is a next-generation encrypted messaging platform built on a custom backend with Signal Protocol encryption. Forked from the acclaimed [telegram-tt](https://github.com/Ajaxy/telegram-tt) project, Wave replaces the MTProto layer with a privacy-first architecture that ensures your messages remain yours alone.

> **Privacy Without Compromise** — End-to-end encryption, zero-knowledge storage, and real-time sync. Even server administrators cannot read your messages.

---

## 🌊 Why Wave?

In an age where digital privacy matters more than ever, Wave delivers:

| Feature | Benefit |
|---------|---------|
| 🔐 **End-to-End Encryption** | Powered by Signal Protocol (`@signalapp/libsignal-client`) |
| 🧠 **Zero-Knowledge Architecture** | Only ciphertext reaches the server |
| ⚡ **Real-Time Sync** | Socket.IO-powered instant delivery |
| 🎨 **Familiar UX** | Built on telegram-tt's polished interface |

---

## ✨ Features

### 🔒 Security First

- **Client-Side Encryption** — Messages encrypted before leaving your device
- **On-Device Key Generation** — Private keys never transmitted or stored server-side
- **AES-GCM Fallback** — Graceful degradation when Signal Protocol unavailable
- **Session Management** — Secure key exchange with device tracking

### 💬 Messaging

- **Direct Messages** — Private one-on-one encrypted conversations
- **Real-Time Delivery** — Socket.IO connections for instant message sync
- **Typing Indicators** — Live presence updates
- **Message History** — Encrypted history stored in Supabase

### 👤 Accounts & Profiles

- **Username-Based Auth** — No phone number required
- **JWT Sessions** — Secure token-based authentication
- **Profile Customization** — Avatar, nickname, and bio support
- **Multi-Device Support** — Session management with new-device alerts

### 🤖 AI Assistant *(Optional)*

- **Multi-Model Support** — DeepSeek, Qwen, and more via OpenRouter & NVIDIA NIM
- **Web Search** — Up-to-date information retrieval
- **Streaming Responses** — Real-time token streaming

---

## 🏗️ Architecture

```
┌─────────────────────────┐      ┌──────────────────────────┐      ┌─────────────────────────┐
│     Wave Client         │      │   Encryption Layer       │      │   Wave Backend          │
│  (React + TypeScript)   │─────▶│  Signal Protocol / AES   │─────▶│  (Express + Socket.IO)  │
│  telegram-tt fork       │      │  (@signalapp/libsignal)  │      │  + Supabase PostgreSQL  │
└─────────────────────────┘      └──────────────────────────┘      └─────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript (telegram-tt fork) |
| **Backend** | Express.js + Socket.IO |
| **Database** | Supabase (PostgreSQL) |
| **Encryption** | Signal Protocol + AES-GCM fallback |
| **Auth** | JWT + bcrypt |
| **Storage** | Supabase Storage (files up to 50MB) |
| **AI** | OpenRouter, NVIDIA NIM |
| **Desktop** | Tauri |

### Core Modules

```
src/api/wave/
├── auth.ts           # Login, signup, session management
├── client.ts         # HTTP client with JWT auth
├── signal.ts         # Signal Protocol adapter + AES fallback
├── messages.ts       # Encrypted message send/receive
├── chats.ts          # Chat creation and member management
├── socket.ts         # Socket.IO real-time connection
└── types.ts          # TypeScript type definitions
```

---

## 🔐 Encryption Flow

### Message Lifecycle

```typescript
// 1. Sender encrypts message client-side
const envelope = await encryptForRecipient(
  plaintext,
  currentUserId,
  recipientUserId,
  recipientDeviceId
);

// 2. Only ciphertext is sent to backend
await waveFetch('/api/dms/send', {
  method: 'POST',
  body: JSON.stringify({
    fromUserId: currentUserId,
    toUserId: recipientUserId,
    content: envelope.ciphertextBase64, // Encrypted payload
  }),
});

// 3. Recipient decrypts locally
const plaintext = await decryptFromSender(envelope, senderUserId);
```

### Security Guarantees

| ✅ We Do | ❌ We Never Do |
|----------|----------------|
| Encrypt all messages client-side | Store plaintext messages |
| Generate keys on-device | Transmit encryption keys |
| Use Signal Protocol primitives | Log sensitive user data |
| Open-source for auditability | Modify the MTProto layer unnecessarily |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ^22.6 or ^24
- **npm** ^10.8 or ^11
- **Backend** — Running Wave backend instance (see `apps/backend/`)

### Installation

```bash
# Clone the repository
git clone https://github.com/imlokzu/wave.git
cd wave/apps/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

```env
# Wave Backend
VITE_WAVE_API_URL=http://localhost:3001
VITE_WAVE_SOCKET_URL=http://localhost:3001

# Optional: AI Features
OPENROUTER_API_KEY=your_key_here
NVIDIA_NIM_API_KEY=your_key_here
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (webpack) |
| `npm run build:production` | Production build |
| `npm run tauri:dev` | Tauri desktop development |
| `npm run tauri:build` | Build Tauri desktop app |
| `npm run check` | TypeScript + ESLint + Stylelint |
| `npm run check:fix` | Auto-fix linting issues |

---

## 📁 Project Structure

```
wave/
├── apps/
│   ├── frontend/              # React + TypeScript client
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── wave/     # Custom Wave API layer
│   │   │   │   └── gramjs/   # Original MTProto (deprecated)
│   │   │   ├── components/   # UI components
│   │   │   ├── lib/          # Core utilities
│   │   │   └── styles/       # SCSS styling
│   │   ├── tauri/            # Desktop app config
│   │   └── package.json
│   │
│   └── backend/               # Express + Socket.IO server
│       ├── src/
│       │   ├── routes/       # REST API endpoints
│       │   ├── socket/       # Socket.IO handlers
│       │   ├── services/     # Business logic
│       │   └── managers/     # Data access layer
│       ├── feed-bot/         # Telegram scraper (Python)
│       ├── admin/            # Admin panel
│       └── migrations/       # SQL migrations
│
├── rules.md                   # Development guidelines
└── README.md
```

---

## 📱 Roadmap

### In Progress
- [ ] Full Signal Protocol integration
- [ ] Group chat encryption
- [ ] Media file encryption

### Planned
- [ ] **Expo/React Native Mobile App** — Native Android & iOS
- [ ] **GitHub Releases** — Direct APK distribution
- [ ] **iOS TestFlight** — Beta testing program
- [ ] **Voice Messages** — Encrypted audio
- [ ] **Video Calls** — WebRTC with E2EE

---

## 🛠️ Development

### Code Quality

```bash
# Run all checks
npm run check

# Auto-fix issues
npm run check:fix

# Type check only
npx tsc --noEmit
```

### Contributing Guidelines

Before contributing, please read [`rules.md`](rules.md). Key points:

1. **TypeScript Strict Mode** — Always enabled
2. **Encryption First** — Encrypt before any network call
3. **Minimal UI Changes** — Focus on API layer modifications
4. **No Console Logs** — Remove debug statements before commit
5. **One File Per Task** — Minimize scope unless necessary

### Testing

```bash
# Unit tests
npm run test

# Playwright E2E
npm run test:playwright

# Record new E2E tests
npm run test:record
```

---

## 📄 License

**GPL-3.0-or-later** — See [LICENSE](LICENSE) for details.

Wave is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation.

---

## 🌐 Connect

- **Repository:** [github.com/imlokzu/wave](https://github.com/imlokzu/wave)
- **Original Project:** [telegram-tt](https://github.com/Ajaxy/telegram-tt)
- **Issues & Feature Requests:** [GitHub Issues](https://github.com/imlokzu/wave/issues)

---

<p align="center">
  <strong>Wave — Privacy Without Compromise</strong><br/>
  <sub>Built with ❤️ for a more private future</sub>
</p>
