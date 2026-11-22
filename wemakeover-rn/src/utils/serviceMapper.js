/**
 * Helpers to read display fields from a raw service document and to build the
 * payload that the cart slice (`addToCart`) expects.
 */

export const getServiceImage = (service) => {
  if (!service) return null;
  if (service.mobileImage) return service.mobileImage;
  if (Array.isArray(service.image)) return service.image[0] || null;
  return service.image || null;
};

/** Category image for mobile UI (mobileImage with website fallback). */
export const getCategoryDisplayImage = (category) => {
  if (!category) return null;
  return category.mobileImage || category.image || null;
};

export const getServiceId = (service) => service?._id?.toString?.() || service?.id?.toString?.() || "";

export const hasOptions = (service) =>
  Array.isArray(service?.options) && service.options.length > 0;

export const getOptionPrice = (service, optionIndex = 0) => {
  if (hasOptions(service)) {
    const opt = service.options[optionIndex] ?? service.options[0];
    if (opt?.price != null && opt.price !== "") return Number(opt.price) || 0;
  }
  return Number(service?.price) || 0;
};

/**
 * Human-readable price string (handles "2.5k-11k" style priceDisplay and
 * "Get in touch" fallbacks).
 */
export const getPriceDisplay = (service, optionIndex = 0) => {
  const source = hasOptions(service) ? service.options[optionIndex] ?? service.options[0] : service;
  if (source?.priceDisplay != null && String(source.priceDisplay).trim() !== "") {
    return String(source.priceDisplay);
  }
  if (source?.price != null && source.price !== "") {
    return `₹${Number(source.price).toLocaleString("en-IN")}`;
  }
  return "Get in touch for pricing";
};

/** True when the service can actually be added to the cart (numeric price). */
export const isAddable = (service, optionIndex = 0) => {
  if (service?.isAvailable === false) return false;
  const cta = service?.ctaContent;
  const enquiryOnly = cta && !String(cta).toLowerCase().includes("add");
  if (enquiryOnly) return false;
  return getOptionPrice(service, optionIndex) > 0;
};

/** Build the cart payload accepted by `addToCart`. */
export const toCartItem = (service, optionIndex = 0) => {
  const opt = hasOptions(service) ? service.options[optionIndex] ?? service.options[0] : null;
  return {
    service_id: getServiceId(service),
    cardHeader: service?.name || "Service",
    cardHeaderLine2: service?.nameLine2?.trim() || "",
    description: service?.description || "",
    price: getOptionPrice(service, optionIndex),
    img: getServiceImage(service),
    optionIndex: hasOptions(service) ? optionIndex : undefined,
    optionLabel: opt?.label || null,
    duration: service?.duration || "",
    taxIncluded: service?.taxIncluded !== false,
    category: service?.category || "default",
    serviceType: service?.serviceType || "Standard",
  };
};
