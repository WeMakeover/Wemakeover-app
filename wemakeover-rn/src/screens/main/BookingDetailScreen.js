import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Button, IconButton, Badge, Divider, Loading, formatINR } from "../../components/ui";
import SheetOverlay from "../../components/SheetOverlay";
import BookSlot from "../../components/BookSlot";
import { formatDate } from "../../utils/paymentUtils";
import { getLocalDateString } from "../../utils/dateUtils";
import {
  fetchBookingById,
  cancelBooking,
  rescheduleBooking,
  selectCurrentBooking,
  selectBookingLoading,
  selectBookingCancelling,
  selectBookingRescheduling,
} from "../../features/booking/bookingSlice";
import toast from "../../lib/toast";

const STATUS_TONE = {
  completed: "success",
  cancelled: "warning",
  no_show: "warning",
  confirmed: "primary",
  pending: "muted",
};

export default function BookingDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { bookingId, openReschedule } = route.params || {};
  const booking = useSelector(selectCurrentBooking);
  const loading = useSelector(selectBookingLoading);
  const cancelling = useSelector(selectBookingCancelling);
  const rescheduling = useSelector(selectBookingRescheduling);

  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [newDate, setNewDate] = useState(getLocalDateString());
  const [newSlot, setNewSlot] = useState("");

  useEffect(() => {
    if (bookingId) dispatch(fetchBookingById(bookingId));
  }, [dispatch, bookingId]);

  useEffect(() => {
    if (openReschedule && booking?._id === bookingId) {
      setShowReschedule(true);
      navigation.setParams({ openReschedule: undefined });
    }
  }, [openReschedule, booking, bookingId, navigation]);

  const isActive = booking && ["pending", "confirmed"].includes(booking.status);
  const canReview = booking && ["completed", "cancelled", "no_show"].includes(booking.status);
  const hasReviewed = booking?.reviewDetails?.reviewSubmittedAt != null;
  const services = booking?.services || [];
  const address = booking?.bookingDetails?.address || booking?.booking?.address || {};
  const date = booking?.bookingDetails?.date || booking?.booking?.date || booking?.date;
  const slot = booking?.bookingDetails?.slot || booking?.booking?.slot || booking?.timeSlot;

  const onCancel = async () => {
    const result = await dispatch(cancelBooking({ bookingId, cancellationReason: cancelReason || "Cancelled by user" }));
    if (result.error) {
      toast.error(result.payload?.message || "Failed to cancel");
    } else {
      toast.success("Booking cancelled");
      setShowCancel(false);
    }
  };

  const onReschedule = async () => {
    if (!newSlot) {
      toast.error("Please select a new slot");
      return;
    }
    const result = await dispatch(rescheduleBooking({ bookingId, newDate, newSlot }));
    if (result.error) {
      toast.error(result.payload?.message || "Failed to reschedule");
    } else {
      toast.success("Booking rescheduled");
      setShowReschedule(false);
    }
  };

  if (loading && !booking) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Booking details</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.statusRow}>
          <Badge label={(booking?.status || "pending").replace("_", " ")} tone={STATUS_TONE[booking?.status] || "muted"} />
          {booking?.orderNumber ? <Text style={styles.orderNo}>#{booking.orderNumber}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.metaText}>{formatDate(date)} · {slot}</Text>
          </View>
          <Divider style={{ marginVertical: spacing.sm }} />
          <Text style={styles.cardLabel}>Services</Text>
          {services.map((s, i) => (
            <View key={i} style={styles.serviceRow}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {s.name} {s.quantity > 1 ? `x${s.quantity}` : ""}
              </Text>
              <Text style={styles.servicePrice}>{formatINR((s.price || 0) * (s.quantity || 1))}</Text>
            </View>
          ))}
        </View>

        {address?.city ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Address</Text>
            <Text style={styles.addrText}>{address.street}</Text>
            <Text style={styles.addrSub}>{[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</Text>
            {address.phone ? <Text style={styles.addrSub}>Phone: {address.phone}</Text> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Payment</Text>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceName}>Total</Text>
            <Text style={[styles.servicePrice, styles.bold]}>{formatINR(booking?.pricing?.totalAmount ?? booking?.totalAmount ?? 0)}</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceName}>Status</Text>
            <Text style={styles.servicePrice}>
              {booking?.paymentStatus === "paid" ? "Paid" : booking?.paymentMethod === "cod" || booking?.paymentMethod === "cash" ? "Pay after service" : "Pending"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {isActive ? (
        <View style={styles.footer}>
          <Button title="Reschedule" variant="outline" onPress={() => setShowReschedule(true)} style={{ flex: 1, marginRight: spacing.sm }} />
          <Button title="Cancel" onPress={() => setShowCancel(true)} style={{ flex: 1, marginLeft: spacing.sm }} />
        </View>
      ) : canReview && !hasReviewed ? (
        <View style={styles.footer}>
          <Button
            title="Write a review"
            onPress={() =>
              navigation.navigate("WriteReview", {
                bookingId: booking._id,
                services: services.map((s) => s.name || s.serviceName).filter(Boolean).join(", "),
              })
            }
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {/* Reschedule modal */}
      <SheetOverlay
        visible={showReschedule}
        onClose={() => setShowReschedule(false)}
        showClose={false}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reschedule booking</Text>
            <IconButton name="close" onPress={() => setShowReschedule(false)} />
          </View>
          <ScrollView>
            <BookSlot
              selectedDate={newDate}
              onDateChange={(d) => {
                setNewDate(d);
                setNewSlot("");
              }}
              selectedSlot={newSlot}
              onSlotSelect={setNewSlot}
            />
          </ScrollView>
          <Button title="Confirm reschedule" loading={rescheduling} onPress={onReschedule} style={{ marginTop: spacing.md }} />
        </View>
      </SheetOverlay>

      {/* Cancel modal */}
      <SheetOverlay
        visible={showCancel}
        onClose={() => setShowCancel(false)}
        showClose={false}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cancel booking</Text>
            <IconButton name="close" onPress={() => setShowCancel(false)} />
          </View>
          <Text style={styles.cancelHint}>Tell us why you're cancelling (optional).</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Reason"
            placeholderTextColor={colors.muted}
            value={cancelReason}
            onChangeText={setCancelReason}
            multiline
          />
          <Button title="Confirm cancellation" loading={cancelling} onPress={onCancel} style={{ marginTop: spacing.md }} />
        </View>
      </SheetOverlay>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  orderNo: { color: colors.muted, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: colors.text },
  cardLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: spacing.sm, textTransform: "uppercase" },
  serviceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  serviceName: { fontSize: 14, color: colors.text, flex: 1 },
  servicePrice: { fontSize: 14, color: colors.text, marginLeft: spacing.sm },
  bold: { fontWeight: "800" },
  addrText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  addrSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: spacing.lg,
    paddingBottom: spacing.lg + 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  cancelHint: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    color: colors.text,
  },
});
