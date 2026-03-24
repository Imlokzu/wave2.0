import type { MethodArgs, MethodResponse, Methods } from '../gramjs/methods/types';
import type { ApiChat, ApiUser } from '../types';
import type { ProfileRow } from './types';

import { isWaveEnvConfigured } from './config';
import { getCurrentWaveUser } from './auth';
import { Logger } from '../../lib/logging/logger';
import {
  getOtherChatMemberId,
  listChatMembersByChatIds,
  listProfilesByIds,
  listUserChats,
} from './chats';
import { decryptMessageRow, listMessages, sendEncryptedMessage } from './messages';

const DEV_FALLBACK_USER_ID = '777000';

type ApiProgressHandler = (progress: number) => void;
type ApiMethod = keyof Methods;
type ApiResult<M extends ApiMethod> = Awaited<MethodResponse<M>>;
const unsupportedMethodsLogged = new Set<string>();

const unsupported = (method: string): undefined => {
  if (unsupportedMethodsLogged.has(method)) {
    return undefined;
  }

  unsupportedMethodsLogged.add(method);
  Logger.warn('Wave Compat', `Unsupported method: ${method}`);
  return undefined;
};

const getCurrentUserId = async (): Promise<string> => {
  const user = await getCurrentWaveUser();

  if (!user) {
    return DEV_FALLBACK_USER_ID;
  }

  return user.id;
};

const toApiUser = (userId: string, username?: string | null): ApiUser => ({
  id: userId,
  isMin: false,
  type: 'userTypeRegular',
  firstName: username || 'Wave User',
  phoneNumber: '',
});

const toApiChat = (
  chatId: string,
  options: {
    title?: string;
    isDirect?: boolean;
  } = {},
): ApiChat => ({
  id: chatId,
  type: options.isDirect ? 'chatTypePrivate' : 'chatTypeSuperGroup',
  title: options.title || 'Wave Chat',
  isListed: true,
});

const toNumericMessageId = (value: string, index: number): number => {
  const digits = value.replace(/\D/g, '').slice(-9);
  if (digits) {
    return Number(digits);
  }

  return index + 1;
};

async function buildChatsPayload(userId: string) {
  const chats = await listUserChats(userId).catch((err) => {
    console.error('[wave/api] Failed to list user chats:', err);
    return [];
  });
  const chatIds = chats.map((chat) => chat.id);
  const membersByChatId = await listChatMembersByChatIds(chatIds).catch((err) => {
    console.error('[wave/api] Failed to list chat members:', err);
    return {} as Record<string, string[]>;
  });

  const allMemberIds = Object.values(membersByChatId).flat();
  const profilesById: Record<string, ProfileRow> = await listProfilesByIds(allMemberIds).catch((err) => {
    console.error('[wave/api] Failed to list profiles:', err);
    return {} as Record<string, ProfileRow>;
  });

  const usersMap: Record<string, ApiUser> = {};

  const apiChats = chats.map((chat) => {
    const members = membersByChatId[chat.id] ?? [];
    const otherMemberId = members.find((memberId) => memberId !== userId);
    const otherProfile = otherMemberId ? profilesById[otherMemberId] : undefined;
    const title = chat.type === 'direct'
      ? (otherProfile?.username || 'Direct chat')
      : `Group ${chat.id.slice(0, 8)}`;

    members.forEach((memberId) => {
      if (!usersMap[memberId]) {
        usersMap[memberId] = toApiUser(memberId, profilesById[memberId]?.username);
      }
    });

    return toApiChat(chat.id, {
      title,
      isDirect: chat.type === 'direct',
    });
  });

  return {
    apiChats,
    users: Object.values(usersMap),
  };
}

export async function initApi(..._args: unknown[]): Promise<void> {
}

