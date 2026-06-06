// InfinityCast - Serverless Peer-to-Peer Screen Sharing
// Powered by WebRTC Manual Signaling

// --- DOM Navigation & State Management ---
const screens = {
    landing: document.getElementById('landing-screen'),
    host: document.getElementById('host-screen'),
    viewer: document.getElementById('viewer-screen'),
    stream: document.getElementById('stream-screen')
};

// Host wizard panels & indicators
const hostPanels = {
    1: document.getElementById('panel-host-1'),
    2: document.getElementById('panel-host-2'),
    3: document.getElementById('panel-host-3')
};
const hostIndicators = {
    1: document.getElementById('ind-host-1'),
    2: document.getElementById('ind-host-2'),
    3: document.getElementById('ind-host-3')
};

// Viewer wizard panels & indicators
const viewerPanels = {
    1: document.getElementById('panel-viewer-1'),
    2: document.getElementById('panel-viewer-2')
};
const viewerIndicators = {
    1: document.getElementById('ind-viewer-1'),
    2: document.getElementById('ind-viewer-2')
};

// Active state values
let currentRole = null; // 'host' | 'viewer' | null
let localStream = null;
let peerConnections = new Map(); // Store multiple peer connections
let dataChannel = null;
let hostKey = null; // Store the host key for multiple viewers

// WebRTC Configuration - Public Google STUN servers
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

// Utility function to switch main screen views
function showScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if (key === screenKey) {
            screens[key].classList.add('active');
        } else {
            screens[key].classList.remove('active');
        }
    });
}

// Utility function to switch Wizard Steps
function showWizardStep(role, stepNumber) {
    const panels = role === 'host' ? hostPanels : viewerPanels;
    const indicators = role === 'host' ? hostIndicators : viewerIndicators;

    Object.keys(panels).forEach(step => {
        if (parseInt(step) === stepNumber) {
            panels[step].classList.add('active');
            indicators[step].classList.add('active');
            indicators[step].classList.remove('completed');
        } else {
            panels[step].classList.remove('active');
            if (parseInt(step) < stepNumber) {
                indicators[step].classList.add('completed');
                indicators[step].classList.remove('active');
            } else {
                indicators[step].classList.remove('active', 'completed');
            }
        }
    });
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMsg = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    toastMsg.textContent = message;
    
    // Set color based on type
    if (type === 'success') {
        toastIcon.style.backgroundColor = 'var(--color-success)';
    } else if (type === 'error') {
        toastIcon.style.backgroundColor = 'var(--color-danger)';
    } else {
        toastIcon.style.backgroundColor = 'var(--accent-indigo)';
    }

    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// Copy to Clipboard Utility
async function copyToClipboard(elementId, buttonId) {
    const textarea = document.getElementById(elementId);
    const button = document.getElementById(buttonId);
    
    if (!textarea.value) {
        showToast("No key to copy yet!", "error");
        return;
    }

    try {
        await navigator.clipboard.writeText(textarea.value);
        showToast("Key copied to clipboard!", "success");
        
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        button.style.backgroundColor = 'var(--color-success)';
        button.style.borderColor = 'var(--color-success)';
        button.style.color = '#ffffff';

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.backgroundColor = '';
            button.style.borderColor = '';
            button.style.color = '';
        }, 2000);
    } catch (err) {
        showToast("Failed to copy. Please select and copy manually.", "error");
    }
}

// --- Landing Screen Actions ---
document.getElementById('btn-choose-host').addEventListener('click', () => {
    currentRole = 'host';
    showScreen('host');
    showWizardStep('host', 1);
});

document.getElementById('btn-choose-viewer').addEventListener('click', () => {
    currentRole = 'viewer';
    showScreen('viewer');
    showWizardStep('viewer', 1);
});

// Back to Home actions
document.getElementById('btn-host-back-to-landing').addEventListener('click', () => {
    resetApp();
});
document.getElementById('btn-viewer-back-to-landing').addEventListener('click', () => {
    resetApp();
});

// --- WebRTC Logic ---

