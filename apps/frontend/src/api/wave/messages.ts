import type { MessageRow, WaveCipherEnvelope, WaveMessageDecrypted } from './types';

import { getCurrentWaveUser } from './auth';
import { getOtherChatMemberUsername } from './chats';
import { waveFetch } from './client';

const parseEnvelope = (raw: string): WaveCipherEnvelope => {
  const parsed = JSON.parse(raw) as Partial<WaveCipherEnvelope>;

  if (
    !parsed
    || typeof parsed.ciphertextBase64 !== 'string'
    || typeof parsed.messageType !== 'number'
    || typeof parsed.senderUserId !== 'string'
    || typeof parsed.senderDeviceId !== 'number'
  ) {
    throw new Error('Invalid encrypted message envelope format');
  }

  return {
    ciphertextBase64: parsed.ciphertextBase64,
    messageType: parsed.messageType,
    senderUserId: parsed.senderUserId,
    senderDeviceId: parsed.senderDeviceId,
  };
};

export async function listMessages(chatId: string): Promise<MessageRow[]> {
  const currentUser = await getCurrentWaveUser();
  if (!currentUser) {
    return [];
  }

  const memberIds = chatId.split('_').filter(Boolean);
  const otherUserId = memberIds.find((id) => id !== currentUser.id);
  if (!otherUserId) {
    return [];
  }

  const response = await waveFetch<{
    success: boolean;
    data: Array<{
      id: string;
      senderId: string;
      content: string;
      timestamp: string;
    }>;
  }>(`/api/dms/history/${encodeURIComponent(currentUser.id)}/${encodeURIComponent(otherUserId)}`);

  const messages = response.data ?? [];

  return messages.map((message) => ({
    id: message.id,
    chat_id: chatId,
    user_id: message.senderId,
    content_encrypted: message.content,
    created_at: message.timestamp,
  }));
}

export async function sendEncryptedMessage(input: {
  chatId: string;
  senderUserId: string;
  recipientUserId: string;
  recipientDeviceId: number;
  plaintext: string;
}): Promise<MessageRow> {
  const targetUsername = await getOtherChatMemberUsername(input.chatId, input.senderUserId);
  const memberIds = input.chatId.split('_').filter(Boolean);
  const otherUserId = input.recipientUserId || memberIds.find((id) => id !== input.senderUserId);

  if (!targetUsername && !otherUserId) {
    throw new Error('Unable to resolve recipient username for this chat');
  }

  const response = await waveFetch<{
    success: boolean;
    data: {
      id: string;
      senderId: string;
      content: string;
      timestamp: string;
    };
  }>('/api/dms/send', {
    method: 'POST',
    body: JSON.stringify({
      fromUserId: input.senderUserId,
      toUsername: targetUsername,
      toUserId: otherUserId,
      content: input.plaintext,
    }),
  });

  const inserted = response.data;

  return {
    id: inserted.id,
    chat_id: input.chatId,
    user_id: inserted.senderId,
    content_encrypted: inserted.content,
    created_at: inserted.timestamp,
  };
}

export async function decryptMessageRow(message: MessageRow): Promise<WaveMessageDecrypted> {
  let text = message.content_encrypted;

  try {
    const envelope = parseEnvelope(message.content_encrypted);
    text = envelope.ciphertextBase64;
  } catch (_err) {
    text = message.content_encrypted;
  }

  return {
    id: message.id,
    chatId: message.chat_id,
    userId: message.user_id,
    text,
    createdAt: message.created_at,
  };
}
