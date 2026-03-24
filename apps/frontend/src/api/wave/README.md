# Wave API Layer (telegram-tt)

This folder contains the Wave backend adapter for telegram-tt.

## Scope

- Wave backend REST auth/session
- Wave backend chat/message loading
- Socket.IO connection for Wave backend events
- Client-side encryption hooks via Signal Protocol (`@signalapp/libsignal-client`)

## Required env vars

- `VITE_WAVE_API_URL`
- `VITE_WAVE_SOCKET_URL`

## Security rule

Wave message transport is backend-driven (`/api/dms/*`).
Compatibility objects in `src/api/wave/messages.ts` keep telegram-tt action flows working while backend payloads stay Wave-native.

## Current integration level

`src/api/wave` is implemented and ready for wiring into existing action flows.
telegram-tt currently imports `src/api/gramjs` widely, so full cutover should be done in phases:

1. Add compatibility shim methods for auth/message/chat calls.
2. Redirect call sites from `../api/gramjs` to `../api/wave` per feature.
3. Remove `src/api/gramjs` after all call sites are migrated.
