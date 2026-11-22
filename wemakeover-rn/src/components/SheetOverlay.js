import React from "react";
import {
  Modal,
  View,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "../theme/theme";

/** Full-screen dim behind bottom sheets. */
export const SHEET_SCRIM = "rgba(0, 0, 0, 0.6)";

/**
 * Bottom-sheet host with a reliable full-screen dim.
 *
 * Root + absolute scrim paint the dim (Android/Expo often skip painting
 * empty absolute Pressables). A flex:1 Pressable sits ABOVE the sheet so
 * outside taps dismiss without blocking sheet interactions.
 */
export default function SheetOverlay({
  visible,
  onClose,
  children,
  showClose = true,
  cover = null,
  bottomInset = 0,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.scrim} pointerEvents="none" />

        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />

        <View
          style={[styles.sheetWrap, bottomInset > 0 ? { marginBottom: bottomInset } : null]}
          pointerEvents="box-none"
        >
          {showClose ? (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {children}
        </View>

        {cover ? (
          <View style={styles.coverWrap} pointerEvents="box-none">
            {cover}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SHEET_SCRIM,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SHEET_SCRIM,
  },
  dismissArea: {
    flex: 1,
  },
  sheetWrap: {
    width: "100%",
    zIndex: 2,
    elevation: 8,
  },
  coverWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
    justifyContent: "flex-end",
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginRight: spacing.lg,
    marginBottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
  },
});
