/**
 * Rich Know-More content per category.
 * Each category gets: overview, process steps, sliding process images,
 * prepare (before appointment) bullets, afterCare bullets, and a note.
 */

// ─── Process images (bundled) ────────────────────────────────────────────────
const PROCESS_IMAGES = {
  facial: [
    require("../../assets/know-more/facial-process-1.png"),
    require("../../assets/know-more/facial-process-2.png"),
    require("../../assets/know-more/facial-process-3.png"),
  ],
  waxing: [
    require("../../assets/know-more/waxing-process-1.png"),
    require("../../assets/know-more/waxing-process-2.png"),
    require("../../assets/know-more/waxing-process-3.png"),
  ],
  manicure: [
    require("../../assets/know-more/manicure-process-1.png"),
    require("../../assets/know-more/manicure-process-2.png"),
    require("../../assets/know-more/manicure-process-3.png"),
  ],
  makeup: [
    require("../../assets/know-more/makeup-process-1.png"),
    require("../../assets/know-more/makeup-process-2.png"),
    require("../../assets/know-more/makeup-process-3.png"),
  ],
  massage: [
    require("../../assets/know-more/massage-process-1.png"),
    require("../../assets/know-more/massage-process-2.png"),
    require("../../assets/know-more/massage-process-3.png"),
  ],
  detan: [
    require("../../assets/know-more/detan-process-1.png"),
    require("../../assets/know-more/detan-process-2.png"),
    require("../../assets/know-more/detan-process-3.png"),
  ],
};

