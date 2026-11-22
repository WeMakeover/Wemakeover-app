import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { formatINRDecimal } from "../../components/ui";
import { buildCartOrderData } from "../../utils/buildCartOrder";
import {
  selectCartItems,
  selectCartSummary,
  selectAppliedCoupon,
  clearCart,
} from "../../features/cart/cartSlice";
import { checkLocationServiceability } from "../../features/serviceability/serviceabilityThunks";
import {
  completeCODFlowThunk,
  completeExistingBookingPaymentFlowThunk,
  completePaymentFlowThunk,
} from "../../features/payment/paymentThunks";
import {
  getBookingFailCopy,
  getOnlinePaymentFailCopy,
  normalizeCheckoutResult,
} from "../../utils/checkoutResult";
import {
  buildOrderDataFromBooking,
  getBookingPaymentMethod,
  isBookingPaid,
} from "../../utils/buildOrderFromBooking";
import { getPaymentMethodLabel } from "../../utils/paymentMethodLabels";

const GPAY = require("../../../assets/gpay-logo.png");
const PHONEPE = require("../../../assets/phonepe-logo.png");
const BHIM = require("../../../assets/bhim-logo.png");
const UPI = require("../../../assets/upi-logo.png");

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function PayRow({
  title,
  subtitle,
  logo,
  icon,
  trailing = "chevron",
  onPress,
  disabled,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={styles.rowLeft}>
        {logo ? (
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name={icon || "card-outline"} size={20} color="#292929" />
          </View>
        )}
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {trailing === "plus" ? (
        <Ionicons name="add" size={22} color="#636366" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#8F90A6" />
      )}
    </TouchableOpacity>
  );
}

