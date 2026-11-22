import React from "react";
import { View, Text, StyleSheet, Image, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const locationPin = require("../../../assets/home/location-pin.png");

function getDisplayLines({ city, addressSubline, isLoading, error, showAddressLine }) {
  if (isLoading) {
    return { title: "Loading...", subtitle: "" };
  }
  if (error === "permission_denied") {
    return { title: "Location", subtitle: "Enable location access" };
  }
  if (error === "rebuild_required") {
    return { title: "Location", subtitle: "Tap to refresh" };
  }
  if (error) {
    return { title: "Location", subtitle: "Tap to retry" };
  }
  return {
    title: city || "Location",
    subtitle: showAddressLine ? addressSubline || "Select address" : "",
  };
}

export default function LocationHeader({
  city,
  addressSubline,
  isLoading,
  error,
  onRetry,
  onPress,
  showAddressLine = false,
  style,
  color = "#FFFFFF",
  animated = false,
}) {
  const { title, subtitle } = getDisplayLines({
    city,
    addressSubline,
    isLoading,
    error,
    showAddressLine,
  });
  const canRetry = Boolean(error) && !isLoading;
  const showDropdown = showAddressLine && !canRetry && typeof onPress === "function";
  const ColorText = animated ? Animated.Text : Text;
  const ColorImage = animated ? Animated.Image : Image;

  const onHeaderPress = () => {
    if (canRetry) {
      onRetry?.();
      return;
    }
    onPress?.();
  };

  return (
    <Pressable
      style={[styles.wrap, style]}
      onPress={onHeaderPress}
      disabled={!canRetry && typeof onPress !== "function"}
      accessibilityRole="button"
      accessibilityLabel="Select delivery location"
    >
      <View style={styles.topRow}>
        <ColorImage
          source={locationPin}
          style={[styles.pinIcon, { tintColor: color }]}
          resizeMode="contain"
        />
        <ColorText style={[styles.city, { color }]} numberOfLines={1}>
          {title}
        </ColorText>
      </View>

      {showAddressLine || canRetry || subtitle ? (
        <View style={styles.sublineRow}>
          <ColorText style={[styles.subline, { color }]} numberOfLines={1}>
            {canRetry ? subtitle || "Tap to retry" : subtitle || "Select address"}
          </ColorText>
          {showDropdown ? (
            // Ionicons color can't animate; hide snap by matching mid-fade via overlaying opacities is overkill —
            // use a static mid color; text/pin carry the motion.
            <Ionicons name="chevron-down" size={14} color="#B896A3" style={styles.chevron} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 2,
    maxWidth: 280,
    zIndex: 20,
    elevation: 0,
    backgroundColor: "transparent",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  pinIcon: {
    width: 24,
    height: 24,
  },
  city: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 24,
    flexShrink: 1,
  },
  sublineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
    paddingVertical: 2,
    paddingLeft: 0,
  },
  chevron: {
    flexShrink: 0,
    marginTop: 1,
  },
  subline: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 20,
    flexShrink: 1,
    flexGrow: 0,
    opacity: 0.95,
  },
});
