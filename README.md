# Wave

**Encrypted Messenger for the Modern Era**

Wave is a next-generation encrypted messaging platform built on a custom Supabase backend with Signal Protocol encryption. Designed for privacy-first communication without compromising on performance or user experience.

---

## 🌊 Why Wave?

In an age where digital privacy matters more than ever, Wave delivers:

- **End-to-End Encryption** — Powered by the battle-tested Signal Protocol
- **Zero-Knowledge Architecture** — Even server administrators cannot read your messages
- **Real-Time Sync** — Instant message delivery across all devices
- **Modern Stack** — Built with React, TypeScript, and Supabase for reliability at scale

---

## ✨ Features

### Security First
- Client-side encryption with Signal Protocol (`@signalapp/libsignal-client`)
- Private keys never leave the device
- Ciphertext-only storage in the cloud
- Secure key exchange and session management

### Real-Time Communication
- Supabase Realtime subscriptions for instant message sync
- Live typing indicators and presence updates
- Optimistic UI updates for responsive feel

### Privacy by Design
- No phone number required — Supabase Auth integration
- Minimal metadata retention
- Open-source client for transparency

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Wave Client   │────▶│  Signal Protocol │────▶│   Supabase      │
│ (React + TS)    │     │  (Encryption)    │     │   (Backend)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React + TypeScript (telegram-tt fork) |
| Backend     | Supabase (Auth + DB + Realtime)     |
| Encryption  | Signal Protocol                     |
| Platform    | Web + Mobile Browser                |

### Database Schema

```sql
profiles     -- User profiles (id, username, avatar_url)
chats        -- Chat rooms (id, type, created_at)
chat_members -- Chat membership (chat_id, user_id)
messages     -- Encrypted messages (content_encrypted only)
```

---

## 🔐 Encryption Flow

1. **Key Generation** — Keys are generated on-device during registration
2. **Message Encryption** — Messages encrypted client-side before transmission
3. **Secure Storage** — Only ciphertext stored in Supabase
4. **Decryption** — Recipients decrypt messages locally with their private keys

```typescript
import { encryptMessage, decryptMessage } from './api/wave/signal';

// Always encrypt before sending
const encrypted = await encryptMessage(recipientId, plaintext);
await supabase.from('messages').insert({ content_encrypted: encrypted });

// Decrypt on receive
const plaintext = await decryptMessage(senderId, encryptedContent);
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ^22.6 or ^24
- npm ^10.8 or ^11
- Supabase project configured

### Installation

```bash
# Clone the repository
git clone https://github.com/imlokzu/wave.git
cd wave/apps/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:production
```

### Environment Setup

Configure your Supabase credentials in the appropriate environment files:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

---

## 📁 Project Structure

```
apps/frontend/
├── src/
│   ├── api/
│   │   ├── wave/           # Custom Wave API layer
│   │   │   ├── auth.ts     # Authentication
│   │   │   ├── chats.ts    # Chat management
│   │   │   ├── messages.ts # Message handling
│   │   │   ├── signal.ts   # Encryption helpers
│   │   │   └── realtime.ts # Real-time subscriptions
│   │   └── gramjs/         # Original MTProto (untouched)
│   ├── components/         # UI components
│   ├── lib/                # Core libraries
│   └── styles/             # Styling
├── tauri/                  # Desktop app configuration
└── package.json
```

---

## 🛠️ Development

### Available Scripts

| Command                      | Description                              |
|------------------------------|------------------------------------------|
| `npm run dev`                | Start development server                 |
| `npm run build:production`   | Build for production                     |
| `npm run tauri:dev`          | Run Tauri desktop app in development     |
| `npm run tauri:build`        | Build Tauri desktop app                  |
| `npm run check`              | Run TypeScript and linters               |
| `npm run test`               | Run test suite                           |

### Code Quality

```bash
# Type check and lint
npm run check

# Auto-fix issues
npm run check:fix
```

---

## 📱 Roadmap

- [ ] **Expo/React Native Mobile App** — Native Android & iOS experience
- [ ] **GitHub Releases** — Direct APK distribution (no Play Store)
- [ ] **iOS TestFlight** — Beta testing program
- [ ] **Group Chats** — Encrypted group messaging
- [ ] **Media Sharing** — Encrypted file and image transfer
- [ ] **Voice Messages** — Encrypted audio messages

---

## 🔒 Security Considerations

### What We Do
✅ Encrypt all messages client-side  
✅ Store only ciphertext in the cloud  
✅ Generate keys on-device only  
✅ Use established cryptographic primitives (Signal Protocol)  
✅ Open-source client for auditability  

### What We Never Do
❌ Store plaintext messages  
❌ Transmit encryption keys over the network  
❌ Log sensitive user data  
❌ Modify the original MTProto layer  

---

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

1. Use TypeScript strict mode
2. Follow existing code style and naming conventions
3. Encrypt messages before any database operation
4. Keep UI changes minimal — focus on the API layer
5. No console.log in production code

---

## 📄 License

GPL-3.0-or-later

---

## 🌐 Connect

- **Repository:** [github.com/imlokzu/wave](https://github.com/imlokzu/wave)
- **Original Project:** [telegram-tt](https://github.com/Ajaxy/telegram-tt)

---

<p align="center">
  <strong>Wave — Privacy Without Compromise</strong>
</p>