# InfinityCast Context

## Overview

InfinityCast is a production-leaning refactor of a peer-to-peer screen sharing prototype. The app keeps manual WebRTC signaling but now separates the UI and behavior into reusable modules so host flow, viewer flow, chat, invites, stream controls, and annotations can evolve independently.

## Current Structure

- `index.html`: application shell and fixed stream DOM hierarchy
- `src/main.js`: app bootstrap and diagnostics console wiring
- `src/lib/utils.js`: DOM registry, app state, screen/wizard navigation, toast, reset helpers
- `src/lib/signaling.js`: session key encode/decode helpers
- `src/lib/rtc.js`: peer connection setup, data channel registration, ICE gathering helpers
- `src/features/host.js`: screen capture, host offer generation, response application
- `src/features/viewer.js`: host offer parsing, answer generation, invite URL parsing
- `src/features/stream.js`: fullscreen, disconnect, mic toggle, host viewer list rendering
- `src/features/invite.js`: extra viewer invite modal flow
- `src/features/chat.js`: sidebar toggle and chat messaging over data channels
- `src/features/annotations.js`: canvas overlay sizing and local annotation interactions
- `src/styles/`: split CSS files by concern

## Key Behaviors

- Host connections and invite connections both reuse the same RTC helper layer.
- Viewer chat and host chat run through registered WebRTC data channels.
- App reset clears media tracks, peer connections, modal state, chat state, and stream UI state.
- The stream layout now keeps the video, annotation canvas, controls, chat sidebar, and host sidebar in a valid structure.

## Follow-Up Opportunities

- Synchronize annotations across peers through data channels
- Persist linting and formatting tooling with ESLint and Prettier
- Add automated browser tests for the manual key exchange flow
