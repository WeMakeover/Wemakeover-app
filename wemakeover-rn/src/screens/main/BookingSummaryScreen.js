import React, { useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { formatINRDecimal } from "../../components/ui";
import StatusRingAnimation from "../../components/StatusRingAnimation";
import {
  formatBookingAddress,
  formatBookingSummaryDate,
  formatBookingSummaryTime,
  formatDurationShort,
} from "../../utils/formatBookingDisplay";
import { getPaymentMethodLabel } from "../../utils/paymentMethodLabels";
import { TRANSPORTATION_PLATFORM_FEE } from "../../utils/pricingUtils";
import { BACKEND_URL } from "../../config/env";
import RemoteImage from "../../components/RemoteImage";

const ASSET_BASE = BACKEND_URL.replace(/\/api$/, "");

function SectionHeading({ children }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ServiceThumb({ image }) {
  const raw = String(image || "").trim();
  const uri = raw
    ? raw.startsWith("http")
      ? raw
      : raw.startsWith("/")
        ? `${ASSET_BASE}${raw}`
        : null
    : null;

  if (uri) {
    return <RemoteImage uri={uri} variant="list" style={styles.serviceThumb} />;
  }

  return (
    <View style={[styles.serviceThumb, styles.serviceThumbFallback]}>
      <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
    </View>
  );
}

export default function BookingSummaryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const order = route.params?.order || {};
  const status = route.params?.status || "confirmed_online";
  const returnTo = route.params?.returnTo || "Cart";
  const retry = route.params?.retry || null;
  const failMessage = route.params?.failMessage || "Your payment was failed!";
  const statusTitleOverride = route.params?.statusTitle || null;
  const existingBooking = route.params?.existingBooking || null;

  const services = order.services || [];
  const isFailed = status === "payment_failed";
  const isCod = status === "confirmed_cod";
  const isOnlineSuccess = status === "confirmed_online";

  const subtotal = order.subtotal ?? services.reduce((s, item) => s + (item.price || 0) * (item.quantity || 1), 0);
  const platformFee = order.platformFee ?? TRANSPORTATION_PLATFORM_FEE;
  const totalAmount = order.totalAmount ?? subtotal + platformFee;
  const paymentLabel = order.paymentMethodLabel || getPaymentMethodLabel(order.paymentMethod);

  const resetToCartMain = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "CartMain" }],
      })
    );
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", resetToCartMain);
    return unsubscribe;
  }, [navigation, resetToCartMain]);

  const addressText = useMemo(
    () => formatBookingAddress(order.address),
    [order.address]
  );

  const goToBookings = () => {
    resetToCartMain();
    navigation.getParent()?.navigate("Bookings");
  };

  const goHome = () => {
    resetToCartMain();
    navigation.getParent()?.navigate("Home");
  };

  const handleBack = () => {
    if (isFailed) {
      if (retry) {
        navigation.replace("PaymentMethods", retry);
        return;
      }
      navigation.goBack();
      return;
    }
    goHome();
  };

  const handleRetryPayment = () => {
    if (retry) {
      navigation.replace("PaymentMethods", retry);
      return;
    }
    navigation.goBack();
  };

  const handlePayNowFromCod = () => {
    const booking =
      existingBooking ||
      (order.bookingId
        ? {
            _id: order.bookingId,
            orderNumber: order.orderNumber,
            services: order.services,
            pricing: {
              subtotal: order.subtotal,
              platformFee: order.platformFee,
              taxAmount: order.taxAmount,
              totalAmount: order.totalAmount,
            },
            bookingDetails: {
              date: order.appointmentDate,
              slot: order.appointmentSlot,
              address: order.address,
            },
            paymentDetails: { paymentMethod: "cod" },
            paymentStatus: "pending",
          }
        : null);

    if (!booking?._id) {
      goToBookings();
      return;
    }

    navigation.navigate("PaymentMethods", {
      mode: "existingBooking",
      booking,
      returnTo: "Bookings",
    });
  };

  const statusTitle =
    statusTitleOverride || (isFailed ? "Payment Failed!" : "Booking Confirmed!");
  const statusSubtitle = isFailed
    ? failMessage
    : "Service scheduled! Our expert will arrive on time.";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#292929" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Summary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StatusRingAnimation variant={isFailed ? "failed" : "success"} />

          <Text style={[styles.statusTitle, isFailed ? styles.statusFailed : styles.statusSuccess]}>
            {statusTitle}
          </Text>
          <Text style={styles.statusSub}>{statusSubtitle}</Text>

          {!isFailed && order.orderNumber ? (
            <View style={styles.bookingIdPill}>
              <Text style={styles.bookingIdText}>Booking ID: {order.orderNumber}</Text>
            </View>
          ) : null}

          {!isFailed ? (
            <>
              <SectionHeading>BOOKING DETAILS</SectionHeading>
              <View style={styles.card}>
                <DetailRow
                  icon="calendar-outline"
                  label="Date"
                  value={formatBookingSummaryDate(order.appointmentDate)}
                />
                <View style={styles.cardDivider} />
                <DetailRow
                  icon="time-outline"
                  label="Start Time"
                  value={formatBookingSummaryTime(order.appointmentSlot || order.appointmentTime)}
                />
                <View style={styles.cardDivider} />
                <DetailRow icon="location-outline" label="Address" value={addressText} />
              </View>

              <SectionHeading>{`SERVICES BOOKED (${services.length})`}</SectionHeading>
              <View style={styles.card}>
                {services.map((service, index) => (
                  <View key={`${service.serviceId || service.id || index}-${index}`}>
                    {index > 0 ? <View style={styles.cardDivider} /> : null}
                    <View style={styles.serviceRow}>
                      <ServiceThumb image={service.image} />
                      <View style={styles.serviceBody}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {service.name}
                          {service.quantity > 1 ? ` x${service.quantity}` : ""}
                        </Text>
                        <View style={styles.durationRow}>
                          <Ionicons name="time-outline" size={12} color="#8F90A6" />
                          <Text style={styles.durationText}>
                            {formatDurationShort(service.duration)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.servicePrice}>
                        {formatINRDecimal((service.price || 0) * (service.quantity || 1))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeading>PRICE BREAKDOWN</SectionHeading>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>{formatINRDecimal(subtotal)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Disposables & Transportation</Text>
              <Text style={styles.priceValue}>{formatINRDecimal(platformFee)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{isCod && !isFailed ? "Total Amount" : "Total Paid"}</Text>
              <Text style={[styles.totalValue, isFailed && styles.totalFailed]}>
                {formatINRDecimal(totalAmount).replace(".00", "")}
              </Text>
            </View>

            {isOnlineSuccess ? (
              <View style={styles.bannerSuccess}>
                <Ionicons name="checkmark-circle" size={18} color="#1C6B2A" />
                <Text style={styles.bannerSuccessText}>
                  Payment successful via {paymentLabel}
                </Text>
              </View>
            ) : null}

            {isCod ? (
              <View style={styles.bannerCod}>
                <View style={styles.bannerCodLeft}>
                  <Ionicons name="card-outline" size={18} color="#8A6A00" />
                  <Text style={styles.bannerCodText}>Pay After Service</Text>
                </View>
                <TouchableOpacity activeOpacity={0.85} onPress={handlePayNowFromCod} style={styles.payNowLink}>
                  <Text style={styles.payNowLinkText}>Pay Now</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : null}

            {isFailed ? (
              <View style={styles.bannerFailed}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.bannerFailedText}>Payment Failed!</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            {isFailed ? (
              <TouchableOpacity activeOpacity={0.9} onPress={handleRetryPayment} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Retry Payment</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity activeOpacity={0.9} onPress={goToBookings} style={styles.outlineBtn}>
                  <Text style={styles.outlineBtnText}>My Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.9} onPress={goHome} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F4F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6E6EB",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#1C1C28",
    fontFamily: fonts.interBold,
    marginRight: 36,
  },
  headerSpacer: { width: 0 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statusTitle: {
    marginTop: spacing.md,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: fonts.interExtraBold,
  },
  statusSuccess: { color: "#317D35" },
  statusFailed: { color: "#DC2626" },
  statusSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  bookingIdPill: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#F5C2D0",
    backgroundColor: "#FFF5F8",
  },
  bookingIdText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  sectionHeading: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
    color: "#8F90A6",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: "hidden",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ECECF0",
    marginVertical: spacing.sm,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0F3",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextWrap: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 12, color: "#8F90A6", marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#1C1C28", lineHeight: 20 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  serviceThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  serviceThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  serviceBody: { flex: 1, minWidth: 0 },
  serviceName: { fontSize: 14, fontWeight: "700", color: "#1C1C28" },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  durationText: { fontSize: 12, color: "#8F90A6" },
  servicePrice: { fontSize: 14, fontWeight: "700", color: "#1C1C28" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  priceLabel: { fontSize: 14, color: "#6B7280" },
  priceValue: { fontSize: 14, color: "#1C1C28", fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ECECF0",
  },
  totalLabel: { fontSize: 16, fontWeight: "800", color: "#1C1C28" },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
  totalFailed: { color: "#DC2626" },
  bannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#EAF7EC",
  },
  bannerSuccessText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#1C6B2A" },
  bannerCod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#FFF8E1",
  },
  bannerCodLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerCodText: { fontSize: 13, fontWeight: "700", color: "#8A6A00" },
  payNowLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  payNowLinkText: { fontSize: 13, fontWeight: "800", color: colors.primary },
  bannerFailed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#FEE2E2",
  },
  bannerFailedText: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  outlineBtn: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { color: colors.primary, fontSize: 16, fontWeight: "800" },
});
