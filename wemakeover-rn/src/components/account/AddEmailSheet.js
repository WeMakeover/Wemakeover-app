import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { colors, radius, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { EMAIL_RE } from "../../utils/authContact";
import SheetOverlay from "../SheetOverlay";

export default function AddEmailSheet({ visible, onClose, onSave, saving }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setEmail("");
    setError("");
  }, [visible]);

  const trimmed = email.trim().toLowerCase();
  const canSave = EMAIL_RE.test(trimmed) && !saving;

  const save = async () => {
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email");
      return;
    }
    const result = await onSave(trimmed);
    if (!result?.ok) {
      setError(result?.message || "Could not add email");
    }
  };

  return (
    <SheetOverlay visible={visible} onClose={onClose}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Add email</Text>
        <Text style={styles.label}>
          Email <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError("");
          }}
          placeholder="Enter your email"
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, error ? styles.inputError : null]}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={save}
          disabled={!canSave}
          style={[styles.actionBtn, !canSave && styles.actionBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionText}>Save</Text>
          )}
        </TouchableOpacity>
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
