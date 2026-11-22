import React, { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Button, Badge, Loading, EmptyState, IconButton } from "../../components/ui";
import {
  getUserAddresses,
  deleteAddress,
  setDefaultAddress,
} from "../../features/address/addressThunks";
import { selectAddresses, selectAddressLoading } from "../../features/address/addressSlice";

export default function AddressListScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const addresses = useSelector(selectAddresses);
  const loading = useSelector(selectAddressLoading);
  const selectMode = route.params?.selectMode;

  useEffect(() => {
    dispatch(getUserAddresses());
  }, [dispatch]);

  const confirmDelete = (id) => {
    Alert.alert("Delete address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => dispatch(deleteAddress(id)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{selectMode ? "Select address" : "My addresses"}</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading && addresses.length === 0 ? (
        <Loading />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="No addresses yet"
          subtitle="Add an address to get your services delivered at home."
          action="Add address"
          onAction={() => navigation.navigate("AddressForm")}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          {addresses.map((addr) => (
            <TouchableOpacity
              key={addr._id}
              activeOpacity={selectMode ? 0.85 : 1}
              onPress={
                selectMode
                  ? () => {
                      const target = route.params?.returnScreen || "CartMain";
                      navigation.navigate({ name: target, params: { selectedAddress: addr }, merge: true });
                    }
                  : undefined
              }
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.typeRow}>
                  <Ionicons
                    name={
                      addr.addressType === "work" || addr.addressType === "office"
                        ? "briefcase-outline"
                        : addr.addressType === "other"
                        ? "location-outline"
                        : "home-outline"
                    }
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.type}>
                    {addr.addressType === "office" ? "work" : addr.addressType || "home"}
                  </Text>
                  {addr.isDefault ? <Badge label="Default" tone="success" style={{ marginLeft: 8 }} /> : null}
                </View>
                {!selectMode ? (
                  <View style={{ flexDirection: "row" }}>
                    <IconButton
                      name="create-outline"
                      size={20}
                      onPress={() => navigation.navigate("AddressForm", { address: addr })}
                    />
                    <IconButton
                      name="trash-outline"
                      size={20}
                      color={colors.muted}
                      onPress={() => confirmDelete(addr._id)}
                    />
                  </View>
                ) : null}
              </View>

              <Text style={styles.addrText}>
                {[addr.houseFlatNumber, addr.streetAreaName || addr.completeAddress]
                  .filter((p) => p && p !== "N/A")
                  .join(", ")}
              </Text>
              <Text style={styles.addrSub}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
              </Text>
              {addr.landmark ? <Text style={styles.addrSub}>Landmark: {addr.landmark}</Text> : null}
              <Text style={styles.addrSub}>Phone: {addr.phone}</Text>

              {!selectMode && !addr.isDefault ? (
                <TouchableOpacity onPress={() => dispatch(setDefaultAddress(addr._id))} style={styles.defaultBtn}>
                  <Ionicons name="star-outline" size={14} color={colors.primary} />
                  <Text style={styles.defaultBtnText}>Set as default</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button title="Add new address" onPress={() => navigation.navigate("AddressForm")} />
      </View>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeRow: { flexDirection: "row", alignItems: "center" },
  type: { fontSize: 13, fontWeight: "700", color: colors.text, marginLeft: 4, textTransform: "capitalize" },
  addrText: { fontSize: 14, color: colors.text, marginTop: spacing.sm, fontWeight: "600" },
  addrSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  defaultBtn: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  defaultBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13, marginLeft: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
