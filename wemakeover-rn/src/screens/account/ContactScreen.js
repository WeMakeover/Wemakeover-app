import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { colors, spacing } from "../../theme/theme";
import { Field, Button, IconButton, SubText } from "../../components/ui";
import { requestContactOtp, sendContactData } from "../../features/contact/contactThunks";
import { resetContactState } from "../../features/contact/contactSlice";

export default function ContactScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { otpLoading, loading, otpSent, success } = useSelector((s) => s.contact);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    message: "",
  });
  const [otp, setOtp] = useState("");

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    return () => {
      dispatch(resetContactState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      setForm((f) => ({ ...f, message: "" }));
      setOtp("");
    }
  }, [success]);

  const onSendOtp = () => {
    dispatch(requestContactOtp({ name: form.name, email: form.email }));
  };

  const onSubmit = () => {
    dispatch(sendContactData({ ...form, otp }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Help & contact</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <SubText>Send us a message and our team will get back to you over email.</SubText>
        <View style={{ height: spacing.md }} />

        <Field label="Name" value={form.name} onChangeText={set("name")} placeholder="Your name" />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Phone (optional)"
          value={form.phoneNumber}
          onChangeText={set("phoneNumber")}
          placeholder="10-digit mobile"
          keyboardType="phone-pad"
        />
        <Field
          label="Message"
          value={form.message}
          onChangeText={set("message")}
          placeholder="How can we help?"
          multiline
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />

        {!otpSent ? (
          <Button
            title="Send verification code"
            loading={otpLoading}
            disabled={!form.name || !form.email || !form.message}
            onPress={onSendOtp}
          />
        ) : (
          <>
            <Field
              label="Verification code"
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter the code sent to your email"
              keyboardType="number-pad"
            />
            <Button title="Submit message" loading={loading} disabled={!otp} onPress={onSubmit} />
            <Button title="Resend code" variant="ghost" loading={otpLoading} onPress={onSendOtp} style={{ marginTop: spacing.sm }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
});
