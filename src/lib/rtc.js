import {
  appEvents,
  dom,
  registerDataChannel,
  registerPeerConnection,
  removePeerConnection,
  showScreen,
  showToast,
  state,
} from './utils.js';

export const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export function registerOutboundDataChannel(peerId, channel) {
  registerDataChannel(peerId, channel);
  channel.addEventListener('open', () => {
    console.log(`Data channel opened for [${peerId}]`);
  });
}

export function initPeerConnection(peerId) {
  const pc = new RTCPeerConnection(rtcConfig);
  registerPeerConnection(peerId, pc);

  pc.addEventListener('connectionstatechange', () => {
    const { connectionState } = pc;
    console.log(`Peer [${peerId}] state: ${connectionState}`);

    appEvents.dispatchEvent(
      new CustomEvent('peerconnectionstatechange', {
        detail: { peerId, connectionState },
      }),
    );

    if (connectionState === 'connected') {
      showScreen('stream');
      showToast(`Connected to ${peerId}.`, 'success');

      if (state.currentRole === 'host') {
        dom.video.srcObject = state.localStream;
        dom.video.muted = true;
      }
    }

    if (connectionState === 'disconnected') {
      showToast(`Peer ${peerId} disconnected.`, 'warning');
    }

    if (connectionState === 'failed' || connectionState === 'closed') {
      removePeerConnection(peerId);
    }
  });

  pc.addEventListener('track', (event) => {
    if (event.streams[0]) {
      dom.video.srcObject = event.streams[0];
      dom.video.muted = false;
    }
  });

  pc.addEventListener('datachannel', (event) => {
    registerDataChannel(peerId, event.channel);
  });

  return pc;
}

export function waitForIceCandidates(pc, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    let isResolved = false;
    const finalize = () => {
      if (isResolved) return;
      isResolved = true;
      pc.removeEventListener('icecandidate', handleIceCandidate);
      pc.removeEventListener('icegatheringstatechange', handleIceStateChange);
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      console.warn('ICE gathering timed out, continuing with partial candidates.');
      finalize();
    }, timeoutMs);

    const handleIceCandidate = (event) => {
      if (!event.candidate) {
        finalize();
      }
    };

    const handleIceStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        finalize();
      }
    };

    pc.addEventListener('icecandidate', handleIceCandidate);
    pc.addEventListener('icegatheringstatechange', handleIceStateChange);
  });
}
