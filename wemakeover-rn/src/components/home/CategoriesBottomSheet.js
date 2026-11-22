import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import SheetOverlay from "../SheetOverlay";
import RemoteImage from "../RemoteImage";

const GRID_GAP = spacing.sm;

function CategoryTile({ category, onPress, tileSize }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(category)}
      style={[styles.tile, { width: tileSize, height: tileSize * 1.05 }]}
    >
      <View style={styles.imageWrap}>
        {category.image ? (
          <RemoteImage uri={category.image} variant="list" style={styles.image} />
        ) : (
          <View style={styles.iconFallback}>
            <Ionicons name={category.icon || "pricetag-outline"} size={28} color={colors.primary} />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function CategoriesBottomSheet({ visible, categories, onClose, onCategoryPress }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sheetHeight = Math.min(height * 0.78, height - insets.top - 40);
  const tileSize = (width - spacing.md * 2 - GRID_GAP * 2) / 3;

  return (
    <SheetOverlay visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { height: sheetHeight, paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>All Categories</Text>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.key}
          numColumns={3}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <CategoryTile
              category={item}
              tileSize={tileSize}
              onPress={(cat) => {
                onClose();
                onCategoryPress(cat);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SheetOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  row: { gap: GRID_GAP, marginBottom: GRID_GAP },
  tile: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: { marginBottom: spacing.xs },
  image: { width: 56, height: 56, borderRadius: radius.md },
  iconFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "Avenir-Heavy",
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: 14,
  },
});
