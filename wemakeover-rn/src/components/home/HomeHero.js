import React from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { fonts } from "../../theme/fonts";

const heroBanner = require("../../../assets/home/hero-banner.png");
export const FIGMA_FRAME_WIDTH = 393;
export const HERO_BASE_WIDTH = 393;
export const HERO_BASE_HEIGHT = 402;

export function getHomeHeroMetrics(screenWidth) {
  const heroWidth = Math.min(screenWidth, HERO_BASE_WIDTH);
  const scale = heroWidth / FIGMA_FRAME_WIDTH;
  const heroHeight = Math.round(HERO_BASE_HEIGHT * scale);
  return { heroWidth, scale, heroHeight };
}

/** Scrollable home hero banner (header overlays separately). */
export default function HomeHero() {
  const { width } = useWindowDimensions();
  const { heroWidth, scale, heroHeight } = getHomeHeroMetrics(width);
  const titleTop = Math.round(148 * scale);
  const titleLeft = Math.round(24 * scale);
  const titleWidth = Math.round(240 * scale);
  const bottomCurve = Math.max(20, Math.round(24 * scale));

  return (
    <View
      style={[
        styles.wrap,
        {
          width: heroWidth,
          height: heroHeight,
          borderBottomLeftRadius: bottomCurve,
          borderBottomRightRadius: bottomCurve,
        },
      ]}
    >
      <ImageBackground source={heroBanner} style={styles.heroImage} resizeMode="contain">
        <View style={styles.content}>
          <View
            style={[
              styles.copyBlock,
              {
                top: titleTop,
                left: titleLeft,
                width: titleWidth,
              },
            ]}
          >
            <Text style={styles.headline} numberOfLines={1}>
              Best In-class experience
            </Text>
            <Text style={styles.headline} numberOfLines={1}>
              delivered at your
            </Text>
            <Text style={[styles.headline, styles.headlineAccent]} numberOfLines={1}>
              Doorstep!
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: HERO_BASE_WIDTH,
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "lightgray",
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-start",
  },
  copyBlock: {
    position: "absolute",
    justifyContent: "flex-start",
    zIndex: 10,
    elevation: 10,
  },
  headline: {
    color: "#FFFEE5",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    letterSpacing: -0.4,
    fontFamily: fonts.poppinsBold,
  },
  headlineAccent: { color: "#FDDD48", fontWeight: "900" },
});