// Helper to compress and encode key (SDP + peerId)
async function encodeSessionKey(id, sdpObj) {
    const data = { id, sdp: sdpObj };
    const str = JSON.stringify(data);
    
    const stream = new Blob([str]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));
    const response = new Response(compressedStream);
    const buffer = await response.arrayBuffer();
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Helper to decode and decompress key
async function decodeSessionKey(hashStr) {
    let b64 = hashStr.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
        b64 += '=';
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));
    const response = new Response(decompressedStream);
    const jsonStr = await response.text();
    return JSON.parse(jsonStr);
}

// Helper function to wait for ICE candidates to gather completely or timeout at 1.5s
function waitForIceCandidates(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
            resolve();
            return;
        }

        let resolved = false;
        const done = () => {
            if (resolved) return;
            resolved = true;
            pc.removeEventListener('icecandidate', onIceCandidate);
            pc.removeEventListener('icegatheringstatechange', onGatheringStateChange);
            resolve();
        };

        // 1.5-second timeout fallback ensures key generates promptly even under tricky networking
        const timeout = setTimeout(() => {
            console.warn("ICE candidate gathering hit 1.5s timeout. Proceeding with currently gathered candidates.");
            done();
        }, 1500);

        function onIceCandidate(event) {
            if (!event.candidate) {
                console.log("ICE gathering complete (null candidate).");
                clearTimeout(timeout);
                done();
            }
        }

        function onGatheringStateChange() {
            if (pc.iceGatheringState === 'complete') {
                console.log("ICE gathering complete (state change).");
                clearTimeout(timeout);
                done();
            }
        }

        pc.addEventListener('icecandidate', onIceCandidate);
        pc.addEventListener('icegatheringstatechange', onGatheringStateChange);
    });
}

// General RTCPeerConnection Initialization
function initPeerConnection(peerId) {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(peerId, pc);

    // Monitor peer connection state changes
    pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`P2P Connection State for [${peerId}]: ${state}`);
        
        if (state === 'connected') {
            showToast(`Direct connection with ${peerId} established!`, "success");
            
            // Switch to stream screen if not already there
            if (!screens.stream.classList.contains('active')) {
                showScreen('stream');
                if (currentRole === 'host') {
                    document.querySelector('.stream-layout').classList.add('has-sidebar');
                    const videoElement = document.getElementById('p2p-video');
                    videoElement.srcObject = localStream;
                    videoElement.muted = true;
                } else {
                    document.querySelector('.stream-layout').classList.remove('has-sidebar');
                }
            }
            
            if (currentRole === 'host') {
                renderViewerList();
            } else {
                document.getElementById('stream-status-label').textContent = "Direct Secure Stream Active";
            }
        }
        
        if (state === 'disconnected') {
            showToast(`Peer ${peerId} disconnected.`, "info");
            if (currentRole === 'host') {
                renderViewerList();
            } else {
                resetApp();
            }
        }

        if (state === 'failed' || state === 'closed') {
            console.log(`Connection for [${peerId}] failed or closed.`);
            if (currentRole === 'host') {
                peerConnections.delete(peerId);
                renderViewerList();
            } else {
                showToast("Connection failed to establish.", "error");
                resetApp();
            }
        }
    };

    // Track handler for the Viewer
    pc.ontrack = (event) => {
        console.log(`Remote track received from [${peerId}] — storing stream, waiting for connection.`);
        const videoElement = document.getElementById('p2p-video');
        if (event.streams && event.streams[0]) {
            videoElement.srcObject = event.streams[0];
        }
    };

    return pc;
}

// --- Host Flow Actions ---

