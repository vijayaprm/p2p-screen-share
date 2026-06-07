import { appEvents, dom, resetApp, showToast, state } from '../lib/utils.js';

function fullscreenMarkup(isActive) {
  if (isActive) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"></path>
      </svg>
      <span>Exit Fullscreen</span>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>
    <span>Fullscreen</span>
  `;
}

function renderViewerList() {
  dom.viewerCount.textContent = String(state.peerConnections.size);
  dom.viewerList.innerHTML = '';

  if (state.peerConnections.size === 0) {
    dom.viewerList.innerHTML = '<div class="viewer-empty-state">No active viewers yet. Share an invite to start streaming.</div>';
    return;
  }

  state.peerConnections.forEach((pc, peerId) => {
    const card = document.createElement('div');
    const isConnected = pc.connectionState === 'connected';

    card.className = 'viewer-card';
    card.innerHTML = `
      <div class="viewer-info">
        <span class="viewer-id">${peerId}</span>
        <span class="viewer-status ${isConnected ? 'connected' : 'connecting'}">
          <span class="status-dot"></span>
          ${isConnected ? 'Connected' : 'Connecting'}
        </span>
      </div>
      <button class="btn-disconnect-viewer" type="button" data-peer-id="${peerId}">
        Disconnect
      </button>
    `;

    card.querySelector('button').addEventListener('click', () => {
      pc.close();
      showToast(`Disconnected ${peerId}.`, 'info');
    });

    dom.viewerList.appendChild(card);
  });
}

function handleConnectionChange(event) {
  const { connectionState } = event.detail;

  if (state.currentRole === 'host') {
    dom.hostSidebar.classList.add('is-visible');
    dom.streamLayout.classList.add('has-host-sidebar');
    dom.streamMainArea.classList.add('host-mode');
    dom.streamMainArea.classList.remove('viewer-mode');
    dom.streamStatusLabel.textContent =
      connectionState === 'connected' ? 'Your direct stream is live' : 'Preparing your direct stream';
  } else if (state.currentRole === 'viewer') {
    dom.hostSidebar.classList.remove('is-visible');
    dom.streamLayout.classList.remove('has-host-sidebar');
    dom.streamMainArea.classList.add('viewer-mode');
    dom.streamMainArea.classList.remove('host-mode');
    dom.streamStatusLabel.textContent =
      connectionState === 'connected' ? 'Direct secure stream active' : 'Connecting to host';
    dom.lblViewerStatus.textContent =
      connectionState === 'connected' ? 'Connected. The stream is live.' : dom.lblViewerStatus.textContent;
  }

  updateRoleControls();
  renderViewerList();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    dom.videoWrapper.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function handleMicToggle() {
  const audioTracks = state.localStream?.getAudioTracks() || [];
  if (audioTracks.length === 0) {
    showToast('No shared audio track is active in this session.', 'warning');
    return;
  }

  const nextEnabled = !audioTracks[0].enabled;
  audioTracks.forEach((track) => {
    track.enabled = nextEnabled;
  });

  dom.btnToggleMic.classList.toggle('is-active', nextEnabled);
  showToast(nextEnabled ? 'Microphone audio enabled.' : 'Microphone audio muted.', 'info');
}

function updateRoleControls() {
  const isHost = state.currentRole === 'host';
  dom.btnToggleAnnotations.classList.toggle('role-hidden', !isHost);
  dom.annotationToolbar.classList.toggle('role-hidden', !isHost);
  dom.annotationCanvas.classList.toggle('role-hidden', !isHost);

  if (!isHost) {
    dom.annotationToolbar.classList.add('hidden');
    dom.annotationCanvas.classList.remove('is-active');
    dom.btnToggleAnnotations.classList.remove('is-active');
  }
}

export function initStream() {
  dom.btnToggleFullscreen.addEventListener('click', toggleFullscreen);
  dom.btnStopStream.addEventListener('click', () => resetApp());
  dom.btnToggleMic.addEventListener('click', handleMicToggle);

  document.addEventListener('fullscreenchange', () => {
    dom.btnToggleFullscreen.innerHTML = fullscreenMarkup(Boolean(document.fullscreenElement));
  });

  dom.btnToggleFullscreen.innerHTML = fullscreenMarkup(false);

  appEvents.addEventListener('peerconnectionstatechange', handleConnectionChange);
  appEvents.addEventListener('peerconnectionschange', renderViewerList);
  appEvents.addEventListener('appreset', () => {
    updateRoleControls();
    renderViewerList();
  });

  updateRoleControls();
}
