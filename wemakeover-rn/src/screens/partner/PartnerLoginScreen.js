import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { colors, radius, spacing } from "../../theme/theme";
import { partnerLogin } from "../../features/partner/partnerAuthThunks";
import { clearPartnerAuthError } from "../../features/partner/partnerAuthSlice";
import { parseContact } from "../../utils/authContact";
import PartnerAuthField from "./PartnerAuthField";

const logoImage = require("../../../assets/auth/logo.png");
const watermarkImage = require("../../../assets/auth/login-watermark.jpg");

export default function PartnerLoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { status, error } = useSelector((s) => s.partnerAuth);

  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = contact.trim().length > 0 && password.length > 0;
  const isLoading = status === "loading";

  const onLogin = async () => {
    if (!canSubmit || isLoading) return;

    const parsed = parseContact(contact);
    if (!parsed.channel) {
      Toast.show({
        type: "error",
        text1: "Invalid contact",
        text2: "Enter a valid email or 10-digit mobile number",
      });
      return;
    }

    dispatch(clearPartnerAuthError());
    const result = await dispatch(
      partnerLogin({
        contact: parsed.channel === "email" ? parsed.email : parsed.phoneNumber,
        password,
      })
    );

    if (partnerLogin.fulfilled.match(result)) {
      Toast.show({
        type: "success",
        text1: "Welcome, Partner",
        text2: "Partner home is ready for the next build.",
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Image
          source={watermarkImage}
          style={[styles.watermark, { width: width * 0.55, height: width * 0.75 }]}
          resizeMode="cover"
          pointerEvents="none"
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textLabel} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Login</Text>
          <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Salon Partner</Text>
        </View>

        <View style={styles.form}>
          <PartnerAuthField
            label="Phone/email"
            value={contact}
            onChangeText={setContact}
            placeholder="Enter your email or mobile number"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PartnerAuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            showToggle
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((v) => !v)}
            error={status === "failed" ? error : null}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.loginBtn, (!canSubmit || isLoading) && styles.loginBtnDisabled]}
            onPress={onLogin}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.loginBtnText}>Login as Partner</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Don&apos;t have a partner account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("PartnerRegister")}
            >
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  watermark: {
    position: "absolute",
    top: 0,
    right: -spacing.md,
    opacity: 0.15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
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
    marginLeft: spacing.md,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textLabel,
    letterSpacing: -0.1,
  },
  headerLogo: {
    marginLeft: "auto",
    width: 143,
    height: 24,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.2,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.lg,
  },
  loginBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnDisabled: {
    opacity: 0.4,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
    letterSpacing: 0.21,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  footerMuted: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
});
