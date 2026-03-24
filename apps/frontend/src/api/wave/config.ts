export interface WaveConfig {
  apiUrl: string;
  socketUrl: string;
}

type WaveEnvName = 'VITE_WAVE_API_URL' | 'VITE_WAVE_SOCKET_URL';

const DEFAULT_WAVE_API_URL = 'http://localhost:3001';

const getEnv = (name: WaveEnvName): string | undefined => {
  const fromImportMeta = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env?.[name];

  if (fromImportMeta) {
    return fromImportMeta;
  }

  const fromProcess = typeof process !== 'undefined'
    ? (process.env[name])
    : undefined;

  return fromProcess;
};

const requireEnv = (name: WaveEnvName): string => {
  const value = getEnv(name);
  if (value) {
    return value;
  }

  throw new Error(`Missing required environment variable: ${name}`);
};

export function isWaveEnvConfigured(): boolean {
  return Boolean(getEnv('VITE_WAVE_API_URL') || getEnv('VITE_WAVE_SOCKET_URL') || DEFAULT_WAVE_API_URL);
}

export function getWaveConfig(): WaveConfig {
  const apiUrl = (getEnv('VITE_WAVE_API_URL') || DEFAULT_WAVE_API_URL).replace(/\/$/, '');

  return {
    apiUrl,
    socketUrl: (getEnv('VITE_WAVE_SOCKET_URL') || apiUrl).replace(/\/$/, ''),
  };
}
