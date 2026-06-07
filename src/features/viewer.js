import { decodeSessionKey, encodeSessionKey } from '../lib/signaling.js';
import { initPeerConnection, waitForIceCandidates } from '../lib/rtc.js';
import {
  copyToClipboard,
  dom,
  resetApp,
  setCurrentRole,
  showScreen,
  showToast,
  showWizardStep,
} from '../lib/utils.js';

async function processOffer() {
  const offerValue = dom.txtViewerOffer.value.trim();
  if (!offerValue) {
    showToast('Paste the host key first.', 'error');
    return;
  }

  dom.btnViewerProcessOffer.disabled = true;
  dom.btnViewerProcessOffer.textContent = 'Generating response...';

  try {
    const decoded = await decodeSessionKey(offerValue);
    const pc = initPeerConnection(decoded.id);

    await pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceCandidates(pc);

    dom.txtViewerAnswer.value = await encodeSessionKey(decoded.id, pc.localDescription);
    dom.lblViewerStatus.textContent = 'Response ready. Send it back to the host.';
    showWizardStep('viewer', 2);
    showToast('Response key generated.', 'success');
  } catch (error) {
    console.error('Failed to process host key', error);
    showToast(error.message || 'Host key could not be processed.', 'error');
  } finally {
    dom.btnViewerProcessOffer.disabled = false;
    dom.btnViewerProcessOffer.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <path d="M12 2v20M17 5l-5-5-5 5M5 19l5 5 5-5"></path>
      </svg>
      Generate Response Key
    `;
  }
}

export function parseInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite');
  if (!invite) return;

  setCurrentRole('viewer');
  showScreen('viewer');
  showWizardStep('viewer', 1);
  dom.txtViewerOffer.value = invite;
  showToast('Invite link detected. Generate your response key to join.', 'success');

  const url = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, '', url);
}

export function initViewer() {
  dom.btnViewerProcessOffer.addEventListener('click', processOffer);
  dom.btnCopyViewerAnswer.addEventListener('click', () =>
    copyToClipboard(dom.txtViewerAnswer, dom.btnCopyViewerAnswer),
  );
  dom.btnViewerBackTo1.addEventListener('click', () => {
    resetApp({ preserveRole: true });
    setCurrentRole('viewer');
    showScreen('viewer');
    showWizardStep('viewer', 1);
  });
}
