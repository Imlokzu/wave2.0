import './util/handleError';
import './util/setupServiceWorker';
import './global/init';
import './lib/logging/debugConsole';

import TeactDOM from './lib/teact/teact-dom';
import {
  getActions, getGlobal,
} from './global';

import {
  DEBUG, STRICTERDOM_ENABLED,
} from './config';
import { Logger } from './lib/logging/logger';
import { enableStrict, setHandler, requestMutation } from './lib/fasterdom/fasterdom';
import { selectChat, selectCurrentMessageList, selectPeerFullInfo, selectTabState } from './global/selectors';
import { selectSharedSettings } from './global/selectors/sharedState';
import { betterView } from './util/betterView';
import { IS_TAURI } from './util/browser/globalEnvironment';
import listenOtherClients from './util/browser/listenOtherClients';
import { requestGlobal, subscribeToMultitabBroadcastChannel } from './util/browser/multitab';
import { establishMultitabRole, subscribeToMasterChange } from './util/establishMultitabRole';
import { initGlobal } from './util/init';
import { initLocalization } from './util/localization';
import { MULTITAB_STORAGE_KEY } from './util/multiaccount';
import { checkAndAssignPermanentWebVersion } from './util/permanentWebVersion';
import { onBeforeUnload } from './util/schedulers';
import initTauriApi from './util/tauri/initTauriApi';
import setupTauriListeners from './util/tauri/setupTauriListeners';
import updateWebmanifest from './util/updateWebmanifest';

import App from './components/App';

import './assets/fonts/roboto.css';
import './styles/index.scss';

let strictChildListMutationCount = 0;
let strictChildListSummaryTimer: number | undefined;

if (STRICTERDOM_ENABLED) {
  // Suppress expected childList mutations during module loading
  setHandler((error: Error) => {
    if (error.message?.includes('childList')) {
      strictChildListMutationCount += 1;

      if (!strictChildListSummaryTimer) {
        strictChildListSummaryTimer = window.setTimeout(() => {
          Logger.debug('StricterDOM', 'Suppressed childList mutations during load', {
            count: strictChildListMutationCount,
          });
          strictChildListMutationCount = 0;
          strictChildListSummaryTimer = undefined;
        }, 1000);
      }

      return;
    }
    // Report other stricterdom violations
    Logger.error('StricterDOM', 'Violation detected', error);
  });

  enableStrict();
}

if (IS_TAURI) {
  initTauriApi();
  setupTauriListeners();
}

init();

async function init() {
  Logger.info('App', 'Initializing application');

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('>>> INIT');
  }

  if (!(window as any).isCompatTestPassed) {
    Logger.warn('App', 'Compat test not passed, aborting init');
    return;
  }

  Logger.info('App', 'Compat test passed, proceeding with init');

  checkAndAssignPermanentWebVersion();
  listenOtherClients();
  Logger.debug('App', 'Other client listener setup complete');

  subscribeToMultitabBroadcastChannel();
  await requestGlobal(APP_VERSION);
  Logger.debug('App', 'Global request complete');

  localStorage.setItem(MULTITAB_STORAGE_KEY, '1');
  onBeforeUnload(() => {
    const global = getGlobal();
    if (Object.keys(global.byTabId).length === 1) {
      localStorage.removeItem(MULTITAB_STORAGE_KEY);
    }
  });

  await initGlobal();
  Logger.info('App', 'Global state initialized');

  getActions().init();
  Logger.debug('App', 'Actions initialized');

  getActions().updateShouldEnableDebugLog();
  getActions().updateShouldDebugExportedSenders();

  const global = getGlobal();

  initLocalization(selectSharedSettings(global).language, true);
  Logger.debug('App', 'Localization initialized');

  subscribeToMasterChange((isMasterTab) => {
    Logger.debug('App', 'Master tab changed', { isMasterTab });
    getActions()
      .switchMultitabRole({ isMasterTab }, { forceSyncOnIOs: true });
  });
  const shouldReestablishMasterToSelf = getGlobal().auth.state !== 'authorizationStateReady';
  establishMultitabRole(shouldReestablishMasterToSelf);
  Logger.debug('App', 'Multitab role established', { shouldReestablishMasterToSelf });

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('>>> START INITIAL RENDER');
  }

  Logger.info('App', 'Starting initial render');

  requestMutation(() => {
    updateWebmanifest();

    TeactDOM.render(
      <App />,
      document.getElementById('root')!,
    );

    betterView();
  });

  Logger.info('App', 'Initial render complete');

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('>>> FINISH INITIAL RENDER');
  }

  if (DEBUG) {
    document.addEventListener('dblclick', () => {
      const currentGlobal = getGlobal();
      const currentMessageList = selectCurrentMessageList(currentGlobal);
      // eslint-disable-next-line no-console
      console.warn('TAB STATE', selectTabState(currentGlobal));
      // eslint-disable-next-line no-console
      console.warn('GLOBAL STATE', currentGlobal);
      if (currentMessageList) {
        // eslint-disable-next-line no-console
        console.warn(
          'CURRENT MESSAGE LIST',
          selectChat(currentGlobal, currentMessageList.chatId),
          selectPeerFullInfo(currentGlobal, currentMessageList.chatId),
          currentGlobal.messages.byChatId[currentMessageList.chatId],
        );
      }
    });
  }
}

onBeforeUnload(() => {
  const actions = getActions();
  actions.leaveGroupCall?.({ isPageUnload: true });
  actions.hangUp?.({ isPageUnload: true });
});
