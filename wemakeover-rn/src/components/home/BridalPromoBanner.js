import React from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { spacing } from "../../theme/theme";

const bridalPromo = require("../../../assets/home/bridal-banner.png");
const BANNER_BASE_WIDTH = 361;
const BANNER_BASE_HEIGHT = 216;

export default function BridalPromoBanner({ onBookNow }) {
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(Math.max(width - spacing.md * 2, 0), BANNER_BASE_WIDTH);
  const scale = bannerWidth / BANNER_BASE_WIDTH;
  const bannerHeight = Math.round(BANNER_BASE_HEIGHT * scale);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onBookNow}
      style={[styles.wrap, { width: bannerWidth, height: bannerHeight }]}
    >
      <ImageBackground source={bridalPromo} style={styles.image} resizeMode="contain">
        <View style={styles.content}>
          <View style={styles.headlineWrap}>
            <Text style={styles.headline} numberOfLines={3}>
              Premium Bridal{"\n"}Makeup Starting{"\n"}At Just{" "}
              <Text style={styles.headlinePrice}>₹9999</Text>
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Book Now</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 0,
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: "#FCE7AA",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
  headlineWrap: {
    position: "absolute",
    left: 24,
    top: 24,
    width: 149,
    height: 60,
    zIndex: 10,
    elevation: 10,
  },
  headline: {
    color: "#57492B",
    fontSize: 16,
    fontStyle: "normal",
    fontWeight: "600",
    lineHeight: 20,
    letterSpacing: 1,
  },
  headlinePrice: {
    color: "#7F5700",
    fontSize: 16,
    fontStyle: "normal",
    fontWeight: "800",
    lineHeight: 20,
    letterSpacing: 1,
  },
  cta: {
    position: "absolute",
    left: 24,
    bottom: 24,
    backgroundColor: "#fff",
    borderColor: "#916300",
    borderWidth: 0.25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
    elevation: 10,
  },
  ctaText: { color: "#916300", fontWeight: "800", fontSize: 12 },
});
