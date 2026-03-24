import { getWaveConfig } from './config';
import { Logger } from '../../lib/logging/logger';

const WAVE_AUTH_TOKEN_KEY = 'wave.auth.token';
const WAVE_REQUEST_TIMEOUT_MS = 10_000;

export function getWaveAuthToken(): string | undefined {
  const token = window.localStorage.getItem(WAVE_AUTH_TOKEN_KEY);
  return token || undefined;
}

export function setWaveAuthToken(token: string): void {
  window.localStorage.setItem(WAVE_AUTH_TOKEN_KEY, token);
}

export function clearWaveAuthToken(): void {
  window.localStorage.removeItem(WAVE_AUTH_TOKEN_KEY);
}

export function getWaveApiUrl(path: string): string {
  const { apiUrl } = getWaveConfig();
  return `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function waveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getWaveAuthToken();
  const headers = new Headers(init?.headers || {});
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), WAVE_REQUEST_TIMEOUT_MS);
  const startTime = performance.now();
  const method = init?.method || 'GET';

  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(getWaveApiUrl(path), {
      ...init,
      headers,
      signal: init?.signal ?? controller.signal,
    });

    const duration = Math.round(performance.now() - startTime);
    Logger.api('Wave API', `${method} ${path}`, response.status, duration);
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    clearTimeout(timeout);

    if (err?.name === 'AbortError') {
      Logger.error('Wave API', `${method} ${path} TIMEOUT`, err, { timeout: WAVE_REQUEST_TIMEOUT_MS, duration });
      throw new Error(`Wave API request timed out (${WAVE_REQUEST_TIMEOUT_MS}ms)`);
    }

    Logger.error('Wave API', `${method} ${path} FAILED`, err, { duration });
    throw err;
  }

  clearTimeout(timeout);

  const json = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message = json?.message || json?.error?.message || json?.error || `Wave API request failed (${response.status})`;
    Logger.warn('Wave API', `${method} ${path} error response`, { status: response.status, error: message });
    throw new Error(String(message));
  }

  return json as T;
}
