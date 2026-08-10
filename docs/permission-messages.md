# Permission Gate Scenarios & Messages

This document lists all the current scenarios and the exact copy shown in the Permission Gate UI when a user denies or blocks a permission (Camera, Location, or Compass).

## Camera Permission

### Scenario 1: Camera is Busy / Blocked by another app
*Condition: `gateState.camera === 'blocked'` (`NotReadableError`)*
* **Message**: "Your camera is busy in another app right now! 📸 Close it out and let's try again."

### Scenario 2: Camera Denied on iOS Safari
*Condition: OS is iOS, Browser is Safari, `gateState.camera === 'denied'`*
* **Browser-Level Fix**: "Tap the **aA icon** in your search bar > **Website Settings** > Allow Camera. 📸"
* **OS-Level Fix**: "Or just head to your iPhone **Settings ⚙️ > Safari** and toggle Camera on. ✨"

### Scenario 3: Camera Denied on iOS Chrome (or other non-Safari browser)
*Condition: OS is iOS, Browser is Chrome (or other), `gateState.camera === 'denied'`*
* **OS-Level Fix**: "Head to your iPhone **Settings ⚙️ > Chrome** [or Browser] and toggle Camera on. 📸"

### Scenario 4: Camera Denied on Android (Chrome or others)
*Condition: OS is Android, `gateState.camera === 'denied'`*
* **Browser-Level Fix**: "Tap the **lock 🔒 icon** in your address bar > **Permissions** > Allow Camera. 📸"
* **OS-Level Fix**: "Or try this: Long-press the **Chrome** [or Browser] app icon > tap **ⓘ (App Info)** > Permissions > Allow Camera. 🚀"

### Scenario 5: Camera Denied on Desktop / Other
*Condition: OS is not iOS or Android, `gateState.camera === 'denied'`*
* **Browser-Level Fix**: "Click the **lock 🔒 icon** next to the website address and allow Camera access. ✨"

---

## Location Permission

### Scenario 1: GPS/Location Hardware Disabled
*Condition: `gateState.location === 'blocked'`*
* **Message**: "We're a bit lost! 🗺️ Make sure your phone's actual GPS is turned on so we can find you."

### Scenario 2: Location Denied on iOS Safari
*Condition: OS is iOS, Browser is Safari, `gateState.location === 'denied'`*
* **Browser-Level Fix**: "Tap the **aA icon** in your search bar > **Website Settings** > Allow Location. 📍"
* **OS-Level Fix**: "Or just head to your iPhone **Settings ⚙️ > Safari > Location** and allow it. ✨"

### Scenario 3: Location Denied on iOS Chrome (or other non-Safari browser)
*Condition: OS is iOS, Browser is Chrome (or other), `gateState.location === 'denied'`*
* **OS-Level Fix**: "Open your iPhone **Settings ⚙️ > Chrome** [or Browser] > **Location** and choose **While Using the App**. 📍"

### Scenario 4: Location Denied on Android (Chrome or others)
*Condition: OS is Android, `gateState.location === 'denied'`*
* **Browser-Level Fix**: "Tap the **lock 🔒 icon** in your address bar > **Permissions** > Allow Location. 📍"
* **OS-Level Fix**: "Or try this: Long-press the **Chrome** [or Browser] app icon > tap **ⓘ (App Info)** > Permissions > Allow Location. 🚀"

### Scenario 5: Location Denied on Desktop / Other
*Condition: OS is not iOS or Android, `gateState.location === 'denied'`*
* **Browser-Level Fix**: "Click the **lock 🔒 icon** next to the website address and allow Location access. 🗺️"

---

## Compass / Device Orientation Permission

### Scenario 1: Compass Denied (Mainly iOS Safari issue)
*Condition: `gateState.compass === 'denied'`*
* **Message**: "Safari blocked the prompt since it was denied earlier. We just need to reload to ask again."
* **Action Button Text**: "Reload Page to Retry" (with Refresh icon)
* **Sub-text Note**: "If it still fails, you might need to clear Safari Website Data in your Settings."
* **Main CTA Button Text**: "Reload to Fix Compass 🔄" (If compass is the only blocker left)

---

## General UI Messages

* **Main Heading (Initial)**: "Unlock AR Mode ✨"
* **Main Heading (When Denied)**: "We Need You Back 🥺"
* **Subheading (Initial)**: "To project AR trails across Lalbagh Botanical Garden, we need a few quick permissions."
* **Subheading (When Denied)**: "Your Lalbagh journey is on pause! We need these permissions to guide you through the historic gardens in AR."
* **Social Proof Badge**: "Touch Lalbagh grass, the AR way 🌿"
* **Retry Feedback Toast**: "Still blocked by your browser. Please check settings!"
* **Main CTA Button (Initial)**: "Unlock AR Map 🚀"
* **Main CTA Button (Denied)**: "Fix Permissions 🛠️"

---

## Permission Rows Summaries
* **Location**: "To find your position in the park" (Required)
* **Camera**: "To show the AR route overlays" (Required)
* **Compass**: "To orient the map correctly" (Required)
