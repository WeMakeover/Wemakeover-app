export const parseBoolField = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1";
};
