# Permissions Protocol

This document outlines the protocol for handling sensitive permissions (Camera, Location, and Device Orientation/Compass) in the web application.

## Protocol Principles

1. **State Machine over Polling**: The permissions flow acts as a state machine. It does not use `setInterval` to poll for permission changes. Instead, it re-checks on mount, when the user explicitly interacts (tap), or when the tab regains focus (`visibilitychange`) after navigating back from settings.
2. **Explicit Consent & Unified Entry Point**: The native prompt is only triggered via explicit user interaction. Both success paths and retry paths funnel through a single AR-app entry point (the Grant/Retry button). Only one function (`onGrantTap`) is permitted to fire native prompts.
3. **Passive vs Active Checks**: Permissions are split into:
   - **Passive Half**: Mount + visibilitychange only. Never fires a native prompt. Rely on `navigator.permissions.query` when available, but treat as a hint on Safari.
   - **Active Half**: Fired from a click handler. Invokes the actual APIs (`getUserMedia`, `getCurrentPosition`, `requestPermission`).
4. **Persistent Blocking & Accurate Guidance**: If a permission is denied or blocked, the user remains on the modal. We provide detailed, permission-specific recovery guidance because different permissions fail for different reasons (e.g., Camera `NotReadableError` implies a busy camera, whereas `NotAllowedError` is a denial; Compass on iOS lacks a settings menu so it simply requires re-prompting).
5. **No Polling**: `document.addEventListener('visibilitychange', ...)` replaces all polling. We also attach `status.onchange` listeners on browsers that properly support reactive permission APIs (e.g., Chrome).

## Implementation Details

### 1. Permission Gate Component
We introduced a global `PermissionGate` (`src/components/PermissionGate.tsx`) component that intercepts the user before they can access the core AR experience. 

### 2. Camera Permission
- Requested actively via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Denied states differentiate between `NotAllowedError` (actual denial) and `NotReadableError` (blocked/busy).
- Must explicitly stop tracks of active streams before re-requesting to avoid "unable to access camera" errors.
- **Safari Note**: Treats `permissions.query` as a Chrome-only hint. iOS Safari doesn't persist camera grants across full page loads.

### 3. Location Permission
- Requested actively via `navigator.geolocation.getCurrentPosition()`
- Verified passively where supported.
- Used in `useLocation.ts`. Avoid polling here; prefer `watchPosition()` with stored ID for ongoing tracking.

### 4. Device Orientation (Compass)
- Requested actively via `(DeviceOrientationEvent as any).requestPermission()` on both iOS Safari and Chrome.
- **No Settings Recovery**: iOS pulled the standalone settings toggle for this. Any failure must prompt the user to tap "Retry" and then allow the prompt.

### 5. PWA-Specific Considerations
- Avoid `#` based navigation for AR views on iOS PWAs; it can reset camera access.
- Avoid full-page reloads (`location.href = ...`) inside the AR flow as this forces iOS to re-prompt for camera and compass.
