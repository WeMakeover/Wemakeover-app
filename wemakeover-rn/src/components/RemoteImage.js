import React from "react";
import { Image, StyleSheet } from "react-native";
import { cloudinaryImage } from "../utils/cloudinaryImage";

/**
 * Remote catalog photo. The box keeps a plain background until the file arrives.
 * variant "list" is the small card file. "detail" is the larger service photo.
 */
export default function RemoteImage({ uri, variant = "list", style, resizeMode = "cover" }) {
  const resolved = cloudinaryImage(uri, variant);
  if (!resolved) return null;
  return (
    <Image
      source={{ uri: resolved }}
      style={[styles.placeholder, style]}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#F4F1F2",
  },
});
