import { createSlice, createSelector } from "@reduxjs/toolkit";
import { calculateOrderPricing } from "../../utils/pricingUtils.js";
import {
  getCartItemId,
  normalizeCartServiceId,
  parseOptionIndexFromServiceId,
  stripOptionSuffix,
} from "./cartItemId.js";

/** Maximum quantity allowed per service (must match backend cart model/middleware) */
export const MAX_QUANTITY_PER_SERVICE = 2;

const EMPTY_CART_ITEMS = Object.freeze([]);
const DEFAULT_WM_COINS = Object.freeze({
  enabled: false,
  amount: 0,
  balance: 0,
});
const DEFAULT_CART_SUMMARY = Object.freeze({
  totalServices: 0,
  totalItems: 0,
  subtotal: 0,
  discountAmount: 0,
  discountedSubtotal: 0,
  wmCoinAmount: 0,
  platformFee: 0,
  taxAmount: 0,
  total: 0,
});

const calculateItemSubtotal = (price, quantity) => {
  const itemPrice = parseFloat(price) || 0;
  return itemPrice * quantity;
};

const getCartTotal = (items) =>
  items.reduce((total, item) => total + calculateItemSubtotal(item.price, item.quantity), 0);

const getTotalItemsCount = (items) => items.reduce((total, item) => total + item.quantity, 0);

const getTotalServicesCount = (items) => items.length;

const ensureWmCoins = (state) => {
  if (!state.wmCoins) {
    state.wmCoins = { ...DEFAULT_WM_COINS };
  }
  return state.wmCoins;
};

const updateCartSummary = (items, appliedCoupon = null, wmCoins = null) => {
  const subtotal = getCartTotal(items);
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const discountedAfterCoupon = Math.max(0, Math.round(subtotal) - Math.round(discountAmount));
  const enabled = Boolean(wmCoins?.enabled);
  const balance = Math.max(0, Math.round(wmCoins?.balance || 0));
  const requested = enabled
    ? Math.max(0, Math.round(wmCoins?.amount != null ? wmCoins.amount : balance))
    : 0;
  const wmCoinAmount = Math.min(requested, balance, discountedAfterCoupon);
  const pricing = calculateOrderPricing(subtotal, { discountAmount, wmCoinAmount });
  return {
    totalServices: getTotalServicesCount(items),
    totalItems: getTotalItemsCount(items),
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    discountedSubtotal: pricing.discountedSubtotal,
    wmCoinAmount: pricing.wmCoinAmount,
    platformFee: pricing.platformFee,
    taxAmount: pricing.taxAmount,
    total: pricing.totalAmount,
  };
};

const touchCart = (state, { clearCoupon = false, clearWmCoins = false } = {}) => {
  if (clearCoupon) state.appliedCoupon = null;
  ensureWmCoins(state);
  if (clearWmCoins) {
    state.wmCoins = { ...state.wmCoins, enabled: false, amount: 0 };
  }
  state.summary = updateCartSummary(state.items, state.appliedCoupon, state.wmCoins);
  state.lastUpdated = new Date().toISOString();
};

