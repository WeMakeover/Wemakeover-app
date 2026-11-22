import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { Loading, ErrorState, EmptyState } from "../../components/ui";
import { categoriesApi } from "../../features/categories/categoriesApi";
import { getCartItemId } from "../../features/cart/cartItemId";
import {
  addToCart,
  decreaseQuantity,
  increaseQuantity,
  MAX_QUANTITY_PER_SERVICE,
  selectItemQuantity,
} from "../../features/cart/cartSlice";
import { groupServicesByType } from "../../utils/serviceGrouping";
import { getPriceDisplay, getServiceImage, isAddable, toCartItem } from "../../utils/serviceMapper";
import { prefetchImages } from "../../utils/prefetchImages";
import RemoteImage from "../../components/RemoteImage";
import ServiceDetailsSheet from "../../components/ServiceDetailsSheet";

const servicesHero = require("../../../assets/home/services-hero-raw-1.png");
const facialCleanupHero = require("../../../assets/home/facial-cleanup-banner.png");
const waxingHero = require("../../../assets/home/waxing-banner.png");
const makeupMehndiHero = require("../../../assets/home/makeup-mehndi-banner.png");
const detanBleachHero = require("../../../assets/home/detan-bleach-banner.png");
const massageBodyPolishHero = require("../../../assets/home/massage-body-polish-banner.png");
const manicurePedicureHero = require("../../../assets/home/manicure-pedicure-banner.png");

const CATEGORY_HERO_BY_SLUG = {
  "facial-cleanup": facialCleanupHero,
  waxing: waxingHero,
  "makeup-mehndi": makeupMehndiHero,
  "detan-bleach": detanBleachHero,
  "massage-body-polish": massageBodyPolishHero,
  "manicure-pedicure": manicurePedicureHero,
};
const CATEGORY_HERO_BY_NAME = {
  "Facial & Cleanup": facialCleanupHero,
  "Facial & Clean-up": facialCleanupHero,
  Waxing: waxingHero,
  "Makeup & Mehndi": makeupMehndiHero,
  "Makeup & Mehendi": makeupMehndiHero,
  "De-Tan & Bleach": detanBleachHero,
  "De-tan & Bleach": detanBleachHero,
  "Massage & Body Polish": massageBodyPolishHero,
  "Manicure & Pedicure": manicurePedicureHero,
};

function getCategoryHero(categoryName, categorySlug) {
  if (categorySlug && CATEGORY_HERO_BY_SLUG[categorySlug]) {
    return CATEGORY_HERO_BY_SLUG[categorySlug];
  }
  if (categoryName && CATEGORY_HERO_BY_NAME[categoryName]) {
    return CATEGORY_HERO_BY_NAME[categoryName];
  }
  return servicesHero;
}

const HERO_BASE_WIDTH = 393;
const HERO_BASE_HEIGHT = 263;
const TABS_REGULAR_PREMIUM_BRIDAL = ["Regular", "Premium", "Bridal"];
const TABS_REGULAR_PREMIUM = ["Regular", "Premium"];

/** Categories that only show Regular | Premium (no Bridal). */
const TWO_TAB_CATEGORY_SLUGS = new Set([
  "waxing",
  "manicure-pedicure",
  "massage-body-polish",
]);
const TWO_TAB_CATEGORY_NAMES = new Set([
  "Waxing",
  "Manicure & Pedicure",
  "Massage & Body Polish",
]);

/** Makeup shows Regular | Bridal to match service grouping from catalog. */
const REGULAR_BRIDAL_CATEGORY_SLUGS = new Set(["makeup-mehndi"]);
const REGULAR_BRIDAL_CATEGORY_NAMES = new Set([
  "Makeup & Mehndi",
  "Makeup & Mehendi",
]);

/** Flat list only — no Regular / Premium / Bridal tabs. */
const NO_TAB_CATEGORY_SLUGS = new Set(["detan-bleach"]);
const NO_TAB_CATEGORY_NAMES = new Set(["De-Tan & Bleach", "De-tan & Bleach"]);

function getTabOrder(categoryName, categorySlug) {
  if (
    (categorySlug && NO_TAB_CATEGORY_SLUGS.has(categorySlug)) ||
    (categoryName && NO_TAB_CATEGORY_NAMES.has(categoryName))
  ) {
    return null;
  }
  if (
    (categorySlug && REGULAR_BRIDAL_CATEGORY_SLUGS.has(categorySlug)) ||
    (categoryName && REGULAR_BRIDAL_CATEGORY_NAMES.has(categoryName))
  ) {
    return ["Regular", "Bridal"];
  }
  if (
    (categorySlug && TWO_TAB_CATEGORY_SLUGS.has(categorySlug)) ||
    (categoryName && TWO_TAB_CATEGORY_NAMES.has(categoryName))
  ) {
    return TABS_REGULAR_PREMIUM;
  }
  return TABS_REGULAR_PREMIUM_BRIDAL;
}

