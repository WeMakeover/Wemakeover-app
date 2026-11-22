/**
 * Mobile homepage categories — built directly from the API.
 * Admin renames and displayOrder are reflected without hardcoded slot matching.
 */

const DEFAULT_ICON = "pricetag-outline";

const sortCategories = (categories = []) =>
  [...categories].sort((a, b) => {
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  });

/**
 * @param {Array} dbCategories categories returned from GET /categories
 * @returns {Array<{ key, dbId, name, image, icon }>}
 */
export const buildHeroCategories = (dbCategories = []) =>
  sortCategories(dbCategories).map((dbCat) => {
    const id = dbCat._id || dbCat.id;
    return {
      key: String(id),
      dbId: id,
      name: dbCat.name || "Category",
      image: dbCat.mobileImage || dbCat.image || null,
      websiteImage: dbCat.image || null,
      mobileImage: dbCat.mobileImage || null,
      icon: DEFAULT_ICON,
    };
  });
