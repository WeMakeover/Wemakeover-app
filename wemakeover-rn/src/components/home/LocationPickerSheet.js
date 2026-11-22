import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "../../theme/theme";
import { formatAddressType } from "../../utils/addressDisplay";
import {
  formatDistanceKm,
  geocodeSavedAddress,
  haversineKm,
} from "../../utils/geo";
import SheetOverlay, { SHEET_SCRIM } from "../SheetOverlay";

function typeIcon(addressType) {
  if (addressType === "work" || addressType === "office") return "briefcase-outline";
  if (addressType === "other") return "location-outline";
  return "home-outline";
}

/**
 * Delivery location picker — GPS city row stays separate from saved-address list.
 */
export default function LocationPickerSheet({
  visible,
  onClose,
  city,
  cityLoading,
  deviceCoords,
  onUseCurrentLocation,
  addresses = [],
  addressesLoading = false,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
  showSavedAddresses = true,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(height * 0.78, height - insets.top - 48);
  const [query, setQuery] = useState("");
  const [distanceById, setDistanceById] = useState({});
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [menuAddress, setMenuAddress] = useState(null);

  const addressIdsKey = useMemo(
    () => addresses.map((a) => String(a._id || a.id)).join("|"),
    [addresses]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return addresses;
    return addresses.filter((addr) => {
      const blob = [
        addr.addressType,
        addr.houseFlatNumber,
        addr.streetAreaName,
        addr.completeAddress,
        addr.city,
        addr.landmark,
        addr.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [addresses, query]);

  useEffect(() => {
    if (!visible) {
      setMenuAddress(null);
      setQuery("");
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !deviceCoords?.latitude || !addresses.length) {
      setDistanceLoading(false);
      return;
    }

    let cancelled = false;
    setDistanceLoading(true);

    (async () => {
      const next = {};
      for (const addr of addresses) {
        if (cancelled) return;
        const id = String(addr._id || addr.id);
        if (distanceById[id] != null) {
          next[id] = distanceById[id];
          continue;
        }
        const hit = await geocodeSavedAddress(addr);
        if (!hit) {
          next[id] = null;
          continue;
        }
        next[id] = haversineKm(
          deviceCoords.latitude,
          deviceCoords.longitude,
          hit.latitude,
          hit.longitude
        );
      }
      if (!cancelled) {
        setDistanceById((prev) => ({ ...prev, ...next }));
        setDistanceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // intentionally keyed by addressIdsKey so Redux array identity churn doesn't cancel lookups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, deviceCoords?.latitude, deviceCoords?.longitude, addressIdsKey]);

  const confirmDelete = (addr) => {
    Alert.alert("Delete address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setMenuAddress(null);
          onDeleteAddress?.(addr);
        },
      },
    ]);
  };

  return (
    <>
      <SheetOverlay visible={visible} onClose={onClose} showClose>
        <View style={[styles.sheet, { height: sheetHeight, paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.title}>Select delivery location</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#B8B8B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search for area, street name..."
              placeholderTextColor="#8A8A8A"
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>

          <View style={styles.group}>
            <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onUseCurrentLocation}>
              <Ionicons name="locate" size={22} color="#2ECC71" style={styles.rowIcon} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitleGreen}>Use current location</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {cityLoading ? "Detecting..." : city || "City unavailable"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            {showSavedAddresses ? (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onAddAddress}>
                  <Ionicons name="add" size={24} color="#2ECC71" style={styles.rowIcon} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitleGreen}>Add new address</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#888" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {showSavedAddresses ? (
            <View style={styles.savedBlock}>
              <Text style={styles.savedHeading}>Your saved addresses</Text>
              {addressesLoading && addresses.length === 0 ? (
                <ActivityIndicator color="#2ECC71" style={{ marginTop: 16 }} />
              ) : filtered.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {addresses.length === 0
                      ? "No saved addresses yet. Tap Add new address below."
                      : "No matching addresses."}
                  </Text>
                  {addresses.length === 0 ? (
                    <TouchableOpacity style={styles.emptyAddBtn} onPress={onAddAddress} activeOpacity={0.85}>
                      <Text style={styles.emptyAddText}>Add new address</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <ScrollView
                  style={styles.savedScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.savedList}
                  keyboardShouldPersistTaps="handled"
                >
                  {filtered.map((addr) => {
                    const id = addr._id || addr.id;
                    const idKey = String(id);
                    const selected = selectedAddressId && String(selectedAddressId) === idKey;
                    const distanceLabel = formatDistanceKm(distanceById[idKey]);
                    const distanceText =
                      distanceLabel ||
                      (distanceLoading && !Object.prototype.hasOwnProperty.call(distanceById, idKey)
                        ? "…"
                        : "—");

                    return (
                      <View
                        key={idKey}
                        style={[styles.addressCard, selected && styles.addressCardSelected]}
                      >
                        <View style={styles.addressMain}>
                          <TouchableOpacity
                            style={styles.addressIconCard}
                            activeOpacity={0.88}
                            onPress={() => onSelectAddress?.(addr)}
                          >
                            <View style={styles.addressIconTop}>
                              <Ionicons name={typeIcon(addr.addressType)} size={22} color="#F5C542" />
                              {selected ? (
                                <View style={styles.checkBadge}>
                                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                </View>
                              ) : null}
                            </View>
                            <View style={styles.distanceBand}>
                              <Text style={styles.distanceText} numberOfLines={1}>
                                {distanceText}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.addressBody}>
                            <TouchableOpacity activeOpacity={0.88} onPress={() => onSelectAddress?.(addr)}>
                              <Text style={styles.addressType}>{formatAddressType(addr.addressType)}</Text>
                              <Text style={styles.addressDetail} numberOfLines={2}>
                                {[addr.houseFlatNumber, addr.streetAreaName || addr.completeAddress, addr.city]
                                  .filter((p) => p && p !== "N/A")
                                  .join(", ")}
                              </Text>
                              {addr.phone ? (
                                <Text style={styles.addressPhone} numberOfLines={1}>
                                  Phone number: {addr.phone}
                                </Text>
                              ) : null}
                            </TouchableOpacity>

                            <View style={styles.cardActions}>
                              <TouchableOpacity
                                style={styles.moreBtn}
                                activeOpacity={0.85}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                onPress={() => setMenuAddress(addr)}
                                accessibilityRole="button"
                                accessibilityLabel="Address options"
                              >
                                <Ionicons name="ellipsis-horizontal" size={16} color="#2ECC71" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>
      </SheetOverlay>

      {/* Separate modal so options always sit above the location sheet */}
      <Modal
        visible={Boolean(visible && menuAddress)}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
        onRequestClose={() => setMenuAddress(null)}
      >
        <View style={styles.menuRoot}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuAddress(null)} />
          <View style={styles.menuColumn}>
            <TouchableOpacity
              style={styles.menuCloseBtn}
              onPress={() => setMenuAddress(null)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close options"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <Text style={styles.menuTitle}>Select option</Text>

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.85}
                onPress={() => confirmDelete(menuAddress)}
              >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.menuRowText}>Delete address</Text>
                <Ionicons name="chevron-forward" size={18} color="#888" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.85}
                onPress={() => {
                  const addr = menuAddress;
                  setMenuAddress(null);
                  onEditAddress?.(addr);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                <Text style={styles.menuRowText}>Edit address</Text>
                <Ionicons name="chevron-forward" size={18} color="#888" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.85}
                onPress={() => {
                  const addr = menuAddress;
                  setMenuAddress(null);
                  onSelectAddress?.(addr);
                }}
              >
                <Ionicons name="location-outline" size={20} color="#FFFFFF" />
                <Text style={styles.menuRowText}>Set as delivery address</Text>
                <Ionicons name="chevron-forward" size={18} color="#888" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  menuRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: SHEET_SCRIM,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuColumn: {
    width: "100%",
  },
  menuCloseBtn: {
    alignSelf: "flex-end",
    marginRight: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(40,40,40,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  menuSheet: {
    width: "100%",
    backgroundColor: "#2C2C2E",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  menuTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  menuRowText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#3A3A3C",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 10,
  },
  group: {
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  rowIcon: {
    width: 28,
    textAlign: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleGreen: {
    color: "#2ECC71",
    fontSize: 15,
    fontWeight: "700",
  },
  rowSub: {
    color: "#B0B0B0",
    fontSize: 12,
    marginTop: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#3A3A3C",
    marginLeft: 52,
  },
  savedBlock: {
    flex: 1,
    marginTop: 18,
    minHeight: 160,
  },
  savedScroll: {
    flex: 1,
  },
  savedHeading: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  savedList: {
    paddingBottom: 8,
    gap: 10,
  },
  emptyWrap: {
    marginTop: 8,
    gap: 12,
  },
  emptyText: {
    color: "#8A8A8A",
    fontSize: 13,
  },
  emptyAddBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#2ECC71",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyAddText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  addressCard: {
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  addressCardSelected: {
    borderColor: "#2ECC71",
  },
  addressMain: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  addressIconCard: {
    width: 56,
    height: 64,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#6B6B6B",
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  addressIconTop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
  },
  distanceBand: {
    height: 20,
    backgroundColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  distanceText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  checkBadge: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2ECC71",
    alignItems: "center",
    justifyContent: "center",
  },
  addressBody: {
    flex: 1,
    minWidth: 0,
  },
  addressType: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  addressDetail: {
    color: "#C7C7CC",
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  addressPhone: {
    color: "#8A8A8A",
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2ECC71",
    alignItems: "center",
    justifyContent: "center",
  },
});
