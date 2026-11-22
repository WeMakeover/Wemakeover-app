import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { colors } from "../../theme/theme";

const chevronRight = require("../../../assets/home/chevron-right.png");

export default function SectionHeader({ title, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} hitSlop={8} style={styles.actionWrap}>
          <Text style={styles.action}>{actionLabel}</Text>
          <Image source={chevronRight} style={styles.chevron} resizeMode="contain" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDEDED",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.32,
    lineHeight: 22,
  },
  actionWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  action: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  chevron: { width: 16, height: 16 },
});