const initialState = {
  items: [],
  appliedCoupon: null,
  wmCoins: { ...DEFAULT_WM_COINS },
  summary: {
    totalServices: 0,
    totalItems: 0,
    subtotal: 0,
    discountAmount: 0,
    discountedSubtotal: 0,
    wmCoinAmount: 0,
    platformFee: 0,
    taxAmount: 0,
    total: 0,
  },
  isCartOpen: false,
  lastUpdated: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const serviceData = action.payload;
      const cartItemId = getCartItemId(serviceData);
      const existingItem = state.items.find((item) => item.id === cartItemId);

      if (existingItem) {
        if (existingItem.quantity < MAX_QUANTITY_PER_SERVICE) {
          existingItem.quantity += 1;
        }
        existingItem.subtotal = calculateItemSubtotal(existingItem.price, existingItem.quantity);
        existingItem.lastModified = new Date().toISOString();
      } else {
        const newCartItem = {
          id: cartItemId,
          service_id: serviceData.service_id || serviceData.serviceId,
          cardHeader: serviceData.cardHeader,
          cardHeaderLine2: serviceData.cardHeaderLine2 || "",
          description: serviceData.description,
          price: parseFloat(serviceData.price) || 0,
          img: serviceData.img,
          optionIndex: serviceData.optionIndex,
          optionLabel: serviceData.optionLabel,
          quantity: 1,
          duration: serviceData.duration,
          taxIncluded: serviceData.taxIncluded,
          category: serviceData.category || "default",
          serviceType: serviceData.serviceType || "Standard",
          isReferralReward: Boolean(serviceData.isReferralReward),
          addedAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          subtotal: calculateItemSubtotal(serviceData.price, 1),
        };
        state.items.push(newCartItem);
      }

      touchCart(state, { clearCoupon: true });
    },

    setAppliedCoupon: (state, action) => {
      state.appliedCoupon = action.payload;
      const coins = ensureWmCoins(state);
      if (coins.enabled) {
        const afterCoupon = Math.max(
          0,
          Math.round(getCartTotal(state.items)) -
            Math.round(action.payload?.discountAmount || 0)
        );
        coins.amount = Math.min(coins.balance || 0, afterCoupon);
      }
      touchCart(state);
    },

    clearAppliedCoupon: (state) => {
      state.appliedCoupon = null;
      touchCart(state);
    },

    setWmCoinBalance: (state, action) => {
      const coins = ensureWmCoins(state);
      const balance = Math.max(0, Math.round(Number(action.payload) || 0));
      coins.balance = balance;
      if (coins.enabled) {
        const afterCoupon = Math.max(
          0,
          Math.round(state.summary?.subtotal || getCartTotal(state.items)) -
            Math.round(state.summary?.discountAmount || 0)
        );
        coins.amount = Math.min(coins.amount || balance, balance, afterCoupon);
      }
      touchCart(state);
    },

    setUseWmCoins: (state, action) => {
      const coins = ensureWmCoins(state);
      const enabled = Boolean(action.payload);
      coins.enabled = enabled;
      if (enabled) {
        const afterCoupon = Math.max(
          0,
          Math.round(getCartTotal(state.items)) -
            Math.round(state.appliedCoupon?.discountAmount || 0)
        );
        coins.amount = Math.min(coins.balance || 0, afterCoupon);
      } else {
        coins.amount = 0;
      }
      touchCart(state);
    },

    setWmCoinAmount: (state, action) => {
      const coins = ensureWmCoins(state);
      const afterCoupon = Math.max(
        0,
        Math.round(getCartTotal(state.items)) -
          Math.round(state.appliedCoupon?.discountAmount || 0)
      );
      const amount = Math.max(0, Math.round(Number(action.payload) || 0));
      coins.enabled = amount > 0;
      coins.amount = Math.min(amount, coins.balance || 0, afterCoupon);
      touchCart(state);
    },

    clearWmCoins: (state) => {
      const coins = ensureWmCoins(state);
      coins.enabled = false;
      coins.amount = 0;
      touchCart(state);
    },

    removeFromCart: (state, action) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
      touchCart(state, { clearCoupon: true });
    },

    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find((i) => i.id === itemId);
      if (item) {
        item.quantity = Math.min(MAX_QUANTITY_PER_SERVICE, Math.max(0, quantity));
        if (item.quantity === 0) {
          state.items = state.items.filter((cartItem) => cartItem.id !== itemId);
        } else {
          item.subtotal = calculateItemSubtotal(item.price, item.quantity);
          item.lastModified = new Date().toISOString();
        }
        touchCart(state, { clearCoupon: true });
      }
    },

    increaseQuantity: (state, action) => {
      const itemId = action.payload;
      const item = state.items.find((i) => i.id === itemId);
      if (item && item.quantity < MAX_QUANTITY_PER_SERVICE) {
        item.quantity += 1;
        item.subtotal = calculateItemSubtotal(item.price, item.quantity);
        item.lastModified = new Date().toISOString();
        touchCart(state, { clearCoupon: true });
      }
    },

    decreaseQuantity: (state, action) => {
      const itemId = action.payload;
      const item = state.items.find((i) => i.id === itemId);
      if (item) {
        item.quantity = Math.max(0, item.quantity - 1);
        if (item.quantity === 0) {
          state.items = state.items.filter((cartItem) => cartItem.id !== itemId);
        } else {
          item.subtotal = calculateItemSubtotal(item.price, item.quantity);
          item.lastModified = new Date().toISOString();
        }
        touchCart(state, { clearCoupon: true });
      }
    },

    clearCart: (state) => {
      ensureWmCoins(state);
      state.items = [];
      state.appliedCoupon = null;
      state.wmCoins = { ...state.wmCoins, enabled: false, amount: 0 };
      state.summary = {
        totalServices: 0,
        totalItems: 0,
        subtotal: 0,
        discountAmount: 0,
        discountedSubtotal: 0,
        wmCoinAmount: 0,
        platformFee: 0,
        taxAmount: 0,
        total: 0,
      };
      state.lastUpdated = new Date().toISOString();
    },

    toggleCart: (state) => {
      state.isCartOpen = !state.isCartOpen;
    },

    setCartOpen: (state, action) => {
      state.isCartOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase("cart/getCart/fulfilled", (state, action) => {
      const cartData = action.payload?.data?.cart;
      if (cartData && cartData.items && cartData.items.length > 0) {
        state.items = cartData.items.map((item) => {
          const canonicalId = normalizeCartServiceId(item.serviceId);
          const baseServiceId = stripOptionSuffix(item.serviceId);
          const optionFromId = parseOptionIndexFromServiceId(canonicalId);
          return {
            id: canonicalId,
            service_id: baseServiceId,
            cardHeader: item.cardHeader,
            description: item.description,
            price: item.price,
            img: item.img,
            quantity: item.quantity,
            duration: item.duration,
            taxIncluded: item.taxIncluded,
            category: item.category,
            serviceType: item.serviceType,
            optionIndex: item.optionIndex ?? optionFromId ?? null,
            optionLabel: item.optionLabel ?? null,
            subtotal: item.subtotal,
            addedAt: item.addedAt,
            lastModified: item.lastModified,
          };
        });
        state.summary = {
          totalServices: cartData.summary.totalServices,
          totalItems: cartData.summary.totalItems,
          subtotal: cartData.summary.subtotal,
          discountAmount: cartData.summary.discountAmount || 0,
          discountedSubtotal: cartData.summary.discountedSubtotal || cartData.summary.subtotal || 0,
          wmCoinAmount: cartData.summary.wmCoinAmount || 0,
          platformFee: cartData.summary.platformFee ?? 100,
          taxAmount: cartData.summary.taxAmount,
          total: cartData.summary.total,
        };
        ensureWmCoins(state);
        state.lastUpdated = new Date().toISOString();
      }
    });
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  toggleCart,
  setCartOpen,
  setAppliedCoupon,
  clearAppliedCoupon,
  setWmCoinBalance,
  setUseWmCoins,
  setWmCoinAmount,
  clearWmCoins,
} = cartSlice.actions;

