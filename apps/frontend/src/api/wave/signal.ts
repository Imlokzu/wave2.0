import type { WaveCipherEnvelope, WaveSessionKeyBundle } from './types';

import { getCurrentWaveUser } from './auth';

export interface WaveSignalAdapter {
  initializeSession(recipientUserId: string, recipientDeviceId: number, bundle: WaveSessionKeyBundle): Promise<void>;
  encrypt(
    plaintext: string,
    currentUserId: string,
    recipientUserId: string,
    recipientDeviceId: number,
  ): Promise<WaveCipherEnvelope>;
  decrypt(envelope: WaveCipherEnvelope, senderUserId: string): Promise<string>;
}

let adapter: WaveSignalAdapter | undefined;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveConversationKey(userA: string, userB: string): Promise<CryptoKey | undefined> {
  if (!globalThis.crypto?.subtle) {
    return undefined;
  }

  const [first, second] = [userA, userB].sort();
  const seed = textEncoder.encode(`wave:${first}:${second}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', seed);

  return globalThis.crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

const fallbackAdapter: WaveSignalAdapter = {
  async initializeSession() {
  },
  async encrypt(plaintext, currentUserId, recipientUserId) {
    const key = await deriveConversationKey(currentUserId, recipientUserId);

    if (!key || !globalThis.crypto?.getRandomValues) {
      return {
        ciphertextBase64: bytesToBase64(textEncoder.encode(plaintext)),
        messageType: 1,
        senderUserId: currentUserId,
        senderDeviceId: 1,
      };
    }

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      textEncoder.encode(plaintext),
    );

    const payload = `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;

    return {
      ciphertextBase64: payload,
      messageType: 1,
      senderUserId: currentUserId,
      senderDeviceId: 1,
    };
  },
  async decrypt(envelope, senderUserId) {
    const currentUser = await getCurrentWaveUser();
    const currentUserId = currentUser?.id;
    if (!currentUserId) {
      return textDecoder.decode(base64ToBytes(envelope.ciphertextBase64));
    }

    const [ivBase64, dataBase64] = envelope.ciphertextBase64.split('.');
    if (!ivBase64 || !dataBase64) {
      return textDecoder.decode(base64ToBytes(envelope.ciphertextBase64));
    }

    const key = await deriveConversationKey(currentUserId, senderUserId);
    if (!key || !globalThis.crypto?.subtle) {
      return textDecoder.decode(base64ToBytes(dataBase64));
    }

    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(ivBase64)) },
      key,
      toArrayBuffer(base64ToBytes(dataBase64)),
    );

    return textDecoder.decode(new Uint8Array(decrypted));
  },
};

export function setWaveSignalAdapter(nextAdapter: WaveSignalAdapter): void {
  adapter = nextAdapter;
}

async function getSignalModule(): Promise<void> {
  return;
}

export async function initializeSignalSession(
  recipientUserId: string,
  recipientDeviceId: number,
  bundle: WaveSessionKeyBundle,
): Promise<void> {
  await getSignalModule();

  const activeAdapter = adapter || fallbackAdapter;

  await activeAdapter.initializeSession(recipientUserId, recipientDeviceId, bundle);
}

export async function encryptForRecipient(
  plaintext: string,
  currentUserId: string,
  recipientUserId: string,
  recipientDeviceId: number,
): Promise<WaveCipherEnvelope> {
  await getSignalModule();

  const activeAdapter = adapter || fallbackAdapter;

  return activeAdapter.encrypt(plaintext, currentUserId, recipientUserId, recipientDeviceId);
}

export async function decryptFromSender(
  envelope: WaveCipherEnvelope,
  senderUserId: string,
): Promise<string> {
  await getSignalModule();

  const activeAdapter = adapter || fallbackAdapter;

  return activeAdapter.decrypt(envelope, senderUserId);
}
