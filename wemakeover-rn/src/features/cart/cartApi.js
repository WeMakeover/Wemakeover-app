import {
  getCartItemId,
  normalizeCartServiceId,
  parseOptionIndexFromServiceId,
} from "./cartItemId.js";
import { BACKEND_URL as backendurl } from "../../config/env";
import { apiFetch } from "../../lib/apiFetch";

/** Canonical serviceId for API calls (PATCH/DELETE) and lookups. */
const normalizeServiceId = (item) => {
  if (!item) return "";
  const fromHelper = getCartItemId(item);
  if (fromHelper) {
    return normalizeCartServiceId(fromHelper);
  }
  if (typeof item.serviceId === "string" && item.serviceId.trim().length > 0) {
    return normalizeCartServiceId(item.serviceId.trim());
  }
  if (item.cardHeader) {
    return `${item.cardHeader}_${item.price ?? 0}_${item.category ?? "default"}`;
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const transformCartItem = (item, overrideQuantity) => {
  const price = parseFloat(item?.price ?? 0);
  const quantity = overrideQuantity ?? item?.quantity ?? 1;
  const serviceId = normalizeServiceId(item);
  const optionFromId = parseOptionIndexFromServiceId(serviceId);
  const optionIndex =
    item?.optionIndex !== undefined && item?.optionIndex !== null
      ? item.optionIndex
      : optionFromId;

  return {
    serviceId,
    cardHeader: item?.cardHeader ?? item?.name ?? "",
    description: item?.description ?? "",
    price,
    img: item?.img ?? item?.image ?? "",
    quantity,
    duration: item?.duration ?? "",
    taxIncluded: Boolean(item?.taxIncluded),
    category: item?.category ?? "default",
    serviceType: item?.serviceType ?? "Standard",
    optionLabel: item?.optionLabel ?? null,
    optionIndex: optionIndex ?? null,
    subtotal: price * quantity,
  };
};

const transformCartPayload = (cartData) => {
  const items = Array.isArray(cartData?.items) ? cartData.items : [];
  return items.map((item) => transformCartItem(item));
};

export const saveCartToDatabase = async (cartData) => {
  const transformedItems = transformCartPayload(cartData);
  const response = await apiFetch(`${backendurl}/cart/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: transformedItems }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to save cart");
  return data;
};

export const getCartFromDatabase = async () => {
  const response = await apiFetch(`${backendurl}/cart`, { method: "GET" });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to get cart");
  return data;
};

export const restoreCartFromDatabase = async (localCartData) => {
  const response = await apiFetch(`${backendurl}/cart/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: localCartData.items || [] }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to restore cart");
  return data;
};

export const clearCartFromDatabase = async () => {
  const response = await apiFetch(`${backendurl}/cart/clear`, { method: "DELETE" });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to clear cart");
  return data;
};

export const addItemToDatabaseCart = async (itemData) => {
  const payload = transformCartItem(itemData);
  const response = await apiFetch(`${backendurl}/cart/add-item`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to add item");
  return data;
};

export const updateItemQuantityInDatabase = async (serviceId, quantity) => {
  const normalizedId = normalizeServiceId({ serviceId });
  const response = await apiFetch(`${backendurl}/cart/item/${normalizedId}/quantity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to update quantity");
  return data;
};

export const removeItemFromDatabaseCart = async (serviceId) => {
  const normalizedId = normalizeServiceId({ serviceId });
  const response = await apiFetch(`${backendurl}/cart/item/${normalizedId}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Failed to remove item");
  return data;
};

export { normalizeServiceId, transformCartItem, transformCartPayload };
