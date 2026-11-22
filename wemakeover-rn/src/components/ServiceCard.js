import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";
import { Badge, QtyStepper } from "./ui";
import {
  getServiceImage,
  getPriceDisplay,
  isAddable,
  toCartItem,
  getServiceId,
} from "../utils/serviceMapper";
import {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  selectItemQuantity,
} from "../features/cart/cartSlice";
import { getCartItemId } from "../features/cart/cartItemId";
import RemoteImage from "./RemoteImage";

export default function ServiceCard({ service, onPress }) {
  const dispatch = useDispatch();
  const optionIndex = 0;
  const cartItem = toCartItem(service, optionIndex);
  const cartItemId = getCartItemId(cartItem);
  const qty = useSelector(selectItemQuantity(cartItem));
  const image = getServiceImage(service);
  const addable = isAddable(service, optionIndex);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View style={styles.imageWrap}>
        {image ? (
          <RemoteImage uri={image} variant="list" style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
          </View>
        )}
        {service?.serviceType ? (
          <Badge label={service.serviceType} tone="primary" style={styles.typeBadge} />
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {service?.name}
          {service?.nameLine2 ? ` ${service.nameLine2}` : ""}
        </Text>
        {service?.duration ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={styles.meta}>{service.duration}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.price}>{getPriceDisplay(service, optionIndex)}</Text>
          {addable ? (
            qty > 0 ? (
              <QtyStepper
                value={qty}
                onIncrease={() => dispatch(increaseQuantity(cartItemId))}
                onDecrease={() => dispatch(decreaseQuantity(cartItemId))}
              />
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => dispatch(addToCart(cartItem))}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addText}>Add</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.enquireBtn}>
              <Text style={styles.enquireText}>Enquire</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  imageWrap: { width: 96, height: 96, borderRadius: radius.md, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  typeBadge: { position: "absolute", top: 6, left: 6 },
  body: { flex: 1, paddingLeft: spacing.md, justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  meta: { fontSize: 12, color: colors.muted, marginLeft: 4 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  price: { fontSize: 15, fontWeight: "700", color: colors.primary, flexShrink: 1 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  addText: { color: "#fff", fontWeight: "700", fontSize: 13, marginLeft: 2 },
  enquireBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  enquireText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
});
