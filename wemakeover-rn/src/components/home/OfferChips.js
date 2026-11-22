import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";

const OFFERS = [
  { id: "discount", label: "Extra 10% off", icon: "pricetag-outline" },
  { id: "massage", label: "Free Head Massage", icon: "gift-outline" },
];

export default function OfferChips() {
  return (
    <View style={styles.row}>
      {OFFERS.map((offer) => (
        <View key={offer.id} style={styles.chip}>
          <Ionicons name={offer.icon} size={16} color={colors.primary} />
          <Text style={styles.label}>{offer.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
});
