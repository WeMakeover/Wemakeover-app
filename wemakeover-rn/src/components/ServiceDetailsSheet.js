import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme/theme";
import { fonts } from "../theme/fonts";
import SheetOverlay from "./SheetOverlay";
import { getServiceDetailsContent } from "../utils/serviceDetailsContent";

const TITLE_COLOR = "#632E39";
const STEP_TITLE = "#5C2A35";
const BODY_GRAY = "#555555";
const LINE_PINK = "#F3C5D0";
const CIRCLE = colors.primary;
const SHEET_BG = "#FFFFFF";
const DIVIDER = "#F0ECEA";
const NOTE_BG = "#FFF5F7";
const NOTE_BORDER = "#F3D5DC";

// ─── Timeline ────────────────────────────────────────────────────────────────

function padStep(n) {
  return String(n).padStart(2, "0");
}

function ProcessTimeline({ steps }) {
  const circleSize = 36;
  const railWidth = 2;

  return (
    <View style={s.timeline}>
      {steps.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;
        return (
          <View key={step.id} style={s.stepRow}>
            <View style={[s.railCol, { width: circleSize }]}>
              {!isFirst ? (
                <View style={[s.railSegment, { width: railWidth, backgroundColor: LINE_PINK }]} />
              ) : (
                <View style={s.railSpacer} />
              )}
              <View
                style={[s.stepCircle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}
              >
                <Text style={s.stepNum}>{padStep(index + 1)}</Text>
              </View>
              {!isLast ? (
                <View style={[s.railSegment, { width: railWidth, backgroundColor: LINE_PINK }]} />
              ) : (
                <View style={s.railSpacer} />
              )}
            </View>
            <View style={s.stepBody}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.description}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Sliding process images ──────────────────────────────────────────────────

function ProcessImageSlider({ images }) {
  const { width } = useWindowDimensions();
  const imgWidth = (width - spacing.md * 2 - 12) / 3;
  const imgHeight = imgWidth * 0.8;

  if (!images || images.length === 0) return null;

  return (
    <View style={s.sliderWrap}>
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `pi-${i}`}
        contentContainerStyle={s.sliderContent}
        renderItem={({ item }) => (
          <Image
            source={item}
            style={[s.processImg, { width: imgWidth, height: imgHeight }]}
            resizeMode="cover"
          />
        )}
      />
    </View>
  );
}

// ─── Bullet list ─────────────────────────────────────────────────────────────

function BulletList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={s.bulletList}>
      {items.map((text, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>{"\u2022"}</Text>
          <Text style={s.bulletText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Note callout ────────────────────────────────────────────────────────────

function NoteBox({ text }) {
  if (!text) return null;
  return (
    <View style={s.noteBox}>
      <View style={s.noteIconWrap}>
        <Ionicons name="information-circle" size={22} color={CIRCLE} />
      </View>
      <View style={s.noteTextWrap}>
        <Text style={s.noteLabel}>Note</Text>
        <Text style={s.noteText}>{text}</Text>
      </View>
    </View>
  );
}

// ─── Sheet ───────────────────────────────────────────────────────────────────

export default function ServiceDetailsSheet({ visible, service, category, onClose }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const payloadRef = useRef(null);
  if (visible && (service || category)) {
    payloadRef.current = service
      ? { type: "service", service }
      : { type: "category", category };
  }
  const payload = payloadRef.current;
  const activeService = payload?.type === "service" ? payload.service : null;
  const activeCategory = payload?.type === "category" ? payload.category : null;

  const content = useMemo(() => {
    if (activeCategory) {
      return getServiceDetailsContent({
        slug: activeCategory.slug,
        name: activeCategory.name,
        category: activeCategory.name,
      });
    }
    if (activeService) return getServiceDetailsContent(activeService);
    return null;
  }, [activeService, activeCategory]);

  const sheetHeight = Math.min(height * 0.95, height - insets.top - 120);

  if (!content) return null;

  const heroSource = activeCategory?.heroSource || null;

  return (
    <SheetOverlay visible={visible} onClose={onClose}>
      <View style={[s.sheet, { height: sheetHeight }]}>
        {/* Fixed category title */}
        <Text style={s.categoryTitle}>{content.title}</Text>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Hero banner (same as category screen) */}
          {heroSource ? (
            <Image source={heroSource} style={s.heroBanner} resizeMode="cover" />
          ) : null}

          {/* Overview */}
          <Text style={s.overviewBody}>{content.overview}</Text>

          {/* The Process */}
          <Text style={s.sectionTitle}>{content.processTitle}</Text>

          {/* Sliding process images */}
          <ProcessImageSlider images={content.processImages} />

          {/* Timeline steps */}
          <ProcessTimeline steps={content.steps} />

          {/* Divider */}
          <View style={s.divider} />

          {/* Prepare section */}
          <Text style={s.prepareSectionLabel}>Prepare</Text>
          <Text style={s.prepareSectionTitle}>{content.prepareTitle}</Text>
          <BulletList items={content.prepareBullets} />

          {/* Divider */}
          <View style={s.divider} />

          {/* After Care section */}
          <Text style={s.afterCareSectionLabel}>After Care</Text>
          <Text style={s.afterCareSectionTitle}>{content.afterCareTitle}</Text>
          <BulletList items={content.afterCareBullets} />

          {/* Note */}
          <NoteBox text={content.note} />
        </ScrollView>
      </View>
    </SheetOverlay>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 20,
  },

  // Category title (bold, dark, top)
  categoryTitle: {
    color: TITLE_COLOR,
    fontFamily: fonts.poppinsBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.3,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },

  // Hero banner
  heroBanner: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: "#EFE9E4",
  },

  // Overview paragraph
  overviewBody: {
    color: BODY_GRAY,
    fontFamily: fonts.poppinsRegular,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 22,
  },

  // Section titles
  sectionTitle: {
    color: "#1A1A1A",
    fontFamily: fonts.poppinsBold,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 14,
  },

  // Process images slider
  sliderWrap: {
    marginBottom: 18,
    marginHorizontal: -spacing.md,
  },
  sliderContent: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  processImg: {
    borderRadius: 10,
    backgroundColor: "#EFE9E4",
  },

  // Timeline
  timeline: {
    paddingBottom: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    minHeight: 76,
  },
  railCol: {
    alignItems: "center",
  },
  railSegment: {
    flex: 1,
    minHeight: 8,
    borderRadius: 1,
  },
  railSpacer: {
    flex: 1,
    minHeight: 8,
  },
  stepCircle: {
    backgroundColor: CIRCLE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepNum: {
    color: "#FFFFFF",
    fontFamily: fonts.poppinsBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  stepBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 6,
    paddingBottom: 18,
  },
  stepTitle: {
    color: STEP_TITLE,
    fontFamily: fonts.poppinsBold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
    textDecorationLine: "underline",
  },
  stepDesc: {
    color: BODY_GRAY,
    fontFamily: fonts.poppinsRegular,
    fontSize: 13,
    lineHeight: 19,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 20,
  },

  // Prepare section
  prepareSectionLabel: {
    color: CIRCLE,
    fontFamily: fonts.poppinsBold,
    fontSize: 14,
    letterSpacing: 0.4,
    marginBottom: 4,
    textDecorationLine: "underline",
  },
  prepareSectionTitle: {
    color: TITLE_COLOR,
    fontFamily: fonts.poppinsBold,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },

  // After Care section
  afterCareSectionLabel: {
    color: "#6B6B6B",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  afterCareSectionTitle: {
    color: CIRCLE,
    fontFamily: fonts.poppinsBold,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
    textDecorationLine: "underline",
  },

  // Bullet list
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingRight: 4,
  },
  bulletDot: {
    color: BODY_GRAY,
    fontFamily: fonts.poppinsRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    color: BODY_GRAY,
    fontFamily: fonts.poppinsRegular,
    fontSize: 13,
    lineHeight: 20,
  },

  // Note box
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: NOTE_BG,
    borderWidth: 1,
    borderColor: NOTE_BORDER,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  noteIconWrap: {
    marginTop: 1,
  },
  noteTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  noteLabel: {
    color: "#1A1A1A",
    fontFamily: fonts.poppinsBold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  noteText: {
    color: BODY_GRAY,
    fontFamily: fonts.poppinsRegular,
    fontSize: 12,
    lineHeight: 18,
  },
});
