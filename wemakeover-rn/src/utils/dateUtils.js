/**
 * Return YYYY-MM-DD for the user's local calendar date (not UTC).
 */
export const getLocalDateString = (date = new Date()) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString();
  return localISOTime.split("T")[0];
};

export const isLocalToday = (dateString) => {
  return dateString === getLocalDateString();
};
