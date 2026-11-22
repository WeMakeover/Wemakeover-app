import { createSlice } from "@reduxjs/toolkit";
import { fetchServiceableCities, checkCityServiceability } from "./serviceabilityThunks";

const initialState = {
  cities: [],
  citiesLoading: false,
  citiesError: null,
  citiesLastFetched: null,

  currentCity: null,
  isServiceable: null,
  validationLoading: false,
  validationError: null,
  validationMessage: null,

  cacheExpiry: 5 * 60 * 1000,
};

const serviceabilitySlice = createSlice({
  name: "serviceability",
  initialState,
  reducers: {
    clearValidation: (state) => {
      state.currentCity = null;
      state.isServiceable = null;
      state.validationError = null;
      state.validationMessage = null;
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload;
    },
    clearServiceabilityData: () => initialState,
    invalidateCache: (state) => {
      state.citiesLastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceableCities.pending, (state) => {
        state.citiesLoading = true;
        state.citiesError = null;
      })
      .addCase(fetchServiceableCities.fulfilled, (state, action) => {
        state.citiesLoading = false;
        state.cities = action.payload;
        state.citiesLastFetched = Date.now();
        state.citiesError = null;
      })
      .addCase(fetchServiceableCities.rejected, (state, action) => {
        state.citiesLoading = false;
        state.citiesError = action.payload || "Failed to fetch serviceable cities";
      })
      .addCase(checkCityServiceability.pending, (state) => {
        state.validationLoading = true;
        state.validationError = null;
      })
      .addCase(checkCityServiceability.fulfilled, (state, action) => {
        state.validationLoading = false;
        state.currentCity = action.payload.requestedCity;
        state.isServiceable = action.payload.isServiceable;
        state.validationMessage = action.payload.message;
        state.validationError = null;
      })
      .addCase(checkCityServiceability.rejected, (state, action) => {
        state.validationLoading = false;
        state.validationError = action.payload || "Failed to check city serviceability";
        state.isServiceable = false;
      });
  },
});

export const { clearValidation, setCurrentCity, clearServiceabilityData, invalidateCache } =
  serviceabilitySlice.actions;

export const selectServiceableCities = (state) => state.serviceability.cities;
export const selectCitiesLoading = (state) => state.serviceability.citiesLoading;
export const selectCitiesError = (state) => state.serviceability.citiesError;
export const selectCurrentCity = (state) => state.serviceability.currentCity;
export const selectIsServiceable = (state) => state.serviceability.isServiceable;
export const selectValidationLoading = (state) => state.serviceability.validationLoading;
export const selectValidationMessage = (state) => state.serviceability.validationMessage;

export const selectCityNames = (state) => state.serviceability.cities.map((city) => city.city);

export default serviceabilitySlice.reducer;
