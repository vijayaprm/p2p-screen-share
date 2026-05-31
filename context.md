# Peer-to-Peer Screen Share Application - Context Documentation

## Overview
This is a web-based peer-to-peer screen sharing application that enables direct communication between two users without requiring a central server. The application uses WebRTC technology to establish direct connections.

## File Structure
The main HTML file contains the complete user interface with three main sections:
1. Landing screen (default view)
2. Host wizard for creating connections
3. Viewer wizard for joining connections
4. Stream display panel for the actual video feed

## Key Features
- Two-step connection process: Host generates key, Viewer responds with key
- Direct peer-to-peer connection establishment
- Video streaming display with fullscreen and disconnect controls
- Diagnostic console for developers
- Responsive design with step-by-step wizards

## Main Sections

### Landing Screen
- Contains links to start Host or Viewer modes
- Introduction to the peer-to-peer concept

### Host Wizard (Steps 1-3)
1. **Step 1**: Display connection key for host to share with peer
2. **Step 2**: Send the generated key to peer and proceed to next step
3. **Step 3**: Receive response key from peer and establish connection

### Viewer Wizard (Steps 1-2)
1. **Step 1**: Input host key to generate response
2. **Step 2**: Display and copy response key to send back to host

### Stream Display
- Video playback area for the peer-to-peer stream
- Fullscreen toggle and disconnect buttons

## UI Components
- Step-by-step wizards with navigation controls
- Text areas for key input/output
- Copy buttons for keys
- Status indicators and connection badges
- Diagnostic console toggle
- Toast notifications

## Technical Implementation Notes
The application uses:
- HTML5 for structure and content
- CSS for styling and responsive design
- JavaScript (main.js) for WebRTC implementation and UI logic
- WebRTC APIs for peer-to-peer communication