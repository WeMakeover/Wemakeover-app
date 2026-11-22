import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  saveCartToDatabase,
  getCartFromDatabase,
  restoreCartFromDatabase,
  clearCartFromDatabase,
  addItemToDatabaseCart,
  updateItemQuantityInDatabase,
  removeItemFromDatabaseCart,
  normalizeServiceId,
} from "./cartApi";

const debounce = (func, delay) => {
  let timeoutId;
  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
};

export const saveCart = createAsyncThunk("cart/saveCart", async (cartData, { rejectWithValue }) => {
  try {
    return await saveCartToDatabase(cartData);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const getCart = createAsyncThunk("cart/getCart", async (_, { rejectWithValue }) => {
  try {
    return await getCartFromDatabase();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const restoreCart = createAsyncThunk(
  "cart/restoreCart",
  async (localCartData, { rejectWithValue }) => {
    try {
      return await restoreCartFromDatabase(localCartData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearCartFromDB = createAsyncThunk(
  "cart/clearCartFromDB",
  async (_, { rejectWithValue }) => {
    try {
      return await clearCartFromDatabase();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addItemToDBCart = createAsyncThunk(
  "cart/addItemToDBCart",
  async (itemData, { rejectWithValue }) => {
    try {
      return await addItemToDatabaseCart(itemData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateItemQuantityInDB = createAsyncThunk(
  "cart/updateItemQuantityInDB",
  async ({ serviceId, quantity }, { rejectWithValue }) => {
    try {
      return await updateItemQuantityInDatabase(serviceId, quantity);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeItemFromDBCart = createAsyncThunk(
  "cart/removeItemFromDBCart",
  async (serviceId, { rejectWithValue }) => {
    try {
      return await removeItemFromDatabaseCart(serviceId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const autoSaveCart = createAsyncThunk(
  "cart/autoSaveCart",
  async (cartData, { rejectWithValue }) => {
    try {
      return await saveCartToDatabase(cartData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createDebouncedAutoSave = (dispatch) => {
  return debounce((cartData) => {
    dispatch(autoSaveCart(cartData));
  }, 2000);
};