// ─── Full category content ───────────────────────────────────────────────────
const CATEGORY_CONTENT = {
  "facial-cleanup": {
    title: "FACIAL",
    overview:
      "At WeMakeover, every facial is carefully performed by hand, step by step, based on your skin\u2019s needs. From deep cleansing and gentle exfoliation to relaxing massage, targeted treatment and a finishing mask, we create a fresh, nourished and visibly refreshed skin experience, right at your doorstep.",
    processTitle: "The Process",
    processImages: PROCESS_IMAGES.facial,
    steps: [
      {
        title: "Skin Cleansing",
        description:
          "The face is gently cleansed to remove makeup, oil and surface impurities, preparing the skin for the facial.",
      },
      {
        title: "Gentle Exfoliation",
        description:
          "A fruit-based exfoliating product is applied to gently remove dead skin cells and reveal smoother-looking skin.",
      },
      {
        title: "Facial Massage",
        description:
          "A relaxing facial massage is performed to help nourish the skin and enhance the overall facial experience.",
      },
      {
        title: "Face Mask & Moisturising",
        description:
          "A suitable facial mask is applied, followed by moisturiser to leave the skin feeling soft, refreshed and hydrated.",
      },
    ],
    prepareTitle: "Before Your Appointment",
    prepareBullets: [
      "Avoid using harsh scrubs or exfoliating products before the service.",
      "Avoid applying heavy creams or facial oils immediately before the appointment.",
      "Inform your professional about any skin sensitivity or recent facial treatments.",
    ],
    afterCareTitle: "After Service Is Completed",
    afterCareBullets: [
      "Avoid harsh scrubs or exfoliation for 24\u201348 hours.",
      "Avoid using strong active skincare products immediately after the facial.",
      "Avoid excessive heat, steam and intense workouts for the day.",
      "Keep the skin moisturised and well hydrated.",
      "Apply sunscreen when stepping outdoors during the day.",
    ],
    note: "A mild feeling of sensitivity or temporary redness may occur after exfoliation, especially on sensitive skin. Avoid the service on irritated or sunburned skin and inform your professional about any known skin sensitivity before starting the facial.",
  },

  waxing: {
    title: "WAXING",
    overview:
      "Our waxing services deliver smooth, clean and long-lasting results with a gentle, hygienic approach. We use quality products and follow professional techniques to minimise discomfort while caring for your skin, right at your doorstep.",
    processTitle: "The Process",
    processImages: PROCESS_IMAGES.waxing,
    steps: [
      {
        title: "Skin Preparation",
        description:
          "Area is cleansed and dried properly to prepare the skin for a comfortable waxing experience.",
      },
      {
        title: "Wax Application",
        description:
          "RICA wax is applied evenly in the direction of hair growth for effective hair grip.",
      },
      {
        title: "Hair Removal",
        description:
          "Wax is removed carefully to lift unwanted hair while minimising unnecessary pulling on the skin.",
      },
      {
        title: "Skin Soothing",
        description:
          "A calming post-wax product is applied to help comfort the skin and leave it feeling smooth.",
      },
    ],
    prepareTitle: "Before Your Appointment",
    prepareBullets: [
      "Keep the room cold- AC on if available (AC is recommended).",
      "Keep the area clean and prepared for quick initiation of the service.",
      "Avoid heavy lotion oil immediately before the service.",
      "Wear comfortable and loose clothes.",
      "Avoid shaving in the day just before.",
    ],
    afterCareTitle: "After Service Is Completed",
    afterCareBullets: [
      "Avoid hot shower after the service.",
      "Skip intense workout or sweating for the day.",
      "Avoid using scrub on treated area.",
      "Minimise friction on waxed skin for 24hrs.",
      "Apply Aloe vera gel gently to relax the skin.",
    ],
    note: "Some temporary redness or sensitivity may occur after waxing. Your WeMakeover professional will assess your skin before starting.",
  },

  "makeup-mehndi": {
    title: "MAKEUP & MEHNDI",
    overview:
      "At WeMakeover, our Makeup & Mehndi services are designed to enhance your natural beauty while making you feel confident and celebration-ready. From flawless makeup and skin preparation to beautiful mehndi designs, our professionals deliver a personalised experience using quality products and hygienic techniques, right at your doorstep.",
    processTitle: "The Process",
    processImages: PROCESS_IMAGES.makeup,
    steps: [
      {
        title: "Skin Preparation",
        description:
          "The skin is cleansed and prepared to create a smooth, fresh base for long-lasting makeup application.",
      },
      {
        title: "Makeup Application",
        description:
          "Makeup is applied according to your preferences, occasion and look, with attention to complexion, eyes, lips and overall finish.",
      },
      {
        title: "Mehndi Application",
        description:
          "Mehndi is carefully applied using a fresh, quality henna cone to create your preferred design with precision and detail.",
      },
      {
        title: "Final Touch & Setting",
        description:
          "The makeup is carefully checked and finished with setting products, while the mehndi is allowed to dry properly for a beautiful, lasting stain.",
      },
    ],
    prepareTitle: "Before Your Appointment",
    prepareBullets: [
      "Keep your face clean and free from heavy makeup before the service.",
      "Avoid using new skincare products immediately before the appointment.",
      "Avoid heavy creams or facial oils before makeup application.",
      "Keep your hands clean and free from lotion before mehndi application.",
      "Share your preferred makeup look and mehndi design in advance if possible.",
    ],
    afterCareTitle: "After Service Is Completed",
    afterCareBullets: [
      "Avoid touching or rubbing your makeup unnecessarily.",
      "Avoid excessive heat and sweating immediately after the makeup service.",
      "Allow mehndi to dry completely before touching or washing it.",
      "Avoid washing the mehndi area with water for several hours.",
      "Apply a light layer of natural oil after the mehndi has dried to help deepen the stain.",
    ],
    note: "Some temporary skin sensitivity or redness may occur after makeup or mehndi application, especially on sensitive skin. Inform your WeMakeover professional about any known skin sensitivity or allergies before starting the service.",
  },

  "detan-bleach": {
    title: "DE-TAN & BLEACH",
    overview:
      "Our De-tan & Bleach service combines skin brightening care with gentle hair lightening to give your skin a fresh, clean and more even-looking appearance. The treatment is performed carefully using suitable products and professional techniques while keeping your skin comfortable throughout the service.",
    processTitle: "The Process",
    processImages: PROCESS_IMAGES.detan,
    steps: [
      {
        title: "Skin Cleansing & Preparation",
        description:
          "The skin is gently cleansed to remove dirt, oil and surface impurities before beginning the treatment.",
      },
      {
        title: "De-tan Treatment",
        description:
          "A suitable de-tan product is applied to help reduce the appearance of tanning, dullness and uneven-looking skin.",
      },
      {
        title: "Bleach Application",
        description:
          "A carefully selected bleach is applied to the required area to lighten the appearance of facial or body hair.",
      },
      {
        title: "Soothing & Moisturising",
        description:
          "The products are gently removed and a calming moisturiser or post-treatment product is applied to hydrate and soothe the skin.",
      },
    ],
    prepareTitle: "Before Your Appointment",
    prepareBullets: [
      "Avoid using harsh scrubs or exfoliating products before the service.",
      "Avoid applying heavy creams, oils or makeup immediately before the appointment.",
      "Keep the treatment area clean and free from skincare products.",
      "Avoid waxing, threading or other hair-removal treatments immediately before the service.",
      "Inform your professional about any skin sensitivity, allergies or recent facial treatments.",
      "Avoid the service on irritated, damaged or sunburned skin.",
    ],
    afterCareTitle: "After Service Is Completed",
    afterCareBullets: [
      "Avoid direct and prolonged sun exposure for the day.",
      "Apply sunscreen when stepping outdoors.",
      "Avoid harsh scrubs and exfoliation for 24\u201348 hours.",
      "Avoid strong active skincare products immediately after the service.",
      "Avoid excessive heat, steam and intense workouts for the day.",
      "Keep the treated skin moisturised and hydrated.",
      "Avoid rubbing or excessive friction on the treated area.",
    ],
    note: "Temporary redness, mild sensitivity or warmth may occur after a De-tan & Bleach service. This usually settles with proper aftercare. Avoid the treatment on irritated or sunburned skin and inform your professional about any known skin sensitivity before starting.",
  },

  "massage-body-polish": {
    title: "MASSAGE & BODY POLISH",
    overview:
      "Our Massage & Body Polish service combines relaxing massage techniques with gentle exfoliation to refresh tired muscles and leave your skin feeling soft, smooth and nourished. We use quality products and follow a hygienic approach to provide a calming spa experience, right at your doorstep.",
    processTitle: "The Process",
    processImages: PROCESS_IMAGES.massage,
    steps: [
      {
        title: "Skin & Body Preparation",
        description:
          "The treatment area is prepared comfortably and the skin is gently cleansed before beginning the service.",
      },
      {
        title: "Body Exfoliation",
        description:
          "A suitable body polish is applied to gently remove dead skin cells and reveal smoother, softer-looking skin.",
      },
      {
        title: "Relaxing Massage",
        description:
          "A relaxing massage is performed using suitable massage techniques and products to help release everyday muscle tension.",
      },
      {
        title: "Moisturising & Finishing",
        description:
          "The skin is gently cleansed and moisturised to restore softness and leave the body feeling refreshed and nourished.",
      },
    ],
    prepareTitle: "Before Your Appointment",
    prepareBullets: [
      "Keep the treatment area clean and ready for the service.",
      "Avoid applying heavy body lotion or oil immediately before the appointment.",
      "Avoid heavy meals immediately before a full-body massage.",
      "Inform your professional about any areas of discomfort or sensitivity.",
      "Wear comfortable and loose clothing.",
    ],
    afterCareTitle: "After Service Is Completed",
    afterCareBullets: [
      "Drink enough water after the massage.",
      "Avoid intense workouts or strenuous activity for the rest of the day.",
      "Avoid very hot showers immediately after the service.",
      "Avoid harsh scrubs or exfoliating products for 24 hours.",
      "Keep the skin moisturised and allow your body to relax.",
    ],
    note: "Mild muscle soreness or temporary skin sensitivity may occur after a massage or body polish. Inform your professional about any discomfort during the service so the treatment can be adjusted accordingly.",
  },

  "manicure-pedicure": {
    title: "MANICURE & PEDICURE",
    overview:
      "Our Manicure & Pedicure services are designed to keep your hands and feet healthy, clean and beautifully groomed. We use high-quality products and follow hygienic techniques to nourish your skin and nails, leaving you feeling refreshed and confident.",
    processTitle: "The Process",
    processImages: PROCESS_IMAGES.manicure,
    steps: [
      {
        title: "Nail Cleaning & Shaping",
        description:
          "Nails are cleaned, trimmed and shaped to your preferred style.",
      },
      {
        title: "Cuticle Care",
        description:
          "Cuticles are gently pushed back and excess dead skin is removed for neat and healthy nails.",
      },
      {
        title: "Exfoliation & Massage",
        description:
          "Hands and feet are exfoliated to remove dead skin cells, followed by a relaxing massage to improve circulation.",
      },
      {
        title: "Polish Application",
        description:
          "A nourishing base coat, your choice of nail polish and a protective top coat are applied for a long-lasting shine.",
      },
    ],
    prepareTitle: "Before Your Appointment",
    prepareBullets: [
      "Remove old nail polish before the service.",
      "Avoid applying hand cream or foot lotion immediately before the appointment.",
      "Inform your professional about any nail or skin conditions.",
      "Wear open-toe footwear for a pedicure.",
    ],
    afterCareTitle: "After Service Is Completed",
    afterCareBullets: [
      "Avoid water exposure for at least 1\u20132 hours.",
      "Avoid harsh chemicals or heavy cleaning for the day.",
      "Apply hand cream and cuticle oil regularly.",
      "Keep nails clean and avoid picking or biting.",
      "For pedicure, avoid tight footwear for a few hours.",
    ],
    note: "Slight redness or sensitivity may occur around the nails or cuticles. This is normal and will subside soon. Inform your professional about any discomfort.",
  },
};

