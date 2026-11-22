import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

/**
 * Route a notification tap to the right place based on its data payload.
 * The backend is expected to send a `data` object like:
 *   { type: "booking", bookingId: "..." }
 *   { type: "review", bookingId: "..." }
 *   { type: "notification" | anything else }
 */
export function routeFromNotificationData(data = {}) {
  if (!navigationRef.isReady()) return;

  const type = data?.type;
  const bookingId = data?.bookingId;

  try {
    switch (type) {
      case "booking":
        if (bookingId) {
          navigationRef.navigate("Bookings", { screen: "BookingDetail", params: { bookingId } });
        } else {
          navigationRef.navigate("Bookings");
        }
        break;
      case "review":
        navigationRef.navigate("Profile", {
          screen: bookingId ? "WriteReview" : "MyReviews",
          params: bookingId ? { bookingId } : undefined,
        });
        break;
      default:
        navigationRef.navigate("Profile", { screen: "Notifications" });
        break;
    }
  } catch (e) {
    console.warn("routeFromNotificationData failed:", e?.message);
  }
}
