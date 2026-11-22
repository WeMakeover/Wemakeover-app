import { useEffect, useState } from "react";
import { categoriesApi } from "../features/categories/categoriesApi";
import {
  matchHeroCategory,
  transformServicesByCardType,
} from "../utils/serviceTransformers";

/**
 * Load services for a hero modal category.
 * Renders by each service's cardType: Vertical → GridCard, Horizontal → FlexCard.
 */
export function useHeroCategoryServices({
  categoryId = null,
  categoryName = null,
  legacySlugs = [],
  legacyNames = [],
}) {
  const [flexCards, setFlexCards] = useState([]);
  const [gridCard, setGridCard] = useState([]);
  const [resolvedName, setResolvedName] = useState(categoryName);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        let resolvedId = categoryId;
        let name = categoryName;

        if (!resolvedId) {
          const categoriesResponse = await categoriesApi.getAllCategories();
          const categories = categoriesResponse.data || [];
          const category = matchHeroCategory(categories, {
            slugs: legacySlugs,
            names: legacyNames,
            categoryId,
          });
          resolvedId = category?._id || category?.id || null;
          name = name || category?.name || null;
        }

        if (!resolvedId) {
          if (!cancelled) {
            setFlexCards([]);
            setGridCard([]);
            setResolvedName(name);
          }
          return;
        }

        const servicesResponse = await categoriesApi.getCategoryServices(resolvedId);
        if (cancelled) return;

        const categoryServices = servicesResponse.data?.services || [];
        name =
          categoryName ||
          servicesResponse.data?.category?.name ||
          name ||
          null;

        const { flexCards: flex, gridCard: grid } = transformServicesByCardType(
          categoryServices,
          name
        );

        setResolvedName(name);
        setFlexCards(flex);
        setGridCard(grid);
      } catch (error) {
        console.error("Error loading hero category services:", error);
        if (!cancelled) {
          setFlexCards([]);
          setGridCard([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [categoryId, categoryName, legacySlugs, legacyNames]);

  return { flexCards, gridCard, categoryName: resolvedName, loading };
}