// Host Step 1: Capture Screen & Create Offer
document.getElementById('btn-host-capture').addEventListener('click', async () => {
    const captureButton = document.getElementById('btn-host-capture');
    captureButton.disabled = true;
    captureButton.innerHTML = `
        <div class="spinner" style="border-top-color: #ffffff; width: 16px; height: 16px; margin-right: 8px; display: inline-block;"></div>
        Capturing screen...
    `;

    try {
        // 1. Request Display Media (with optional audio)
        const shareAudio = document.getElementById('chk-host-audio').checked;
        const constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: shareAudio ? {
                echoCancellation: true,
                noiseSuppression: true
            } : false
        };

        try {
            localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
        } catch (err) {
            if (shareAudio) {
                console.warn("Screen capture with audio failed. Retrying with video only.", err);
                showToast("Audio capture failed. Falling back to video-only.", "warning");
                localStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                });
            } else {
                throw err;
            }
        }

        // Listen for user stopping display share through standard browser UI
        localStream.getVideoTracks().forEach(track => {
            track.onended = () => {
                showToast("Screen sharing stopped.", "info");
                resetApp();
            };
        });

        // 2. Initialize the first Peer Connection with a random ID
        const firstPeerId = 'peer-' + Math.random().toString(36).substring(2, 8);
        const pc = initPeerConnection(firstPeerId);

        // Create standard WebRTC Data Channel to enforce active transport path
        const dc = pc.createDataChannel('infinity-cast-data');
        dc.onopen = () => console.log(`Data channel opened on Host for [${firstPeerId}].`);
        dc.onmessage = (e) => console.log(`Data Channel Msg from [${firstPeerId}]: ${e.data}`);

        // 3. Add Screen Track to PeerConnection
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        // 4. Create local SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 5. Wait for ICE candidate gathering
        captureButton.innerHTML = `
            <div class="spinner" style="border-top-color: #ffffff; width: 16px; height: 16px; margin-right: 8px; display: inline-block;"></div>
            Gathering network routes...
        `;
        await waitForIceCandidates(pc);

        // 6. Serialize, compress, and display Host Key
        const compressedKey = await encodeSessionKey(firstPeerId, pc.localDescription);
        document.getElementById('txt-host-offer').value = compressedKey;

        showToast("Host Key successfully generated!", "success");
        showWizardStep('host', 2);

    } catch (err) {
        console.error("Screen capture failed:", err);
        showToast(`Capture failed: ${err.message || err}`, "error");
    } finally {
        captureButton.disabled = false;
        captureButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <path d="M12 17v4M8 21h8"/>
            </svg>
            Select Screen & Generate Key
        `;
    }
});

// Copy Host Offer
document.getElementById('btn-copy-host-offer').addEventListener('click', () => {
    copyToClipboard('txt-host-offer', 'btn-copy-host-offer');
});

// Host Navigation Step 2 -> Step 3
document.getElementById('btn-host-go-to-3').addEventListener('click', () => {
    if (!document.getElementById('txt-host-offer').value) {
        showToast("Please generate a key first!", "error");
        return;
    }
    showWizardStep('host', 3);
});

// Back buttons for Host steps
document.getElementById('btn-host-back-to-1').addEventListener('click', () => {
    if (confirm("Going back will reset your current screen share. Continue?")) {
        resetApp();
        showWizardStep('host', 1);
    }
});

document.getElementById('btn-host-back-to-2').addEventListener('click', () => {
    showWizardStep('host', 2);
});

// Host Step 3: Parse Response Key (Answer) and Connect
document.getElementById('btn-host-connect').addEventListener('click', async () => {
    const answerInput = document.getElementById('txt-host-answer').value.trim();
    if (!answerInput) {
        showToast("Please paste the Response Key from the viewer first.", "error");
        return;
    }

    try {
        const decoded = await decodeSessionKey(answerInput);
        if (!peerConnections.has(decoded.id)) {
            showToast("Connection Session ID mismatch or expired.", "error");
            return;
        }

        const pc = peerConnections.get(decoded.id);
        const answerDesc = new RTCSessionDescription(decoded.sdp);
        
        showToast("Connecting directly to peer...", "info");
        await pc.setRemoteDescription(answerDesc);
        
        // Host screen starts showing local preview as confirmation
        const videoElement = document.getElementById('p2p-video');
        videoElement.srcObject = localStream;
        videoElement.muted = true; // Mute preview to prevent loopback/echo

    } catch (err) {
        console.error("Invalid Response Key parsed:", err);
        showToast("Invalid Response Key format. Please ensure you copied the entire key text.", "error");
    }
});

// --- Viewer Flow Actions ---

// Viewer Step 1: Parse Host Key & Generate Answer
document.getElementById('btn-viewer-process-offer').addEventListener('click', async () => {
    const offerInput = document.getElementById('txt-viewer-offer').value.trim();
    if (!offerInput) {
        showToast("Please paste the Host Key first.", "error");
        return;
    }

    const processBtn = document.getElementById('btn-viewer-process-offer');
    processBtn.disabled = true;
    processBtn.innerHTML = `
        <div class="spinner" style="border-top-color: #ffffff; width: 16px; height: 16px; margin-right: 8px; display: inline-block;"></div>
        Generating Response...
    `;

    try {
        const decoded = await decodeSessionKey(offerInput);
        const hostPeerId = decoded.id;
        const offerDesc = new RTCSessionDescription(decoded.sdp);

        // 1. Initialize PeerConnection
        const pc = initPeerConnection(hostPeerId);

        // Data channel listener on Viewer
        pc.ondatachannel = (event) => {
            const receiveChannel = event.channel;
            receiveChannel.onopen = () => console.log(`Data channel opened on Viewer with Host [${hostPeerId}].`);
            receiveChannel.onmessage = (e) => console.log(`Data Msg from Host: ${e.data}`);
        };

        // 2. Set Host Offer as Remote Description
        await pc.setRemoteDescription(offerDesc);

        // 3. Create local Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // 4. Wait for ICE candidate gathering
        await waitForIceCandidates(pc);

        // 5. Display Response Key (Answer)
        const compressedAnswer = await encodeSessionKey(hostPeerId, pc.localDescription);
        document.getElementById('txt-viewer-answer').value = compressedAnswer;

        showToast("Response Key successfully generated!", "success");
        showWizardStep('viewer', 2);

    } catch (err) {
        console.error("Failed to process Host Key:", err);
        showToast(`Failed to parse: ${err.message || err}`, "error");
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M12 2v20M17 5l-5-5-5 5M5 19l5 5 5-5"/>
            </svg>
            Generate Response Key
        `;
    }
});