/** Map DB types into visible tabs (Classic/Standard → Regular; Bridal → Premium when Bridal tab is hidden). */
function mapTabTitle(title, tabOrder) {
  if (!title) return "Regular";
  if (title === "Classic" || title === "Standard") return "Regular";
  if (tabOrder.includes(title)) return title;
  if (title === "Bridal" && !tabOrder.includes("Bridal")) return "Premium";
  return "Regular";
}

function CategoryServiceListItem({ service }) {
  const dispatch = useDispatch();
  const optionIndex = 0;
  const cartItem = toCartItem(service, optionIndex);
  const cartItemId = getCartItemId(cartItem);
  const qty = useSelector(selectItemQuantity(cartItem));
  const image = getServiceImage(service);
  const addable = isAddable(service, optionIndex);
  const title = [service?.name, service?.nameLine2].filter(Boolean).join(" ").trim() || "Service";
  const ctaLabel = service?.ctaContent?.trim() || "Enquire";

  const actionControl = addable ? (
    qty > 0 ? (
      <View style={styles.qtyWrap}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => dispatch(decreaseQuantity(cartItemId))}
          style={styles.qtyBtn}
        >
          <Ionicons name="remove" size={16} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{qty}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={qty >= MAX_QUANTITY_PER_SERVICE}
          onPress={() => dispatch(increaseQuantity(cartItemId))}
          style={[styles.qtyBtn, qty >= MAX_QUANTITY_PER_SERVICE ? styles.qtyBtnDisabled : null]}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => dispatch(addToCart(cartItem))}
        style={styles.addBtn}
      >
        <Text style={styles.addBtnText}>Add +</Text>
      </TouchableOpacity>
    )
  ) : (
    <View style={styles.addBtn}>
      <Text style={styles.addBtnText}>{ctaLabel}</Text>
    </View>
  );

  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardBody}>
        {image ? (
          <RemoteImage uri={image} variant="list" style={styles.serviceImage} />
        ) : (
          <View style={[styles.serviceImage, styles.serviceImageFallback]}>
            <Text style={styles.serviceImageFallbackText}>WM</Text>
          </View>
        )}

        <View style={styles.serviceMain}>
          {service?.duration ? (
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={13} color="#8A8A8A" />
              <Text style={styles.durationText} numberOfLines={1}>
                {service.duration}
              </Text>
            </View>
          ) : null}

          <Text style={styles.serviceTitle} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.priceWrap}>
            <Text style={styles.servicePrice} numberOfLines={1}>
              {getPriceDisplay(service, optionIndex)}
            </Text>
            {service?.taxIncluded !== false ? (
              <Text style={styles.taxText} numberOfLines={1}>
                Inc Taxes
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.serviceAction}>{actionControl}</View>
      </View>
    </View>
  );
}

