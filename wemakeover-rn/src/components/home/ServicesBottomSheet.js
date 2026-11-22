import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../theme/theme";
import PopularServiceCard from "./PopularServiceCard";
import SheetOverlay from "../SheetOverlay";

export default function ServicesBottomSheet({ visible, title, services, onClose, onServicePress }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(height * 0.82, height - insets.top - 40);

  return (
    <SheetOverlay visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { height: sheetHeight, paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <FlatList
          data={services}
          keyExtractor={(item) => item._id?.toString() || item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <PopularServiceCard
                service={item}
                fullWidth
                onPress={() => {
                  onClose();
                  onServicePress(item);
                }}
              />
            </View>
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
    overflow: "hidden",
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
  listItem: { marginBottom: spacing.md },
});