// Alias lookups (category name → slug key)
const NAME_TO_SLUG = {
  "Facial & Cleanup": "facial-cleanup",
  "Facial & Clean-up": "facial-cleanup",
  Waxing: "waxing",
  "Makeup & Mehndi": "makeup-mehndi",
  "Makeup & Mehendi": "makeup-mehndi",
  "De-Tan & Bleach": "detan-bleach",
  "De-tan & Bleach": "detan-bleach",
  "Massage & Body Polish": "massage-body-polish",
  "Manicure & Pedicure": "manicure-pedicure",
};

function detectSlugFromService(service) {
  const blob = [
    service?.name,
    service?.nameLine2,
    service?.category,
    service?.serviceType,
    service?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/facial|cleanup|clean-up|glow|o3/.test(blob)) return "facial-cleanup";
  if (/wax|honey|rika|sanfe|peel/.test(blob)) return "waxing";
  if (/massage|polish|scrub|spa/.test(blob)) return "massage-body-polish";
  if (/manicure|pedicure|nail/.test(blob)) return "manicure-pedicure";
  if (/bleach|de-?tan|detan|tan/.test(blob)) return "detan-bleach";
  if (/makeup|mehndi|mehendi|bridal/.test(blob)) return "makeup-mehndi";
  return null;
}

