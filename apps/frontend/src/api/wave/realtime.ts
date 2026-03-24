import type { WaveMessageChangePayload } from './types';

export function subscribeToChatMessages(
  _chatId: string,
  _onMessage: (payload: WaveMessageChangePayload) => void,
): () => void {
  return () => {};
}
