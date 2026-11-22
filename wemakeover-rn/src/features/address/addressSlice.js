import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "./addressThunks";

const initialState = {
  addresses: [],
  defaultAddress: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const addressSlice = createSlice({
  name: "address",
  initialState,
  reducers: {
    clearAddressError: (state) => {
      state.error = null;
    },
    clearAddressData: (state) => {
      state.addresses = [];
      state.defaultAddress = null;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.addresses = [];
        state.defaultAddress = null;
        state.isLoading = false;
        state.error = null;
        state.lastUpdated = null;
      })
      .addCase(getUserAddresses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserAddresses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.addresses = action.payload.data?.addresses || [];
        state.defaultAddress =
          action.payload.data?.addresses?.find((addr) => addr.isDefault) || null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getUserAddresses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      .addCase(createAddress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        const newAddress = action.payload.data?.address;
        if (newAddress) {
          state.addresses.push(newAddress);
          if (newAddress.isDefault) {
            state.addresses.forEach((address) => {
              if (address._id !== newAddress._id) address.isDefault = false;
            });
            state.defaultAddress = newAddress;
          }
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      .addCase(updateAddress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedAddress = action.payload.data?.address;
        if (updatedAddress) {
          const index = state.addresses.findIndex((a) => a._id === updatedAddress._id);
          if (index !== -1) {
            state.addresses[index] = updatedAddress;
            if (updatedAddress.isDefault) {
              state.addresses.forEach((address) => {
                if (address._id !== updatedAddress._id) address.isDefault = false;
              });
              state.defaultAddress = updatedAddress;
            } else if (state.defaultAddress && state.defaultAddress._id === updatedAddress._id) {
              state.defaultAddress = null;
            }
          }
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        const addressId = action.payload.data?._id;
        state.addresses = state.addresses.filter((a) => a._id !== addressId);
        if (state.defaultAddress && state.defaultAddress._id === addressId) {
          state.defaultAddress = null;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        const updated =
          action.payload?.data?.address ||
          action.payload?.data ||
          null;
        const addressId = updated?._id || updated?.id || action.payload?.data?._id;
        if (!addressId) return;

        state.addresses.forEach((address) => {
          address.isDefault = String(address._id || address.id) === String(addressId);
        });
        const index = state.addresses.findIndex(
          (a) => String(a._id || a.id) === String(addressId)
        );
        if (index !== -1) {
          state.addresses[index] = {
            ...state.addresses[index],
            ...(updated && typeof updated === "object" ? updated : {}),
            isDefault: true,
          };
          state.defaultAddress = state.addresses[index];
        } else if (updated && (updated._id || updated.id)) {
          state.defaultAddress = { ...updated, isDefault: true };
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearAddressError, clearAddressData } = addressSlice.actions;

export const selectAddresses = (state) => state.address.addresses;
export const selectDefaultAddress = (state) => state.address.defaultAddress;
export const selectAddressLoading = (state) => state.address.isLoading;

export default addressSlice.reducer;
