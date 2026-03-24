/**
 * Centralized logging system for live debugging and error tracking
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'api' | 'state' | 'perf';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  error?: Error;
  duration?: number;
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];
const LOG_STORAGE_KEY = 'wave_debug_logs';

// Color coding for console output
const COLORS: Record<LogLevel, string> = {
  debug: '#999999',
  info: '#0066cc',
  warn: '#ff9900',
  error: '#cc0000',
  api: '#00aa00',
  state: '#0099ff',
  perf: '#aa00aa',
};

const BACKGROUND: Record<LogLevel, string> = {
  debug: '#f5f5f5',
  info: '#e6f2ff',
  warn: '#fff3e6',
  error: '#ffe6e6',
  api: '#e6ffe6',
  state: '#e6f5ff',
  perf: '#f5e6ff',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function createLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: any,
  error?: Error,
  duration?: number,
): LogEntry {
  return {
    timestamp: Date.now(),
    level,
    module,
    message,
    data,
    error,
    duration,
  };
}

function addLog(entry: LogEntry): void {
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Persist to localStorage (keep only last N logs to avoid quota issues)
  try {
    const storedLogs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]').slice(-100);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify([...storedLogs, entry]));
  } catch (e) {
    // localStorage might be full or disabled
  }
}

function consoleLog(entry: LogEntry): void {
  const timeStr = formatTime(entry.timestamp);
  const badge = `%c[${entry.level.toUpperCase()}]%c`;
  const module = `%c${entry.module}%c`;
  const message = entry.message;

  const styles = [
    `color: ${COLORS[entry.level]}; font-weight: bold; background: ${BACKGROUND[entry.level]}; padding: 2px 6px; border-radius: 3px;`,
    'color: inherit; background: inherit;',
    `color: #666; font-size: 0.9em;`,
    'color: inherit;',
  ];

  let output = `${badge} ${module} ${timeStr} ${message}`;
  const params: any[] = [...styles];

  if (entry.data !== undefined) {
    output += ' %O';
    params.push(entry.data);
  }

  if (entry.duration !== undefined) {
    output += ` [${entry.duration}ms]`;
  }

  if (entry.error) {
    output += ' %O';
    params.push(entry.error);
  }

  console.log(output, ...params);
}

export const Logger = {
  debug(module: string, message: string, data?: any): void {
    const entry = createLogEntry('debug', module, message, data);
    addLog(entry);
    consoleLog(entry);
  },

  info(module: string, message: string, data?: any): void {
    const entry = createLogEntry('info', module, message, data);
    addLog(entry);
    consoleLog(entry);
  },

  warn(module: string, message: string, data?: any): void {
    const entry = createLogEntry('warn', module, message, data);
    addLog(entry);
    consoleLog(entry);
  },

  error(module: string, message: string, error?: Error | unknown, data?: any): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const entry = createLogEntry('error', module, message, data, err);
    addLog(entry);
    consoleLog(entry);
  },

  api(module: string, method: string, status: number, duration: number, data?: any): void {
    const entry = createLogEntry('api', module, `${method}`, { status, ...data }, undefined, duration);
    addLog(entry);
    consoleLog(entry);
  },

  state(module: string, action: string, payload?: any): void {
    const entry = createLogEntry('state', module, `→ ${action}`, payload);
    addLog(entry);
    if (action !== 'tick') {
      // Skip tick noise
      consoleLog(entry);
    }
  },

  perf(module: string, operation: string, duration: number, details?: any): void {
    const entry = createLogEntry('perf', module, operation, details, undefined, duration);
    addLog(entry);
    if (duration > 50) {
      // Only log slow operations in console
      consoleLog(entry);
    }
  },

  /**
   * Get all logs as an array
   */
  getLogs(): LogEntry[] {
    return [...logs];
  },

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return logs.filter((log) => log.level === level);
  },

  /**
   * Get logs filtered by module
   */
  getLogsByModule(module: string): LogEntry[] {
    return logs.filter((log) => log.module.includes(module));
  },

  /**
   * Get errors only
   */
  getErrors(): LogEntry[] {
    return logs.filter((log) => log.level === 'error' || log.error);
  },

  /**
   * Clear all logs
   */
  clear(): void {
    logs.length = 0;
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(logs, null, 2);
  },

  /**
   * Print summary to console
   */
  summary(): void {
    console.group('%c📊 LOGGER SUMMARY', 'font-size: 14px; font-weight: bold; color: #0066cc;');
    console.log(`Total logs: ${logs.length}`);
    console.log(`Errors: ${logs.filter((l) => l.level === 'error').length}`);
    console.log(`Warnings: ${logs.filter((l) => l.level === 'warn').length}`);
    console.log(`API calls: ${logs.filter((l) => l.level === 'api').length}`);
    console.log(`State changes: ${logs.filter((l) => l.level === 'state').length}`);
    console.log(`Perf issues (>50ms): ${logs.filter((l) => l.level === 'perf' && l.duration && l.duration > 50).length}`);

    const modules = [...new Set(logs.map((l) => l.module))];
    console.log(`Active modules: ${modules.join(', ')}`);
    console.groupEnd();
  },

  /**
   * Print all errors to console
   */
  printErrors(): void {
    const errors = Logger.getErrors();
    console.group(`%c🔴 ERRORS (${errors.length})`, 'font-size: 12px; font-weight: bold; color: #cc0000;');
    errors.forEach((entry) => {
      console.log(`${formatTime(entry.timestamp)} [${entry.module}] ${entry.message}`, entry.data, entry.error);
    });
    console.groupEnd();
  },
};

// Expose globally for debugging
(window as any).Logger = Logger;

console.log('%c🚀 Logger initialized - use window.Logger for debugging', 'color: #0066cc; font-weight: bold;');
