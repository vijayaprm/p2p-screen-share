import { decodeSessionKey, encodeSessionKey } from '../lib/signaling.js';
import { initPeerConnection, registerOutboundDataChannel, waitForIceCandidates } from '../lib/rtc.js';
import {
  copyToClipboard,
  dom,
  resetApp,
  setCurrentRole,
  setLocalStream,
  showScreen,
  showToast,
  showWizardStep,
  state,
} from '../lib/utils.js';

function buildCaptureConstraints(shareAudio) {
  return {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: shareAudio
      ? {
          echoCancellation: true,
          noiseSuppression: true,
        }
      : false,
  };
}

async function captureDisplay() {
  const shareAudio = dom.chkHostAudio.checked;

  try {
    return await navigator.mediaDevices.getDisplayMedia(buildCaptureConstraints(shareAudio));
  } catch (error) {
    if (!shareAudio) throw error;
    showToast('Audio capture was unavailable. Falling back to video only.', 'warning');
    return navigator.mediaDevices.getDisplayMedia(buildCaptureConstraints(false));
  }
}

async function handleCapture() {
  dom.btnHostCapture.disabled = true;
  dom.btnHostCapture.textContent = 'Capturing screen...';

  try {
    const stream = await captureDisplay();
    setCurrentRole('host');
    setLocalStream(stream);

    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        showToast('Screen sharing stopped.', 'warning');
        resetApp();
      });
    });

    const peerId = `peer-${Math.random().toString(36).slice(2, 8)}`;
    const pc = initPeerConnection(peerId);
    const channel = pc.createDataChannel('infinity-cast-data');
    registerOutboundDataChannel(peerId, channel);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    dom.btnHostCapture.textContent = 'Gathering network routes...';
    await waitForIceCandidates(pc);

    dom.txtHostOffer.value = await encodeSessionKey(peerId, pc.localDescription);
    showWizardStep('host', 2);
    showToast('Host key generated.', 'success');
  } catch (error) {
    console.error('Screen capture failed', error);
    showToast(error.message || 'Screen capture failed.', 'error');
  } finally {
    dom.btnHostCapture.disabled = false;
    dom.btnHostCapture.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M12 17v4M8 21h8"></path>
      </svg>
      Select Screen & Generate Key
    `;
  }
}

async function connectHostToViewer() {
  const answerValue = dom.txtHostAnswer.value.trim();
  if (!answerValue) {
    showToast('Paste the response key first.', 'error');
    return;
  }

  try {
    const decoded = await decodeSessionKey(answerValue);
    const pc = state.peerConnections.get(decoded.id);

    if (!pc) {
      throw new Error('Connection session ID was not found.');
    }

    await pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));
    dom.video.srcObject = state.localStream;
    dom.video.muted = true;
    showToast('Connecting to viewer...', 'info');
  } catch (error) {
    console.error('Invalid response key', error);
    showToast(error.message || 'Response key could not be applied.', 'error');
  }
}

export function initHost() {
  dom.btnHostCapture.addEventListener('click', handleCapture);
  dom.btnCopyHostOffer.addEventListener('click', () => copyToClipboard(dom.txtHostOffer, dom.btnCopyHostOffer));
  dom.btnHostGoTo3.addEventListener('click', () => {
    if (!dom.txtHostOffer.value) {
      showToast('Generate a host key first.', 'error');
      return;
    }

    showWizardStep('host', 3);
  });
  dom.btnHostBackTo1.addEventListener('click', () => {
    resetApp({ preserveRole: true });
    setCurrentRole('host');
    showScreen('host');
    showWizardStep('host', 1);
  });
  dom.btnHostBackTo2.addEventListener('click', () => showWizardStep('host', 2));
  dom.btnHostConnect.addEventListener('click', connectHostToViewer);
}
