import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { colors, radius, spacing, typography } from "../../theme/theme";

const logoImage = require("../../../assets/auth/logo.png");
const googleIcon = require("../../../assets/auth/google-icon.png");

const HERO_SLIDES = [
  { id: "makeup", source: require("../../../assets/auth/hero-1.jpg") },
  { id: "waxing", source: require("../../../assets/auth/hero-2.jpg") },
  { id: "manicure", source: require("../../../assets/auth/hero-3.jpg") },
];

const AUTO_PLAY_MS = 4500;

function CarouselDots({ count, activeIndex }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, index) => {
        const active = index === activeIndex;
        return (
          <View
            key={index}
            style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
          />
        );
      })}
    </View>
  );
}

export default function AuthWelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const heroHeight = Math.round(width * (315 / 393));
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const scrollToIndex = useCallback(
    (index) => {
      listRef.current?.scrollToOffset({ offset: width * index, animated: true });
      activeIndexRef.current = index;
      setActiveIndex(index);
    },
    [width]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIndexRef.current + 1) % HERO_SLIDES.length;
      scrollToIndex(next);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [scrollToIndex]);

  const onMomentumScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  const onGooglePress = () => {
    Toast.show({
      type: "info",
      text1: "Google Sign-In",
      text2: "Available in the next app build. Use email login for now.",
    });
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width, height: heroHeight }]}>
      <Image source={item.source} style={styles.heroImage} resizeMode="cover" />
    </View>
  );

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={[styles.heroWrap, { height: heroHeight }]}>
        <FlatList
          ref={listRef}
          data={HERO_SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />
        <View style={styles.dotsOverlay}>
          <CarouselDots count={HERO_SLIDES.length} activeIndex={activeIndex} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.copyBlock}>
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headline}>
            {"The makeover you've been\nwaiting for, "}
            <Text style={styles.headlineAccent}>Starts here!</Text>
          </Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.primaryRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, styles.registerButton]}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.registerText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, styles.loginButton]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.googleButton}
            onPress={onGooglePress}
          >
            <Image source={googleIcon} style={styles.googleIcon} resizeMode="contain" />
            <Text style={styles.googleText}>Login/Signup with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.partnerLink}
            onPress={() => navigation.navigate("PartnerLogin")}
          >
            <Text style={styles.partnerLinkText}>Login/Signup as Partner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  heroWrap: {
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    backgroundColor: colors.background,
  },
  slide: {
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  dotsOverlay: {
    position: "absolute",
    left: spacing.lg,
    bottom: spacing.md,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 10,
    borderRadius: radius.pill,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 10,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    justifyContent: "space-between",
  },
  copyBlock: {
    gap: spacing.md,
  },
  logo: {
    width: 143,
    height: 24,
  },
  headline: {
    ...typography.headingLg,
    color: colors.text,
  },
  headlineAccent: {
    color: colors.primary,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  primaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  registerText: {
    ...typography.body,
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.primary,
  },
  loginText: {
    ...typography.body,
    color: colors.background,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleText: {
    ...typography.body,
    color: colors.textDark,
  },
  partnerLink: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  partnerLinkText: {
    ...typography.body,
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
