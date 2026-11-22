import { createSlice } from "@reduxjs/toolkit";

/**
 * Partner auth is intentionally separate from customer `auth` slice.
 * Backend partner APIs will plug in via partnerAuthThunks later —
 * this slice only holds UI session state for the partner track.
 */
const initialState = {
  isAuthenticated: false,
  status: "idle", // idle | loading | succeeded | failed
  error: null,
  partner: null, // { id, name, contact, role: 'partner' }
};

const partnerAuthSlice = createSlice({
  name: "partnerAuth",
  initialState,
  reducers: {
    partnerAuthLoading(state) {
      state.status = "loading";
      state.error = null;
    },
    partnerLoginSucceeded(state, action) {
      state.status = "succeeded";
      state.isAuthenticated = true;
      state.error = null;
      state.partner = {
        role: "partner",
        ...action.payload,
      };
    },
    partnerRegisterSucceeded(state, action) {
      state.status = "succeeded";
      state.isAuthenticated = true;
      state.error = null;
      state.partner = {
        role: "partner",
        ...action.payload,
      };
    },
    partnerAuthFailed(state, action) {
      state.status = "failed";
      state.error = action.payload || "Something went wrong";
    },
    partnerLogout(state) {
      Object.assign(state, initialState);
    },
    clearPartnerAuthError(state) {
      state.error = null;
      if (state.status === "failed") state.status = "idle";
    },
  },
});

export const {
  partnerAuthLoading,
  partnerLoginSucceeded,
  partnerRegisterSucceeded,
  partnerAuthFailed,
  partnerLogout,
  clearPartnerAuthError,
} = partnerAuthSlice.actions;

export default partnerAuthSlice.reducer;
