import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/stream.css';
import './styles/chat.css';
import './styles/annotations.css';
import './styles/modal.css';
import './styles/diagnostics.css';
import './styles/responsive.css';

import { initAnnotations } from './features/annotations.js';
import { initChat } from './features/chat.js';
import { initHost } from './features/host.js';
import { initInvite } from './features/invite.js';
import { initStream } from './features/stream.js';
import { initViewer, parseInviteFromUrl } from './features/viewer.js';
import { dom, resetApp, setCurrentRole, showScreen, showWizardStep } from './lib/utils.js';

function initLanding() {
  dom.btnChooseHost.addEventListener('click', () => {
    setCurrentRole('host');
    showScreen('host');
    showWizardStep('host', 1);
  });

  dom.btnChooseViewer.addEventListener('click', () => {
    setCurrentRole('viewer');
    showScreen('viewer');
    showWizardStep('viewer', 1);
  });

  dom.btnHostBackToLanding.addEventListener('click', resetApp);
  dom.btnViewerBackToLanding.addEventListener('click', resetApp);
}

function initDiagnostics() {
  let isOpen = false;

  const appendLog = (message, type = 'info') => {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    dom.diagnosticsLog.appendChild(entry);
    dom.diagnosticsLog.scrollTop = dom.diagnosticsLog.scrollHeight;

    if ((type === 'warn' || type === 'error') && !isOpen) {
      isOpen = true;
      dom.diagnosticsConsole.classList.remove('diagnostics-closed');
    }
  };

  dom.btnToggleDiagnostics.addEventListener('click', () => {
    isOpen = !isOpen;
    dom.diagnosticsConsole.classList.toggle('diagnostics-closed', !isOpen);
  });

  dom.btnClearDiagnostics.addEventListener('click', () => {
    dom.diagnosticsLog.innerHTML = '';
  });

  const nativeLog = console.log.bind(console);
  const nativeWarn = console.warn.bind(console);
  const nativeError = console.error.bind(console);

  const stringifyArgs = (args) =>
    args
      .map((value) => {
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(' ');

  console.log = (...args) => {
    nativeLog(...args);
    appendLog(stringifyArgs(args), 'info');
  };

  console.warn = (...args) => {
    nativeWarn(...args);
    appendLog(stringifyArgs(args), 'warn');
  };

  console.error = (...args) => {
    nativeError(...args);
    appendLog(stringifyArgs(args), 'error');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason);
    appendLog(`Unhandled rejection: ${reason}`, 'error');
  });

  appendLog('Diagnostics console ready.', 'info');
}

function initApp() {
  initLanding();
  initHost();
  initViewer();
  initStream();
  initInvite();
  initChat();
  initAnnotations();
  initDiagnostics();
  resetApp({ preserveRole: false });
  parseInviteFromUrl();
}

initApp();
