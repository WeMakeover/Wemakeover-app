import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

/**
 * Push notification helpers (Expo + native FCM).
 *
 * On Android, `getDevicePushTokenAsync()` returns the native FCM registration
 * token, which is exactly what the backend stores on the user (`fcmToken`) and
 * later targets with Firebase Admin. This requires a Firebase project:
 *   - add `google-services.json` to the project root
 *   - set `android.googleServicesFile` in app.json
 *   - build with EAS / a dev build (push tokens are NOT available in Expo Go).
 *
 * On iOS the device token is an APNs token; Firebase Admin can deliver to it
 * once an APNs auth key is configured in the Firebase console.
 */

const ANDROID_CHANNEL_ID = "default";

let handlerConfigured = false;

// Show notifications while the app is foregrounded.
export function setupNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#CC2B52",
    });
  } catch (e) {
    console.warn("ensureAndroidChannel failed:", e?.message);
  }
}

export async function requestPushPermission() {
  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted && settings.canAskAgain !== false) {
    const req = await Notifications.requestPermissionsAsync();
    granted =
      req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  return !!granted;
}

/**
 * Returns the native device push token (FCM on Android / APNs on iOS), or null
 * if unavailable (simulator, denied permission, Expo Go, or Firebase not set up).
 */
export async function getDeviceFcmToken() {
  if (!Device.isDevice) {
    console.warn("Push tokens are only available on physical devices.");
    return null;
  }
  // Expo Go can't obtain native device push tokens.
  if (Constants.appOwnership === "expo") {
    console.warn("Push tokens require a development or production build (not Expo Go).");
    return null;
  }
  const granted = await requestPushPermission();
  if (!granted) return null;
  await ensureAndroidChannel();
  try {
    const tokenResponse = await Notifications.getDevicePushTokenAsync();
    return tokenResponse?.data || null;
  } catch (e) {
    console.warn("getDevicePushTokenAsync failed:", e?.message);
    return null;
  }
}

export function addNotificationListeners({ onReceive, onResponse } = {}) {
  const receiveSub = Notifications.addNotificationReceivedListener((n) => onReceive?.(n));
  const responseSub = Notifications.addNotificationResponseReceivedListener((r) => onResponse?.(r));
  return () => {
    receiveSub.remove();
    responseSub.remove();
  };
}

// Notification that launched the app from a cold start (tap on a notification).
export async function getInitialNotificationResponse() {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch {
    return null;
  }
}

export async function setBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count || 0));
  } catch {
    /* ignore */
  }
}
