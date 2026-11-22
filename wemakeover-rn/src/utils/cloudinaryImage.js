const UPLOAD_MARKER = "/image/upload/";

const TRANSFORMS = {
  list: "w_480,c_limit,f_auto,q_auto",
  detail: "w_1200,c_limit,f_auto,q_auto",
};

/**
 * Shrink a Cloudinary original for the phone. Other URLs are returned unchanged.
 * List cards use a small file. The service page uses a larger one.
 */
export function cloudinaryImage(url, variant = "list") {
  const value = String(url || "").trim();
  if (!value) return "";
  const transform = TRANSFORMS[variant] || TRANSFORMS.list;
  const at = value.indexOf(UPLOAD_MARKER);
  if (at < 0 || !value.includes("res.cloudinary.com")) return value;

  const rest = value.slice(at + UPLOAD_MARKER.length);
  const first = rest.split("/")[0] || "";
  if (/_/.test(first) && !/^v\d+$/.test(first)) return value;

  return `${value.slice(0, at + UPLOAD_MARKER.length)}${transform}/${rest}`;
}
