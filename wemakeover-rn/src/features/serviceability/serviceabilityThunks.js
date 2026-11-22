import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getServiceableCities,
  checkCityServiceability as checkCityServiceabilityApi,
  checkLocationServiceability as checkLocationServiceabilityApi,
} from "./serviceabilityApi";

export const fetchServiceableCities = createAsyncThunk(
  "serviceability/fetchCities",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const lastFetched = state.serviceability.citiesLastFetched;
      const cacheExpiry = state.serviceability.cacheExpiry;
      if (lastFetched && Date.now() - lastFetched < cacheExpiry) {
        return state.serviceability.cities;
      }
      const response = await getServiceableCities();
      if (!response.success) throw new Error(response.message || "Failed to fetch serviceable cities");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch serviceable cities");
    }
  }
);

export const checkCityServiceability = createAsyncThunk(
  "serviceability/checkCity",
  async (city, { rejectWithValue }) => {
    try {
      if (!city || typeof city !== "string" || city.trim() === "") {
        throw new Error("Please provide a valid city name");
      }
      const response = await checkCityServiceabilityApi(city.trim());
      if (!response.success) throw new Error(response.message || "Failed to check city serviceability");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to check city serviceability");
    }
  }
);

export const checkLocationServiceability = createAsyncThunk(
  "serviceability/checkLocation",
  async ({ city, pincode }, { rejectWithValue }) => {
    try {
      if (!city || city.trim() === "") throw new Error("Please provide a valid city name");
      if (!pincode || pincode.trim() === "") throw new Error("Please provide a valid pincode");
      const response = await checkLocationServiceabilityApi(city.trim(), pincode.trim());
      if (!response.success) throw new Error(response.message || "Failed to check location serviceability");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to check location serviceability");
    }
  }
);
