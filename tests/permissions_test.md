# Permissions Test Cases & Nuances

Testing mobile browser permissions is highly nuanced because iOS and Android handle privacy very differently. This
document covers all edge cases and expected behaviors.

## 1. Location Permission (GPS)

**How it works:** Governed by `navigator.geolocation`.
**Nuance:** Once a user hits "Deny" on a Location prompt, the browser permanently remembers this for the domain. **We
cannot trigger the native popup again programmatically.** The user MUST go to their browser settings to manually allow
it.

| Scenario              | Device/Browser | Expected App Behavior                                                        | UI Copy & How to Recover                                                                                                             |
|:----------------------|:---------------|:-----------------------------------------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------|
| **First Visit**       | All            | Native popup appears.                                                        | N/A                                                                                                                                  |
| **User taps "Allow"** | All            | Gate passes (if soft pass), AR gate checks for Camera/Compass.               | N/A                                                                                                                                  |
| **User taps "Deny"**  | All            | Gate hard-blocks. Native popup will NOT appear again.                        | UI shows **"Location (Denied)"** and **"I've Fixed It (Check Again) 🔄"** button. User must tap lock icon / `aA` and manually allow. |
| **Hardware failure**  | All (Indoors)  | Takes >2s, app shows soft timeout. Resolves to granted but accuracy is poor. | UI shows **"Finding GPS signal..."** then warning **"Move outdoors"**.                                                               |

## 2. Camera Permission

**How it works:** Governed by `navigator.mediaDevices.getUserMedia()`.
**Nuance:** Just like Location, if a user hits "Deny", the browser permanently blocks it. On iOS Safari, we cannot even
*passively check* if it was denied (the Permissions API doesn't support Camera).

| Scenario                    | Device/Browser | Expected App Behavior                                      | UI Copy & How to Recover                                                                         |
|:----------------------------|:---------------|:-----------------------------------------------------------|:-------------------------------------------------------------------------------------------------|
| **First tap on AR**         | All            | Native camera popup appears.                               | N/A                                                                                              |
| **User taps "Deny"**        | All            | Gate blocks AR access. Native popup will NOT appear again. | UI shows **"Camera (Denied)"** and **"I've Fixed It (Check AR) 🔄"**. User must fix in settings. |
| **Camera in use elsewhere** | All            | Throws `NotReadableError`. Handled as "blocked".           | UI shows **"Camera (Unavailable)"**. User must close other apps using the camera.                |

## 3. Compass / Gyroscope (The iOS Headache)

**How it works:** On iOS 13+, governed by `DeviceOrientationEvent.requestPermission()`. On Android, it's granted
automatically on HTTPS sites.
**Nuance:** This is an Apple-specific privacy feature. It applies to **ALL browsers on an iPhone** (Safari, Chrome,
Firefox) because Apple forces all iOS browsers to use the WebKit engine.

| Scenario                          | Device/Browser | Expected App Behavior                                                     | UI Copy & How to Recover                                                                                                    |
|:----------------------------------|:---------------|:--------------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------|
| **Normal use**                    | Android Chrome | No popup ever appears. It just works.                                     | N/A                                                                                                                         |
| **First tap on AR**               | iOS (All)      | Native Apple popup: "would like to access Motion & Orientation".          | N/A                                                                                                                         |
| **User taps "Cancel"**            | iOS (All)      | iOS permanently remembers the denial for that *session*.                  | UI shows **"Your browser blocked the prompt..."** and **"Reload to Fix Compass 🔄"** button.                                |
| **User taps "Cancel" repeatedly** | iOS (All)      | iOS permanently blacklists the site. A page reload will no longer fix it. | UI shows **"Your browser permanently blocked compass. You must clear Website Data..."** and **"Compass Blocked ❌"** button. |

## 4. In-App Browsers (Instagram / Facebook)

**How it works:** Social media apps open links in their own webview, which severely limits permissions and breaks
`localStorage`.
**Nuance:**
| Scenario | Device/Browser | Expected App Behavior | How to recover |
| :--- | :--- | :--- | :--- |
| **User clicks link from IG** | All | The `<InAppBrowserBlocker>` component intercepts the load. | UI explicitly tells
the user: "Tap the 3 dots and select Open in System Browser". |

## 5. AR Contextual Gate (Progressive Enhancement)

**How it works:** We reuse the `<PermissionGate requiredPermissions="all">` component strictly inside the AR tab.
**Nuance:** The initial root gate uses `requiredPermissions="location"`. It soft-passes the user into the Satellite Map
mode. The AR tab gate acts as a secondary trap.

| Scenario                             | Device/Browser | Expected App Behavior                                                              | UI Copy & How to Recover                                                       |
|:-------------------------------------|:---------------|:-----------------------------------------------------------------------------------|:-------------------------------------------------------------------------------|
| **User lands on App**                | All            | Soft-pass Gate. Only Location is strictly required.                                | UI shows **"Location, Camera, Compass"**. Button reads **"Unlock AR Map 🚀"**. |
| **User taps AR Tab (Camera Denied)** | All            | Secondary AR Gate appears inside the tab. Top bar is `z-10000` so user can escape. | UI shows **"Camera (Denied)"** and **"I've Fixed It (Check AR) 🔄"**.          |
| **User escapes AR Gate**             | All            | User taps "Sat" or "Map" on Top Nav. AR Gate instantly vanishes.                   | User returns to 2D fallback gracefully.                                        |

## Summary of Button Behaviors

To prevent user confusion when native popups don't appear (due to prior denials):

- If **Location/Camera** is denied, the button reads **"I've Fixed It (Check Again) 🔄"** (or **"I Fixed It (Check AR) 🔄"
  ** for the AR gate). This teaches the user that tapping the button won't magically show the popup—they must follow the
  on-screen instructions to fix it in their settings first, and *then* tap the button to let the app verify.
- If **Compass** is denied on iOS, the button reads **"Reload to Fix Compass 🔄"**. If that fails, it changes to **"
  Compass Blocked ❌"** with manual clearing instructions.
