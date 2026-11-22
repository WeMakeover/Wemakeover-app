import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { colors, radius, spacing } from "../../theme/theme";
import { OTP_LENGTH, OTP_RESEND_SECONDS, PHONE_UPDATE_OTP_LENGTH, SMS_OTP_ENABLED } from "../../config/authConfig";
import { getOtpDestination } from "../../utils/authContact";
import { verifyOtpThunk, resendOtpThunk, completeMsg91SignupThunk } from "../../features/auth/authThunks";
import { msg91RetryOtp, msg91VerifyOtp } from "../../lib/msg91Otp";

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function OtpScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { status, error } = useSelector((s) => s.auth);

  const provider = route.params?.provider || "";
  const channel = route.params?.channel || "email";
  const email = route.params?.email || "";
  const phoneNumber = route.params?.phoneNumber || "";
  const signup = route.params?.signup;
  const destination =
    route.params?.destination ||
    getOtpDestination({ channel, email, phoneNumber });
  const codeLength = provider === "msg91" ? PHONE_UPDATE_OTP_LENGTH : OTP_LENGTH;

  const [otp, setOtp] = useState("");
  const [reqId, setReqId] = useState(route.params?.reqId || "");
  const [savedAccessToken, setSavedAccessToken] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_RESEND_SECONDS);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRef = useRef(null);

  const canVerify = otp.length === codeLength;
  const canResend = secondsLeft === 0 && !resendLoading;
  const isVerifying = checkingCode || (status === "loading" && !resendLoading);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const onOtpChange = (value) => {
    setResendSuccess(false);
    setOtp(value.replace(/\D/g, "").slice(0, codeLength));
  };

  const onVerify = async () => {
    if (!canVerify || isVerifying) return;

    if (provider === "msg91") {
      setCheckingCode(true);
      try {
        let token = savedAccessToken;
        if (!token) {
          const checked = await msg91VerifyOtp(reqId, otp.trim());
          if (!checked.ok || !checked.accessToken) {
            Toast.show({
              type: "error",
              text1: "Verification failed",
              text2: checked.message || "Wrong code entered",
            });
            return;
          }
          token = checked.accessToken;
          setSavedAccessToken(token);
        }
        await dispatch(
          completeMsg91SignupThunk({
            reqId,
            otp: otp.trim(),
            signup,
            accessToken: token,
          })
        );
      } finally {
        setCheckingCode(false);
      }
      return;
    }

    if (channel === "phone" && !SMS_OTP_ENABLED) {
      Toast.show({
        type: "info",
        text1: "SMS verification",
        text2: "Phone OTP will be enabled once the SMS API key is added.",
      });
      return;
    }

    dispatch(
      verifyOtpThunk({
        channel,
        email,
        phoneNumber,
        otp: otp.trim(),
      })
    );
  };

  const onResend = useCallback(async () => {
    if (!canResend) return;

    if (provider === "msg91") {
      setResendLoading(true);
      try {
        const sent = await msg91RetryOtp(reqId);
        if (!sent.ok) {
          throw new Error(sent.message || "Could not resend verification code.");
        }
        setReqId(sent.reqId || reqId);
        setSavedAccessToken("");
        setResendSuccess(true);
        setSecondsLeft(OTP_RESEND_SECONDS);
        setOtp("");
        inputRef.current?.focus();
      } catch (err) {
        Toast.show({
          type: "error",
          text1: "Resend failed",
          text2: err?.message || "Could not resend verification code.",
        });
      } finally {
        setResendLoading(false);
      }
      return;
    }

    if (channel === "phone" && !SMS_OTP_ENABLED) {
      setResendSuccess(true);
      setSecondsLeft(OTP_RESEND_SECONDS);
      setOtp("");
      Toast.show({
        type: "info",
        text1: "SMS resend",
        text2: "Phone OTP resend will work once the SMS API key is configured.",
      });
      return;
    }

    setResendLoading(true);
    try {
      await dispatch(
        resendOtpThunk({ channel, email, phoneNumber })
      ).unwrap();
      setResendSuccess(true);
      setSecondsLeft(OTP_RESEND_SECONDS);
      setOtp("");
      inputRef.current?.focus();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Resend failed",
        text2: err || "Could not resend verification code.",
      });
    } finally {
      setResendLoading(false);
    }
  }, [canResend, channel, dispatch, email, phoneNumber, provider, reqId]);

  const fieldError = status === "failed" ? error : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textLabel} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.title}>Verify Account</Text>

            <View style={styles.subtitleBlock}>
              <Text style={styles.subtitle}>
                <Text style={styles.subtitleMedium}>Code has been send to </Text>
                <Text style={styles.subtitleBold}>{destination}</Text>
              </Text>
              <Text style={styles.subtitleHint}>
                Enter the code to verify your account.
              </Text>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Enter Code</Text>
            <View style={[styles.inputWrap, fieldError ? styles.inputError : null]}>
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={onOtpChange}
                placeholder={`Enter ${codeLength} digit code`}
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={codeLength}
                autoFocus
                style={[styles.input, otp.length > 0 && styles.inputFilled]}
              />
            </View>
            {resendSuccess ? (
              <Text style={styles.successText}>Verification code sent successfully</Text>
            ) : null}
            {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.resendBlock}>
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn&apos;t Receive Code?</Text>
              <TouchableOpacity
                onPress={onResend}
                disabled={!canResend}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                  Resend Code
                </Text>
              </TouchableOpacity>
            </View>
            {secondsLeft > 0 ? (
              <Text style={styles.timerText}>
                {`Resend code in ${formatCountdown(secondsLeft)}`}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.verifyBtn, (!canVerify || isVerifying) && styles.verifyBtnDisabled]}
            onPress={onVerify}
            disabled={!canVerify || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  content: {
    gap: spacing.xl + spacing.sm,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.textDark,
    letterSpacing: -0.15,
    lineHeight: 34,
    textAlign: "center",
  },
  subtitleBlock: {
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    letterSpacing: 0.14,
  },
  subtitleMedium: {
    fontWeight: "500",
    color: colors.textMuted,
  },
  subtitleBold: {
    fontWeight: "800",
    color: colors.textDark,
    letterSpacing: 0.175,
  },
  subtitleHint: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    letterSpacing: 0.14,
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
  inputWrap: {
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
  input: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.placeholder,
    letterSpacing: 0.14,
    padding: 0,
    textAlign: "left",
  },
  inputFilled: {
    fontWeight: "700",
    color: colors.inputText,
  },
  successText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.otpSuccess,
    letterSpacing: 0.14,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.errorStrong,
    letterSpacing: 0.14,
    paddingHorizontal: spacing.sm,
  },
  footer: {
    marginTop: "auto",
    gap: spacing.lg,
  },
  resendBlock: {
    alignItems: "center",
    gap: spacing.sm,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  resendPrompt: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textLabel,
    letterSpacing: 0.14,
  },
  resendLink: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.borderStrong,
    letterSpacing: 0.175,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  resendLinkDisabled: {
    opacity: 0.55,
  },
  timerText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.timerText,
    letterSpacing: 0.14,
    textAlign: "center",
  },
  verifyBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnDisabled: {
    opacity: 0.4,
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
    letterSpacing: 0.21,
  },
});