const FALLBACK = {
  title: "BEAUTY SERVICE",
  overview:
    "At WeMakeover, every service is thoughtfully performed at your doorstep with expert care and quality products. From preparation to finish, our beauty partners ensure a comfortable, professional experience every time.",
  processTitle: "The Process",
  processImages: null,
  steps: [
    {
      title: "Preparation",
      description: "Tools and products prepared. Skin or area assessed before we begin.",
    },
    {
      title: "Core Treatment",
      description: "Main technique delivered with steady, expert pacing and careful attention.",
    },
    {
      title: "Refine & Finish",
      description: "Detail pass for a clean, even result. Finishing product applied.",
    },
    {
      title: "Aftercare Advice",
      description: "Simple tips shared to help you maintain the results at home.",
    },
  ],
  prepareTitle: "Before Your Appointment",
  prepareBullets: [
    "Ensure the treatment area is clean and accessible.",
    "Inform your professional about any allergies or skin conditions.",
  ],
  afterCareTitle: "After Service Is Completed",
  afterCareBullets: [
    "Avoid harsh products on treated areas for 24 hours.",
    "Keep the area moisturised and hydrated.",
  ],
  note: null,
};

/**
 * Get full Know-More content for a category or individual service.
 *
 * @param {object} source - either { slug, name } for category mode, or a service object
 * @returns content object with all sheet sections
 */
export function getServiceDetailsContent(source) {
  const slug =
    source?.slug ||
    NAME_TO_SLUG[source?.name] ||
    NAME_TO_SLUG[source?.category] ||
    detectSlugFromService(source);

  const cat = (slug && CATEGORY_CONTENT[slug]) || FALLBACK;

  const steps = cat.steps.map((s, i) => ({
    id: `step-${i + 1}`,
    title: s.title,
    description: s.description,
  }));

  return {
    title: cat.title,
    overview: cat.overview,
    processTitle: cat.processTitle || "The Process",
    processImages: cat.processImages || null,
    steps,
    prepareTitle: cat.prepareTitle || "Before Your Appointment",
    prepareBullets: cat.prepareBullets || [],
    afterCareTitle: cat.afterCareTitle || "After Service Is Completed",
    afterCareBullets: cat.afterCareBullets || [],
    note: cat.note || null,
  };
}

export default getServiceDetailsContent;
