import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { spacing } from "../../theme/theme";

const footerLogo = require("../../../assets/home/footer-logo.png");

export default function HomeFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.tagline}>Your Trusted Grooming</Text>
      <Text style={styles.tagline}>& Salon Partner</Text>
      <Text style={styles.subline}>We bring the best salon experience at your home!</Text>
      <Image source={footerLogo} style={styles.logo} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    paddingTop: 36,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: 0,
    backgroundColor: "#FFFFFF",
  },
  tagline: {
    fontSize: 24,
    fontWeight: "700",
    color: "#B3B3B3",
    lineHeight: 30,
  },
  subline: {
    marginTop: 10,
    marginBottom: 14,
    fontSize: 12,
    color: "#C0C0C0",
    fontWeight: "500",
  },
  logo: { width: 153, height: 26, aspectRatio: 153 / 26 },
});
