export const appEvents = new EventTarget();

export const state = {
  currentRole: null,
  localStream: null,
  peerConnections: new Map(),
  dataChannels: new Map(),
  pendingInvitePeerId: null,
};

export const dom = {
  screens: {
    landing: document.getElementById('landing-screen'),
    host: document.getElementById('host-screen'),
    viewer: document.getElementById('viewer-screen'),
    stream: document.getElementById('stream-screen'),
  },
  hostPanels: {
    1: document.getElementById('panel-host-1'),
    2: document.getElementById('panel-host-2'),
    3: document.getElementById('panel-host-3'),
  },
  hostIndicators: {
    1: document.getElementById('ind-host-1'),
    2: document.getElementById('ind-host-2'),
    3: document.getElementById('ind-host-3'),
  },
  viewerPanels: {
    1: document.getElementById('panel-viewer-1'),
    2: document.getElementById('panel-viewer-2'),
  },
  viewerIndicators: {
    1: document.getElementById('ind-viewer-1'),
    2: document.getElementById('ind-viewer-2'),
  },
  btnChooseHost: document.getElementById('btn-choose-host'),
  btnChooseViewer: document.getElementById('btn-choose-viewer'),
  btnHostBackToLanding: document.getElementById('btn-host-back-to-landing'),
  btnViewerBackToLanding: document.getElementById('btn-viewer-back-to-landing'),
  btnHostCapture: document.getElementById('btn-host-capture'),
  btnCopyHostOffer: document.getElementById('btn-copy-host-offer'),
  btnHostGoTo3: document.getElementById('btn-host-go-to-3'),
  btnHostBackTo1: document.getElementById('btn-host-back-to-1'),
  btnHostBackTo2: document.getElementById('btn-host-back-to-2'),
  btnHostConnect: document.getElementById('btn-host-connect'),
  btnViewerProcessOffer: document.getElementById('btn-viewer-process-offer'),
  btnCopyViewerAnswer: document.getElementById('btn-copy-viewer-answer'),
  btnViewerBackTo1: document.getElementById('btn-viewer-back-to-1'),
  chkHostAudio: document.getElementById('chk-host-audio'),
  txtHostOffer: document.getElementById('txt-host-offer'),
  txtHostAnswer: document.getElementById('txt-host-answer'),
  txtViewerOffer: document.getElementById('txt-viewer-offer'),
  txtViewerAnswer: document.getElementById('txt-viewer-answer'),
  lblViewerStatus: document.getElementById('lbl-viewer-status'),
  streamLayout: document.querySelector('.stream-layout'),
  streamMainArea: document.querySelector('.stream-main-area'),
  streamStatusLabel: document.getElementById('stream-status-label'),
  videoWrapper: document.getElementById('video-wrapper'),
  video: document.getElementById('p2p-video'),
  btnToggleFullscreen: document.getElementById('btn-toggle-fullscreen'),
  btnStopStream: document.getElementById('btn-stop-stream'),
  btnToggleMic: document.getElementById('btn-toggle-mic'),
  btnToggleChat: document.getElementById('btn-toggle-chat'),
  btnToggleAnnotations: document.getElementById('btn-toggle-annotations'),
  viewerStreamSidebar: document.getElementById('viewer-stream-sidebar'),
  viewerChatLog: document.getElementById('viewer-chat-log'),
  viewerChatInput: document.getElementById('viewer-chat-input'),
  btnSendViewerChat: document.getElementById('btn-send-viewer-chat'),
  annotationCanvas: document.getElementById('annotation-canvas'),
  annotationToolbar: document.getElementById('annotation-toolbar'),
  btnDrawMode: document.getElementById('btn-draw-mode'),
  btnEraseMode: document.getElementById('btn-erase-mode'),
  drawColor: document.getElementById('draw-color'),
  btnClearCanvas: document.getElementById('btn-clear-canvas'),
  hostSidebar: document.getElementById('host-stream-sidebar'),
  viewerCount: document.getElementById('viewer-count'),
  viewerList: document.getElementById('viewer-list'),
  btnOpenInviteModal: document.getElementById('btn-open-invite-modal'),
  inviteModal: document.getElementById('invite-modal'),
  btnCloseInviteModal: document.getElementById('btn-close-invite-modal'),
  txtInviteLink: document.getElementById('txt-invite-link'),
  txtInviteKey: document.getElementById('txt-invite-key'),
  txtInviteResponse: document.getElementById('txt-invite-response'),
  btnCopyInviteLink: document.getElementById('btn-copy-invite-link'),
  btnCopyInviteKey: document.getElementById('btn-copy-invite-key'),
  btnConnectInvitedViewer: document.getElementById('btn-connect-invited-viewer'),
  toast: document.getElementById('toast'),
  diagnosticsConsole: document.getElementById('diagnostics-console'),
  btnToggleDiagnostics: document.getElementById('btn-toggle-diagnostics'),
  btnClearDiagnostics: document.getElementById('btn-clear-diagnostics'),
  diagnosticsLog: document.getElementById('diagnostics-log'),
};

export function setCurrentRole(role) {
  state.currentRole = role;
}

export function setLocalStream(stream) {
  state.localStream = stream;
}

export function setPendingInvitePeerId(peerId) {
  state.pendingInvitePeerId = peerId;
}

