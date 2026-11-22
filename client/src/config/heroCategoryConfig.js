/**
 * Stable hero category slots — match DB categories by slug/name aliases,
 * not by display name alone (admin can rename categories).
 */
export const HERO_CATEGORY_SLOTS = [
  {
    id: 1,
    legacySlugs: ["professional-makeup"],
    legacyNames: ["Professional Makeup"],
    fallbackName: "Professional Makeup",
    modalKey: "professionalMakeup",
  },
  {
    id: 2,
    legacySlugs: ["facial", "cleanup-facial", "cleanup-and-facial"],
    legacyNames: ["Facial", "Cleanup & Facial", "Cleanup and Facial"],
    fallbackName: "Facial",
    modalKey: "cleanupAndFacial",
  },
  {
    id: 3,
    legacySlugs: ["professional-mehendi", "professional-mehandi"],
    legacyNames: ["Professional Mehendi", "Professional Mehandi"],
    fallbackName: "Professional Mehendi",
    modalKey: "professionalMehendi",
  },
  {
    id: 4,
    legacySlugs: ["waxing"],
    legacyNames: ["Waxing"],
    fallbackName: "Waxing",
    modalKey: "waxing",
  },
  {
    id: 5,
    legacySlugs: [
      "mani-pedi-massage",
      "manicure-pedicure",
      "manicure-and-pedicure",
      "mani-pedi-and-massage",
    ],
    legacyNames: [
      "Mani/Pedi & Massage",
      "Manicure and Pedicure",
      "Mani Pedi & Massage",
    ],
    fallbackName: "Mani/Pedi & Massage",
    modalKey: "manicureAndPedicure",
  },
  {
    id: 6,
    legacySlugs: ["detan-bleach", "bleach-detan", "bleach-and-detan"],
    legacyNames: ["Detan & Bleach", "Bleach and De-Tan", "Detan and Bleach"],
    fallbackName: "Detan & Bleach",
    modalKey: "bleachAndDeTan",
  },
];
