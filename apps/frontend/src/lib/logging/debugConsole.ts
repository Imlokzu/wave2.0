/**
 * Debug console helpers for inspecting app state and logs
 * Available as window.DEBUG in the browser console
 */

import { Logger } from './logger';
import { getGlobal } from '../../global';

export const DEBUG_CONSOLE = {
  /**
   * Show all logs
   */
  logs(): void {
    Logger.summary();
  },

  /**
   * Show only errors
   */
  errors(): void {
    Logger.printErrors();
  },

  /**
   * Show logs from a specific module
   */
  logsFrom(moduleName: string): void {
    const logs = Logger.getLogsByModule(moduleName);
    console.group(`%c📋 Logs from ${moduleName} (${logs.length})`, 'color: #0066cc; font-weight: bold;');
    logs.forEach((log) => {
      console.log(`${new Date(log.timestamp).toLocaleTimeString()}: ${log.message}`, log.data);
    });
    console.groupEnd();
  },

  /**
   * Show only API calls
   */
  apis(): void {
    const apiLogs = Logger.getLogsByLevel('api');
    console.group(`%c🔵 API Calls (${apiLogs.length})`, 'color: #00aa00; font-weight: bold;');
    apiLogs.forEach((log) => {
      console.log(`${new Date(log.timestamp).toLocaleTimeString()}: ${log.message}`, log.data, `${log.duration}ms`);
    });
    console.groupEnd();
  },

  /**
   * Show auth status
   */
  auth(): void {
    const global = getGlobal();
    console.group('%c🔐 Auth Status', 'color: #ff9900; font-weight: bold;');
    console.log('Auth State:', global.auth?.state);
    console.log('Currently User ID:', global.currentUserId);
    console.log('Is Authenticated:', !!global.currentUserId);
    console.log('Full Auth:', global.auth);
    console.groupEnd();
  },

  /**
   * Show global state summary
   */
  state(): void {
    const global = getGlobal();
    console.group('%c🌍 Global State', 'color: #0099ff; font-weight: bold;');
    console.log('Current User ID:', global.currentUserId);
    console.log('Auth State:', global.auth?.state);
    console.log('Chats:', Object.keys(global.chats?.byId || {}).length);
    console.log('Users:', Object.keys(global.users?.byId || {}).length);
    console.log('Messages:', Object.keys(global.messages?.byChatId || {}).length);
    console.log('Tabs:', Object.keys(global.byTabId || {}).length);
    console.log(' Connection State:', global.connectionState);
    console.groupEnd();
  },

  /**
   * Show chats
   */
  chats(): void {
    const global = getGlobal();
    const chats = global.chats?.byId || {};
    console.group(`%c💬 Chats (${Object.keys(chats).length})`, 'color: #0099ff; font-weight: bold;');
    Object.entries(chats).forEach(([id, chat]: any) => {
      console.log(`${chat?.title || chat?.firstName || id}:`, chat);
    });
    console.groupEnd();
  },

  /**
   * Show performance issues
   */
  perf(): void {
    const perfLogs = Logger.getLogsByLevel('perf');
    const slow = perfLogs.filter((l) => l.duration && l.duration > 50);
    console.group(`%c⚡ Performance Issues (${slow.length})`, 'color: #aa00aa; font-weight: bold;');
    slow.forEach((log) => {
      console.log(`${new Date(log.timestamp).toLocaleTimeString()}: ${log.message} [${log.duration}ms]`);
    });
    console.groupEnd();
  },

  /**
   * Export all logs as JSON
   */
  export(): string {
    const json = Logger.export();
    console.log('Logs exported to clipboard');
    return json;
  },

  /**
   * Clear all logs
   */
  clear(): void {
    Logger.clear();
    console.log('%c✅ All logs cleared', 'color: #00aa00; font-weight: bold;');
  },

  /**
   * Show help
   */
  help(): void {
    console.group('%c📚 Debug Console Help', 'color: #0066cc; font-weight: bold;');
    console.log('window.DEBUG.logs() - Show all logs with summary');
    console.log('window.DEBUG.errors() - Show only errors');
    console.log('window.DEBUG.logsFrom(module) - Show logs from specific module');
    console.log('window.DEBUG.apis() - Show API calls');
    console.log('window.DEBUG.auth() - Show auth status');
    console.log('window.DEBUG.state() - Show global state summary');
    console.log('window.DEBUG.chats() - Show all chats');
    console.log('window.DEBUG.perf() - Show performance issues');
    console.log('window.DEBUG.export() - Export logs as JSON');
    console.log('window.DEBUG.clear() - Clear all logs');
    console.log('window.DEBUG.help() - Show this help');
    console.groupEnd();
  },
};

// Expose globally
(window as any).DEBUG = DEBUG_CONSOLE;

console.log(
  '%c🐛 Debug Console Ready! Use window.DEBUG for debugging\n%cwindow.DEBUG.help() for commands',
  'color: #0066cc; font-weight: bold; font-size: 12px;',
  'color: #666; font-size: 11px;',
);
