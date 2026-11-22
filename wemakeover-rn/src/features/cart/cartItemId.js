const OPTION_SUFFIX_PATTERN = /(_opt_\d+)+$/;

/**
 * Strip trailing _opt_N suffix(es) from a cart/service id.
 */
export const stripOptionSuffix = (id) => {
  if (typeof id !== "string") return "";
  const trimmed = id.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.+?)(_opt_\d+)+$/);
  return match ? match[1] : trimmed;
};

export const parseOptionIndexFromServiceId = (id) => {
  if (typeof id !== "string") return null;
  const match = id.trim().match(/_opt_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

export const normalizeCartServiceId = (serviceId) => {
  if (typeof serviceId !== "string") return "";
  const trimmed = serviceId.trim();
  if (!trimmed) return "";
  const repeated = trimmed.match(/^(.+?)(_opt_(\d+))(?:_opt_\3)+$/);
  if (repeated) {
    return `${repeated[1]}_opt_${repeated[3]}`;
  }
  return trimmed;
};

/**
 * Single source of truth for cart item ID.
 */
export const getCartItemId = (serviceData) => {
  if (!serviceData) return "";

  const rawBase = serviceData.service_id || serviceData.serviceId || serviceData.id;
  const baseId = stripOptionSuffix(rawBase || "");

  if (baseId && serviceData.optionIndex !== undefined && serviceData.optionIndex !== null) {
    return `${baseId}_opt_${serviceData.optionIndex}`;
  }

  if (rawBase) {
    return normalizeCartServiceId(String(rawBase));
  }

  if (serviceData.cardHeader) {
    return `${serviceData.cardHeader}_${serviceData.price}_${serviceData.category || "default"}`;
  }

  return "";
};
