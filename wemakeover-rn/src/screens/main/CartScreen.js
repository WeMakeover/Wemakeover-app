import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { EmptyState, formatINRDecimal } from "../../components/ui";
import SheetOverlay from "../../components/SheetOverlay";
import RemoteImage from "../../components/RemoteImage";
import { getLocalDateString } from "../../utils/dateUtils";
import { isSlotDisabled } from "../../utils/slotUtils";
import { calculateServiceDuration } from "../../utils/paymentUtils";
import { getUserAddresses, setDefaultAddress } from "../../features/address/addressThunks";
import { selectAddresses, selectDefaultAddress } from "../../features/address/addressSlice";
import {
  fetchMinimumOrderValue,
  selectMinimumOrderValue,
} from "../../features/booking/bookingSlice";
import {
  selectCartItems,
  selectCartSummary,
  selectAppliedCoupon,
  selectCartSubtotal,
  selectWmCoins,
  increaseQuantity,
  decreaseQuantity,
  setAppliedCoupon,
  clearAppliedCoupon,
  setWmCoinBalance,
  setUseWmCoins,
  setWmCoinAmount,
  MAX_QUANTITY_PER_SERVICE,
} from "../../features/cart/cartSlice";
import { validateCouponApi, fetchAvailableCouponsApi } from "../../features/coupon/couponApi";
import { getMyReferralApi } from "../../features/referrals/referralApi";
import toast from "../../lib/toast";

const ALL_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];

const WEEKDAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function parseLocalDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function ordinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

function buildDays(count = 14) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      iso: getLocalDateString(d),
      weekday: WEEKDAYS_SHORT[d.getDay()],
      day: d.getDate(),
      month: MONTHS_SHORT[d.getMonth()],
    });
  }
  return days;
}

