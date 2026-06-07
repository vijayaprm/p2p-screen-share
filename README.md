# InfinityCast

Live demo: [vijayaprm.github.io/p2p-screen-share](https://vijayaprm.github.io/p2p-screen-share/)

InfinityCast is a browser-to-browser screen sharing app that uses manual WebRTC signaling instead of a dedicated signaling server. A host generates a share key, a viewer responds with a return key, and the stream connects directly between both browsers.

## Features

- Direct peer-to-peer screen streaming with no account system or backend
- Manual host/viewer key exchange flow for local or out-of-band sharing
- Invite flow for adding additional viewers during an active host session
- In-stream chat over WebRTC data channels
- Annotation overlay with draw, erase, color, and clear controls
- Diagnostics console for connection and runtime troubleshooting

## Architecture

The app is now organized into focused modules:

- `src/main.js`: bootstraps the app and shared diagnostics
- `src/lib/`: signaling helpers, RTC setup, and shared UI/state utilities
- `src/features/`: host flow, viewer flow, stream controls, invite modal, chat, and annotations
- `src/styles/`: split CSS for layout, stream UI, chat, modal, diagnostics, and responsive behavior

## Development

```bash
npm install
npm run dev
```

Build the production bundle with:

```bash
npm run build
```

The Vite config is set up with `base: /p2p-screen-share/` so the built app is ready for GitHub Pages-style hosting under the repository path.

## Connection Flow

1. The host captures a screen, window, or tab and generates a host key.
2. The viewer pastes the host key and generates a response key.
3. The host pastes the response key to finish the direct WebRTC handshake.
4. Once connected, the stream screen enables chat, fullscreen, annotations, and host-side invite management.

## Notes

- Chat is carried over WebRTC data channels, so it becomes available only after the peer connection is established.
- Annotation controls are local browser overlays today. They do not yet synchronize between peers.
- The `deploy` script currently performs the production build and is ready to be extended for your preferred hosting workflow.
