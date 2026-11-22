import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/theme";

/**
 * Tappable star rating. Supports read-only display and whole-star selection.
 * (Half-star precision from the web is simplified to whole stars on mobile.)
 */
export default function StarRating({ value = 0, onChange, size = 28, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((s) => {
        const filled = value >= s;
        const half = !filled && value >= s - 0.5;
        const name = filled ? "star" : half ? "star-half" : "star-outline";
        const star = (
          <Ionicons name={name} size={size} color={filled || half ? "#F59E0B" : colors.border} />
        );
        if (readOnly || !onChange) {
          return (
            <View key={s} style={styles.star}>
              {star}
            </View>
          );
        }
        return (
          <TouchableOpacity key={s} style={styles.star} onPress={() => onChange(s)} hitSlop={6}>
            {star}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  star: { paddingHorizontal: 3 },
});