function formatSlotHeadline(dateIso, slot) {
  if (!dateIso || !slot) return "";
  const d = parseLocalDate(dateIso);
  const day = d.getDate();
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${day}${ordinalSuffix(day)} ${MONTHS_FULL[d.getMonth()]}, ${d.getFullYear()} • ${slot.replace(/\s/g, "")}`;
}

function formatApproxDuration(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  if (rem > 0) parts.push(`${rem} ${rem === 1 ? "min" : "mins"}`);
  if (parts.length === 0) return "0 mins";
  return parts.join(" ");
}

function formatAddressLine(address) {
  if (!address) return "";
  const line1 = [address.houseFlatNumber, address.streetAreaName || address.completeAddress]
    .filter((part) => part && part !== "N/A")
    .join(", ");
  const cityPart = [address.city, address.pincode ? `(${address.pincode})` : null].filter(Boolean).join(" ");
  return [line1, cityPart].filter(Boolean).join(", ");
}

function CartTotalPrice({ value, style, rupeeStyle, mainStyle, decStyle }) {
  const formatted = Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [main, decimals = "00"] = formatted.split(".");
  return (
    <Text style={style}>
      <Text style={rupeeStyle}>₹</Text>
      <Text style={mainStyle}>{main}</Text>
      <Text style={decStyle}>.{decimals}</Text>
    </Text>
  );
}

function PriceRow({ label, value, highlight }) {
  return (
    <View style={styles.breakupRow}>
      <Text style={[styles.breakupLabel, highlight && styles.breakupTotalLabel]}>{label}</Text>
      <Text style={[styles.breakupValue, highlight && styles.breakupTotalValue]}>{formatINRDecimal(value)}</Text>
    </View>
  );
}

function QtyStepper({ value, onIncrease, onDecrease, max = MAX_QUANTITY_PER_SERVICE }) {
  return (
    <View style={styles.qtyWrap}>
      <TouchableOpacity activeOpacity={0.8} onPress={onDecrease} style={styles.qtyBtnMinus}>
        <Ionicons name="remove" size={14} color="#9C9C9C" />
      </TouchableOpacity>
      <Text style={styles.qtyValue}>{value}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={value >= max}
        onPress={onIncrease}
        style={[styles.qtyBtnPlus, value >= max ? styles.qtyBtnDisabled : null]}
      >
        <Ionicons name="add" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function CartLineItem({ item, onIncrease, onDecrease }) {
  const title = [item.cardHeader, item.cardHeaderLine2].filter(Boolean).join(" ").trim() || "Service";
  const showTax = item.taxIncluded !== false;

  return (
    <View style={styles.cartItem}>
      {item.img ? (
        <RemoteImage uri={item.img} variant="list" style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
        </View>
      )}

      <View style={styles.cartItemBody}>
        {item.duration ? (
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={13} color={colors.textLabel} />
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        ) : null}
        <Text style={styles.itemName} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.itemPrice}>{formatINRDecimal(item.price)}</Text>
        {showTax ? <Text style={styles.taxText}>Tax Included</Text> : null}
      </View>

      <QtyStepper value={item.quantity} onIncrease={onIncrease} onDecrease={onDecrease} />
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const route = useRoute();
  const items = useSelector(selectCartItems);
  const summary = useSelector(selectCartSummary);
  const appliedCoupon = useSelector(selectAppliedCoupon);
  const cartSubtotal = useSelector(selectCartSubtotal);
  const wmCoins = useSelector(selectWmCoins);
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const addresses = useSelector(selectAddresses);
  const defaultAddress = useSelector(selectDefaultAddress);
  const minimumOrderValue = useSelector(selectMinimumOrderValue);

  const [coupon, setCoupon] = useState(appliedCoupon?.code || "");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [draftDate, setDraftDate] = useState(getLocalDateString());
  const [draftSlot, setDraftSlot] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [pickedAddress, setPickedAddress] = useState(null);
  const [draftAddressId, setDraftAddressId] = useState(null);

  const address = pickedAddress || defaultAddress || addresses[0] || null;
  const slotHeadline = formatSlotHeadline(selectedDate, selectedSlot);
  const totalDurationLabel = useMemo(() => formatApproxDuration(calculateServiceDuration(items)), [items]);
  const days = useMemo(() => buildDays(14), []);
  const now = useMemo(() => new Date(), [slotModalVisible]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getUserAddresses());
      dispatch(fetchMinimumOrderValue());
    }
  }, [dispatch, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.selectedAddress) {
        setPickedAddress(route.params.selectedAddress);
      }
    }, [route.params?.selectedAddress])
  );

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return undefined;
      let cancelled = false;
      getMyReferralApi()
        .then((data) => {
          if (!cancelled) {
            dispatch(setWmCoinBalance(data?.wmCoinBalance || 0));
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [dispatch, isAuthenticated])
  );

  useEffect(() => {
    if (appliedCoupon?.code) {
      setCoupon(appliedCoupon.code);
    }
  }, [appliedCoupon?.code]);

  // Referral Progress “Apply” — prefill / auto-apply bonus coupon from params.
  useFocusEffect(
    useCallback(() => {
      const pending = route.params?.applyCoupon;
      if (!pending) return undefined;

      const code = String(pending).trim().toUpperCase();
      setCoupon(code);
      setCouponError("");

      // Clear param so pull-to-focus doesn’t re-trigger forever.
      navigation.setParams?.({ applyCoupon: undefined });

      if (!isAuthenticated) {
        toast.error("Login to apply your referral bonus");
        return undefined;
      }

      if (cartSubtotal <= 0) {
        toast.success("Add paid services to apply your ₹1500 bonus");
        return undefined;
      }

      let cancelled = false;
      (async () => {
        setApplyingCoupon(true);
        try {
          const result = await validateCouponApi({ code, subtotal: cartSubtotal });
          if (cancelled) return;
          if (!result?.success) {
            setCouponError(result?.message || "Invalid coupon");
            dispatch(clearAppliedCoupon());
            return;
          }
          dispatch(
            setAppliedCoupon({
              code: result.data.coupon.code,
              discountAmount: result.data.discountAmount,
              message: result.message,
              pricing: result.data.pricing,
            })
          );
          toast.success(result.message || "Referral bonus applied");
        } catch (error) {
          if (!cancelled) {
            setCouponError(error.message || "Failed to apply coupon");
            dispatch(clearAppliedCoupon());
          }
        } finally {
          if (!cancelled) setApplyingCoupon(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      route.params?.applyCoupon,
      cartSubtotal,
      isAuthenticated,
      dispatch,
      navigation,
    ])
  );

  useEffect(() => {
    if (!isAuthenticated || cartSubtotal <= 0) {
      setAvailableCoupons([]);
      return undefined;
    }

    let cancelled = false;
    fetchAvailableCouponsApi(cartSubtotal)
      .then((result) => {
        if (!cancelled) setAvailableCoupons(result?.data?.coupons || []);
      })
      .catch(() => {
        if (!cancelled) setAvailableCoupons([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, cartSubtotal]);

  const openAddressPicker = () => {
    if (!isAuthenticated) {
      navigation.navigate("Profile");
      return;
    }
    dispatch(getUserAddresses());
    setDraftAddressId(address?._id || null);
    setAddressModalVisible(true);
  };

  const openSlotPicker = () => {
    setDraftDate(selectedSlot ? selectedDate : getLocalDateString());
    setDraftSlot(selectedSlot);
    setSlotModalVisible(true);
  };

  const applyCouponCode = async (codeInput) => {
    const code = String(codeInput ?? coupon).trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a coupon code");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Login to apply a coupon");
      navigation.navigate("Profile");
      return;
    }

    setCoupon(code);
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const result = await validateCouponApi({ code, subtotal: cartSubtotal });
      if (!result?.success) {
        setCouponError(result?.message || "Invalid coupon");
        dispatch(clearAppliedCoupon());
        return;
      }
      dispatch(
        setAppliedCoupon({
          code: result.data.coupon.code,
          discountAmount: result.data.discountAmount,
          message: result.message,
          pricing: result.data.pricing,
        })
      );
      toast.success(result.message || "Coupon applied");
    } catch (error) {
      setCouponError(error.message || "Failed to apply coupon");
      dispatch(clearAppliedCoupon());
    } finally {
      setApplyingCoupon(false);
    }
  };

  const onApplyCoupon = () => applyCouponCode(coupon);

  const onSelectAvailableCoupon = (availableCoupon) => {
    if (appliedCoupon?.code === availableCoupon.code) return;
    applyCouponCode(availableCoupon.code);
  };

  const onRemoveCoupon = () => {
    setCoupon("");
    setCouponError("");
    dispatch(clearAppliedCoupon());
  };

  const confirmSlot = () => {
    if (!draftSlot) {
      toast.error("Please select a time slot");
      return;
    }
    setSelectedDate(draftDate);
    setSelectedSlot(draftSlot);
    setSlotModalVisible(false);
  };

  const confirmAddress = () => {
    const chosen = addresses.find((a) => a._id === draftAddressId);
    if (chosen) {
      setPickedAddress(chosen);
      if (!chosen.isDefault) dispatch(setDefaultAddress(chosen._id));
    }
    setAddressModalVisible(false);
  };

  const belowMov = minimumOrderValue ? summary.subtotal < minimumOrderValue : false;
  const shortfall = minimumOrderValue ? minimumOrderValue - summary.subtotal : 0;

  const openPaymentPage = () => {
    if (!isAuthenticated) {
      navigation.navigate("Profile");
      return;
    }
    if (!address) {
      toast.error("Please add an address");
      openAddressPicker();
      return;
    }
    if (!selectedSlot) {
      openSlotPicker();
      return;
    }
    if (belowMov) {
      toast.error(`Add ${formatINRDecimal(shortfall)} more to checkout`);
      return;
    }
    navigation.navigate("PaymentMethods", {
      selectedAddress: address,
      selectedDate,
      selectedSlot,
    });
  };

  if (!items.length) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#292929" />
          </TouchableOpacity>
          <Text style={styles.title}>Cart</Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          subtitle="Browse services and add your favourites to get started."
          action="Explore services"
          onAction={() => navigation.navigate("Home")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color="#292929" />
        </TouchableOpacity>
        <Text style={styles.title}>Cart</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Address */}
        <TouchableOpacity activeOpacity={0.9} onPress={openAddressPicker} style={styles.addressCard}>
          <View style={styles.addressBody}>
            <Text style={styles.addressLabel}>Address</Text>
            {address ? (
              <Text style={styles.addressText} numberOfLines={2}>
                {formatAddressLine(address)}
              </Text>
            ) : (
              <Text style={styles.addressPlaceholder}>
                {isAuthenticated ? "Add or select an address" : "Login to add an address"}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color="#292d32" />
        </TouchableOpacity>

        {/* Date & slot */}
        <TouchableOpacity activeOpacity={0.85} onPress={openSlotPicker} style={styles.slotRow}>
          <Text style={styles.slotRowLabel} numberOfLines={1}>
            {selectedSlot ? slotHeadline : "Choose Your Date & Slot"}
          </Text>
          <View style={styles.slotAction}>
            <Text style={styles.slotActionText}>{selectedSlot ? "Modify" : "Pick A Slot"}</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Coupon */}
        <View style={styles.couponRow}>
          <TextInput
            value={coupon}
            onChangeText={(text) => {
              setCoupon(text.toUpperCase());
              setCouponError("");
            }}
            placeholder="Apply Coupon"
            placeholderTextColor="#C7C9D9"
            style={styles.couponInput}
            editable={!appliedCoupon}
          />
          {appliedCoupon ? (
            <TouchableOpacity activeOpacity={0.85} onPress={onRemoveCoupon} style={styles.couponActionBtn}>
              <Text style={styles.couponRemoveText}>Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onApplyCoupon}
              disabled={applyingCoupon}
              style={styles.couponActionBtn}
            >
              <Text style={styles.couponApplyText}>{applyingCoupon ? "..." : "Apply"}</Text>
            </TouchableOpacity>
          )}
        </View>
        {appliedCoupon ? (
          <Text style={styles.couponSuccess}>
            {appliedCoupon.code} applied · You save {formatINRDecimal(appliedCoupon.discountAmount)}
          </Text>
        ) : null}
        {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}

        {isAuthenticated && wmCoins.balance > 0 ? (
          <View style={styles.wmCoinCard}>
            <View style={styles.wmCoinTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.wmCoinTitle}>Use WM Coins</Text>
                <Text style={styles.wmCoinSub}>
                  Balance ₹{wmCoins.balance} · applies to services only (not fees)
                </Text>
              </View>
              <Switch
                value={Boolean(wmCoins.enabled)}
                onValueChange={(v) => dispatch(setUseWmCoins(v))}
                trackColor={{ false: "#E5E5E5", true: "#F7D4DC" }}
                thumbColor={wmCoins.enabled ? colors.primary : "#f4f3f4"}
              />
            </View>
            {wmCoins.enabled ? (
              <View style={styles.wmCoinAmountRow}>
                <Text style={styles.wmCoinAmountLabel}>Amount</Text>
                <TextInput
                  value={String(summary.wmCoinAmount || wmCoins.amount || 0)}
                  onChangeText={(t) => {
                    const digits = t.replace(/[^\d]/g, "");
                    dispatch(setWmCoinAmount(digits === "" ? 0 : Number(digits)));
                  }}
                  keyboardType="number-pad"
                  style={styles.wmCoinInput}
                  maxLength={6}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {!appliedCoupon && availableCoupons.length > 0 ? (
          <View style={styles.availableCoupons}>
            {availableCoupons.slice(0, 3).map((c) => (
              <TouchableOpacity
                key={c.id || c.code}
                activeOpacity={0.85}
                onPress={() => onSelectAvailableCoupon(c)}
                style={styles.offerChip}
              >
                <Ionicons name="pricetag-outline" size={12} color={colors.primary} />
                <Text style={styles.offerChipText} numberOfLines={1}>
                  {c.code} · {c.offerLabel || c.savingsLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Items */}
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionHeading}>Items In Cart </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <View key={item.id}>
              <CartLineItem
                item={item}
                onIncrease={() => dispatch(increaseQuantity(item.id))}
                onDecrease={() => dispatch(decreaseQuantity(item.id))}
              />
              {index < items.length - 1 ? <View style={styles.itemDivider} /> : null}
            </View>
          ))}
        </View>

        {/* Price breakup — scrolls with cart; sits flush above sticky pay bar */}
        <View style={styles.breakupSection}>
          <Text style={styles.sectionHeading}>Price Breakup</Text>
          <View style={styles.breakupBody}>
            <PriceRow label="Subtotal:" value={summary.subtotal} />
            {summary.discountAmount > 0 ? (
              <PriceRow label={`Coupon (${appliedCoupon?.code || ""}):`} value={-summary.discountAmount} />
            ) : null}
            {summary.wmCoinAmount > 0 ? (
              <PriceRow label="WM Coins:" value={-summary.wmCoinAmount} />
            ) : null}
            <PriceRow label="Disposables & Transportation Charges:" value={summary.platformFee} />
            <PriceRow label="Total:" value={summary.total} highlight />
          </View>
        </View>
        </ScrollView>

        {/* Sticky pay bar — sibling of scroll, no absolute gap */}
        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.85} onPress={openPaymentPage} style={styles.payUsing}>
            <View style={styles.payUsingTop}>
              <Text style={styles.payUsingLabel}>Pay Using</Text>
              <Ionicons name="chevron-up" size={14} color="#292929" />
            </View>
            <View style={styles.payUsingMethod}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
              <Text style={styles.payUsingMethodText}>UPI / Cards</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={openPaymentPage} style={styles.payBtn}>
            <CartTotalPrice
              value={summary.total}
              style={styles.payBtnPrice}
              rupeeStyle={styles.payBtnRupee}
              mainStyle={styles.payBtnMain}
              decStyle={styles.payBtnDec}
            />
            <Text style={styles.payBtnText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slot picker sheet */}
      <SheetOverlay visible={slotModalVisible} onClose={() => setSlotModalVisible(false)}>
        <View style={styles.slotSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Pick Your Slot</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
              <Text style={styles.sheetOverline}>SELECT DATE</Text>
              <Text style={styles.sheetHeading}>When should we arrive?</Text>
              <Text style={styles.sheetApprox}>
                Your service should takes approx.{" "}
                <Text style={styles.sheetApproxStrong}>{totalDurationLabel}</Text>
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateRow}
              >
                {days.map((d) => {
                  const active = draftDate === d.iso;
                  if (active) {
                    return (
                      <LinearGradient
                        key={d.iso}
                        colors={["#CC2B52", "#FF99B2"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.dateCardActive}
                      >
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => {
                            setDraftDate(d.iso);
                            setDraftSlot("");
                          }}
                          style={styles.dateCardInner}
                        >
                          <Text style={styles.dateWeekdayActive}>{d.weekday}</Text>
                          <Text style={styles.dateDayActive}>{d.day}</Text>
                          <Text style={styles.dateMonthActive}>{d.month}</Text>
                        </TouchableOpacity>
                      </LinearGradient>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={d.iso}
                      activeOpacity={0.9}
                      onPress={() => {
                        setDraftDate(d.iso);
                        setDraftSlot("");
                      }}
                      style={styles.dateCard}
                    >
                      <Text style={styles.dateWeekday}>{d.weekday}</Text>
                      <Text style={styles.dateDay}>{d.day}</Text>
                      <Text style={styles.dateMonth}>{d.month}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.sheetOverlineTime, { marginTop: spacing.lg }]}>SELECT TIME</Text>
              <Text style={styles.sheetSubHeading}>Pick your start time</Text>

              <View style={styles.timeGrid}>
                {ALL_SLOTS.map((slot) => {
                  const disabled = isSlotDisabled(slot, now, draftDate);
                  const active = draftSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      disabled={disabled}
                      activeOpacity={0.85}
                      onPress={() => setDraftSlot(slot)}
                      style={[
                        styles.timeSlot,
                        active && styles.timeSlotActive,
                        disabled && styles.timeSlotDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          active && styles.timeSlotTextActive,
                          disabled && styles.timeSlotTextDisabled,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity activeOpacity={0.9} onPress={confirmSlot} style={styles.sheetDoneBtn}>
              <Text style={styles.sheetDoneText}>Done</Text>
            </TouchableOpacity>
        </View>
      </SheetOverlay>

      {/* Address picker sheet */}
      <SheetOverlay
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.addressSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.addressSheetTitle}>My Address</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.addressSheetList}>
              {addresses.length === 0 ? (
                <Text style={styles.addressEmpty}>No saved addresses yet.</Text>
              ) : (
                addresses.map((addr, index) => {
                  const active = draftAddressId === addr._id;
                  return (
                    <View key={addr._id}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setDraftAddressId(addr._id)}
                        style={styles.addressOption}
                      >
                        <Text style={styles.addressOptionText}>{formatAddressLine(addr)}</Text>
                        <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                          {active ? <View style={styles.radioInner} /> : null}
                        </View>
                      </TouchableOpacity>
                      {index < addresses.length - 1 ? <View style={styles.addressOptionDivider} /> : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={confirmAddress}
              disabled={!draftAddressId}
              style={[styles.sheetDoneBtn, !draftAddressId && styles.sheetDoneBtnDisabled]}
            >
              <Text style={styles.sheetDoneText}>Done</Text>
            </TouchableOpacity>
        </View>
      </SheetOverlay>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: "#0C0C0D",
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 24,
    fontWeight: "700",
    color: "#292929",
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 36 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    flexGrow: 1,
  },

  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.canvas,
    borderBottomWidth: 0.5,
    borderBottomColor: "#FFFFFF",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    ...cardShadow,
  },
  addressBody: { flex: 1, gap: spacing.sm },
  addressLabel: { fontSize: 14, fontWeight: "700", color: "#292d32" },
  addressText: { fontSize: 12, color: colors.textLabel, fontWeight: "500", lineHeight: 18 },
  addressPlaceholder: { fontSize: 12, color: "#C7C9D9" },

  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  slotRowLabel: { flex: 1, fontSize: 14, fontWeight: "800", color: "#292d32" },
  slotAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  slotActionText: { fontSize: 16, fontWeight: "800", color: colors.primary },

  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "#8F90A6",
    borderRadius: radius.sm,
    paddingLeft: spacing.md,
    paddingRight: 6,
    height: 46,
  },
  couponInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  couponActionBtn: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    height: "100%",
  },
  couponApplyText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  couponRemoveText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  couponSuccess: { marginTop: 6, fontSize: 12, color: colors.success, fontWeight: "600" },
  couponError: { marginTop: 6, fontSize: 12, color: colors.error },
  wmCoinCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#FFF8FA",
    borderWidth: 1,
    borderColor: "#F0D0DA",
  },
  wmCoinTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  wmCoinTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  wmCoinSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  wmCoinAmountRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wmCoinAmountLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textLabel,
  },
  wmCoinInput: {
    minWidth: 90,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#E5D0D6",
    backgroundColor: "#fff",
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  availableCoupons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  offerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#F2F2F5",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  offerChipText: { fontSize: 11, fontWeight: "600", color: "#1C1C28" },

  itemsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  sectionHeading: { fontSize: 14, fontWeight: "800", color: "#292d32" },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  itemsList: { marginTop: spacing.md, gap: spacing.sm },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  thumb: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: "#EFE9E4" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  cartItemBody: { flex: 1, minWidth: 0, gap: 4 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  durationText: { color: colors.textLabel, fontSize: 10, fontWeight: "500", lineHeight: 16 },
  itemName: { color: "#1C1C28", fontSize: 12, fontWeight: "800", lineHeight: 16 },
  itemPrice: { color: colors.primary, fontSize: 12, fontWeight: "700", letterSpacing: 0.25 },
  taxText: { color: colors.primary, fontSize: 8, lineHeight: 10 },
  itemDivider: { height: 0.5, backgroundColor: "#E6E6EB", marginVertical: spacing.sm },

  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtnMinus: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#9C9C9C",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnPlus: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyValue: { color: colors.textLabel, fontSize: 14, fontWeight: "600", minWidth: 12, textAlign: "center" },

  breakupSection: {
    marginTop: "auto",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  breakupBody: { marginTop: spacing.md, gap: 12 },
  breakupRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  breakupLabel: { fontSize: 14, color: colors.textLabel, fontWeight: "500", flex: 1, marginRight: spacing.sm },
  breakupValue: { fontSize: 14, color: colors.textLabel, fontWeight: "500" },
  breakupTotalLabel: { color: colors.primary, fontWeight: "800" },
  breakupTotalValue: { color: colors.primary, fontWeight: "800" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EAEAEA",
  },
  payUsing: { gap: 6 },
  payUsingTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  payUsingLabel: { fontSize: 14, fontWeight: "800", color: "#292929" },
  payUsingMethod: { flexDirection: "row", alignItems: "center", gap: 8 },
  payUsingMethodText: { fontSize: 12, color: "#3E3E3E", fontWeight: "600" },

  payBtn: {
    height: 48,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  payBtnPrice: { color: "#FFFFFF" },
  payBtnRupee: { fontSize: 14, fontWeight: "900" },
  payBtnMain: { fontSize: 16, fontWeight: "900" },
  payBtnDec: { fontSize: 10, fontWeight: "900" },
  payBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(22, 22, 24, 0.72)", justifyContent: "flex-end" },

  slotSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "88%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E6E6EB",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontFamily: fonts.avenirNextBold, fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: spacing.lg },
  sheetOverline: { fontSize: 11, fontWeight: "800", color: colors.textLabel, letterSpacing: 1.1 },
  sheetOverlineTime: { fontFamily: fonts.avenirHeavy, fontSize: 11, fontWeight: "800", color: colors.primary, letterSpacing: 1.1 },
  sheetHeading: { fontFamily: fonts.avenirHeavy, fontSize: 21, fontWeight: "900", color: "#000000", marginTop: spacing.md, letterSpacing: -0.4 },
  sheetApprox: { fontFamily: fonts.interRegular, fontSize: 13, color: "#7C6FA0", marginTop: spacing.md, lineHeight: 19.5 },
  sheetApproxStrong: { fontFamily: fonts.interBold, color: colors.primary },
  sheetSubHeading: { fontFamily: fonts.avenirHeavy, fontSize: 20, fontWeight: "800", color: "#1A1630", marginTop: 4, letterSpacing: -0.4 },

  dateRow: { gap: 12, paddingVertical: spacing.md },
  dateCard: {
    width: 107.005,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#7C5CFC",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateCardActive: {
    width: 107.005,
    borderRadius: radius.lg,
    shadowColor: "#CC2B52",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dateCardInner: { paddingVertical: 14, alignItems: "center" },
  dateWeekday: { fontSize: 10, fontWeight: "700", color: "#7F7F7F", letterSpacing: 1 },
  dateDay: { fontSize: 28, fontWeight: "800", color: "#292d32", letterSpacing: -0.8, marginVertical: 2 },
  dateMonth: { fontSize: 10, fontWeight: "600", color: "#7F7F7F" },
  dateWeekdayActive: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.72)", letterSpacing: 1 },
  dateDayActive: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.8, marginVertical: 2 },
  dateMonthActive: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.65)" },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  timeSlot: {
    width: "31.5%",
    height: 50,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(124,92,252,0.12)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotActive: { backgroundColor: "#FFEAEF", borderColor: colors.primary },
  timeSlotDisabled: { backgroundColor: "#F3F4F6", borderColor: "#F3F4F6" },
  timeSlotText: { fontFamily: fonts.interMedium, fontSize: 13, color: "#4A4068" },
  timeSlotTextActive: { fontFamily: fonts.interBold, color: colors.primary },
  timeSlotTextDisabled: { color: "#B3B3B3" },

  sheetDoneBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl + spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneBtnDisabled: { opacity: 0.5 },
  sheetDoneText: { fontFamily: fonts.avenirHeavy, color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  addressSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "80%",
  },
  addressSheetTitle: { fontSize: 14, fontWeight: "800", color: colors.primary, marginBottom: spacing.lg },
  addressSheetList: { flexGrow: 0 },
  addressEmpty: { fontSize: 13, color: colors.muted, paddingVertical: spacing.md },
  addressOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  addressOptionText: { flex: 1, fontSize: 12, color: colors.textLabel, fontWeight: "500", lineHeight: 18 },
  addressOptionDivider: { height: 0.5, backgroundColor: "#E6E6EB" },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#636366",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
