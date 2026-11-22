import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";

/**
 * Functional UI primitives + small widgets shared across screens.
 * Restyle freely later; the data wiring does not depend on the look.
 */

export const formatINR = (value) => {
  const n = Number(value);
  if (!isFinite(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN")}`;
};

export const formatINRDecimal = (value) => {
  const n = Number(value);
  if (!isFinite(n)) return "₹0.00";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function Screen({ children, scroll = true, style, contentStyle }) {
  const inner = <View style={[styles.screen, style]}>{children}</View>;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ flexGrow: 1 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </KeyboardAvoidingView>
  );
}

export function Heading({ children, style }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function SubText({ children, style, numberOfLines }) {
  return (
    <Text style={[styles.subtext, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, action, onAction }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Field({ label, error, style, ...props }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Button({ title, onPress, loading, disabled, variant = "primary", style, children }) {
  const isOutline = variant === "outline";
  const isGhost = variant === "ghost";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isOutline ? styles.buttonOutline : isGhost ? styles.buttonGhost : styles.buttonPrimary,
        disabled || loading ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline || isGhost ? colors.primary : "#fff"} />
      ) : (
        children || (
          <Text style={[styles.buttonText, isOutline || isGhost ? styles.buttonTextOutline : null]}>
            {title}
          </Text>
        )
      )}
    </TouchableOpacity>
  );
}

export function LinkText({ children, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={[styles.link, style]}>{children}</Text>
    </TouchableOpacity>
  );
}

export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, active, onPress, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null, style]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = "primary", style }) {
  const toneStyle =
    tone === "success"
      ? styles.badgeSuccess
      : tone === "warning"
      ? styles.badgeWarning
      : tone === "muted"
      ? styles.badgeMuted
      : styles.badgePrimary;
  return (
    <View style={[styles.badge, toneStyle, style]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export function IconButton({ name, onPress, size = 22, color = colors.text, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.iconButton, style]} hitSlop={8}>
      <Ionicons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

export function QtyStepper({ value, onIncrease, onDecrease, max = 2 }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onDecrease} style={styles.stepperBtn}>
        <Ionicons name="remove" size={18} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        onPress={onIncrease}
        style={[styles.stepperBtn, value >= max ? { opacity: 0.4 } : null]}
        disabled={value >= max}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export function Loading({ text }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text ? <Text style={[styles.subtext, { marginTop: spacing.md }]}>{text}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = "sparkles-outline", title, subtitle, action, onAction }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={[styles.subtext, { textAlign: "center" }]}>{subtitle}</Text> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: spacing.md, paddingHorizontal: spacing.xl }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: "#FEE2E2" }]}>
        <Ionicons name="alert-circle-outline" size={34} color={colors.error} />
      </View>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={[styles.subtext, { textAlign: "center" }]}>{message || "Please try again."}</Text>
      {onRetry ? <Button title="Retry" onPress={onRetry} variant="outline" style={{ marginTop: spacing.md, paddingHorizontal: spacing.xl }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  heading: { fontSize: 26, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  subtext: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 13, color: colors.text, marginBottom: spacing.xs, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#fff",
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  button: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
  buttonGhost: { backgroundColor: colors.surface },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  buttonTextOutline: { color: colors.primary },
  link: { color: colors.primary, fontWeight: "600", textAlign: "center", marginTop: spacing.md },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sectionAction: { fontSize: 13, fontWeight: "600", color: colors.primary },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgePrimary: { backgroundColor: colors.surface },
  badgeSuccess: { backgroundColor: "#DCFCE7" },
  badgeWarning: { backgroundColor: "#FEF3C7" },
  badgeMuted: { backgroundColor: "#F3F4F6" },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  iconButton: { padding: 6 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperValue: { minWidth: 24, textAlign: "center", fontWeight: "700", color: colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
});
