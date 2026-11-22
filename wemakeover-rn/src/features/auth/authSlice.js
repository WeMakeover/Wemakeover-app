import { createSlice } from "@reduxjs/toolkit";
import {
  checkLoginStatus,
  completeGoogleSignupThunk,
  forgetPasswordThunk,
  googleLoginThunk,
  loginUser,
  logoutUser,
  resendOtpThunk,
  resetPasswordThunk,
  signupUser,
  completeMsg91SignupThunk,
  requestPhoneUpdateOtpThunk,
  updatePhoneThunk,
  addEmailThunk,
  verifyOtpThunk,
} from "./authThunks";
import toast from "../../lib/toast";

const initialState = {
  user: null,
  userEmail: null,
  status: "idle",
  error: null,
  isAuthenticated: false,
  signupSuccess: false,
  forgotPasswordSuccess: false,
  resetPasswordSuccess: false,
  phoneNumberRequired: false, // Google OAuth phone collection
  pendingGoogleUser: null,
};

export const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuthState: (state) => {
      state.error = null;
      if (!state.isAuthenticated) {
        state.status = "idle";
      }
      state.signupSuccess = false;
      state.forgotPasswordSuccess = false;
      state.resetPasswordSuccess = false;
      state.phoneNumberRequired = false;
      state.pendingGoogleUser = null;
    },
    clearUserEmail: (state) => {
      state.userEmail = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // SIGNUP
      .addCase(signupUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.signupSuccess = false;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.signupSuccess = false;
        toast.error(state.error);
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.signupSuccess = true;
        state.userEmail = action.meta.arg.email.trim().toLowerCase();
        toast.success(
          action.payload.message ||
            "Signup successful. Check your email for verification."
        );
      })

      // VERIFY OTP
      .addCase(verifyOtpThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        toast.error(state.error);
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.userEmail = null;
        state.signupSuccess = false;
        toast.success("OTP verified successfully");
      })

      .addCase(completeMsg91SignupThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(completeMsg91SignupThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(completeMsg91SignupThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.signupSuccess = false;
        toast.success(action.payload.message || "Account verified");
      })

      // RESEND OTP
      .addCase(resendOtpThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(resendOtpThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        toast.success(action.payload.message);
      })
      .addCase(resendOtpThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        toast.error(state.error);
      })

      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })

      // GOOGLE LOGIN
      .addCase(googleLoginThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(googleLoginThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        toast.error(action.payload || "Google login failed");
      })
      .addCase(googleLoginThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.phoneNumberRequired) {
          state.phoneNumberRequired = true;
          state.pendingGoogleUser = action.payload.user;
          state.isAuthenticated = false;
        } else {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.phoneNumberRequired = false;
          state.pendingGoogleUser = null;
        }
      })

      // COMPLETE GOOGLE SIGNUP
      .addCase(completeGoogleSignupThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(completeGoogleSignupThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        toast.error(action.payload || "Failed to complete signup");
      })
      .addCase(completeGoogleSignupThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.phoneNumberRequired = false;
        state.pendingGoogleUser = null;
        toast.success("Signup completed successfully!");
      })

      // CHECK LOGIN STATUS
      .addCase(checkLoginStatus.pending, (state) => {
        state.status = "loading";
      })
      .addCase(checkLoginStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(checkLoginStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.isAuthenticated = Boolean(action.payload.loggedIn);
      })

      // LOGOUT
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        toast.error(`Logout failed: ${state.error}`);
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = "succeeded";
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.userEmail = null;
        state.signupSuccess = false;
        toast.success("Logged out successfully!");
      })

      // FORGET PASSWORD
      .addCase(forgetPasswordThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.forgotPasswordSuccess = false;
      })
      .addCase(forgetPasswordThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.forgotPasswordSuccess = false;
        toast.error(state.error);
      })
      .addCase(forgetPasswordThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.forgotPasswordSuccess = true;
        toast.success(action.payload.message);
      })

      // RESET PASSWORD
      .addCase(resetPasswordThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.resetPasswordSuccess = false;
      })
      .addCase(resetPasswordThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.resetPasswordSuccess = true;
        toast.success(action.payload.message || "Password reset successful");
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.resetPasswordSuccess = false;
        toast.error(state.error);
      })

      .addCase(addEmailThunk.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = { ...state.user, ...action.payload.user };
        }
        toast.success(action.payload?.message || "Email added");
      })
      .addCase(addEmailThunk.rejected, (state, action) => {
        toast.error(action.payload || "Could not add email");
      })

      .addCase(updatePhoneThunk.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = { ...state.user, ...action.payload.user };
        }
        toast.success(action.payload?.message || "Mobile number updated");
      })
      .addCase(updatePhoneThunk.rejected, (state, action) => {
        const message = action.payload || "Failed to update mobile number";
        if (message !== "Wrong code entered" && message !== "Verified number does not match") {
          toast.error(message);
        }
      })
      .addCase(requestPhoneUpdateOtpThunk.rejected, (state, action) => {
        toast.error(action.payload || "Failed to send verification code");
      });
  },
});

export const { resetAuthState, clearUserEmail } = AuthSlice.actions;
export default AuthSlice.reducer;
