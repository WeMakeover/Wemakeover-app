import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";

/**
 * Central font-family names used across the app.
 *
 * - Inter / Poppins / Playfair: bundled via @expo-google-fonts (works on iOS + Android).
 * - Avenir / Avenir Next: built-in system fonts on iOS (render with no setup).
 *   On Android they are NOT available and fall back to the system font UNTIL
 *   you drop the licensed .ttf files into `assets/fonts/` and enable them in
 *   `fontAssets` below (see the commented block).
 */
export const fonts = {
  // Inter
  interRegular: "Inter_400Regular",
  interMedium: "Inter_500Medium",
  interSemiBold: "Inter_600SemiBold",
  interBold: "Inter_700Bold",
  interExtraBold: "Inter_800ExtraBold",

  // Poppins
  poppinsRegular: "Poppins_400Regular",
  poppinsMedium: "Poppins_500Medium",
  poppinsSemiBold: "Poppins_600SemiBold",
  poppinsBold: "Poppins_700Bold",

  // Playfair Display
  playfairRegular: "PlayfairDisplay_400Regular",
  playfairSemiBold: "PlayfairDisplay_600SemiBold",
  playfairBold: "PlayfairDisplay_700Bold",

  // Avenir (iOS PostScript names)
  avenirRoman: "Avenir-Roman",
  avenirMedium: "Avenir-Medium",
  avenirHeavy: "Avenir-Heavy",
  avenirBlack: "Avenir-Black",

  // Avenir Next (iOS PostScript names)
  avenirNext: "AvenirNext-Regular",
  avenirNextMedium: "AvenirNext-Medium",
  avenirNextDemi: "AvenirNext-DemiBold",
  avenirNextBold: "AvenirNext-Bold",
};

/**
 * Fonts to load at app start via expo-font `useFonts`.
 *
 * To enable Avenir / Avenir Next on Android, add your licensed .ttf files to
 * `assets/fonts/` using these exact filenames and uncomment the block below.
 * The key MUST match the family name referenced in styles (see `fonts` above),
 * so on iOS the system font is used and on Android the bundled file is used.
 */
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,

  // "Avenir-Roman": require("../../assets/fonts/Avenir-Roman.ttf"),
  // "Avenir-Medium": require("../../assets/fonts/Avenir-Medium.ttf"),
  // "Avenir-Heavy": require("../../assets/fonts/Avenir-Heavy.ttf"),
  // "Avenir-Black": require("../../assets/fonts/Avenir-Black.ttf"),
  // "AvenirNext-Regular": require("../../assets/fonts/AvenirNext-Regular.ttf"),
  // "AvenirNext-Medium": require("../../assets/fonts/AvenirNext-Medium.ttf"),
  // "AvenirNext-DemiBold": require("../../assets/fonts/AvenirNext-DemiBold.ttf"),
  // "AvenirNext-Bold": require("../../assets/fonts/AvenirNext-Bold.ttf"),
};