export async function callApi<M extends ApiMethod>(method: M, ...args: MethodArgs<M>): Promise<ApiResult<M>>;
export async function callApi<M extends ApiMethod>(
  method: M,
  ...args: [...MethodArgs<M>, ApiProgressHandler]
): Promise<ApiResult<M>>;
export async function callApi<M extends ApiMethod>(method: M, ...args: unknown[]): Promise<ApiResult<M>> {
  if (!isWaveEnvConfigured()) {
    if (method === 'fetchCurrentUser') {
      return null as ApiResult<M>;
    }

    if (method === 'fetchChats' || method === 'fetchSavedChats') {
      return {
        chatIds: [],
        chats: [],
        users: [],
        userStatusesById: {},
        draftsById: {},
        orderedPinnedIds: undefined,
        totalChatCount: 0,
        lastMessageByChatId: {},
        messages: [],
        notifyExceptionById: {},
        nextOffsetId: undefined,
        nextOffsetPeerId: undefined,
        nextOffsetDate: undefined,
        threadReadStatesById: {},
        threadInfos: [],
      } as ApiResult<M>;
    }

    if (method === 'fetchMessages') {
      return {
        messages: [],
        chats: [],
        users: [],
      } as ApiResult<M>;
    }

    if (
      method === 'broadcastLocalDbUpdateFull'
      || method === 'incrementLocalMessagesCounter'
      || method === 'setForceHttpTransport'
      || method === 'setAllowHttpTransport'
      || method === 'setShouldDebugExportedSenders'
    ) {
      return true as ApiResult<M>;
    }

    return undefined as ApiResult<M>;
  }

  switch (method) {
    case 'fetchChats': {
      Logger.info('Wave Compat', 'Fetching chats');
      const userId = await getCurrentUserId();
      Logger.debug('Wave Compat', 'Got user ID', { userId });

      const { apiChats, users } = await buildChatsPayload(userId);
      Logger.info('Wave Compat', 'Chats loaded', { chatCount: apiChats.length, userCount: users.length });

      return {
        chatIds: apiChats.map((chat) => chat.id),
        chats: apiChats,
        users,
        userStatusesById: {},
        draftsById: {},
        orderedPinnedIds: undefined,
        totalChatCount: apiChats.length,
        lastMessageByChatId: {},
        messages: [],
        notifyExceptionById: {},
        nextOffsetId: undefined,
        nextOffsetPeerId: undefined,
        nextOffsetDate: undefined,
        threadReadStatesById: {},
        threadInfos: [],
      } as ApiResult<M>;
    }

    case 'fetchSavedChats': {
      return {
        chatIds: [],
        chats: [],
        users: [],
        userStatusesById: {},
        draftsById: {},
        orderedPinnedIds: undefined,
        totalChatCount: 0,
        lastMessageByChatId: {},
        messages: [],
        notifyExceptionById: {},
        nextOffsetId: undefined,
        nextOffsetPeerId: undefined,
        nextOffsetDate: undefined,
        threadReadStatesById: {},
        threadInfos: [],
      } as ApiResult<M>;
    }

    case 'fetchCurrentUser': {
      const waveUser = await getCurrentWaveUser();
      if (!waveUser) {
        return undefined as ApiResult<M>;
      }

      return toApiUser(waveUser.id, waveUser.email) as ApiResult<M>;
    }

    case 'searchChats': {
      const [input] = args as [{ query?: string } | undefined];
      const userId = await getCurrentUserId();
      const { apiChats } = await buildChatsPayload(userId);
      const query = input?.query?.trim().toLowerCase();

      if (!query) {
        return { chats: apiChats } as ApiResult<M>;
      }

      const filtered = apiChats.filter((chat) => {
        return chat.id.toLowerCase().includes(query) || chat.title.toLowerCase().includes(query);
      });

      return { chats: filtered } as ApiResult<M>;
    }

    case 'fetchMessages': {
      const [input] = args as [{ chatId?: string; chat?: { id?: string } }];
      const chatId = input?.chatId ?? input?.chat?.id;
      if (!chatId) {
        throw new Error('[wave/api] fetchMessages requires chatId');
      }

      const dbMessages = await listMessages(chatId);
      const currentUserId = await getCurrentUserId();

      const decryptedMessages = await Promise.all(dbMessages.map(async (message) => {
        try {
          const decrypted = await decryptMessageRow(message);
          return {
            row: message,
            text: decrypted.text,
          };
        } catch (err) {
          return {
            row: message,
            text: 'Encrypted message',
          };
        }
      }));

      const messages = decryptedMessages.map(({ row, text }, index) => ({
        id: toNumericMessageId(row.id, index),
        chatId: row.chat_id,
        date: Math.floor(new Date(row.created_at).getTime() / 1000),
        isOutgoing: row.user_id === currentUserId,
        senderId: row.user_id,
        content: {
          text: {
            text,
          },
        },
      }));

      const memberIds = Array.from(new Set(dbMessages.map((message) => message.user_id)));
      const profilesById = await listProfilesByIds(memberIds);
      const users = memberIds.map((memberId) => toApiUser(memberId, profilesById[memberId]?.username));

      return {
        messages,
        chats: [toApiChat(chatId)],
        users,
      } as ApiResult<M>;
    }

    case 'sendMessage': {
      const [input] = args as [{
        chatId?: string;
        chat?: { id?: string };
        text?: string;
        message?: string;
        recipientUserId?: string;
        recipientDeviceId?: number;
      }];

      const chatId = input?.chatId ?? input?.chat?.id;
      const plaintext = input?.text ?? input?.message;

      if (!chatId || !plaintext) {
        throw new Error('[wave/api] sendMessage requires chatId and plaintext');
      }

      const senderUserId = await getCurrentUserId();
      const recipientUserId = input?.recipientUserId
        || await getOtherChatMemberId(chatId, senderUserId)
        || senderUserId;

      const row = await sendEncryptedMessage({
        chatId,
        senderUserId,
        recipientUserId,
        recipientDeviceId: input.recipientDeviceId ?? 1,
        plaintext,
      });

      return {
        id: toNumericMessageId(row.id, 0),
        chatId: row.chat_id,
        date: Math.floor(new Date(row.created_at).getTime() / 1000),
        isOutgoing: true,
        senderId: row.user_id,
        content: {
          text: {
            text: plaintext,
          },
        },
      } as ApiResult<M>;
    }

    case 'broadcastLocalDbUpdateFull':
    case 'incrementLocalMessagesCounter':
    case 'setForceHttpTransport':
    case 'setAllowHttpTransport':
    case 'setShouldDebugExportedSenders': {
      return true as ApiResult<M>;
    }

    default:
      return unsupported(method) as ApiResult<M>;
  }
}

export async function callApiLocal<M extends ApiMethod>(method: M, ...args: MethodArgs<M>): Promise<ApiResult<M>> {
  return callApi(method, ...args);
}

export function cancelApiProgress(..._args: unknown[]): void {
}

export function cancelApiProgressMaster(..._args: unknown[]): void {
}

export function handleMethodCallback(..._args: unknown[]): void {
}

export function handleMethodResponse(..._args: unknown[]): void {
}

export function updateFullLocalDb(..._args: unknown[]): void {
}

export function updateLocalDb(..._args: unknown[]): void {
}

export function setShouldEnableDebugLog(..._args: unknown[]): void {
}
