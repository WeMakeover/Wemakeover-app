import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
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
import { colors, radius, spacing } from "../../theme/theme";
import { loginUser } from "../../features/auth/authThunks";

const watermarkImage = require("../../../assets/auth/login-watermark.jpg");

function AuthField({
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
}) {
  return (
    <View style={styles.fieldWrap}>
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

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { status, error } = useSelector((s) => s.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;
  const isLoading = status === "loading";

  const onLogin = () => {
    if (!canSubmit || isLoading) return;
    dispatch(loginUser({ email: email.trim().toLowerCase(), password }));
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
          <Text style={styles.headerTitle}>Login</Text>
        </View>

        <View style={styles.form}>
          <AuthField
            label="Phone/email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email or mobile number"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AuthField
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
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => navigation.navigate("ForgotPassword")}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.loginBtn,
              (!canSubmit || isLoading) && styles.loginBtnDisabled,
            ]}
            onPress={onLogin}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
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
  watermark: {
    position: "absolute",
    top: 0,
    right: -spacing.md,
    opacity: 0.15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
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
  forgotWrap: {
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textLabel,
    textDecorationLine: "underline",
    letterSpacing: 0.15,
  },
  actions: {
    gap: spacing.md,
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
});