export default function CategoryServicesScreen({ route, navigation }) {
  const { categoryId, categoryName } = route.params || {};
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [services, setServices] = useState([]);
  const [resolvedName, setResolvedName] = useState(categoryName || "Services");
  const [resolvedSlug, setResolvedSlug] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [knowMoreOpen, setKnowMoreOpen] = useState(false);

  const load = useCallback(async () => {
    if (!categoryId) {
      setError("Category not available");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    try {
      const res = await categoriesApi.getCategoryServices(categoryId);
      setServices(res?.data?.services || []);
      const name = res?.data?.category?.name || categoryName;
      const slug = res?.data?.category?.slug || null;
      if (name) setResolvedName(name);
      if (slug) setResolvedSlug(slug);
    } catch (e) {
      setError(e.message || "Failed to load services");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, categoryName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    prefetchImages(services.map((service) => getServiceImage(service)), "list");
  }, [services]);

  const tabOrder = useMemo(
    () => getTabOrder(resolvedName, resolvedSlug),
    [resolvedName, resolvedSlug]
  );

  useEffect(() => {
    setActiveTab(0);
  }, [categoryId, tabOrder]);

  const groups = useMemo(() => {
    // Flat list categories (e.g. De-Tan & Bleach): no tab grouping.
    if (!tabOrder) {
      return [{ title: "All", data: services }];
    }

    const grouped = groupServicesByType(services);
    const merged = {};
    for (const title of tabOrder) merged[title] = [];

    for (const group of grouped) {
      const title = mapTabTitle(group.title, tabOrder);
      if (!merged[title]) merged[title] = [];
      merged[title].push(...group.data);
    }

    return tabOrder.map((title) => ({
      title,
      data: merged[title] || [],
    }));
  }, [services, tabOrder]);
  const showTabs = !loading && !error && Array.isArray(tabOrder) && tabOrder.length > 1;
  const safeTab = Math.min(activeTab, Math.max(groups.length - 1, 0));
  const activeServices = groups[safeTab]?.data || [];
  const heroSource = getCategoryHero(resolvedName, resolvedSlug);
  const heroHeight =
    Math.round((width * HERO_BASE_HEIGHT) / HERO_BASE_WIDTH) + insets.top;

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.fixedTop}>
        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <Image source={heroSource} style={styles.heroPhoto} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)"]}
            locations={[0.35, 0.65, 1]}
            style={styles.heroGradient}
            pointerEvents="none"
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")
            }
            style={[styles.backBtn, { top: insets.top + 10 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color="#1C1C28" />
          </TouchableOpacity>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {resolvedName}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setKnowMoreOpen(true)}
              hitSlop={8}
              style={styles.knowMoreBtn}
              accessibilityRole="button"
              accessibilityLabel="Know More"
            >
              <Text style={styles.knowMoreHeroText}>Know More</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {showTabs ? (
          <View style={styles.tabsWrap}>
            <View style={styles.tabsRow}>
              {groups.map((group, index) => {
                const active = index === safeTab;
                return (
                  <TouchableOpacity
                    key={group.title}
                    onPress={() => setActiveTab(index)}
                    activeOpacity={0.9}
                    style={[styles.tabSegment, active ? styles.tabSegmentActive : null]}
                  >
                    <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                      {group.title}
                    </Text>
                    {active ? <View style={styles.tabUnderline} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.listSection}>
        {loading ? (
          <Loading text="Loading services..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : activeServices.length === 0 ? (
          <EmptyState
            icon="sparkles-outline"
            title={`No ${groups[safeTab]?.title || "Regular"} services`}
            subtitle="Services for this tab will appear here soon."
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          >
            {activeServices.map((service, index) => (
              <CategoryServiceListItem
                key={service._id || service.id || `${service.name}-${index}`}
                service={service}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <ServiceDetailsSheet
        visible={knowMoreOpen}
        category={{
          name: resolvedName,
          slug: resolvedSlug,
          heroSource,
        }}
        onClose={() => setKnowMoreOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  fixedTop: { backgroundColor: colors.canvas },
  heroWrap: {
    width: "100%",
    backgroundColor: "#D5C0A5",
    overflow: "hidden",
    position: "relative",
  },
  heroPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    // Anchor crop to the top of the photo
    top: 0,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 3,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  heroTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 20,
    justifyContent: "flex-end",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Avenir",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  knowMoreBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
  },
  knowMoreHeroText: {
    color: "#FFFFFF",
    fontFamily: "Avenir",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  tabsWrap: {
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  tabsRow: {
    flexDirection: "row",
    width: "100%",
    overflow: "hidden",
    borderRadius: 4,
  },
  tabSegment: {
    flex: 1,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 8,
    position: "relative",
  },
  tabSegmentActive: {
    backgroundColor: "#FFFFFF",
  },
  tabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: "#7A1F35",
  },
  tabText: {
    color: "#9A9A9A",
    fontFamily: "Avenir",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  tabTextActive: {
    color: "#7A1F35",
    fontWeight: "700",
  },
  listSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    minHeight: 360,
  },
  listContent: {
    paddingBottom: spacing.xl,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0F0F0",
    padding: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  serviceCardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serviceImage: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: "#EFE9E4",
  },
  serviceImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  serviceImageFallbackText: {
    color: colors.primary,
    fontFamily: "Avenir",
    fontSize: 13,
    fontWeight: "700",
  },
  serviceMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 4,
  },
  serviceAction: {
    alignSelf: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    color: "#8A8A8A",
    fontFamily: "Avenir",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
  },
  serviceTitle: {
    color: "#1A1A1A",
    fontFamily: "Avenir",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  priceWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  servicePrice: {
    color: "rgba(204, 43, 82, 1)",
    fontFamily: fonts.poppinsBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.25,
    includeFontPadding: false,
  },
  taxText: {
    color: "rgba(204, 43, 82, 0.75)",
    fontFamily: fonts.poppinsMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.25,
    includeFontPadding: false,
  },
  addBtn: {
    width: 90,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  addBtnText: {
    color: colors.primary,
    fontFamily: "Avenir",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  qtyWrap: {
    width: 90,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.35,
  },
  qtyValue: {
    color: "#1C1C28",
    fontFamily: "Avenir",
    fontSize: 13,
    fontWeight: "700",
  },
});
