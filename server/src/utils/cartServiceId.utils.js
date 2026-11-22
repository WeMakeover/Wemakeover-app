/**
 * Collapse duplicate option suffixes on cart line ids (e.g. _opt_0_opt_0 -> _opt_0).
 */
export const normalizeCartServiceId = (serviceId) => {
  if (typeof serviceId !== 'string') return serviceId;
  const trimmed = serviceId.trim();
  if (!trimmed) return trimmed;

  const repeated = trimmed.match(/^(.+?)(_opt_(\d+))(?:_opt_\3)+$/);
  if (repeated) {
    return `${repeated[1]}_opt_${repeated[3]}`;
  }

  return trimmed;
};
