export interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ChatRow {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
}

export interface ChatMemberRow {
  chat_id: string;
  user_id: string;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  user_id: string;
  content_encrypted: string;
  created_at: string;
}

export interface WaveCipherEnvelope {
  ciphertextBase64: string;
  messageType: number;
  senderUserId: string;
  senderDeviceId: number;
}

export interface WaveMessageDecrypted {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface WaveSessionKeyBundle {
  registrationId: number;
  deviceId: number;
  identityPublicKeyBase64: string;
  signedPreKeyId: number;
  signedPreKeyPublicBase64: string;
  signedPreKeySignatureBase64: string;
  oneTimePreKeyId: number;
  oneTimePreKeyPublicBase64: string;
}

export interface WaveMessageChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: MessageRow | null;
  old: MessageRow | null;
}
