import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getUserAddresses as getUserAddressesApi,
  createAddress as createAddressApi,
  updateAddress as updateAddressApi,
  deleteAddress as deleteAddressApi,
  setDefaultAddress as setDefaultAddressApi,
  getDefaultAddress as getDefaultAddressApi,
} from "./addressApi";

export const getUserAddresses = createAsyncThunk(
  "address/getUserAddresses",
  async (_, { rejectWithValue }) => {
    try {
      return await getUserAddressesApi();
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch addresses");
    }
  }
);

const validate = (data) => {
  const requiredFields = ["address", "city", "state", "pincode", "phone"];
  const missing = requiredFields.filter((field) => !data[field]);
  if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(", ")}`);

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(data.phone)) {
    throw new Error("Please provide a valid 10-digit Indian mobile number starting with 6-9");
  }
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!pincodeRegex.test(data.pincode)) {
    throw new Error("Please provide a valid 6-digit pincode");
  }
};

const toServer = (data) => ({
  houseFlatNumber: data.houseFlatNumber || "N/A",
  streetAreaName: data.streetAreaName || data.address,
  completeAddress: data.address,
  landmark: data.landmark || "",
  pincode: data.pincode,
  city: data.city || "",
  state: data.state || "Bihar",
  country: data.country || "India",
  phone: data.phone,
  // App shows "work"; API/DB store "office"
  addressType: data.addressType === "work" ? "office" : data.addressType || "home",
  isDefault: data.isDefault || false,
});

/** Map API addressType for mobile UI chips (office → work). */
export const fromServerAddressType = (type) => (type === "office" ? "work" : type || "home");

export const createAddress = createAsyncThunk(
  "address/createAddress",
  async (addressData, { rejectWithValue }) => {
    try {
      validate(addressData);
      return await createAddressApi(toServer(addressData));
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create address");
    }
  }
);

export const updateAddress = createAsyncThunk(
  "address/updateAddress",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      validate(data);
      return await updateAddressApi(id, toServer(data));
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update address");
    }
  }
);

export const deleteAddress = createAsyncThunk(
  "address/deleteAddress",
  async (addressId, { rejectWithValue }) => {
    try {
      return await deleteAddressApi(addressId);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete address");
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  "address/setDefaultAddress",
  async (addressId, { rejectWithValue }) => {
    try {
      return await setDefaultAddressApi(addressId);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to set default address");
    }
  }
);

export const getDefaultAddress = createAsyncThunk(
  "address/getDefaultAddress",
  async (_, { rejectWithValue }) => {
    try {
      return await getDefaultAddressApi();
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch default address");
    }
  }
);
