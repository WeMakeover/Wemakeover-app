import React, { useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { colors, radius, spacing } from "../../theme/theme";
import { partnerRegister } from "../../features/partner/partnerAuthThunks";
import { clearPartnerAuthError } from "../../features/partner/partnerAuthSlice";
import { EMAIL_RE, PHONE_RE, parseContact } from "../../utils/authContact";
import PartnerAuthField from "./PartnerAuthField";

const logoImage = require("../../../assets/auth/logo.png");

const PASSWORD_RE =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export default function PartnerRegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { status, error: serverError } = useSelector((s) => s.partnerAuth);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const passwordValid = PASSWORD_RE.test(password);
  const passwordHint =
    password.length > 0 && !passwordValid
      ? "Must contain number, special character, upper & lower case"
      : null;

  const contactParsed = useMemo(() => parseContact(contact), [contact]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) return null;
    if (password !== confirmPassword) return "Password doesn't matched";
    return null;
  }, [password, confirmPassword]);

  const contactError = useMemo(() => {
    const trimmed = contact.trim();
    if (!trimmed) return null;
    if (submitted || contact.includes("@")) {
      if (contactParsed.channel === "email" && !EMAIL_RE.test(trimmed)) {
        return "Email id is entered wrong";
      }
      if (contactParsed.channel === "phone" && !PHONE_RE.test(contactParsed.phoneNumber)) {
        return "Phone number is entered wrong";
      }
      if (!contactParsed.channel) {
        return "Enter a valid email or 10-digit mobile number";
      }
    }
    if (submitted && status === "failed" && serverError) {
      return serverError;
    }
    return null;
  }, [contact, contactParsed, submitted, status, serverError]);

  const contactValid =
    contactParsed.channel === "email"
      ? EMAIL_RE.test(contact.trim())
      : contactParsed.channel === "phone"
        ? PHONE_RE.test(contactParsed.phoneNumber)
        : false;

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    contactValid &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    passwordValid &&
    password === confirmPassword;

  const isLoading = status === "loading";

  const onRegister = async () => {
    setSubmitted(true);
    if (!canSubmit || isLoading) return;

    dispatch(clearPartnerAuthError());
    const result = await dispatch(
      partnerRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contact:
          contactParsed.channel === "email"
            ? contactParsed.email
            : contactParsed.phoneNumber,
        password,
      })
    );

    if (partnerRegister.fulfilled.match(result)) {
      Toast.show({
        type: "success",
        text1: "Partner account ready",
        text2: "Welcome — partner home opens next.",
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textLabel} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Register</Text>
          <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Salon Partner</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <PartnerAuthField
              style={styles.nameField}
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              autoCapitalize="words"
            />
            <PartnerAuthField
              style={styles.nameField}
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              autoCapitalize="words"
            />
          </View>

          <PartnerAuthField
            label="Phone/email"
            value={contact}
            onChangeText={setContact}
            placeholder="Enter email or 10-digit mobile"
            keyboardType="email-address"
            autoCapitalize="none"
            error={contactError}
          />

          <PartnerAuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create password"
            secureTextEntry
            showToggle
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((v) => !v)}
            error={passwordHint}
          />

          <PartnerAuthField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
            showToggle
            visible={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword((v) => !v)}
            error={confirmError}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.registerBtn, (!canSubmit || isLoading) && styles.registerBtnDisabled]}
            onPress={onRegister}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.registerBtnText}>Register as Partner</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Already a partner? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("PartnerLogin")}
            >
              <Text style={styles.footerLink}>Login</Text>
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
  nameRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
  },
  actions: {
    gap: spacing.lg,
  },
  registerBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  registerBtnDisabled: {
    opacity: 0.4,
  },
  registerBtnText: {
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
