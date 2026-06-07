import { decodeSessionKey, encodeSessionKey } from '../lib/signaling.js';
import { initPeerConnection, registerOutboundDataChannel, waitForIceCandidates } from '../lib/rtc.js';
import {
  closePendingInviteConnection,
  copyToClipboard,
  dom,
  setPendingInvitePeerId,
  showToast,
  state,
} from '../lib/utils.js';

async function openInviteModal() {
  if (!state.localStream) {
    showToast('Start sharing your screen before inviting another viewer.', 'error');
    return;
  }

  dom.btnOpenInviteModal.disabled = true;
  dom.btnOpenInviteModal.textContent = 'Generating invite...';

  try {
    closePendingInviteConnection();

    const peerId = `peer-${Math.random().toString(36).slice(2, 8)}`;
    setPendingInvitePeerId(peerId);

    const pc = initPeerConnection(peerId);
    const channel = pc.createDataChannel('infinity-cast-data');
    registerOutboundDataChannel(peerId, channel);

    state.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, state.localStream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceCandidates(pc);

    const inviteKey = await encodeSessionKey(peerId, pc.localDescription);
    const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${inviteKey}`;

    dom.txtInviteLink.value = inviteLink;
    dom.txtInviteKey.value = inviteKey;
    dom.txtInviteResponse.value = '';
    dom.inviteModal.classList.add('active');
    showToast('Invite key ready to share.', 'success');
  } catch (error) {
    console.error('Invite generation failed', error);
    showToast('Invite generation failed.', 'error');
  } finally {
    dom.btnOpenInviteModal.disabled = false;
    dom.btnOpenInviteModal.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="20" y1="8" x2="20" y2="14"></line>
        <line x1="23" y1="11" x2="17" y2="11"></line>
      </svg>
      Invite Viewer
    `;
  }
}

async function connectInvitedViewer() {
  const responseKey = dom.txtInviteResponse.value.trim();
  if (!responseKey) {
    showToast('Paste the viewer response key first.', 'error');
    return;
  }

  try {
    const decoded = await decodeSessionKey(responseKey);

    if (decoded.id !== state.pendingInvitePeerId) {
      throw new Error('Response key does not match the pending invite.');
    }

    const pc = state.peerConnections.get(decoded.id);
    if (!pc) {
      throw new Error('Pending invite session expired.');
    }

    await pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
    dom.inviteModal.classList.remove('active');
    setPendingInvitePeerId(null);
    showToast('Connecting invited viewer...', 'info');
  } catch (error) {
    console.error('Failed to connect invited viewer', error);
    showToast(error.message || 'Viewer response key is invalid.', 'error');
  }
}

export function initInvite() {
  dom.btnOpenInviteModal.addEventListener('click', openInviteModal);
  dom.btnCloseInviteModal.addEventListener('click', () => {
    closePendingInviteConnection();
    dom.inviteModal.classList.remove('active');
  });
  dom.btnCopyInviteLink.addEventListener('click', () =>
    copyToClipboard(dom.txtInviteLink, dom.btnCopyInviteLink),
  );
  dom.btnCopyInviteKey.addEventListener('click', () =>
    copyToClipboard(dom.txtInviteKey, dom.btnCopyInviteKey),
  );
  dom.btnConnectInvitedViewer.addEventListener('click', connectInvitedViewer);
}
