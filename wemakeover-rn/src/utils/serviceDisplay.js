/**
 * Parse bodyContent into bullet lines for popular service cards.
 */
export function getServiceBullets(service, max = 3) {
  const raw = service?.bodyContent || "";
  if (!raw.trim()) return [];

  return raw
    .split(/\n|•|·/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max);
}