export default function PaymentMethodsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const items = useSelector(selectCartItems);
  const summary = useSelector(selectCartSummary);
  const appliedCoupon = useSelector(selectAppliedCoupon);

  const mode = route.params?.mode || "cart";
  const existingBooking = route.params?.booking || null;
  const returnTo = route.params?.returnTo || "Cart";
  const isExistingBooking = mode === "existingBooking";

  const selectedAddress = route.params?.selectedAddress || null;
  const selectedDate = route.params?.selectedDate || null;
  const selectedSlot = route.params?.selectedSlot || null;

  const [submitting, setSubmitting] = useState(false);
  const [lastMethod, setLastMethod] = useState(null);

  const existingOrderData = useMemo(
    () => (isExistingBooking ? buildOrderDataFromBooking(existingBooking, user) : null),
    [isExistingBooking, existingBooking, user]
  );

  const billTotal = useMemo(() => {
    if (isExistingBooking) {
      return existingOrderData?.totalAmount || existingBooking?.pricing?.totalAmount || 0;
    }
    return summary.total || 0;
  }, [isExistingBooking, existingOrderData, existingBooking, summary.total]);

  const showPayAfterService = !isExistingBooking || getBookingPaymentMethod(existingBooking) !== "cod";

  const exitPaymentFlow = () => {
    if (returnTo === "Bookings") {
      navigation.getParent()?.navigate("Bookings", { screen: "BookingsMain" });
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: "CartMain" }],
    });
  };

  const buildRetryParams = () => ({
    mode,
    booking: existingBooking,
    returnTo,
    selectedAddress,
    selectedDate,
    selectedSlot,
  });

  const buildSummaryOrder = (orderData, appointmentDate, appointmentSlot, extras = {}) => ({
    services: orderData.services,
    subtotal: orderData.subtotal,
    platformFee: orderData.platformFee,
    taxAmount: orderData.taxAmount,
    discountAmount: orderData.discountAmount,
    totalAmount: orderData.totalAmount,
    appointmentDate,
    appointmentSlot,
    address: orderData.bookingDetails?.address || orderData.booking?.address || selectedAddress,
    orderNumber: extras.orderNumber || orderData.orderNumber,
    orderId: extras.orderId,
    bookingId: extras.bookingId,
    paymentMethod: extras.paymentMethod,
    paymentMethodLabel: extras.paymentMethodLabel,
  });

  const runPayment = async (preferredMethod) => {
    if (submitting) return;

    if (isExistingBooking) {
      if (!existingBooking || !existingOrderData?.bookingId) {
        Alert.alert("Booking unavailable", "Could not load booking details.");
        exitPaymentFlow();
        return;
      }
      if (isBookingPaid(existingBooking)) {
        Alert.alert("Already paid", "This booking is already paid.");
        exitPaymentFlow();
        return;
      }
    } else {
      if (!items.length) {
        Alert.alert("Empty cart", "Your cart is empty");
        navigation.goBack();
        return;
      }
      if (!selectedAddress) {
        Alert.alert("Address needed", "Please add an address");
        navigation.goBack();
        return;
      }
      if (!selectedDate || !selectedSlot) {
        Alert.alert("Slot needed", "Please select a date & slot");
        navigation.goBack();
        return;
      }
    }

    setLastMethod(preferredMethod);
    setSubmitting(true);
    try {
      if (!isExistingBooking) {
        try {
          const result = await dispatch(
            checkLocationServiceability({
              city: selectedAddress.city,
              pincode: selectedAddress.pincode,
            })
          ).unwrap();
          if (result && result.isServiceable === false) {
            Alert.alert(
              "Not serviceable",
              `Sorry, we don't serve ${selectedAddress.city} (${selectedAddress.pincode}) yet.`
            );
            return;
          }
        } catch {
          // fail-open
        }
      }

      const orderData = isExistingBooking
        ? existingOrderData
        : buildCartOrderData({
            items,
            summary,
            address: selectedAddress,
            user,
            selectedDate,
            selectedSlot,
            appliedCoupon,
          });

      const isCod = preferredMethod === "cod";
      const result = await dispatch(
        isExistingBooking
          ? completeExistingBookingPaymentFlowThunk({ orderData, preferredMethod })
          : isCod
            ? completeCODFlowThunk(orderData)
            : completePaymentFlowThunk({ orderData, preferredMethod })
      );

      const checkout = normalizeCheckoutResult(result);

      if (checkout.ok) {
        if (!isExistingBooking) {
          dispatch(clearCart());
        }

        const appointmentDate =
          selectedDate || orderData.booking?.date || orderData.bookingDetails?.date;
        const appointmentSlot =
          selectedSlot || orderData.booking?.slot || orderData.bookingDetails?.slot;

        const bookingForPayNow =
          isExistingBooking && existingBooking
            ? existingBooking
            : checkout.bookingId
              ? {
                  _id: checkout.bookingId,
                  orderNumber: checkout.orderNumber || orderData.orderNumber,
                  services: orderData.services,
                  pricing: {
                    subtotal: orderData.subtotal,
                    platformFee: orderData.platformFee,
                    taxAmount: orderData.taxAmount,
                    totalAmount: orderData.totalAmount,
                  },
                  bookingDetails: orderData.bookingDetails || orderData.booking,
                  paymentDetails: { paymentMethod: isCod ? "cod" : "online" },
                  paymentStatus: isCod ? "pending" : "completed",
                }
              : null;

        navigation.replace("BookingSummary", {
          status: isCod ? "confirmed_cod" : "confirmed_online",
          returnTo,
          existingBooking: bookingForPayNow,
          order: buildSummaryOrder(orderData, appointmentDate, appointmentSlot, {
            orderNumber: checkout.orderNumber || orderData.orderNumber,
            orderId: checkout.orderId || checkout.bookingId || checkout.orderNumber,
            bookingId: checkout.bookingId || checkout.orderId,
            paymentMethod: isCod ? "cash" : preferredMethod,
            paymentMethodLabel: getPaymentMethodLabel(isCod ? "cod" : preferredMethod),
          }),
        });
        return;
      }

      const reason = isCod
        ? getBookingFailCopy(checkout.error || result)
        : getOnlinePaymentFailCopy(checkout.error || result);

      navigation.replace("BookingSummary", {
        status: "payment_failed",
        statusTitle: reason.title,
        failMessage: reason.detail,
        retry: buildRetryParams(),
        order: buildSummaryOrder(
          orderData,
          selectedDate || orderData.booking?.date || orderData.bookingDetails?.date,
          selectedSlot || orderData.booking?.slot || orderData.bookingDetails?.slot,
          { paymentMethod: preferredMethod, paymentMethodLabel: getPaymentMethodLabel(preferredMethod) }
        ),
      });
    } catch (e) {
      const isCod = preferredMethod === "cod";
      const reason = isCod ? getBookingFailCopy(e) : getOnlinePaymentFailCopy(e);
      const orderData = isExistingBooking
        ? existingOrderData
        : buildCartOrderData({
            items,
            summary,
            address: selectedAddress,
            user,
            selectedDate,
            selectedSlot,
            appliedCoupon,
          });

      navigation.replace("BookingSummary", {
        status: "payment_failed",
        statusTitle: reason.title,
        failMessage: reason.detail,
        retry: buildRetryParams(),
        order: buildSummaryOrder(orderData, selectedDate, selectedSlot, {
          paymentMethod: preferredMethod,
          paymentMethodLabel: getPaymentMethodLabel(preferredMethod),
        }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          disabled={submitting}
        >
          <Ionicons name="chevron-back" size={22} color="#292929" />
        </TouchableOpacity>
        <Text style={styles.billTotal}>Bill total: {formatINRDecimal(billTotal)}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>RECOMMENDED</SectionLabel>
        <View style={styles.card}>
          <PayRow
            title="Google Pay UPI"
            logo={GPAY}
            disabled={submitting}
            onPress={() => runPayment("google_pay")}
          />
          <View style={styles.sep} />
          <PayRow
            title="PhonePe UPI"
            logo={PHONEPE}
            disabled={submitting}
            onPress={() => runPayment("phone_pe")}
          />
          <View style={styles.sep} />
          <PayRow
            title="BHIM UPI"
            logo={BHIM}
            disabled={submitting}
            onPress={() => runPayment("bhim")}
          />
        </View>

        <SectionLabel>CARDS</SectionLabel>
        <View style={styles.card}>
          <PayRow
            title="Add credit or debit cards"
            icon="card-outline"
            trailing="plus"
            disabled={submitting}
            onPress={() => runPayment("card")}
          />
        </View>

        <SectionLabel>PAY BY ANY UPI APP</SectionLabel>
        <View style={styles.card}>
          <PayRow
            title="Pay with UPI"
            logo={UPI}
            subtitle="Opens your installed UPI apps"
            disabled={submitting}
            onPress={() => runPayment("upi")}
          />
        </View>

        {showPayAfterService ? (
          <>
            <SectionLabel>PAY AFTER SERVICE</SectionLabel>
            <View style={styles.card}>
              <PayRow
                title="Pay After Service"
                icon="cash-outline"
                subtitle="Use cash or ask for QR"
                disabled={submitting}
                onPress={() => runPayment("cod")}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      {submitting ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Opening payment…</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F4F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  billTotal: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1C1C28",
    fontFamily: fonts.avenirHeavy,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
    color: "#8F90A6",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowDisabled: { opacity: 0.55 },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  logo: { width: 36, height: 28 },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C1C28",
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#8F90A6",
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ECECF0",
    marginLeft: 64,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textLabel,
  },

  failBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: "center",
  },
  failIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFF0F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  failTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1C1C28",
    marginBottom: 8,
  },
  failAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.md,
  },
  failMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  linkBtn: {
    marginTop: spacing.lg,
    paddingVertical: 10,
  },
  linkBtnText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: { opacity: 0.7 },
});
