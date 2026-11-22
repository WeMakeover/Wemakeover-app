import { createAsyncThunk } from '@reduxjs/toolkit';
import { adminCouponsApi } from './adminCouponsApi';

export const fetchAllCoupons = createAsyncThunk(
  'adminCoupons/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await adminCouponsApi.getAllCoupons(params);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch coupons');
    }
  }
);

export const fetchCouponById = createAsyncThunk(
  'adminCoupons/fetchById',
  async (couponId, { rejectWithValue }) => {
    try {
      return await adminCouponsApi.getCouponById(couponId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch coupon');
    }
  }
);

export const createCoupon = createAsyncThunk(
  'adminCoupons/create',
  async (data, { rejectWithValue }) => {
    try {
      return await adminCouponsApi.createCoupon(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create coupon');
    }
  }
);

export const updateCoupon = createAsyncThunk(
  'adminCoupons/update',
  async ({ couponId, data }, { rejectWithValue }) => {
    try {
      return await adminCouponsApi.updateCoupon(couponId, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update coupon');
    }
  }
);

export const deleteCoupon = createAsyncThunk(
  'adminCoupons/delete',
  async (couponId, { rejectWithValue }) => {
    try {
      return await adminCouponsApi.deleteCoupon(couponId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete coupon');
    }
  }
);

export const toggleCouponActive = createAsyncThunk(
  'adminCoupons/toggleActive',
  async (couponId, { rejectWithValue }) => {
    try {
      return await adminCouponsApi.toggleCouponActive(couponId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update coupon status');
    }
  }
);