export const selectAppliedCoupon = (state) => state.cart.appliedCoupon;
export const selectWmCoins = (state) => state.cart.wmCoins || DEFAULT_WM_COINS;
export const selectCartItems = (state) => state.cart.items || EMPTY_CART_ITEMS;
/** Memoized so useSelector doesn’t see a new object every call. */
export const selectCartSummary = createSelector(
  [(state) => state.cart.summary],
  (summary) => {
    if (!summary) return DEFAULT_CART_SUMMARY;
    return {
      totalServices: summary.totalServices || 0,
      totalItems: summary.totalItems || 0,
      subtotal: summary.subtotal || 0,
      discountAmount: summary.discountAmount || 0,
      discountedSubtotal: summary.discountedSubtotal || 0,
      wmCoinAmount: summary.wmCoinAmount || 0,
      platformFee: summary.platformFee || 0,
      taxAmount: summary.taxAmount || 0,
      total: summary.total || 0,
    };
  }
);
export const selectCartTotal = (state) => selectCartSummary(state).total;
export const selectCartSubtotal = (state) => selectCartSummary(state).subtotal;
export const selectCartTaxAmount = (state) => selectCartSummary(state).taxAmount;
export const selectCartItemsCount = (state) => selectCartSummary(state).totalItems;
export const selectCartServicesCount = (state) => selectCartSummary(state).totalServices;
export const selectIsCartOpen = (state) => state.cart.isCartOpen;
export const selectCartLastUpdated = (state) => state.cart.lastUpdated;

export const selectItemQuantity = (serviceData) => (state) => {
  const cartItemId = getCartItemId(serviceData);
  const item = state.cart.items.find((i) => i.id === cartItemId);
  return item ? item.quantity : 0;
};

export const selectIsItemInCart = (serviceData) => (state) => {
  const cartItemId = getCartItemId(serviceData);
  return state.cart.items.some((i) => i.id === cartItemId);
};

export default cartSlice.reducer;
