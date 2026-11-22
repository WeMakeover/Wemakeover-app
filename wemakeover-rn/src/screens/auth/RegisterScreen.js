import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { colors, radius, spacing } from "../../theme/theme";
import { validateReferralCodeApi } from "../../features/referrals/referralApi";
import { checkRegisterAvailabilityApi } from "../../features/auth/authApi";
import { msg91SendOtp } from "../../lib/msg91Otp";
import { EMAIL_RE, PHONE_RE } from "../../utils/authContact";

const PASSWORD_RE =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

function AuthField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  showToggle,
  visible,
  onToggleVisibility,
  keyboardType,
  autoCapitalize,
  error,
  success,
  hint,
  onBlur,
  style,
}) {
  const borderStyle = error
    ? styles.inputError
    : success
      ? styles.inputSuccess
      : null;

  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <View style={[styles.inputWrap, borderStyle]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
        {showToggle ? (
          <TouchableOpacity onPress={onToggleVisibility} hitSlop={8} style={styles.eyeBtn}>
            <Ionicons
              name={visible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.textLabel}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {hint && !error && !success ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {success ? (
        <View style={styles.fieldSuccessRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.otpSuccess} />
          <Text style={styles.fieldSuccessText}>{success}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.fieldErrorRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.errorStrong} />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function RegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { status, error: serverError } = useSelector((s) => s.auth);

  const routeRef = route?.params?.ref ? String(route.params.ref).trim().toUpperCase() : "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(routeRef);
  const [referralStatus, setReferralStatus] = useState("idle"); // idle | validating | valid | invalid
  const [referralMessage, setReferralMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  const referralRequestId = useRef(0);
  const prefillValidated = useRef(false);

  const passwordValid = PASSWORD_RE.test(password);
  const passwordHint =
    password.length > 0 && !passwordValid
      ? "Must contain number, special character, upper & lower case "
      : null;

  const phoneDigits = phone.replace(/\D/g, "").slice(0, 10);
  const emailTrimmed = email.trim().toLowerCase();

  const confirmError = useMemo(() => {
    if (!confirmPassword) return null;
    if (password !== confirmPassword) return "Password doesn't matched ";
    return null;
  }, [password, confirmPassword]);

  const phoneFieldError =
    phoneError ||
    (submitted && phoneDigits.length > 0 && !PHONE_RE.test(phoneDigits)
      ? "Phone number is entered wrong"
      : "");

  const emailFieldError =
    emailError ||
    (submitted && emailTrimmed && !EMAIL_RE.test(emailTrimmed)
      ? "Email id is entered wrong"
      : "");

  const referralBlocking =
    referralCode.trim().length > 0 &&
    (referralStatus === "invalid" || referralStatus === "validating");

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    PHONE_RE.test(phoneDigits) &&
    (!emailTrimmed || EMAIL_RE.test(emailTrimmed)) &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    passwordValid &&
    password === confirmPassword &&
    !referralBlocking;

  const isLoading = sendingCode;

  const validateReferral = useCallback(async (code) => {
    const trimmed = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (!trimmed) {
      setReferralStatus("idle");
      setReferralMessage("");
      return { valid: true, empty: true };
    }

    const requestId = ++referralRequestId.current;
    setReferralStatus("validating");
    setReferralMessage("");

    const result = await validateReferralCodeApi(trimmed);
    if (requestId !== referralRequestId.current) {
      return result;
    }

    if (result.valid) {
      setReferralStatus("valid");
      setReferralMessage(result.message || "Referral code applied successfully");
      if (result.referralCode && result.referralCode !== trimmed) {
        setReferralCode(result.referralCode);
      }
    } else {
      setReferralStatus("invalid");
      setReferralMessage(result.message || "Invalid referral code");
    }
    return result;
  }, []);

  // Prefill from deep link /register?ref=CODE and validate once
  useEffect(() => {
    if (!routeRef || prefillValidated.current) return;
    prefillValidated.current = true;
    validateReferral(routeRef);
  }, [routeRef, validateReferral]);

  useEffect(() => {
    if (status === "failed" && serverError && submitted) {
      const lower = String(serverError).toLowerCase();
      if (lower.includes("referral")) {
        setReferralStatus("invalid");
        setReferralMessage(serverError);
      }
    }
  }, [status, serverError, submitted]);

  const onReferralChange = (text) => {
    const next = String(text || "").toUpperCase().replace(/\s+/g, "");
    setReferralCode(next);
    if (referralStatus !== "idle") {
      setReferralStatus("idle");
      setReferralMessage("");
    }
  };

  const onReferralBlur = () => {
    if (!referralCode.trim()) {
      setReferralStatus("idle");
      setReferralMessage("");
      return;
    }
    validateReferral(referralCode);
  };

  const onSignup = async () => {
    setSubmitted(true);
    if (!canSubmit || isLoading) return;

    const code = referralCode.trim().toUpperCase();
    if (code && referralStatus !== "valid") {
      const result = await validateReferral(code);
      if (!result.valid) return;
    }

    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    setPhoneError("");
    setEmailError("");
    setSendingCode(true);
    try {
      await checkRegisterAvailabilityApi({
        phoneNumber: phoneDigits,
        email: emailTrimmed,
      });
      const sent = await msg91SendOtp(phoneDigits);
      if (!sent.ok || !sent.reqId) {
        setPhoneError(sent.message || "Failed to send code");
        return;
      }
      navigation.navigate("Otp", {
        provider: "msg91",
        channel: "phone",
        phoneNumber: phoneDigits,
        email: emailTrimmed,
        destination: `+91-${phoneDigits}`,
        reqId: sent.reqId,
        signup: {
          name,
          email: emailTrimmed,
          phoneNumber: phoneDigits,
          password,
          confirmPassword,
          referralCode: code,
        },
      });
    } catch (err) {
      const message = err?.message || "Failed to send code";
      if (/email/i.test(message)) setEmailError(message);
      else setPhoneError(message);
    } finally {
      setSendingCode(false);
    }
  };

  const referralError = referralStatus === "invalid" ? referralMessage : null;
  const referralSuccess = referralStatus === "valid" ? referralMessage : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
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
          <Text style={styles.headerTitle}>Register</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <AuthField
              label="First Name"
              required
              value={firstName}
              onChangeText={setFirstName}
              placeholder="John"
              autoCapitalize="words"
              style={styles.nameField}
            />
            <AuthField
              label="Last Name"
              required
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              autoCapitalize="words"
              style={styles.nameField}
            />
          </View>

          <AuthField
            label="Phone"
            required
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/\D/g, "").slice(0, 10));
              setPhoneError("");
            }}
            placeholder="Enter your mobile number"
            keyboardType="phone-pad"
            error={phoneFieldError}
          />

          <AuthField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailFieldError}
          />

          <AuthField
            label="Password"
            required
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            showToggle
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((v) => !v)}
            hint={passwordHint}
          />

          <AuthField
            label="Confirm Password"
            required
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
            showToggle
            visible={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword((v) => !v)}
            error={confirmError}
          />

          <AuthField
            label="Referral Code"
            value={referralCode}
            onChangeText={onReferralChange}
            onBlur={onReferralBlur}
            placeholder="Enter referral code"
            autoCapitalize="characters"
            error={referralError}
            success={referralSuccess}
            hint={
              referralStatus === "validating"
                ? "Checking referral code…"
                : "Have a friend’s code? Enter it here."
            }
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.registerBtn, (!canSubmit || isLoading) && styles.registerBtnDisabled]}
            onPress={onSignup}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.registerBtnText}>Register</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: spacing.lg,
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
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textDark,
    letterSpacing: 0.14,
  },
  requiredMark: {
    color: colors.primary,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.borderMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: colors.errorStrong,
  },
  inputSuccess: {
    borderColor: colors.otpSuccess,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.inputText,
    letterSpacing: 0.14,
    padding: 0,
  },
  eyeBtn: {
    marginLeft: spacing.sm,
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.primary,
    letterSpacing: 0.12,
    lineHeight: 22,
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  fieldErrorText: {
    flex: 1,
    fontSize: 14,
    color: colors.errorStrong,
    letterSpacing: 0.14,
    lineHeight: 22,
  },
  fieldSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  fieldSuccessText: {
    flex: 1,
    fontSize: 14,
    color: colors.otpSuccess,
    letterSpacing: 0.14,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
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
});
