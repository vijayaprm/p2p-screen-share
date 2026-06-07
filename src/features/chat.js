import { appEvents, dom, showToast, state } from '../lib/utils.js';

function renderMessage({ sender, text, peerId, tone }) {
  const item = document.createElement('div');
  item.className = `chat-message ${tone}`;
  item.innerHTML = `
    <span class="chat-message-meta">${sender}${peerId ? ` • ${peerId}` : ''}</span>
    <p>${text}</p>
  `;
  dom.viewerChatLog.appendChild(item);
  dom.viewerChatLog.scrollTop = dom.viewerChatLog.scrollHeight;
}

function toggleChat() {
  const isOpen = dom.viewerStreamSidebar.classList.toggle('is-open');
  dom.streamMainArea.classList.toggle('chat-open', isOpen);
  dom.btnToggleChat.classList.toggle('is-active', isOpen);
}

function sendChatMessage() {
  const message = dom.viewerChatInput.value.trim();
  if (!message) return;

  const connectedChannels = [...state.dataChannels.entries()].filter(
    ([, channel]) => channel.readyState === 'open',
  );

  if (connectedChannels.length === 0) {
    showToast('No active chat channel is connected yet.', 'error');
    return;
  }

  const payload = JSON.stringify({
    type: 'chat',
    text: message,
    senderRole: state.currentRole,
    sentAt: Date.now(),
  });

  connectedChannels.forEach(([, channel]) => {
    channel.send(payload);
  });

  renderMessage({
    sender: state.currentRole === 'host' ? 'Host' : 'You',
    text: message,
    tone: 'local',
    peerId: state.currentRole === 'host' && connectedChannels.length > 1 ? 'broadcast' : '',
  });

  dom.viewerChatInput.value = '';
}

function handleDataMessage(event) {
  try {
    const payload = JSON.parse(event.detail.data);
    if (payload.type !== 'chat') return;

    dom.viewerStreamSidebar.classList.add('is-open');
    dom.streamMainArea.classList.add('chat-open');
    dom.btnToggleChat.classList.add('is-active');
    renderMessage({
      sender: payload.senderRole === 'host' ? 'Host' : 'Viewer',
      text: payload.text,
      tone: 'remote',
      peerId: event.detail.peerId,
    });
  } catch {
    console.log('Received non-JSON data channel message.');
  }
}

export function initChat() {
  dom.btnToggleChat.addEventListener('click', toggleChat);
  dom.btnSendViewerChat.addEventListener('click', sendChatMessage);
  dom.viewerChatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendChatMessage();
    }
  });

  appEvents.addEventListener('datachannelmessage', handleDataMessage);
  appEvents.addEventListener('appreset', () => {
    dom.viewerStreamSidebar.classList.remove('is-open');
    dom.streamMainArea.classList.remove('chat-open');
    dom.btnToggleChat.classList.remove('is-active');
  });
}
