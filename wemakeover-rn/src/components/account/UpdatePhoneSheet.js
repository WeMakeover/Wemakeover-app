import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { PHONE_RE } from "../../utils/authContact";
import {
  OTP_RESEND_SECONDS,
  PHONE_UPDATE_OTP_LENGTH,
} from "../../config/authConfig";
import { MSG91_PHONE_OTP_ENABLED } from "../../config/msg91";
import { msg91RetryOtp, msg91SendOtp, msg91VerifyOtp } from "../../lib/msg91Otp";
import SheetOverlay from "../SheetOverlay";

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function UpdatePhoneSheet({
  visible,
  onClose,
  currentPhone,
  onSendCode,
  onVerify,
  sending,
  verifying,
}) {
  const currentDigits = useMemo(() => digitsOnly(currentPhone), [currentPhone]);
  const [nextPhone, setNextPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [step, setStep] = useState("phone");
  const [secondsLeft, setSecondsLeft] = useState(OTP_RESEND_SECONDS);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [reqId, setReqId] = useState("");
  const [savedAccessToken, setSavedAccessToken] = useState("");
  const [msg91Busy, setMsg91Busy] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setNextPhone("");
      setCode("");
      setPhoneError("");
      setCodeError("");
      setStep("phone");
      setSecondsLeft(OTP_RESEND_SECONDS);
      setReqId("");
      setSavedAccessToken("");
      setMsg91Busy(false);
    } else {
      setKeyboardHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || step !== "otp" || secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, step, secondsLeft]);

  const trimmed = nextPhone.trim();
  const busy = sending || verifying || msg91Busy;
  const canSend =
    PHONE_RE.test(trimmed) && trimmed !== currentDigits && !busy;
  const canVerify =
    step === "otp" &&
    code.length === PHONE_UPDATE_OTP_LENGTH &&
    Boolean(reqId) &&
    !busy;

  const onChangePhone = (value) => {
    setPhoneError("");
    setNextPhone(value.replace(/\D/g, "").slice(0, 10));
    if (step === "otp") {
      setStep("phone");
      setCode("");
      setCodeError("");
      setReqId("");
      setSavedAccessToken("");
    }
  };

  const sendCode = async () => {
    if (!MSG91_PHONE_OTP_ENABLED) {
      setPhoneError("Add EXPO_PUBLIC_MSG91_AUTH_TOKEN to wemakeover-rn/.env, then restart Metro.");
      return;
    }
    if (!PHONE_RE.test(trimmed)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    if (trimmed === currentDigits) {
      setPhoneError("New number must be different from the current number");
      return;
    }
    const allowed = await onSendCode(trimmed);
    if (!allowed?.ok) {
      if (allowed?.message) setPhoneError(allowed.message);
      return;
    }

    setMsg91Busy(true);
    try {
      const sent = await msg91SendOtp(trimmed);
      if (sent.alreadyVerified && sent.accessToken) {
        const save = await onVerify({
          phoneNumber: trimmed,
          accessToken: sent.accessToken,
        });
        if (!save?.ok) {
          setPhoneError(save?.message || "Failed to update mobile number");
        }
        return;
      }
      if (sent.ok && sent.reqId) {
        setReqId(sent.reqId);
        setSavedAccessToken("");
        setStep("otp");
        setCode("");
        setCodeError("");
        setSecondsLeft(OTP_RESEND_SECONDS);
        return;
      }
      setPhoneError(sent.message || "Failed to send code");
    } catch (err) {
      setPhoneError(err?.message || "Failed to send code");
    } finally {
      setMsg91Busy(false);
    }
  };

  const verify = async () => {
    if (code.length !== PHONE_UPDATE_OTP_LENGTH || !reqId) return;
    setMsg91Busy(true);
    try {
      let accessToken = savedAccessToken;
      if (!accessToken) {
        const checked = await msg91VerifyOtp(reqId, code);
        if (!checked.ok || !checked.accessToken) {
          setCodeError(checked.message || "Wrong code entered");
          return;
        }
        accessToken = checked.accessToken;
        setSavedAccessToken(accessToken);
      }
      const save = await onVerify({
        phoneNumber: trimmed,
        accessToken,
      });
      if (!save?.ok) {
        setCodeError(save?.message || "Could not save this number");
      }
    } catch (err) {
      setCodeError(err?.message || "Wrong code entered");
    } finally {
      setMsg91Busy(false);
    }
  };

  const resend = async () => {
    if (secondsLeft > 0 || busy || !reqId) return;
    setMsg91Busy(true);
    try {
      const sent = await msg91RetryOtp(reqId);
      if (sent.ok && sent.reqId) {
        setReqId(sent.reqId);
        setSavedAccessToken("");
        setCode("");
        setCodeError("");
        setSecondsLeft(OTP_RESEND_SECONDS);
        return;
      }
      setCodeError(sent.message || "Failed to resend code");
    } catch (err) {
      setCodeError(err?.message || "Failed to resend code");
    } finally {
      setMsg91Busy(false);
    }
  };

  return (
    <SheetOverlay
      visible={visible}
      onClose={onClose}
      bottomInset={keyboardHeight > 0 ? keyboardHeight : spacing.xl + spacing.sm}
    >
      <View style={styles.sheet}>
        <Text style={styles.title}>Update mobile number</Text>

        {currentDigits ? (
          <Text style={styles.current}>{currentDigits}</Text>
        ) : (
          <Text style={styles.currentMuted}>No number saved yet</Text>
        )}

        <Text style={styles.label}>
          Enter new phone number <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={nextPhone}
          onChangeText={onChangePhone}
          placeholder="9999999999"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={10}
          style={[styles.input, phoneError ? styles.inputError : null]}
        />
        {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}

        {step === "otp" ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              Enter Code <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              value={code}
              onChangeText={(value) => {
                setCodeError("");
                setCode(value.replace(/\D/g, "").slice(0, PHONE_UPDATE_OTP_LENGTH));
              }}
              placeholder="6765"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              maxLength={PHONE_UPDATE_OTP_LENGTH}
              style={[styles.input, codeError ? styles.inputError : null]}
            />
            {codeError ? (
              <View style={styles.codeErrorRow}>
                <View style={styles.wrongRow}>
                  <Ionicons name="ellipse" size={8} color={colors.error} />
                  <Text style={styles.error}>{codeError}</Text>
                </View>
                {secondsLeft === 0 ? (
                  <TouchableOpacity onPress={resend} disabled={busy} hitSlop={8}>
                    <Text style={styles.resendText}>Resend Code</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : secondsLeft === 0 ? (
              <TouchableOpacity onPress={resend} disabled={busy} style={styles.resendWrap} hitSlop={8}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timer}>{formatCountdown(secondsLeft)}</Text>
            )}
          </>
        ) : null}

        {step === "phone" ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={sendCode}
            disabled={!canSend}
            style={[styles.actionBtn, !canSend && styles.actionBtnDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionText}>Send code</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={verify}
            disabled={!canVerify}
            style={[styles.actionBtn, !canVerify && styles.actionBtnDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionText}>Verify</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SheetOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  current: {
    fontFamily: fonts.interMedium,
    fontSize: 16,
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  currentMuted: {
    fontFamily: fonts.interRegular,
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.interMedium,
    fontSize: 13,
    color: colors.textDark,
    marginBottom: 8,
  },
  required: {
    color: colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.inputText,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.error,
  },
  timer: {
    marginTop: 6,
    fontSize: 12,
    color: colors.muted,
  },
  codeErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  wrongRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  resendText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  resendWrap: {
    marginTop: 6,
    alignSelf: "flex-end",
  },
  actionBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});
