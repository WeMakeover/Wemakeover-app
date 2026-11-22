import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Loading, ErrorState } from "../../components/ui";
import HomeHero, { getHomeHeroMetrics } from "../../components/home/HomeHero";
import HomeTopBar from "../../components/home/HomeTopBar";
import SectionHeader from "../../components/home/SectionHeader";
import PopularServiceCard from "../../components/home/PopularServiceCard";
import ServicesBottomSheet from "../../components/home/ServicesBottomSheet";
import LocationPickerSheet from "../../components/home/LocationPickerSheet";
import BridalPromoBanner from "../../components/home/BridalPromoBanner";
import HomeFooter from "../../components/home/HomeFooter";
import { servicesApi } from "../../features/services/servicesApi";
import { categoriesApi } from "../../features/categories/categoriesApi";
import { buildHeroCategories } from "../../config/heroCategories";
import { useDeviceLocation } from "../../hooks/useDeviceLocation";
import { pickRandom } from "../../utils/arrayUtils";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { getUserAddresses, setDefaultAddress, deleteAddress } from "../../features/address/addressThunks";
import {
  selectAddresses,
  selectAddressLoading,
  selectDefaultAddress,
} from "../../features/address/addressSlice";
import { formatSavedAddressSubline } from "../../utils/addressDisplay";
import { getServiceImage } from "../../utils/serviceMapper";
import { prefetchImages } from "../../utils/prefetchImages";
import RemoteImage from "../../components/RemoteImage";

const GRID_GAP = 16;
const POPULAR_COUNT = 5;
const SHEET_COUNT = 12;

