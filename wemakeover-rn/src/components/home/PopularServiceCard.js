import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { colors, radius, spacing } from "../../theme/theme";
import { QtyStepper } from "../ui";
import {
  getServiceImage,
  getPriceDisplay,
  isAddable,
  toCartItem,
} from "../../utils/serviceMapper";
import { getServiceBullets } from "../../utils/serviceDisplay";
import { getCartItemId } from "../../features/cart/cartItemId";
import RemoteImage from "../RemoteImage";
import {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  selectItemQuantity,
} from "../../features/cart/cartSlice";

const CARD_WIDTH = 220;
const ACCENT = "#6B2F45";
const starIcon = require("../../../assets/home/star.png");

export default function PopularServiceCard({ service, onPress, fullWidth = false }) {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const optionIndex = 0;
  const cartItem = toCartItem(service, optionIndex);
  const cartItemId = getCartItemId(cartItem);
  const qty = useSelector(selectItemQuantity(cartItem));
  const image = getServiceImage(service);
  const addable = isAddable(service, optionIndex);
  const bullets = getServiceBullets(service);
  const cardWidth = fullWidth ? width - spacing.md * 2 : Math.min(CARD_WIDTH, width * 0.58);

  const title = [service?.name, service?.nameLine2].filter(Boolean).join(" ");

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.card, { width: cardWidth }, !fullWidth && styles.cardHorizontal]}
    >
      <View style={styles.imageWrap}>
        {image ? (
          <RemoteImage uri={image} variant="list" style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>WM</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.ratingPill}>
              <Image source={starIcon} style={styles.star} resizeMode="contain" />
              <Text style={styles.ratingText}>4.5</Text>
            </View>
          </View>

          {bullets.length > 0 ? (
            <View style={styles.bullets}>
              {bullets.map((line, i) => (
                <View key={`${line}-${i}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText} numberOfLines={1}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          ) : service?.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {service.description}
            </Text>
          ) : null}

          {service?.duration ? (
            <Text style={styles.duration}>{service.duration}</Text>
          ) : null}
        </View>

        <View style={styles.footerDivider} />

        <View style={styles.footer}>
          <Text style={styles.price} numberOfLines={1}>
            {getPriceDisplay(service, optionIndex)}
          </Text>
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
                onPress={(e) => {
                  e.stopPropagation?.();
                  dispatch(addToCart(cartItem));
                }}
              >
                <Text style={styles.addText}>Add +</Text>
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
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: "hidden",
    // Keep horizontal cards equal height so price/Add stay on one baseline
    minHeight: 292,
  },
  cardHorizontal: { marginRight: spacing.sm },
  imageWrap: { height: 126, backgroundColor: colors.canvas },
  image: { width: "100%", height: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#E4E4E4" },
  imageFallbackText: { color: ACCENT, fontWeight: "700", fontSize: 13 },
  body: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: "space-between",
  },
  meta: {
    flexGrow: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    minHeight: 45, // reserve space for up to 2 title lines
  },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1C1C28", lineHeight: 22.5 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  star: {
    width: 12,
    height: 12,
  },
  ratingText: { fontSize: 12, fontWeight: "500", color: "#555770" },
  bullets: { marginTop: 2 },
  bulletRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  bulletDot: { color: "#555770", marginRight: 4, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10, color: "#555770", lineHeight: 16 },
  description: { marginTop: 2, fontSize: 10, color: "#555770", lineHeight: 16 },
  duration: { fontSize: 12, color: "#1C1C28", lineHeight: 16, marginTop: 4, marginBottom: 8 },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E8E8EE",
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    gap: 2,
  },
  price: { flex: 1, fontSize: 14, fontWeight: "700", color: ACCENT, letterSpacing: 0.1 },
  addBtn: {
    backgroundColor: ACCENT,
    borderWidth: 0,
    minWidth: 80,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  enquireBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  enquireText: { color: ACCENT, fontWeight: "700", fontSize: 12 },
});
