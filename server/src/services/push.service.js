import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { User } from '../models/user.model.js';

/**
 * Push notification service (Firebase Cloud Messaging).
 *
 * Sends pushes to a user's stored `fcmToken` (registered by the mobile app via
 * POST /api/auth/fcm-token). Firebase is initialized lazily on first use so the
 * server runs fine even when push is not configured (push simply becomes a no-op).
 *
 * Configure with ANY of (checked in this order):
 *   FIREBASE_SERVICE_ACCOUNT_PATH = path to the downloaded service-account .json
 *                                   (easiest — e.g. ./serviceAccountKey.json)
 *   FIREBASE_SERVICE_ACCOUNT      = the full service-account JSON (stringified)
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *                                   (private key keeps literal \n escapes)
 *
 * Get the file/keys from Firebase console > Project settings > Service accounts >
 * "Generate new private key".
 */

let firebaseApp = null;
let initAttempted = false;

const getServiceAccount = () => {
  // 1) Path to the downloaded service-account JSON file (simplest setup).
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const resolved = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    } catch (error) {
      console.error('⚠️  Could not read FIREBASE_SERVICE_ACCOUNT_PATH:', error.message);
      return null;
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      console.error('⚠️  FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      // Env vars store newlines as the literal characters "\n".
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
};

const ensureInit = () => {
  if (firebaseApp) return firebaseApp;
  if (initAttempted) return null;
  initAttempted = true;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn('⚠️  Firebase not configured — push notifications are disabled.');
    return null;
  }

  try {
    firebaseApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('✅ Firebase Admin initialized — push notifications enabled.');
  } catch (error) {
    console.error('❌ Firebase Admin init failed:', error.message);
    firebaseApp = null;
  }
  return firebaseApp;
};

export const isPushConfigured = () => !!ensureInit();

// FCM data payload values must be strings.
const stringifyData = (data = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) out[key] = String(value);
  }
  return out;
};

/**
 * Send a push to a specific user (by id). Safe to call unconditionally — it
 * resolves to a status object and never throws.
 */
export const sendPushToUser = async (userId, { title, body, data = {} }) => {
  const app = ensureInit();
  if (!app) return { sent: false, reason: 'not_configured' };
  if (!userId) return { sent: false, reason: 'no_user' };

  try {
    const user = await User.findById(userId).select('fcmToken');
    const token = user?.fcmToken;
    if (!token) return { sent: false, reason: 'no_token' };

    await admin.messaging().send({
      token,
      notification: { title, body },
      data: stringifyData(data),
      android: {
        priority: 'high',
        notification: { channelId: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default' } },
      },
    });

    return { sent: true };
  } catch (error) {
    const code = error?.errorInfo?.code || error?.code;
    // Clear stale/invalid tokens so we don't keep retrying them.
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      try {
        await User.findByIdAndUpdate(userId, { fcmToken: null });
      } catch {
        /* ignore */
      }
      return { sent: false, reason: 'invalid_token' };
    }
    console.error('❌ Push send failed:', error?.message);
    return { sent: false, reason: 'send_error' };
  }
};

/**
 * Map a Notification document's `type` to the deep-link `data` payload the
 * mobile app understands (see RN: navigationRef.routeFromNotificationData).
 */
const mapNotificationData = (notification) => {
  const base = { notificationId: String(notification._id) };
  switch (notification.type) {
    case 'review_request':
    case 'review_reminder':
      // -> Bookings/WriteReview for that booking
      return { ...base, type: 'review', bookingId: notification.bookingId };
    case 'booking_confirmed':
    case 'booking_completed':
    case 'booking_cancelled':
    case 'booking_rescheduled':
    case 'payment_received':
      // -> Booking detail
      return { ...base, type: 'booking', bookingId: notification.bookingId };
    case 'complaint_response':
      // -> Profile > My reviews (no bookingId so the app opens the list)
      return { ...base, type: 'review' };
    default:
      // -> Profile > Notifications
      return { ...base, type: 'system' };
  }
};

/**
 * Send a push that mirrors an in-app Notification document. Called automatically
 * by the Notification model's post-save hook for every newly created notification.
 */
export const sendNotificationPush = async (notification) => {
  if (!notification) return { sent: false, reason: 'no_notification' };
  return sendPushToUser(notification.userId, {
    title: notification.title,
    body: notification.message,
    data: mapNotificationData(notification),
  });
};

export default { sendPushToUser, sendNotificationPush, isPushConfigured };