// Copy Viewer Answer
document.getElementById('btn-copy-viewer-answer').addEventListener('click', () => {
    copyToClipboard('txt-viewer-answer', 'btn-copy-viewer-answer');
});

// Back button for Viewer Step 2
document.getElementById('btn-viewer-back-to-1').addEventListener('click', () => {
    if (confirm("Going back will reset the current connection attempt. Continue?")) {
        resetApp();
        showWizardStep('viewer', 1);
    }
});

// --- Stream Interface Controls ---

// Fullscreen controls
document.getElementById('btn-toggle-fullscreen').addEventListener('click', () => {
    const videoWrapper = document.getElementById('video-wrapper');
    if (!document.fullscreenElement) {
        if (videoWrapper.requestFullscreen) {
            videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) { // Safari support
            videoWrapper.webkitRequestFullscreen();
        }
        document.getElementById('btn-toggle-fullscreen').innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/>
            </svg>
            <span>Exit Fullscreen</span>
        `;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        document.getElementById('btn-toggle-fullscreen').innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <span>Fullscreen</span>
        `;
    }
});

// Escape key or browser exit from fullscreen handler
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.getElementById('btn-toggle-fullscreen').innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <span>Fullscreen</span>
        `;
    }
});

// Stop Stream and Reset App
document.getElementById('btn-stop-stream').addEventListener('click', () => {
    if (confirm("Disconnect and close this session?")) {
        resetApp();
    }
});

// --- Stream Manager Sidebar & Invite Modal Logic ---
const inviteModal = document.getElementById('invite-modal');
const btnOpenInviteModal = document.getElementById('btn-open-invite-modal');
const btnCloseInviteModal = document.getElementById('btn-close-invite-modal');
const btnCopyInviteLink = document.getElementById('btn-copy-invite-link');
const btnCopyInviteKey = document.getElementById('btn-copy-invite-key');
const btnConnectInvitedViewer = document.getElementById('btn-connect-invited-viewer');

const txtInviteLink = document.getElementById('txt-invite-link');
const txtInviteKey = document.getElementById('txt-invite-key');
const txtInviteResponse = document.getElementById('txt-invite-response');

let pendingInvitePeerId = null;

// Open Invite Modal
btnOpenInviteModal.addEventListener('click', async () => {
    if (!localStream) {
        showToast("No active local stream.", "error");
        return;
    }
    
    btnOpenInviteModal.disabled = true;
    btnOpenInviteModal.innerHTML = 'Generating Key...';
    
    try {
        // Generate a new peer ID for this invited peer
        const invitedPeerId = 'peer-' + Math.random().toString(36).substring(2, 8);
        pendingInvitePeerId = invitedPeerId;
        
        // Initialize PeerConnection
        const pc = initPeerConnection(invitedPeerId);
        
        // Create Data Channel
        const dc = pc.createDataChannel('infinity-cast-data');
        dc.onopen = () => console.log(`Data channel opened on Host for [${invitedPeerId}].`);
        dc.onmessage = (e) => console.log(`Data Channel Msg from [${invitedPeerId}]: ${e.data}`);
        
        // Add local stream tracks
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
        
        // Create offer & set description
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Wait for ICE candidates
        await waitForIceCandidates(pc);
        
        // Encode invitation key
        const newKey = await encodeSessionKey(invitedPeerId, pc.localDescription);
        
        // Set link and key textarea values
        const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${newKey}`;
        txtInviteLink.value = inviteLink;
        txtInviteKey.value = newKey;
        txtInviteResponse.value = '';
        
        // Open the modal
        inviteModal.classList.add('active');
        showToast("Invitation key ready!", "success");
    } catch (err) {
        console.error("Failed to generate invite:", err);
        showToast("Failed to generate invitation key.", "error");
        pendingInvitePeerId = null;
    } finally {
        btnOpenInviteModal.disabled = false;
        btnOpenInviteModal.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" style="margin-right: 4px;">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Invite Viewer
        `;
    }
});

// Close Invite Modal
btnCloseInviteModal.addEventListener('click', () => {
    // If we close the modal without connecting, we should cleanup the pending connection
    if (pendingInvitePeerId && peerConnections.has(pendingInvitePeerId)) {
        const pc = peerConnections.get(pendingInvitePeerId);
        // Only close it if it's still in connecting state
        if (pc.connectionState !== 'connected') {
            pc.close();
            peerConnections.delete(pendingInvitePeerId);
        }
    }
    pendingInvitePeerId = null;
    inviteModal.classList.remove('active');
});

// Copy Invite Link
btnCopyInviteLink.addEventListener('click', () => {
    copyToClipboard('txt-invite-link', 'btn-copy-invite-link');
});

// Copy Invite Key
btnCopyInviteKey.addEventListener('click', () => {
    copyToClipboard('txt-invite-key', 'btn-copy-invite-key');
});

// Connect Invited Viewer
btnConnectInvitedViewer.addEventListener('click', async () => {
    const responseVal = txtInviteResponse.value.trim();
    if (!responseVal) {
        showToast("Please paste the Viewer's Response Key.", "error");
        return;
    }
    
    try {
        const decoded = await decodeSessionKey(responseVal);
        const peerId = decoded.id;
        
        if (peerId !== pendingInvitePeerId) {
            showToast("Connection ID mismatch.", "error");
            return;
        }
        
        if (!peerConnections.has(peerId)) {
            showToast("Session expired or invalid.", "error");
            return;
        }
        
        const pc = peerConnections.get(peerId);
        const answerDesc = new RTCSessionDescription(decoded.sdp);
        
        showToast("Connecting to viewer...", "info");
        await pc.setRemoteDescription(answerDesc);
        
        // Close modal
        inviteModal.classList.remove('active');
        pendingInvitePeerId = null;
        renderViewerList();
    } catch (err) {
        console.error("Failed to connect viewer from modal:", err);
        showToast("Failed to parse Response Key.", "error");
    }
});

// Disconnect Viewer
function disconnectPeer(peerId) {
    if (peerConnections.has(peerId)) {
        const pc = peerConnections.get(peerId);
        pc.close();
        peerConnections.delete(peerId);
        showToast(`Disconnected viewer: ${peerId}`, "info");
        renderViewerList();
    }
}

// Render Host Dashboard Viewers list
function renderViewerList() {
    const listEl = document.getElementById('viewer-list');
    const countEl = document.getElementById('viewer-count');
    if (!listEl || !countEl) return;

    listEl.innerHTML = '';
    countEl.textContent = peerConnections.size;
    
    if (peerConnections.size === 0) {
        listEl.innerHTML = `
            <div class="viewer-empty-state">
                No active viewers. Share an invite link to start streaming!
            </div>
        `;
        return;
    }
    
    peerConnections.forEach((pc, peerId) => {
        const card = document.createElement('div');
        card.className = 'viewer-card';
        
        const isConnected = pc.connectionState === 'connected';
        const stateClass = isConnected ? 'connected' : 'connecting';
        const stateText = isConnected ? 'Connected' : 'Connecting';
        
        card.innerHTML = `
            <div class="viewer-info">
                <span class="viewer-id">${peerId}</span>
                <span class="viewer-status ${stateClass}">
                    <span class="status-dot"></span>
                    ${stateText}
                </span>
            </div>
            <button class="btn-disconnect-viewer" data-id="${peerId}" title="Disconnect Viewer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        card.querySelector('.btn-disconnect-viewer').addEventListener('click', () => {
            if (confirm(`Disconnect viewer ${peerId}?`)) {
                disconnectPeer(peerId);
            }
        });
        
        listEl.appendChild(card);
    });
}

