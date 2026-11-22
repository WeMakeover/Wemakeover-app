import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { colors, radius, spacing, typography } from "../../theme/theme";
import { partnerLogout } from "../../features/partner/partnerAuthSlice";

const logoImage = require("../../../assets/auth/logo.png");

/**
 * Temporary partner landing — replaced by real partner home / jobs in next phase.
 * Stays outside customer MainTabs on purpose.
 */
export default function PartnerHomeScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const partner = useSelector((s) => s.partnerAuth.partner);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <Image source={logoImage} style={styles.logo} resizeMode="contain" />

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Salon Partner</Text>
      </View>

      <Text style={styles.title}>
        Welcome{partner?.name ? `, ${partner.name}` : ""}
      </Text>
      <Text style={styles.subtitle}>
        Your partner space is ready. Jobs, earnings, and schedule land here in the next
        build — kept fully separate from the customer app.
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.logoutBtn}
        onPress={() => dispatch(partnerLogout())}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 143,
    height: 24,
    marginBottom: spacing.lg,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.2,
  },
  title: {
    ...typography.headingLg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
});
