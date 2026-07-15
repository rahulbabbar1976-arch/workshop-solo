# Native App Migration (Capacitor)

This document outlines the required changes and benefits when we finalize the web app and convert it into a native Android/iOS application using **Capacitor**.

## 1. The Core Benefit: Native Camera Control
Currently, as a Progressive Web App (PWA), the app relies on the browser's standard `<input type="file" capture="environment">` to open the camera. The browser cannot dictate resolution or quality to the device camera, meaning it captures massive 10MB-15MB photos which we then have to compress heavily in JavaScript (using the Canvas API) to prevent crashes and save bandwidth.

**With Capacitor (`@capacitor/camera`):**
We gain direct access to the device's native hardware. We can instruct the camera to restrict quality *before* the picture is even taken:

```javascript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 50,             // Natively compress the photo immediately
    width: 1200,             // Natively restrict the width
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera
  });
  
  // The resulting image is already tiny and optimized natively!
};
```

**Advantages:**
- **Crash Prevention:** Prevents low-memory Android phones from crashing when loading a 15MB photo into RAM.
- **Battery & CPU Savings:** Bypassing heavy JavaScript canvas compression saves battery and processes instantly.
- **Seamless UI:** Keeps the user strictly inside the app environment rather than booting them out to a clunky browser-camera interface.

## 2. Implementation Steps
When we are ready to transition to the native Capacitor build, follow these steps:

1. **Install Capacitor CLI and Core:**
   ```bash
   npm i @capacitor/core
   npm i -D @capacitor/cli
   ```
2. **Initialize Capacitor:**
   ```bash
   npx cap init "Workshop App" "com.workshop.app" --web-dir=out
   ```
3. **Install the Native Platforms:**
   ```bash
   npm i @capacitor/android @capacitor/ios
   npx cap add android
   npx cap add ios
   ```
4. **Install the Camera Plugin:**
   ```bash
   npm i @capacitor/camera
   npx cap sync
   ```
5. **Refactor Code:** 
   Replace the standard `<input type="file">` HTML buttons in `JobCardDetailClient.tsx` and `new/page.tsx` with the `@capacitor/camera` invocation.