export function showScreen(screenKey) {
  Object.entries(dom.screens).forEach(([key, screen]) => {
    screen.classList.toggle('active', key === screenKey);
  });
}

export function showWizardStep(role, stepNumber) {
  const panels = role === 'host' ? dom.hostPanels : dom.viewerPanels;
  const indicators = role === 'host' ? dom.hostIndicators : dom.viewerIndicators;

  Object.entries(panels).forEach(([step, panel]) => {
    const numericStep = Number(step);
    panel.classList.toggle('active', numericStep === stepNumber);

    indicators[step].classList.toggle('active', numericStep === stepNumber);
    indicators[step].classList.toggle('completed', numericStep < stepNumber);
  });
}

export function showToast(message, type = 'info') {
  const toastMessage = dom.toast.querySelector('.toast-message');
  const toastIcon = dom.toast.querySelector('.toast-icon');
  const colorMap = {
    info: 'var(--accent-gold)',
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
  };

  toastMessage.textContent = message;
  toastIcon.style.backgroundColor = colorMap[type] || colorMap.info;

  dom.toast.classList.add('active');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    dom.toast.classList.remove('active');
  }, 3600);
}

export async function copyToClipboard(inputEl, buttonEl, successLabel = 'Copied!') {
  if (!inputEl.value) {
    showToast('Nothing to copy yet.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(inputEl.value);
    const original = buttonEl.innerHTML;
    buttonEl.innerHTML = successLabel;
    buttonEl.disabled = true;
    showToast('Copied to clipboard.', 'success');

    window.setTimeout(() => {
      buttonEl.innerHTML = original;
      buttonEl.disabled = false;
    }, 1800);
  } catch (error) {
    console.error('Clipboard write failed', error);
    showToast('Clipboard access failed. Copy manually instead.', 'error');
  }
}

export function registerPeerConnection(peerId, pc) {
  state.peerConnections.set(peerId, pc);
  appEvents.dispatchEvent(new CustomEvent('peerconnectionschange'));
}

export function removePeerConnection(peerId) {
  state.peerConnections.delete(peerId);
  state.dataChannels.delete(peerId);
  appEvents.dispatchEvent(new CustomEvent('peerconnectionschange'));
}

export function registerDataChannel(peerId, channel) {
  state.dataChannels.set(peerId, channel);

  channel.addEventListener('open', () => {
    appEvents.dispatchEvent(new CustomEvent('datachannelopen', { detail: { peerId, channel } }));
  });

  channel.addEventListener('close', () => {
    state.dataChannels.delete(peerId);
    appEvents.dispatchEvent(new CustomEvent('datachannelclose', { detail: { peerId } }));
  });

  channel.addEventListener('message', (event) => {
    appEvents.dispatchEvent(
      new CustomEvent('datachannelmessage', {
        detail: {
          peerId,
          data: event.data,
        },
      }),
    );
  });
}

export function closePendingInviteConnection() {
  const pendingPeerId = state.pendingInvitePeerId;
  if (!pendingPeerId) return;

  const pc = state.peerConnections.get(pendingPeerId);
  if (pc && pc.connectionState !== 'connected') {
    pc.close();
  }

  removePeerConnection(pendingPeerId);
  state.pendingInvitePeerId = null;
}

export function resetApp({ preserveRole = false } = {}) {
  closePendingInviteConnection();

  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => track.stop());
    state.localStream = null;
  }

  state.peerConnections.forEach((pc) => pc.close());
  state.peerConnections.clear();
  state.dataChannels.clear();
  state.pendingInvitePeerId = null;

  dom.video.srcObject = null;
  dom.viewerChatLog.innerHTML = '';
  dom.viewerChatInput.value = '';
  dom.viewerStreamSidebar.classList.remove('is-open');
  dom.streamMainArea.classList.remove('chat-open', 'host-mode', 'viewer-mode');
  dom.annotationToolbar.classList.add('hidden');
  dom.annotationCanvas.classList.remove('is-active');
  dom.btnToggleAnnotations.classList.remove('is-active', 'role-hidden');
  dom.btnToggleChat.classList.remove('is-active');
  dom.btnToggleMic.classList.remove('is-active');
  dom.annotationCanvas.width = 0;
  dom.annotationCanvas.height = 0;
  dom.inviteModal.classList.remove('active');
  dom.hostSidebar.classList.remove('is-visible');
  dom.streamLayout.classList.remove('has-host-sidebar');
  dom.txtHostOffer.value = '';
  dom.txtHostAnswer.value = '';
  dom.txtViewerOffer.value = '';
  dom.txtViewerAnswer.value = '';
  dom.txtInviteLink.value = '';
  dom.txtInviteKey.value = '';
  dom.txtInviteResponse.value = '';
  dom.lblViewerStatus.textContent = 'Awaiting connection from host...';
  dom.streamStatusLabel.textContent = 'Waiting for a secure direct stream';

  showWizardStep('host', 1);
  showWizardStep('viewer', 1);
  showScreen('landing');

  if (!preserveRole) {
    state.currentRole = null;
  }

  appEvents.dispatchEvent(new CustomEvent('peerconnectionschange'));
  appEvents.dispatchEvent(new CustomEvent('appreset'));
}
