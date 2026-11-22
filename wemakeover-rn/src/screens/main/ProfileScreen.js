import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { addEmailThunk, logoutUser, requestPhoneUpdateOtpThunk, updatePhoneThunk } from "../../features/auth/authThunks";
import { getMyReferralApi } from "../../features/referrals/referralApi";
import { bookingApi } from "../../features/booking/bookingApi";
import { selectUnreadCount } from "../../features/notifications/notificationsSlice";
import UpdatePhoneSheet from "../../components/account/UpdatePhoneSheet";
import AddEmailSheet from "../../components/account/AddEmailSheet";

const FREE_SERVICE_GOAL = 3;
const chevronRight = require("../../../assets/home/chevron-right.png");

function visibleEmail(email) {
  const value = String(email || "").trim();
  if (!value || /@mobile\.wemakeover\.app$/i.test(value)) return "";
  return value;
}

function formatPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `(+91) ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    return `(+91) ${digits.slice(2)}`;
  }
  return phone;
}

function ActionRow({ icon, label, onPress, right, labelColor, badgeCount }) {
  const showBadge = Number(badgeCount) > 0;
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        {showBadge ? (
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.actionLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
      {right != null ? right : <Image source={chevronRight} style={styles.chevron} resizeMode="contain" />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, status } = useSelector((s) => s.auth);
  const unreadCount = useSelector(selectUnreadCount);
  const [wmBalance, setWmBalance] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [phoneSheetVisible, setPhoneSheetVisible] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const shownEmail = visibleEmail(user?.email);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [referral, statsRes] = await Promise.all([
            getMyReferralApi().catch(() => null),
            bookingApi.getBookingStats().catch(() => null),
          ]);
          if (!alive) return;
          if (referral?.wmCoinBalance != null) {
            setWmBalance(Number(referral.wmCoinBalance) || 0);
          }
          const completed =
            statsRes?.data?.completedBookings ??
            statsRes?.completedBookings ??
            0;
          setCompletedOrders(Number(completed) || 0);
        } catch {
          // Keep last known values
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const filledSegments = completedOrders % FREE_SERVICE_GOAL;

  const onLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => dispatch(logoutUser()) },
    ]);
  };

  const goHome = () => {
    navigation.getParent()?.navigate("Home");
  };

  const onSendPhoneCode = async (phoneNumber) => {
    setPhoneSending(true);
    try {
      const result = await dispatch(requestPhoneUpdateOtpThunk(phoneNumber));
      if (requestPhoneUpdateOtpThunk.fulfilled.match(result)) {
        return { ok: true };
      }
      return { ok: false, message: result.payload || "Failed to send code" };
    } finally {
      setPhoneSending(false);
    }
  };

  const onSaveEmail = async (email) => {
    setEmailSaving(true);
    try {
      const result = await dispatch(addEmailThunk(email));
      if (addEmailThunk.fulfilled.match(result)) {
        setEmailSheetVisible(false);
        return { ok: true };
      }
      return { ok: false, message: result.payload || "Could not add email" };
    } finally {
      setEmailSaving(false);
    }
  };

  const onVerifyPhoneCode = async ({ phoneNumber, accessToken }) => {
    setPhoneVerifying(true);
    try {
      const result = await dispatch(updatePhoneThunk({ phoneNumber, accessToken }));
      if (updatePhoneThunk.fulfilled.match(result)) {
        setPhoneSheetVisible(false);
        return { ok: true };
      }
      return { ok: false, message: result.payload || "Wrong code entered" };
    } finally {
      setPhoneVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goHome} activeOpacity={0.85} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textLabel} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name || "User"}
              </Text>
              <TouchableOpacity
                style={styles.phoneRow}
                onPress={() => setPhoneSheetVisible(true)}
                activeOpacity={0.75}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.profilePhone,
                    !user?.phoneNumber && styles.profilePhoneMuted,
                  ]}
                >
                  {user?.phoneNumber
                    ? formatPhone(user.phoneNumber)
                    : "Add phone number"}
                </Text>
                <Ionicons
                  name="create-outline"
                  size={14}
                  color={colors.primary}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
              {shownEmail ? (
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {shownEmail}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.emailRow}
                  onPress={() => setEmailSheetVisible(true)}
                  activeOpacity={0.75}
                  hitSlop={8}
                >
                  <Text style={[styles.profileEmail, styles.profilePhoneMuted]}>
                    Add email
                  </Text>
                  <Ionicons
                    name="create-outline"
                    size={14}
                    color={colors.primary}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || "U").charAt(0).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressSeg,
                  i < filledSegments ? styles.progressSegFilled : styles.progressSegEmpty,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressHint}>
            Complete {FREE_SERVICE_GOAL} orders and get a service completely free of your choice!
            Renews unlimited times!
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Profile Actions</Text>
        <View style={styles.actionsCard}>
          <ActionRow
            icon="wallet-outline"
            label="WM Coins"
            labelColor={colors.primary}
            onPress={() => navigation.navigate("ReferEarn")}
            right={
              <View style={styles.coinsRight}>
                <Ionicons name="ellipse" size={16} color="#E8B923" />
                <Text style={styles.coinsValue}>₹{Number(wmBalance).toLocaleString("en-IN")}</Text>
              </View>
            }
          />
          <View style={styles.divider} />
          <ActionRow
            icon="people-outline"
            label="Refer & Earn"
            onPress={() => navigation.navigate("ReferEarn")}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="home-outline"
            label="My Address"
            onPress={() => navigation.navigate("AddressList")}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="star-outline"
            label="Write a review"
            onPress={() => navigation.navigate("MyReviews")}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="call-outline"
            label="Contact Us"
            onPress={() => navigation.navigate("Contact")}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="notifications-outline"
            label="Notifications"
            badgeCount={unreadCount}
            onPress={() => navigation.navigate("Notifications")}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="log-out-outline"
            label="Log out"
            labelColor={colors.error}
            onPress={onLogout}
          />
        </View>

        {status === "loading" ? <Text style={styles.loggingOut}>Logging out...</Text> : null}
      </ScrollView>

      <AddEmailSheet
        visible={emailSheetVisible}
        onClose={() => setEmailSheetVisible(false)}
        onSave={onSaveEmail}
        saving={emailSaving}
      />
      <UpdatePhoneSheet
        visible={phoneSheetVisible}
        onClose={() => setPhoneSheetVisible(false)}
        currentPhone={user?.phoneNumber}
        onSendCode={onSendPhoneCode}
        onVerify={onVerifyPhoneCode}
        sending={phoneSending}
        verifying={phoneVerifying}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvas,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
    fontWeight: "600",
    color: colors.textDark,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  profileCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  profileName: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
    color: colors.primary,
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  profilePhone: {
    fontFamily: fonts.interMedium,
    fontSize: 13,
    color: colors.textDark,
  },
  profilePhoneMuted: {
    color: colors.muted,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  profileEmail: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontFamily: fonts.poppinsBold,
    fontSize: 28,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.lg,
  },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  progressSegFilled: {
    backgroundColor: colors.primary,
  },
  progressSegEmpty: {
    backgroundColor: "#E8E8E8",
  },
  progressHint: {
    marginTop: spacing.sm,
    fontFamily: fonts.interRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 16,
    color: colors.textDark,
  },
  actionsCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  actionIconWrap: {
    width: 28,
    marginRight: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  iconBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  actionLabel: {
    flex: 1,
    fontFamily: fonts.poppinsMedium,
    fontSize: 15,
    color: colors.textDark,
  },
  chevron: {
    width: 16,
    height: 16,
    tintColor: colors.muted,
  },
  coinsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coinsValue: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  loggingOut: {
    textAlign: "center",
    color: colors.muted,
    marginTop: spacing.lg,
  },
});
