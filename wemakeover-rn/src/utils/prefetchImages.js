import { Image } from "react-native";
import { cloudinaryImage } from "./cloudinaryImage";

const started = new Set();

/** Download remote photos before the screen that shows them is opened. */
export function prefetchImages(urls, variant = "list") {
  const list = Array.isArray(urls) ? urls : [urls];
  list.forEach((url) => {
    const resolved = cloudinaryImage(url, variant);
    if (!resolved || started.has(resolved)) return;
    started.add(resolved);
    Image.prefetch(resolved).catch(() => {
      started.delete(resolved);
    });
  });
}
