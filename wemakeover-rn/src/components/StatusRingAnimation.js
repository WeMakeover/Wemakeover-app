import React from "react";
import { Image, View, StyleSheet } from "react-native";

const SUCCESS = require("../../assets/booking/status-success.gif");
const FAILED = require("../../assets/booking/status-failed.gif");

/**
 * Booking summary status GIFs (real animated GIF assets).
 */
export default function StatusRingAnimation({ variant = "success", size = 140 }) {
  const source = variant === "failed" ? FAILED : SUCCESS;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={source}
        style={{ width: size, height: size, backgroundColor: "transparent" }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "transparent",
  },
});
