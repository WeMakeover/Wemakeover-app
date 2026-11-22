import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Loading, EmptyState } from "../../components/ui";
import {
  fetchUserBookings,
  cancelBooking,
  selectBookings,
  selectBookingLoading,
  selectBookingCancelling,
} from "../../features/booking/bookingSlice";
import { formatTime } from "../../utils/paymentUtils";
import toast from "../../lib/toast";

const bookingsHero = require("../../../assets/home/bookings-hero-raw.png");
// Source photo is 1536x1024 (1.5:1). We show a shorter, cropped-from-top slice
// of it so the banner stays compact while keeping the sign/face fully visible.
const HERO_HEIGHT = 228;
const HERO_IMAGE_ASPECT = 1024 / 1536;

const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function primaryServiceLabel(services) {
  if (!Array.isArray(services) || services.length === 0) return "Service";
  const first = services[0]?.name || services[0]?.serviceName || "Service";
  const extra = services.length - 1;
  return extra > 0 ? `${first} +${extra}` : first;
}

function formatBookingSchedule(dateValue, slot) {
  const parts = [];
  if (dateValue) {
    const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (!isNaN(d.getTime())) {
      const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleDateString("en-IN", { month: "short" });
      parts.push(`${weekday} • ${day} ${month} ${d.getFullYear()}`);
    }
  }
  if (slot) parts.push(formatTime(slot));
  return parts.join(" • ");
}

function getStatusPill(booking) {
  if (booking.status === "cancelled") return { label: "Cancelled", bg: "#FDE1E1", color: "#A50407" };
  if (booking.status === "no_show") return { label: "No Show", bg: "#FDE1E1", color: "#A50407" };
  if (booking.paymentStatus === "paid" || booking.paymentStatus === "completed") {
    return { label: "Paid", bg: "#CFF7D3", color: "#1C6B2A" };
  }
  return { label: "Pay After Service", bg: "#FFF1C2", color: "#8A6A00" };
}

function BookingCard({ booking, onPress, onCancel, onReschedule, onPayNow, cancelling }) {
  const status = booking.status || "pending";
  const isActive = ["pending", "confirmed"].includes(status);
  const isPaid =
    booking.paymentStatus === "paid" || booking.paymentStatus === "completed";
  const pill = getStatusPill(booking);
  const date = booking.bookingDetails?.date || booking.booking?.date || booking.date;
  const slot = booking.bookingDetails?.slot || booking.booking?.slot || booking.timeSlot;

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card} onPress={onPress}>
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Ionicons name="checkmark-circle" size={12} color={pill.color} />
          <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>
        {primaryServiceLabel(booking.services)}
      </Text>
      <Text style={styles.cardMeta}>{formatBookingSchedule(date, slot)}</Text>

      {isActive ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn]}
            disabled={cancelling}
            onPress={onCancel}
          >
            <Ionicons name="close-circle-outline" size={14} color="#A50407" />
            <Text style={[styles.actionText, { color: "#A50407" }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.rescheduleBtn]} onPress={onReschedule}>
            <Ionicons name="calendar-outline" size={12} color="#3E3E3E" />
            <Text style={[styles.actionText, { color: "#3E3E3E" }]}>Reschedule</Text>
          </TouchableOpacity>

          {!isPaid ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.payBtn]}
              onPress={(e) => {
                e?.stopPropagation?.();
                onPayNow();
              }}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>₹ Pay Now</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function BookingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings);
  const loading = useSelector(selectBookingLoading);
  const cancelling = useSelector(selectBookingCancelling);
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("upcoming");

  const heroNaturalHeight = width * HERO_IMAGE_ASPECT;
  const heroHeight = HERO_HEIGHT;

  const load = useCallback(() => {
    dispatch(fetchUserBookings());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(dispatch(fetchUserBookings())).finally(() => setRefreshing(false));
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.getParent()?.navigate("Home");
    }
  };

  const handleCancel = (booking) => {
    Alert.alert("Cancel booking", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          const result = await dispatch(
            cancelBooking({ bookingId: booking._id, cancellationReason: "Cancelled by user" })
          );
          if (result.error) {
            toast.error(result.payload?.message || "Failed to cancel booking");
          } else {
            toast.success("Booking cancelled");
          }
        },
      },
    ]);
  };

  const handleReschedule = (booking) => {
    navigation.navigate("BookingDetail", { bookingId: booking._id, openReschedule: true });
  };

  const handlePayNow = (booking) => {
    navigation.getParent()?.navigate("Cart", {
      screen: "PaymentMethods",
      params: {
        mode: "existingBooking",
        booking,
        returnTo: "Bookings",
      },
    });
  };

  const filtered = bookings.filter((b) => {
    if (filter === "upcoming") return ["pending", "confirmed"].includes(b.status);
    if (filter === "completed") return b.status === "completed";
    return ["cancelled", "no_show"].includes(b.status);
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.hero, { height: heroHeight }]}>
        <Image
          source={bookingsHero}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: heroNaturalHeight }}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.85} onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color="#1C1C28" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsWrap}>
        <View style={styles.tabsRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                activeOpacity={0.9}
                style={[styles.tabSegment, active ? styles.tabSegmentActive : null]}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{f.label}</Text>
                {active ? <View style={styles.tabUnderline} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && bookings.length === 0 ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          subtitle="Your bookings will appear here once you book a service."
          action="Explore services"
          onAction={() => navigation.getParent()?.navigate("Home")}
        />
      ) : (
        <ScrollView
          style={styles.listSection}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {filtered.map((b) => (
            <BookingCard
              key={b._id}
              booking={b}
              cancelling={cancelling}
              onPress={() => navigation.navigate("BookingDetail", { bookingId: b._id })}
              onCancel={() => handleCancel(b)}
              onReschedule={() => handleReschedule(b)}
              onPayNow={() => handlePayNow(b)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  hero: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsWrap: {
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  tabsRow: {
    flexDirection: "row",
    width: "100%",
    overflow: "hidden",
    borderRadius: 4,
  },
  tabSegment: {
    flex: 1,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 8,
    position: "relative",
  },
  tabSegmentActive: {
    backgroundColor: "#FFFFFF",
  },
  tabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: "#7A1F35",
  },
  tabText: {
    color: "#9A9A9A",
    fontFamily: "Avenir",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  tabTextActive: {
    color: "#7A1F35",
    fontWeight: "700",
  },
  listSection: { flex: 1 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF",
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#0C0C0D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  pillRow: { flexDirection: "row", marginBottom: spacing.md },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillText: { fontFamily: "Avenir", fontSize: 12, fontWeight: "700" },
  cardTitle: { fontFamily: "Avenir", fontSize: 14, fontWeight: "700", color: "#212529", marginBottom: 6 },
  cardMeta: { fontFamily: "Avenir", fontSize: 12, color: "#6C757D", marginBottom: spacing.md },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cancelBtn: { borderColor: "#A50407" },
  rescheduleBtn: { borderColor: "#3E3E3E" },
  payBtn: { borderColor: colors.primary },
  actionText: { fontFamily: "Avenir", fontSize: 13, fontWeight: "600", letterSpacing: 0.1 },
});
