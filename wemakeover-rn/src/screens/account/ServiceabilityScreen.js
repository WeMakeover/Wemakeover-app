import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Field, Button, IconButton, Badge, Loading } from "../../components/ui";
import {
  fetchServiceableCities,
  checkCityServiceability,
} from "../../features/serviceability/serviceabilityThunks";
import {
  selectServiceableCities,
  selectCitiesLoading,
  selectIsServiceable,
  selectValidationLoading,
  selectValidationMessage,
  selectCurrentCity,
  clearValidation,
} from "../../features/serviceability/serviceabilitySlice";
import { submitCityRequest } from "../../features/cityRequests/cityRequestsApi";
import toast from "../../lib/toast";

export default function ServiceabilityScreen({ navigation }) {
  const dispatch = useDispatch();
  const cities = useSelector(selectServiceableCities);
  const citiesLoading = useSelector(selectCitiesLoading);
  const isServiceable = useSelector(selectIsServiceable);
  const validationLoading = useSelector(selectValidationLoading);
  const validationMessage = useSelector(selectValidationMessage);
  const currentCity = useSelector(selectCurrentCity);
  const user = useSelector((s) => s.auth.user);

  const [checkCity, setCheckCity] = useState("");
  const [request, setRequest] = useState({
    requestedCity: "",
    requestedState: "",
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const setReq = (key) => (value) => setRequest((r) => ({ ...r, [key]: value }));

  useEffect(() => {
    dispatch(fetchServiceableCities());
    return () => dispatch(clearValidation());
  }, [dispatch]);

  const onSubmitRequest = async () => {
    if (!request.requestedCity || !request.name || !request.email || !request.phone) {
      toast.error("Please fill city, name, email and phone");
      return;
    }
    setSubmitting(true);
    try {
      await submitCityRequest(request);
      toast.success("City request submitted. We'll notify you when we expand!");
      setRequest((r) => ({ ...r, requestedCity: "", requestedState: "", message: "" }));
    } catch (e) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Service availability</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Check your city</Text>
        <Field placeholder="Enter your city" value={checkCity} onChangeText={setCheckCity} />
        <Button
          title="Check"
          loading={validationLoading}
          disabled={!checkCity.trim()}
          onPress={() => dispatch(checkCityServiceability(checkCity))}
        />
        {isServiceable !== null && currentCity ? (
          <View style={[styles.resultBox, isServiceable ? styles.ok : styles.no]}>
            <Ionicons
              name={isServiceable ? "checkmark-circle" : "close-circle"}
              size={20}
              color={isServiceable ? colors.success : colors.error}
            />
            <Text style={styles.resultText}>
              {validationMessage ||
                (isServiceable
                  ? `${currentCity} is serviceable!`
                  : `Sorry, ${currentCity} is not serviceable yet.`)}
            </Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Cities we serve</Text>
        {citiesLoading && cities.length === 0 ? (
          <View style={{ height: 80 }}>
            <Loading />
          </View>
        ) : cities.length === 0 ? (
          <Text style={styles.muted}>No serviceable cities listed yet.</Text>
        ) : (
          <View style={styles.chips}>
            {cities.map((c) => (
              <Badge key={c._id || c.city} label={c.city} style={{ marginRight: 8, marginBottom: 8 }} />
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Request your city</Text>
        <Text style={styles.muted}>Don't see your city? Let us know and we'll prioritise it.</Text>
        <View style={{ height: spacing.md }} />
        <Field label="City *" value={request.requestedCity} onChangeText={setReq("requestedCity")} placeholder="City" />
        <Field label="State" value={request.requestedState} onChangeText={setReq("requestedState")} placeholder="State" />
        <Field label="Name *" value={request.name} onChangeText={setReq("name")} placeholder="Your name" />
        <Field label="Email *" value={request.email} onChangeText={setReq("email")} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone *" value={request.phone} onChangeText={setReq("phone")} placeholder="10-digit mobile" keyboardType="phone-pad" />
        <Field label="Message" value={request.message} onChangeText={setReq("message")} placeholder="Anything else?" multiline />
        <Button title="Submit request" loading={submitting} onPress={onSubmitRequest} />
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
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  muted: { fontSize: 13, color: colors.muted },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  ok: { backgroundColor: "#DCFCE7" },
  no: { backgroundColor: "#FEE2E2" },
  resultText: { marginLeft: 8, flex: 1, color: colors.text, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
