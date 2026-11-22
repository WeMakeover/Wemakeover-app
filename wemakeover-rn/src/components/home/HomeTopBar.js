import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationHeader from "./LocationHeader";
import { fonts } from "../../theme/fonts";

const SCROLLED_LOCATION_COLOR = "#6B2F45";
const DEFAULT_LOCATION_COLOR = "#FFFFFF";

/** Fixed home top bar — scroll-linked soft fade (Animated, no per-frame setState). */
export default function HomeTopBar({
  location,
  onReferPress,
  addressSubline,
  showAddressLine,
  onLocationPress,
  scrollY,
  fadeEnd = 280,
}) {
  const insets = useSafeAreaInsets();
  const rangeEnd = Math.max(1, fadeEnd);

  const progress = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, rangeEnd],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [scrollY, rangeEnd]
  );

  const barBg = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,0.96)"],
      }),
    [progress]
  );

  const borderColor = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(107,47,69,0)", "rgba(107,47,69,0.08)"],
      }),
    [progress]
  );

  const locationColor = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [DEFAULT_LOCATION_COLOR, SCROLLED_LOCATION_COLOR],
      }),
    [progress]
  );

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          paddingTop: Math.max(insets.top, 8),
          backgroundColor: barBg,
          borderBottomColor: borderColor,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.row} pointerEvents="box-none">
        <LocationHeader
          city={location.city}
          addressSubline={addressSubline}
          showAddressLine={showAddressLine}
          isLoading={location.isLoading}
          error={location.error}
          onRetry={location.refresh}
          onPress={onLocationPress}
          color={locationColor}
          animated
          style={styles.location}
        />

        {typeof onReferPress === "function" ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onReferPress}
            style={styles.referBtnWrap}
            accessibilityRole="button"
            accessibilityLabel="Refer and Earn"
          >
            <LinearGradient
              colors={["#CC2B52", "#FFFFFF"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.referBorder}
            >
              <View style={styles.referBtn}>
                <View style={[StyleSheet.absoluteFill, styles.referBase]} />
                <LinearGradient
                  colors={["#AD12F5", "#FDAC62"]}
                  locations={[0, 0.81]}
                  start={{ x: 0.44, y: 1.05 }}
                  end={{ x: 0.5, y: 0.05 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={["#FF33BA", "rgba(237, 66, 179, 0)"]}
                  locations={[0.2, 1]}
                  start={{ x: 0, y: 0.12 }}
                  end={{ x: 0.7, y: 0.55 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0)"]}
                  start={{ x: 0.26, y: 0.3 }}
                  end={{ x: 0.85, y: 0.9 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.referBtnText} numberOfLines={1}>
                  Refer & Earn
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

export { SCROLLED_LOCATION_COLOR };

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  location: {
    flex: 1,
    maxWidth: 240,
  },
  referBtnWrap: {
    marginTop: 2,
    width: 99,
    height: 36,
    borderRadius: 12,
    shadowColor: "#55128A",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  referBorder: {
    flex: 1,
    borderRadius: 12,
    padding: 1,
    overflow: "hidden",
  },
  referBtn: {
    flex: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  referBase: {
    backgroundColor: "#55128A",
  },
  referBtnText: {
    color: "#FFFFFF",
    fontFamily: fonts.poppinsBold,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.05,
    includeFontPadding: false,
    textAlign: "center",
    zIndex: 2,
  },
});
