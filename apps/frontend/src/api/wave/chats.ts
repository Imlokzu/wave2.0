import type {
  ChatRow,
  ProfileRow,
} from './types';

import { waveFetch } from './client';

type WaveConversation = {
  id: string;
  type: 'dm' | 'room';
  otherUser?: {
    id: string;
    username: string;
    nickname?: string;
  } | null;
};

const cachedMembersByChatId = new Map<string, string[]>();
const cachedProfilesById = new Map<string, ProfileRow>();
const cachedOtherUserByChatId = new Map<string, { id: string; username?: string }>();

export async function listUserChats(userId: string): Promise<ChatRow[]> {
  const response = await waveFetch<{
    success: boolean;
    data: WaveConversation[];
  }>(`/api/chats/list/${encodeURIComponent(userId)}`);

  const conversations = response.data ?? [];

  const chats = conversations.map<ChatRow>((conversation) => {
    const otherUserId = conversation.otherUser?.id;
    const members = otherUserId ? [userId, otherUserId] : [userId];

    cachedMembersByChatId.set(conversation.id, members);

    if (conversation.otherUser) {
      cachedProfilesById.set(conversation.otherUser.id, {
        id: conversation.otherUser.id,
        username: conversation.otherUser.username,
        avatar_url: null,
        created_at: new Date().toISOString(),
      });

      cachedOtherUserByChatId.set(conversation.id, {
        id: conversation.otherUser.id,
        username: conversation.otherUser.username,
      });
    }

    return {
      id: conversation.id,
      type: conversation.type === 'dm' ? 'direct' : 'group',
      created_at: new Date().toISOString(),
    };
  });

  return chats;
}

export async function createDirectChat(userAId: string, userBId: string): Promise<ChatRow> {
  const chatId = `${userAId}_${userBId}`;
  cachedMembersByChatId.set(chatId, [userAId, userBId]);

  return {
    id: chatId,
    type: 'direct',
    created_at: new Date().toISOString(),
  };
}

export async function listChatMembersByChatIds(chatIds: string[]): Promise<Record<string, string[]>> {
  return chatIds.reduce<Record<string, string[]>>((acc, chatId) => {
    const cached = cachedMembersByChatId.get(chatId);
    if (cached?.length) {
      acc[chatId] = [...cached];
      return acc;
    }

    const splitIds = chatId.split('_').filter(Boolean);
    if (splitIds.length > 1) {
      acc[chatId] = splitIds;
    }

    return acc;
  }, {});
}

export async function getOtherChatMemberId(chatId: string, currentUserId: string): Promise<string | undefined> {
  const membersByChatId = await listChatMembersByChatIds([chatId]);
  const members = membersByChatId[chatId] ?? [];

  return members.find((memberId) => memberId !== currentUserId);
}

export async function listProfilesByIds(userIds: string[]): Promise<Record<string, ProfileRow>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) {
    return {};
  }

  return uniqueUserIds.reduce<Record<string, ProfileRow>>((acc, id) => {
    const cached = cachedProfilesById.get(id);
    if (cached) {
      acc[id] = cached;
      return acc;
    }

    acc[id] = {
      id,
      username: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    return acc;
  }, {});
}

export async function getOtherChatMemberUsername(chatId: string, currentUserId: string): Promise<string | undefined> {
  const cachedOther = cachedOtherUserByChatId.get(chatId);
  if (cachedOther && cachedOther.id !== currentUserId) {
    return cachedOther.username;
  }

  return undefined;
}