const chunk = (arr, size) => {
  const rows = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
};

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const route = useRoute();
  const location = useDeviceLocation();
  const { width } = useWindowDimensions();
  const tileSize = (width - 40 - GRID_GAP * 2) / 3;
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const addresses = useSelector(selectAddresses);
  const defaultAddress = useSelector(selectDefaultAddress);
  const addressesLoading = useSelector(selectAddressLoading);

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [popularSheetOpen, setPopularSheetOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [sheetServices, setSheetServices] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const selectedAddressIdRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { heroHeight } = getHomeHeroMetrics(width);
  const headerFadeEnd = Math.max(1, heroHeight - 72);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      // Load independently so Popular API failures never blank Categories
      const [catResult, svcResult, popularResult] = await Promise.allSettled([
        categoriesApi.getAllCategories(),
        servicesApi.getAllServices({ limit: 100, isActive: true }),
        servicesApi.getPopularServices({ limit: 50 }),
      ]);

      if (catResult.status === "fulfilled") {
        setCategories(buildHeroCategories(catResult.value?.data || []));
      } else {
        setCategories([]);
        setError(catResult.reason?.message || "Failed to load categories");
      }

      if (svcResult.status === "fulfilled") {
        setServices(svcResult.value?.data?.services || []);
      } else {
        setServices([]);
      }

      if (popularResult.status === "fulfilled") {
        setPopularServices(popularResult.value?.data?.services || []);
      } else {
        setPopularServices([]);
      }
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getUserAddresses());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      selectedAddressIdRef.current = null;
      setSelectedAddress(null);
      return;
    }

    // Prefer the address the user just picked; don't stomp it with a stale default
    if (selectedAddressIdRef.current) {
      const picked = addresses.find(
        (a) => String(a._id || a.id) === String(selectedAddressIdRef.current)
      );
      if (picked) {
        setSelectedAddress(picked);
        return;
      }
    }

    if (defaultAddress) {
      selectedAddressIdRef.current = defaultAddress._id || defaultAddress.id;
      setSelectedAddress(defaultAddress);
      return;
    }

    const first = addresses[0] || null;
    selectedAddressIdRef.current = first?._id || first?.id || null;
    setSelectedAddress(first);
  }, [isAuthenticated, defaultAddress, addresses]);

  const addressSubline = useMemo(() => {
    if (!isAuthenticated) return "";
    if (!selectedAddress) return "Add address";
    return formatSavedAddressSubline(selectedAddress);
  }, [isAuthenticated, selectedAddress]);

  const onRefresh = () => {
    setRefreshing(true);
    location.refresh();
    if (isAuthenticated) dispatch(getUserAddresses());
    loadAll();
  };

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false && s.isAvailable !== false),
    [services]
  );

  const popularPreview = useMemo(
    () => popularServices.slice(0, POPULAR_COUNT),
    [popularServices]
  );

  const homeCategories = useMemo(() => categories.slice(0, 6), [categories]);

  useEffect(() => {
    prefetchImages(homeCategories.map((cat) => cat.image), "list");
    prefetchImages(popularPreview.map((service) => getServiceImage(service)), "list");
    prefetchImages(popularPreview.map((service) => getServiceImage(service)), "detail");
  }, [homeCategories, popularPreview]);

  const bridalCategory = useMemo(
    () => categories.find((c) => /bridal/i.test(c.name)),
    [categories]
  );

  const openCategory = (cat) => {
    if (!cat?.dbId) return;
    navigation.navigate("CategoryServices", {
      categoryId: cat.dbId,
      categoryName: cat.name,
    });
  };

  const openService = (service) => {
    prefetchImages(getServiceImage(service), "detail");
    navigation.navigate("ServiceDetail", { service });
  };

  const openPopularSheet = () => {
    // Prefer full curated list; fall back to random actives only if empty
    const forSheet =
      popularServices.length > 0
        ? popularServices
        : pickRandom(activeServices, SHEET_COUNT);
    setSheetServices(forSheet);
    setPopularSheetOpen(true);
  };

  const openBridal = () => {
    if (bridalCategory?.dbId) {
      openCategory(bridalCategory);
      return;
    }
    const bridalService = activeServices.find((s) => /bridal/i.test(s.name || ""));
    if (bridalService) openService(bridalService);
  };

  const openReferEarn = () => {
    if (!isAuthenticated) {
      Toast.show({
        type: "info",
        text1: "Login required",
        text2: "Sign in to get your referral code and start earning.",
      });
      return;
    }
    // Open Refer & Earn on the Home stack — do not switch to Account tab
    navigation.navigate("ReferEarn");
  };

  const openLocationSheet = () => {
    // Always open picker when possible so address list is reachable from the header dropdown
    if (isAuthenticated) {
      dispatch(getUserAddresses());
      setLocationSheetOpen(true);
      return;
    }
    location.refresh();
  };

  const handleSelectAddress = (addr) => {
    const id = addr?._id || addr?.id || null;
    selectedAddressIdRef.current = id;
    setSelectedAddress(addr || null);
    setLocationSheetOpen(false);
    if (id) dispatch(setDefaultAddress(id));
  };

  const handleAddAddress = () => {
    setLocationSheetOpen(false);
    navigation.navigate("AddressForm", { reopenLocationSheet: true });
  };

  const handleEditAddress = (addr) => {
    setLocationSheetOpen(false);
    navigation.navigate("AddressForm", { address: addr, reopenLocationSheet: true });
  };

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.reopenLocationSheet) return undefined;
      setLocationSheetOpen(true);
      dispatch(getUserAddresses());
      navigation.setParams?.({ reopenLocationSheet: undefined });
      return undefined;
    }, [route.params?.reopenLocationSheet, dispatch, navigation])
  );

  const handleDeleteAddress = async (addr) => {
    const id = addr?._id || addr?.id;
    if (!id) return;
    const result = await dispatch(deleteAddress(id));
    if (!result.error) {
      if (String(selectedAddressIdRef.current) === String(id)) {
        selectedAddressIdRef.current = null;
        setSelectedAddress(null);
      }
      dispatch(getUserAddresses());
    }
  };

  const onHomeScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false, // backgroundColor / tintColor cannot use native driver
      }),
    [scrollY]
  );

  return (
    <View style={styles.safe}>
      <HomeTopBar
        location={location}
        onReferPress={openReferEarn}
        addressSubline={addressSubline}
        showAddressLine={isAuthenticated}
        onLocationPress={openLocationSheet}
        scrollY={scrollY}
        fadeEnd={headerFadeEnd}
      />

      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onHomeScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <HomeHero />

        <View style={styles.body}>
          <SectionHeader
            title="Categories"
            style={styles.sectionTop}
          />

          <View style={styles.categoriesBlock}>
          {loading ? (
            <View style={styles.loadingBox}>
              <Loading />
            </View>
          ) : (
            chunk(homeCategories, 3).map((row, ri, rows) => (
              <View
                key={`cat-row-${ri}`}
                style={[
                  styles.gridRow,
                  ri === rows.length - 1 ? styles.gridRowLast : null,
                ]}
              >
                {row.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    activeOpacity={0.85}
                    onPress={() => openCategory(cat)}
                    style={[styles.catTile, { width: tileSize, height: 102 }]}
                  >
                    <View style={styles.catImageWrap}>
                      {cat.image ? (
                        <RemoteImage uri={cat.image} variant="list" style={styles.catImage} />
                      ) : (
                        <View style={styles.catIconCircle}>
                          <Ionicons name={cat.icon} size={26} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.catName} numberOfLines={2}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {row.length < 3
                  ? [...Array(3 - row.length)].map((_, i) => (
                      <View key={`spacer-${i}`} style={{ width: tileSize }} />
                    ))
                  : null}
              </View>
            ))
          )}
          </View>

          <SectionHeader
            title="Popular Near You"
            actionLabel="View All"
            onAction={openPopularSheet}
            style={styles.popularHeader}
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <Loading />
            </View>
          ) : error ? (
            <View style={styles.loadingBox}>
              <ErrorState message={error} onRetry={loadAll} />
            </View>
          ) : popularPreview.length === 0 ? (
            <Text style={styles.emptyText}>No services available right now.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {popularPreview.map((service) => (
                <PopularServiceCard
                  key={service._id || service.id}
                  service={service}
                  onPress={() => openService(service)}
                />
              ))}
            </ScrollView>
          )}

          <BridalPromoBanner onBookNow={openBridal} />
          <HomeFooter />
        </View>
      </Animated.ScrollView>

      <ServicesBottomSheet
        visible={popularSheetOpen}
        title="Popular Near You"
        services={sheetServices}
        onClose={() => setPopularSheetOpen(false)}
        onServicePress={openService}
      />

      <LocationPickerSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        city={location.city}
        cityLoading={location.isLoading}
        deviceCoords={location.coords}
        onUseCurrentLocation={() => {
          location.refresh();
        }}
        addresses={addresses}
        addressesLoading={addressesLoading}
        selectedAddressId={selectedAddress?._id || selectedAddress?.id}
        onSelectAddress={handleSelectAddress}
        onAddAddress={handleAddAddress}
        onEditAddress={handleEditAddress}
        onDeleteAddress={handleDeleteAddress}
        showSavedAddresses={isAuthenticated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 0, flexGrow: 1 },
  body: { paddingTop: 24, backgroundColor: "#FFFFFF" },
  sectionTop: { marginTop: spacing.xs },
  categoriesBlock: {
    paddingTop: 24,
  },
  popularHeader: { marginTop: 24 },
  gridRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: GRID_GAP,
    gap: GRID_GAP,
  },
  gridRowLast: {
    marginBottom: 0,
  },
  catTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  catImageWrap: { marginBottom: spacing.xs },
  catImage: { width: 50, height: 50, borderRadius: radius.md },
  catIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: {
    fontFamily: "Avenir-Heavy",
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: 16,
  },
  popularRow: {
    paddingLeft: spacing.md,
    paddingRight: 0,
    paddingBottom: spacing.xs,
  },
  loadingBox: { height: 180, justifyContent: "center" },
  emptyText: {
    textAlign: "center",
    color: colors.muted,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
