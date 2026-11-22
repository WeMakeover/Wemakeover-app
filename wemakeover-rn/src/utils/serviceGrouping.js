/**
 * Group a category's services into "service type" tabs, mirroring the website
 * (transformServicesToGridCard + SERVICE_TYPE_DISPLAY_ORDER).
 *
 * DB `serviceType` values are mapped to tab names and ordered:
 *   Regular -> Premium -> Bridal
 * Classic / Standard map into Regular.
 */
export const SERVICE_TYPE_DISPLAY_ORDER = ["Regular", "Premium", "Bridal"];

const TYPE_TO_TAB = {
  Standard: "Regular",
  Regular: "Regular",
  Classic: "Regular",
  Premium: "Premium",
  Bridal: "Bridal",
};

export const mapServiceTypeToTab = (serviceType) =>
  TYPE_TO_TAB[serviceType] || serviceType || "Regular";

/**
 * @param {Array} services raw service docs from the API
 * @returns {Array<{ title: string, data: Array }>} ordered groups
 */
export const groupServicesByType = (services = []) => {
  if (!services.length) return [];

  const grouped = services.reduce((acc, service) => {
    const tab = mapServiceTypeToTab(service.serviceType || "Standard");
    if (!acc[tab]) acc[tab] = [];
    acc[tab].push(service);
    return acc;
  }, {});

  const orderedTitles = Object.keys(grouped).sort((a, b) => {
    const i = SERVICE_TYPE_DISPLAY_ORDER.indexOf(a);
    const j = SERVICE_TYPE_DISPLAY_ORDER.indexOf(b);
    const orderA = i === -1 ? SERVICE_TYPE_DISPLAY_ORDER.length : i;
    const orderB = j === -1 ? SERVICE_TYPE_DISPLAY_ORDER.length : j;
    return orderA - orderB;
  });

  return orderedTitles.map((title) => ({ title, data: grouped[title] }));
};
