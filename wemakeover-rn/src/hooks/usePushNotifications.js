import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setupNotificationHandler,
  getDeviceFcmToken,
  addNotificationListeners,
  getInitialNotificationResponse,
} from "../lib/push";
import { notificationsApi } from "../features/notifications/notificationsApi";
import { fetchUnreadCount } from "../features/notifications/notificationsSlice";
import {
  getStoredFcmToken,
  setStoredFcmToken,
  clearStoredFcmToken,
} from "../lib/tokenStorage";
import { routeFromNotificationData } from "../navigation/navigationRef";

/**
 * Owns the device push lifecycle:
 *  - configures the foreground handler + listeners (route taps, refresh badge)
 *  - registers the native FCM token with the backend after login (deduped)
 *  - routes a notification that cold-started the app
 *  - forgets the stored token on logout so re-login re-registers
 */
export default function usePushNotifications() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const handledColdStart = useRef(false);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    const remove = addNotificationListeners({
      onReceive: () => {
        dispatch(fetchUnreadCount());
      },
      onResponse: (response) => {
        const data = response?.notification?.request?.content?.data;
        routeFromNotificationData(data);
        dispatch(fetchUnreadCount());
      },
    });
    return remove;
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const token = await getDeviceFcmToken();
        if (token && !cancelled) {
          const stored = await getStoredFcmToken();
          if (stored !== token) {
            await notificationsApi.registerFcmToken(token);
            await setStoredFcmToken(token);
          }
        }
      } catch (e) {
        console.warn("FCM registration failed:", e?.message);
      }

      if (cancelled) return;
      dispatch(fetchUnreadCount());

      if (!handledColdStart.current) {
        handledColdStart.current = true;
        const initial = await getInitialNotificationResponse();
        const data = initial?.notification?.request?.content?.data;
        if (data) setTimeout(() => routeFromNotificationData(data), 400);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearStoredFcmToken();
    }
  }, [isAuthenticated]);
}
