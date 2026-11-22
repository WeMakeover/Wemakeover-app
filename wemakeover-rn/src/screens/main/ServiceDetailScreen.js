import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Button, Badge, QtyStepper, IconButton } from "../../components/ui";
import {
  getServiceImage,
  getPriceDisplay,
  isAddable,
  toCartItem,
  hasOptions,
} from "../../utils/serviceMapper";
import {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  selectItemQuantity,
  selectCartItemsCount,
} from "../../features/cart/cartSlice";
import { getCartItemId } from "../../features/cart/cartItemId";
import RemoteImage from "../../components/RemoteImage";

export default function ServiceDetailScreen({ route, navigation }) {
  const { service } = route.params || {};
  const dispatch = useDispatch();
  const [optionIndex, setOptionIndex] = useState(0);
  const cartCount = useSelector(selectCartItemsCount);

  const image = getServiceImage(service);
  const cartItem = toCartItem(service, optionIndex);
  const cartItemId = getCartItemId(cartItem);
  const qty = useSelector(selectItemQuantity(cartItem));
  const addable = isAddable(service, optionIndex);
  const options = hasOptions(service) ? service.options : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <TouchableOpacity onPress={() => navigation.navigate("Cart")} style={{ padding: 6 }}>
          <Ionicons name="cart-outline" size={24} color={colors.text} />
          {cartCount > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.imageWrap}>
          {image ? (
            <RemoteImage uri={image} variant="detail" style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Ionicons name="sparkles-outline" size={48} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          {service?.serviceType ? <Badge label={service.serviceType} /> : null}
          <Text style={styles.name}>
            {service?.name}
            {service?.nameLine2 ? ` ${service.nameLine2}` : ""}
          </Text>

          {service?.duration ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={15} color={colors.muted} />
              <Text style={styles.meta}>{service.duration}</Text>
              {service?.taxIncluded !== false ? (
                <Text style={[styles.meta, { marginLeft: spacing.md }]}>Incl. taxes</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.price}>{getPriceDisplay(service, optionIndex)}</Text>

          {service?.description ? (
            <Text style={styles.desc}>{service.description}</Text>
          ) : null}

          {options.length > 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.sectionTitle}>Choose an option</Text>
              {options.map((opt, idx) => {
                const active = idx === optionIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionRow, active ? styles.optionRowActive : null]}
                    onPress={() => setOptionIndex(idx)}
                  >
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? colors.primary : colors.muted}
                    />
                    <Text style={styles.optionLabel}>{opt.label || `Option ${idx + 1}`}</Text>
                    <Text style={styles.optionPrice}>{getPriceDisplay(service, idx)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom action */}
      <View style={styles.footer}>
        {addable ? (
          qty > 0 ? (
            <View style={styles.footerRow}>
              <QtyStepper
                value={qty}
                onIncrease={() => dispatch(increaseQuantity(cartItemId))}
                onDecrease={() => dispatch(decreaseQuantity(cartItemId))}
              />
              <Button
                title="Go to cart"
                onPress={() => navigation.navigate("Cart")}
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          ) : (
            <Button title="Add to cart" onPress={() => dispatch(addToCart(cartItem))} />
          )
        ) : (
          <Button title="Enquire now" variant="outline" onPress={() => navigation.navigate("Profile")} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  imageWrap: { width: "100%", height: 240, backgroundColor: colors.surface },
  image: { width: "100%", height: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  meta: { fontSize: 13, color: colors.muted, marginLeft: 4 },
  price: { fontSize: 22, fontWeight: "800", color: colors.primary, marginTop: spacing.md },
  desc: { fontSize: 14, color: colors.muted, lineHeight: 21, marginTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  optionLabel: { flex: 1, marginLeft: spacing.sm, fontSize: 14, fontWeight: "600", color: colors.text },
  optionPrice: { fontSize: 14, fontWeight: "700", color: colors.primary },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: { flexDirection: "row", alignItems: "center" },
});
