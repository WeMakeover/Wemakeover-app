import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { colors, spacing } from "../../theme/theme";
import { Field, Button, IconButton, Chip } from "../../components/ui";
import { createAddress, updateAddress } from "../../features/address/addressThunks";
import { selectAddressLoading } from "../../features/address/addressSlice";
import { closeToPrevious } from "../../navigation/navFlow";
import toast from "../../lib/toast";

const TYPES = ["home", "work", "other"];

function normalizeTypeForForm(type) {
  if (type === "office") return "work";
  return type || "home";
}

export default function AddressFormScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAddressLoading);
  const editing = route.params?.address;
  const reopenLocationSheet = Boolean(route.params?.reopenLocationSheet);

  const [form, setForm] = useState(() => ({
    houseFlatNumber: editing?.houseFlatNumber && editing.houseFlatNumber !== "N/A" ? editing.houseFlatNumber : "",
    streetAreaName: editing?.streetAreaName || "",
    address: editing?.completeAddress || "",
    landmark: editing?.landmark || "",
    city: editing?.city || "",
    state: editing?.state || "Bihar",
    pincode: editing?.pincode || "",
    phone: editing?.phone || "",
    addressType: normalizeTypeForForm(editing?.addressType),
    isDefault: editing?.isDefault || false,
  }));

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  /** Always return to the previous screen in this stack (never jump tabs). */
  const closeForm = () => {
    if (reopenLocationSheet) {
      // Pop back to Home and ask it to reopen the location sheet
      navigation.navigate({
        name: "HomeMain",
        params: { reopenLocationSheet: true },
        merge: true,
      });
      return;
    }

    const routeNames = navigation.getState()?.routeNames || [];
    const fallback = routeNames.includes("ProfileMain")
      ? "ProfileMain"
      : routeNames.includes("CartMain")
        ? "CartMain"
        : routeNames.includes("HomeMain")
          ? "HomeMain"
          : undefined;

    closeToPrevious(navigation, { fallbackScreen: fallback });
  };

  const onSubmit = async () => {
    const addressId = editing?._id || editing?.id;
    const action = editing
      ? updateAddress({ id: addressId, data: form })
      : createAddress(form);
    const result = await dispatch(action);
    const ok = result?.meta?.requestStatus === "fulfilled";
    if (!ok) {
      toast.error(result?.payload || "Failed to save address");
      return;
    }
    toast.success(editing ? "Address updated" : "Address added");
    closeForm();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={closeForm} />
        <Text style={styles.title}>{editing ? "Edit address" : "Add address"}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Field label="House / Flat number" value={form.houseFlatNumber} onChangeText={set("houseFlatNumber")} placeholder="e.g. A-101" />
        <Field label="Street / Area" value={form.streetAreaName} onChangeText={set("streetAreaName")} placeholder="Street, area" />
        <Field label="Complete address *" value={form.address} onChangeText={set("address")} placeholder="Full address" multiline />
        <Field label="Landmark" value={form.landmark} onChangeText={set("landmark")} placeholder="Nearby landmark" />
        <Field label="City *" value={form.city} onChangeText={set("city")} placeholder="City" />
        <Field label="State *" value={form.state} onChangeText={set("state")} placeholder="State" />
        <Field label="Pincode *" value={form.pincode} onChangeText={set("pincode")} placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6} />
        <Field label="Phone *" value={form.phone} onChangeText={set("phone")} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />

        <Text style={styles.label}>Address type</Text>
        <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
          {TYPES.map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={form.addressType === t} onPress={() => set("addressType")(t)} />
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Set as default address</Text>
          <Switch
            value={form.isDefault}
            onValueChange={set("isDefault")}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Button title={editing ? "Update address" : "Save address"} loading={loading} onPress={onSubmit} style={{ marginTop: spacing.lg }} />
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
  label: { fontSize: 13, color: colors.text, marginBottom: spacing.xs, fontWeight: "500" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
