# Wave 2.0 — AI Instructions

## Project Overview
Wave 2.0 is an encrypted messenger built on a fork of `telegram-tt` (Telegram Web App) with a custom Supabase backend and Signal Protocol encryption.

- **Frontend:** Fork of [telegram-tt](https://github.com/Ajaxy/telegram-tt) — React + TypeScript
- **Backend:** Supabase (Auth + Database + Realtime)
- **Encryption:** Signal Protocol (`@signalapp/libsignal-client`)
- **Original repo:** github.com/imlokzu/wave

---

## Architecture

### API Layer
The MTProto layer has been replaced with a custom Wave API:
- **REMOVE:** `src/api/gramjs/` — original MTProto SDK, do not touch
- **USE:** `src/api/wave/` — our custom Supabase client

### Supabase Schema
```sql
profiles     (id, username, avatar_url, created_at)
chats        (id, type, created_at)
chat_members (chat_id, user_id)
messages     (id, chat_id, user_id, content_encrypted, created_at)
```

### Encryption Flow
1. Keys are generated on device only — never sent to server
2. Messages are encrypted client-side with Signal Protocol before any network call
3. Only ciphertext is stored in Supabase
4. Even the server owner cannot read messages

---

## Rules — READ BEFORE DOING ANYTHING

### ❌ Never do this
- Do NOT create test files (`*.test.ts`, `*.spec.ts`) unless explicitly asked
- Do NOT create documentation files (`*.md`) unless explicitly asked
- Do NOT create example or demo files
- Do NOT add `console.log` statements to production code
- Do NOT store plaintext messages in Supabase — always encrypt first
- Do NOT send encryption keys over the network
- Do NOT modify `src/api/gramjs/` — leave MTProto untouched
- Do NOT install unnecessary dependencies
- Do NOT create more than 1 new file per task unless absolutely necessary
- Do NOT rewrite working code just to "clean it up" unless asked

### ✅ Always do this
- Use TypeScript strict mode
- Encrypt messages client-side before any Supabase call
- Use Supabase Realtime for live message updates
- Keep telegram-tt UI unchanged as much as possible — only modify the API layer
- Use existing Supabase client from `src/api/wave/supabaseClient.ts`
- Follow existing code style and naming conventions

---

## Tech Stack Details

### Frontend
- React + TypeScript (telegram-tt fork)
- Works on: web browser + mobile browser
- Future: Expo/React Native for Android APK

### Backend (Supabase)
- Auth: Supabase Auth (replaces Telegram auth)
- Database: PostgreSQL via Supabase
- Realtime: Supabase Realtime subscriptions (replaces MTProto sync)
- Storage: Supabase Storage (for files/media)

### Encryption
```ts
import { SignalProtocolStore } from './signal/store';
// Always encrypt before sending to Supabase
// Never log or expose private keys
```

---

## File Structure (Wave API layer)
```
src/api/wave/
  supabaseClient.ts   — Supabase client init
  auth.ts             — login, register, logout
  messages.ts         — send, receive, encrypt/decrypt
  chats.ts            — create chat, get chats, members
  realtime.ts         — Supabase Realtime subscriptions
  signal/
    store.ts          — Signal Protocol key store
    encryption.ts     — encrypt/decrypt helpers
```

---

## Future Plans
- Expo/React Native mobile version
- APK distributed via GitHub Releases (no Play Store needed)
- iOS via Expo Go / TestFlight