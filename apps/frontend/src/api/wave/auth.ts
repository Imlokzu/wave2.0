import { disconnectWaveSocket } from './socket';
import { clearWaveAuthToken, getWaveAuthToken, setWaveAuthToken, waveFetch } from './client';

export interface WaveUser {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
}

export interface WaveAuthResult {
  user: WaveUser;
  token: string;
}

export interface WaveSignUpInput {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
  avatarFile?: File;
}

export function normalizeWaveUsername(emailOrUsername: string): string {
  const value = emailOrUsername.trim().toLowerCase();

  // Existing accounts may still use plain usernames.
  if (!value.includes('@')) {
    return value;
  }

  let normalized = value
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    normalized = 'wave_user';
  }

  // Keep compatibility with backend username constraints.
  return normalized.slice(0, 20);
}

export async function signInWithPassword(email: string, password: string): Promise<WaveAuthResult> {
  const username = normalizeWaveUsername(email);

  const response = await waveFetch<{
    user: {
      id: string;
      username: string;
      nickname?: string;
    };
    token: string;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.user || !response.token) {
    throw new Error('Failed to sign in with Wave auth');
  }

  setWaveAuthToken(response.token);

  return {
    user: {
      ...response.user,
      email: response.user.username,
    },
    token: response.token,
  };
}

export async function signUpWithPassword(email: string, password: string): Promise<WaveAuthResult> {
  const normalizedUsername = normalizeWaveUsername(email);

  return signUpWithProfile({
    email,
    password,
    username: normalizedUsername,
    displayName: normalizedUsername,
  });
}

export async function signUpWithProfile(input: WaveSignUpInput): Promise<WaveAuthResult> {
  const rawUsername = input.username?.trim();
  if (!rawUsername) {
    throw new Error('Username is required');
  }

  const normalizedUsername = normalizeWaveUsername(rawUsername);
  const normalizedDisplayName = (input.displayName || normalizedUsername).trim();

  const response = await waveFetch<{
    user: {
      id: string;
      username: string;
      nickname?: string;
    };
    token: string;
  }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      username: normalizedUsername,
      nickname: normalizedDisplayName,
      password: input.password,
    }),
  });

  if (!response.user || !response.token) {
    throw new Error('Failed to sign up with Wave auth');
  }

  setWaveAuthToken(response.token);

  if (input.avatarFile) {
    const formData = new FormData();
    formData.append('avatar', input.avatarFile);

    await waveFetch(`/api/users/${encodeURIComponent(response.user.id)}/avatar`, {
      method: 'POST',
      body: formData,
    }).catch(() => undefined);
  }

  return {
    user: {
      ...response.user,
      email: input.email,
    },
    token: response.token,
  };
}

export async function signOutWave(): Promise<void> {
  const token = getWaveAuthToken();
  if (token) {
    await waveFetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => undefined);
  }

  clearWaveAuthToken();
  disconnectWaveSocket();
}

export async function getCurrentWaveUser(): Promise<WaveUser | null> {
  const token = getWaveAuthToken();
  if (!token) {
    return null;
  }

  const response = await waveFetch<{
    user: {
      id: string;
      username: string;
      nickname?: string;
    };
  }>('/api/auth/session', {
    method: 'GET',
  }).catch(() => {
    clearWaveAuthToken();
    return undefined;
  });

  if (!response?.user) {
    return null;
  }

  return {
    ...response.user,
    email: response.user.username,
  };
}
