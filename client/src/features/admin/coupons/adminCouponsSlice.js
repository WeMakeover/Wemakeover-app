import { createSlice } from '@reduxjs/toolkit';
import {
  fetchAllCoupons,
  fetchCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
} from './adminCouponsThunks';

const initialState = {
  coupons: [],
  selectedCoupon: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  },
  loading: false,
  saving: false,
  error: null,
};

const adminCouponsSlice = createSlice({
  name: 'adminCoupons',
  initialState,
  reducers: {
    clearCouponError: (state) => {
      state.error = null;
    },
    setCouponsPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.coupons = action.payload.data?.coupons || [];
        state.pagination = action.payload.data?.pagination || state.pagination;
      })
      .addCase(fetchAllCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCouponById.fulfilled, (state, action) => {
        state.selectedCoupon = action.payload.data?.coupon || null;
      })
      .addCase(createCoupon.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createCoupon.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(createCoupon.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateCoupon.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateCoupon.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(updateCoupon.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        const deletedId = action.payload.data?._id;
        if (deletedId) {
          state.coupons = state.coupons.filter((c) => c._id !== deletedId);
        }
      })
      .addCase(toggleCouponActive.fulfilled, (state, action) => {
        const updated = action.payload.data?.coupon;
        if (updated) {
          const index = state.coupons.findIndex((c) => c._id === updated._id);
          if (index !== -1) state.coupons[index] = updated;
        }
      });
  },
});

export const { clearCouponError, setCouponsPage } = adminCouponsSlice.actions;
export default adminCouponsSlice.reducer;
