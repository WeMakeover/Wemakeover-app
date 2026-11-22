import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";

export default function PartnerAuthField({
  label,
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
  style,
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: colors.error,
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
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 2,
  },
});
