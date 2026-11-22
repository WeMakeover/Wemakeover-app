# Wemakeover Mobile (React Native / Expo)

The Wemakeover **customer** mobile app (Android + iOS), built with **Expo**. It reuses the
existing MERN backend (`server-main`) and ports the web client's (`client-main`) data layer
(Redux slices, thunks, utils, API calls). Only the UI is rebuilt for mobile.

> Scope: **v1 = user app only**. Admins continue to use the existing web admin panel
> (same backend + database). Admin screens can be added to the app later.

---

## What's implemented so far

- **Foundation**
  - Token-based auth (no cookies): access/refresh tokens stored in `expo-secure-store`.
  - `src/lib/apiFetch.js` — a `fetch` wrapper that adds `Authorization: Bearer` + `X-Client: mobile`
    and transparently refreshes the token on 401.
  - Redux Toolkit store on `AsyncStorage` (`src/store/store.js`).
  - Toast shim (`src/lib/toast.js`) mirroring `react-hot-toast` so ported slices work unchanged.
- **Auth feature (ported + working):** login, register, OTP verify/resend, forgot password,
  reset password (deep link), logout, Google thunks. Files in `src/features/auth/`.
- **Utils (ported):** `pricingUtils`, `slotUtils`, `dateUtils`.
- **Navigation:** auth stack + bottom tabs (Home / Cart / Bookings / Profile) with placeholder screens.

- **Customer features (ported + screens built):** catalog (services/categories), cart,
  address book, checkout + booking, payment (Razorpay/COD), serviceability + city requests,
  reviews + complaints, notifications, contact.
- **Push notifications (FCM):** native device token registration + tap handling (see below).

## Still to port (next steps)

Real UI design for every screen (current screens are functional placeholders),
testimonials on a home section, Google Sign-In native SDK, and image upload.

---

## Push notifications (FCM)

The app registers the device's **native FCM token** with the backend and routes
notification taps to the right screen.

- `src/lib/push.js` — permissions, Android channel, `getDeviceFcmToken()` (native token),
  foreground handler, and listeners.
- `src/hooks/usePushNotifications.js` — registers the token after login (deduped via
  SecureStore), refreshes the unread badge, routes taps, and handles cold-start taps.
- `src/navigation/navigationRef.js` — `routeFromNotificationData(data)` maps the push
  `data` payload to a screen.
- Backend endpoint: `POST /api/auth/fcm-token` (auth-protected) stores `user.fcmToken`.

**Expected push `data` payload** (sent by the backend via Firebase Admin):

```json
{ "type": "booking",  "bookingId": "<id>" }   // -> Bookings > BookingDetail
{ "type": "review",   "bookingId": "<id>" }   // -> Profile > WriteReview (or MyReviews)
{ "type": "system" }                            // -> Profile > Notifications
```

### Firebase setup required (Android)

Native FCM tokens are **not** available in Expo Go — use a dev/production build.

1. Create a Firebase project and add an **Android app**. For the "Android package name"
   enter the value from `app.json` → `expo.android.package` (currently `com.wemakeover.app`).
   It must match exactly.
2. Download **`google-services.json`** into the project root (`wemakeover-rn/`).
3. Add it to `app.json` under `android`:
   ```json
   "android": { "googleServicesFile": "./google-services.json" }
   ```
4. In **EAS** set the Android FCM **V1 service account key** (`eas credentials`) so the
   backend/Expo can deliver pushes.
5. Rebuild: `eas build --profile development --platform android`.

> iOS: the device token is an APNs token. To deliver via Firebase, add the iOS app to
> Firebase and upload an **APNs auth key**, then `GoogleService-Info.plist` +
> `ios.googleServicesFile` in `app.json`.

---

## Project structure

```
src/
  config/env.js        # API base URL resolution
  lib/                 # apiFetch, tokenStorage, toast
  utils/               # ported pure logic (pricing, slots, dates)
  features/auth/       # authApi, authThunks, authSlice (ported & adapted)
  store/store.js       # Redux + redux-persist (AsyncStorage)
  theme/theme.js       # brand colors/spacing
  components/ui.js     # minimal UI primitives (replace with real design)
  navigation/          # RootNavigator, AuthStack, MainTabs
  screens/auth/        # Login, Register, Otp, ForgotPassword, ResetPassword
  screens/main/        # Home, Cart, Bookings, Profile (placeholders)
App.js                 # Provider + PersistGate + NavigationContainer + Toast
```

---

## Running it (development)

1. **Start the backend** (`server-main`) and make sure it listens on `0.0.0.0:3000`.
2. **Set the API URL.** Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`:
   - Android emulator: `http://10.0.2.2:3000/api`
   - Physical phone (same Wi-Fi): `http://<YOUR_PC_LAN_IP>:3000/api` (find it with `ipconfig`)
   - (Alternatively edit `expo.extra.apiBaseUrl` in `app.json`.)
3. **Install & start:**
   ```bash
   npm install
   npx expo start
   ```
4. Open in **Expo Go** (scan the QR) for pure-JS screens. Once native modules
   (Razorpay/Firebase/Google Sign-In) are added, use a **development build** instead (see below).

> The backend already supports mobile: it returns `accessToken`/`refreshToken` in the JSON body
> when the request includes `X-Client: mobile`, and exposes `POST /api/auth/refresh`.

---

## Development builds & deployment (EAS)

Native modules (payments, push, Google sign-in) require a **dev build** rather than Expo Go.

1. Install the CLI and log in:
   ```bash
   npm i -g eas-cli
   eas login
   ```
2. Configure builds (creates `eas.json`):
   ```bash
   eas build:configure
   ```
3. **Development build** (for on-device debugging with native modules):
   ```bash
   eas build --profile development --platform android
   ```
4. **Production builds:**
   ```bash
   eas build --profile production --platform android   # -> AAB for Play Store
   eas build --profile production --platform ios        # -> IPA (needs Apple Developer account)
   ```
5. **Submit to stores:**
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```
6. **OTA JS updates** (no store review for JS-only changes):
   ```bash
   eas update
   ```

### Store accounts needed
- Google Play Console — one-time **$25**.
- Apple Developer Program — **$99/year** (for iOS).

### Backend for production
- Deploy `server-main` with **HTTPS** (Render/Railway/VPS).
- Provide env vars: MongoDB Atlas, Redis, Cloudinary, Razorpay, email.
- Point the app to the HTTPS API via `EXPO_PUBLIC_API_URL`.

---

## How auth works on mobile (vs web)

| | Web (`client-main`) | Mobile (this app) |
|---|---|---|
| Session | HttpOnly cookies | Bearer tokens in `expo-secure-store` |
| Attached by | browser automatically | `apiFetch` adds `Authorization` header |
| Refresh | cookie + `/auth/refresh` | `apiFetch` auto-calls `/auth/refresh` on 401 |
| Boot | `checkLoginStatus` | `checkLoginStatus` (uses stored token) |
