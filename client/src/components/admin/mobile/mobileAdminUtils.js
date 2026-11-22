export const MOBILE_TAB_ORDER = ["Classic", "Regular", "Premium", "Bridal"];

export const SERVICE_TYPE_OPTIONS = [
  { value: "Classic", label: "Classic" },
  { value: "Premium", label: "Premium" },
  { value: "Standard", label: "Regular" },
  { value: "Bridal", label: "Bridal" },
];

const TYPE_TO_TAB = {
  Standard: "Regular",
  Regular: "Regular",
  Classic: "Classic",
  Premium: "Premium",
  Bridal: "Bridal",
  Deluxe: "Premium",
};

export const mapServiceTypeToTab = (serviceType) =>
  TYPE_TO_TAB[serviceType] || serviceType || "Regular";

export const getServiceImage = (service) => {
  if (!service) return null;
  if (service.mobileImage) return service.mobileImage;
  if (Array.isArray(service.image)) return service.image[0] || null;
  if (Array.isArray(service.images)) return service.images[0] || null;
  return service.image || null;
};

export const formatMobilePrice = (price) => {
  if (price == null || price === "") return "Get in touch for pricing";
  const num = Number(price);
  if (!Number.isNaN(num) && num > 0) return `₹${num.toLocaleString("en-IN")}`;
  return String(price);
};

export const getPriceDisplay = (service) => {
  if (service?.priceDisplay) return String(service.priceDisplay);
  return formatMobilePrice(service?.price);
};

export const isAddableService = (service) => {
  if (service?.isAvailable === false) return false;
  const cta = service?.ctaContent || "Add";
  if (cta !== "Add") return false;
  const price = Number(service?.price);
  return !Number.isNaN(price) && price > 0;
};

export const groupServicesByMobileTab = (services = []) => {
  const grouped = services.reduce((acc, service) => {
    const tab = mapServiceTypeToTab(service.serviceType);
    if (!acc[tab]) acc[tab] = [];
    acc[tab].push(service);
    return acc;
  }, {});

  return MOBILE_TAB_ORDER.filter((tab) => grouped[tab]?.length).map((tab) => ({
    tab,
    services: grouped[tab],
  }));
};
