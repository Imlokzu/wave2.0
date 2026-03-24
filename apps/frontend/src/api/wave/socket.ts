import { io, type Socket } from 'socket.io-client';

import { getWaveAuthToken } from './client';
import { getWaveConfig } from './config';

let socket: Socket | undefined;

export async function getWaveSocket(): Promise<Socket> {
  if (socket) {
    return socket;
  }

  const waveConfig = getWaveConfig();
  const token = getWaveAuthToken();

  socket = io(waveConfig.socketUrl, {
    transports: ['websocket'],
    autoConnect: true,
    withCredentials: true,
    auth: {
      accessToken: token,
    },
  });

  return socket;
}

export function disconnectWaveSocket(): void {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = undefined;
}