// Reset Application to initial state
function resetApp() {
    console.log("Resetting application state...");
    
    // Close invite modal
    if (inviteModal) {
        inviteModal.classList.remove('active');
    }
    pendingInvitePeerId = null;

    // Stop stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close and reset PeerConnections
    peerConnections.forEach((pc) => {
        pc.close();
    });
    peerConnections.clear();

    // Reset video elements
    const videoElement = document.getElementById('p2p-video');
    if (videoElement) {
        videoElement.srcObject = null;
    }

    // Reset UI inputs
    document.getElementById('txt-host-offer').value = '';
    document.getElementById('txt-host-answer').value = '';
    document.getElementById('txt-viewer-offer').value = '';
    document.getElementById('txt-viewer-answer').value = '';

    // Remove sidebar layouts
    const layout = document.querySelector('.stream-layout');
    if (layout) {
        layout.classList.remove('has-sidebar');
    }

    // Clear active classes & return to Landing
    currentRole = null;
    showScreen('landing');
}

// Parse query parameters for direct invite joining
function parseInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const inviteKey = params.get('invite');
    if (inviteKey) {
        console.log("Found invite key in URL query parameter.");
        showToast("Invite link detected! Joining stream...", "success");
        currentRole = 'viewer';
        showScreen('viewer');
        showWizardStep('viewer', 1);
        document.getElementById('txt-viewer-offer').value = inviteKey;
        
        // Clean URL parameter without reloading page
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }
}

