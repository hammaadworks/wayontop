# Permissions Protocol

This document outlines the protocol for handling sensitive permissions (Camera, Location, and Device Orientation/Compass) in the web application.

## Protocol Principles

1. **Pre-prompt Modals**: Before triggering the browser's native permission prompt, we display a beautiful, app-styled modal explaining *why* the permission is necessary and how it improves the user experience.
2. **Explicit Consent**: The native prompt is only triggered after the user explicitly clicks "Yes" or "Continue" on our pre-prompt modal.
3. **Persistent Blocking on Denial**: If the user denies consent or the permission is permanently blocked, they are kept on the modal state. They cannot proceed into the AR view until the required permissions are granted, as the app fundamentally relies on them.
4. **Periodic Verification & Guidance**: We periodically verify permission status. Since web applications cannot programmatically open browser or OS settings, if a permission is permanently denied (e.g., `prompt` state becomes `denied`), the modal will transition into a "Settings Guide" mode. This mode provides explicit visual instructions (e.g., "Click the lock icon in the address bar to allow Camera and Location") to guide the user to the exact place they can re-enable the permissions.
5. **State Caching**: The state of device orientation permission (especially on iOS Safari where it requires a user gesture) should be cached in `localStorage` or `sessionStorage` (as a flag indicating it was granted) to avoid prompting on every page reload if possible.

## Implementation Details

### 1. Permission Gate Component
We introduced a global `PermissionGate` (`src/components/PermissionGate.tsx`) component that intercepts the user before they can access the core AR experience. 

### 2. Camera Permission
- Requested via `navigator.mediaDevices.getUserMedia({ video: true })`
- Status checked via `navigator.permissions.query({ name: 'camera' })`
- Used in `CameraFeed.tsx`.

### 3. Location Permission
- Requested via `navigator.geolocation.getCurrentPosition()`
- Status checked via `navigator.permissions.query({ name: 'geolocation' })`
- Used in `useLocation.ts`.

### 4. Device Orientation (Compass)
- Requested via `DeviceOrientationEvent.requestPermission()` on iOS Safari.
- Handled gracefully in `PermissionGate` to avoid continuous popups and track user consent.

### 5. The "Blocked" Fallback
When a permission is in the `denied` state:
- The modal immediately blocks access to the app.
- It displays instructions to click the lock icon in the browser address bar to enable access.
- It polls continuously so that as soon as the user grants access in the settings, the app unlocks instantly without requiring a page reload.
