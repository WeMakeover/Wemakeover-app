import { createSlice } from "@reduxjs/toolkit";
import { requestContactOtp, sendContactData } from "./contactThunks";
import toast from "react-hot-toast";

const initialState = {
  loading: false,
  otpLoading: false,
  error: null,
  success: false,
  otpSent: false,
  pendingEmail: "",
};

const contactSlice = createSlice({
  name: "contact",
  initialState,
  reducers: {
    resetContactState: (state) => {
      state.loading = false;
      state.otpLoading = false;
      state.error = null;
      state.success = false;
      state.otpSent = false;
      state.pendingEmail = "";
    },
    clearContactOtpStep: (state) => {
      state.otpSent = false;
      state.pendingEmail = "";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestContactOtp.pending, (state) => {
        state.otpLoading = true;
        state.error = null;
      })
      .addCase(requestContactOtp.fulfilled, (state, action) => {
        state.otpLoading = false;
        state.otpSent = true;
        state.pendingEmail = action.meta.arg.email;
        toast.success(
          action.payload?.message || "Verification code sent to your email."
        );
      })
      .addCase(requestContactOtp.rejected, (state, action) => {
        state.otpLoading = false;
        state.error = action.payload;
        toast.error(state.error);
      })

      .addCase(sendContactData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(sendContactData.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.otpSent = false;
        state.pendingEmail = "";
        toast.success(action.payload?.message);
      })
      .addCase(sendContactData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
        toast.error(state.error);
      });
  },
});

export const { resetContactState, clearContactOtpStep } = contactSlice.actions;
export default contactSlice.reducer;