// Initialise
resetApp();
parseInviteFromUrl();

// ── Diagnostics Console ──────────────────────────────────────────────────────
(function setupDiagnostics() {
    const consoleEl   = document.getElementById('diagnostics-console');
    const toggleBtn   = document.getElementById('btn-toggle-diagnostics');
    const clearBtn    = document.getElementById('btn-clear-diagnostics');
    const logEl       = document.getElementById('diagnostics-log');

    let isOpen = false;

    toggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            consoleEl.classList.remove('diagnostics-closed');
        } else {
            consoleEl.classList.add('diagnostics-closed');
        }
    });

    clearBtn.addEventListener('click', () => {
        logEl.innerHTML = '';
    });

    function appendLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const ts = new Date().toLocaleTimeString();
        entry.textContent = `[${ts}] ${msg}`;
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
        // Auto-open on errors/warnings
        if ((type === 'error' || type === 'warn') && !isOpen) {
            isOpen = true;
            consoleEl.classList.remove('diagnostics-closed');
        }
    }

    // Intercept console methods
    const _log   = console.log.bind(console);
    const _warn  = console.warn.bind(console);
    const _error = console.error.bind(console);

    console.log = (...args) => {
        _log(...args);
        appendLog(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 'info');
    };
    console.warn = (...args) => {
        _warn(...args);
        appendLog(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 'warn');
    };
    console.error = (...args) => {
        _error(...args);
        appendLog(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 'error');
    };

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const msg = reason?.message || JSON.stringify(reason) || String(reason);
        appendLog(`Unhandled rejection: ${msg}`, 'error');
    });

    appendLog('Diagnostics console ready. Open two tabs at http://localhost:5173/', 'info');
    appendLog('HOST tab: Share My Screen → generate key → copy → send to VIEWER', 'info');
    appendLog('VIEWER tab: Join Stream → paste key → Generate Response Key → copy → send back to HOST', 'info');
})();
