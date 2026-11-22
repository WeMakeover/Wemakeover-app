import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  checkLoginStatusApi,
  completeGoogleSignupApi,
  forgetPassword,
  googleLoginApi,
  loginApi,
  logoutApi,
  resendOtpApi,
  resendPhoneOtpApi,
  resetPasswordApi,
  signupApi,
  requestPhoneUpdateOtpApi,
  updatePhoneApi,
  addEmailApi,
  verifyOtpApi,
  verifyPhoneOtpApi,
} from "./authApi";
import { SMS_OTP_ENABLED } from "../../config/authConfig";
import { msg91VerifyOtp } from "../../lib/msg91Otp";

const MIN_LOGIN_LOADING_MS = 600; // keep "Logging in..." visible briefly

// NOTE: Cart restore/persist on login/logout (present in the web client) will be
// re-added once the cart feature is ported. Auth works independently for now.

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    const start = Date.now();
    try {
      const result = await loginApi(credentials);
      const elapsed = Date.now() - start;
      if (elapsed < MIN_LOGIN_LOADING_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOGIN_LOADING_MS - elapsed));
      }
      return result;
    } catch (error) {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_LOGIN_LOADING_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOGIN_LOADING_MS - elapsed));
      }
      return rejectWithValue(error.message);
    }
  }
);

export const checkLoginStatus = createAsyncThunk(
  "auth/status",
  async (_, { rejectWithValue }) => {
    try {
      const res = await checkLoginStatusApi();
      if (!res.success && res.message?.includes("No access & refresh token")) {
        return { success: false, loggedIn: false, user: null };
      }
      if (!res.success) {
        // Not logged in is a normal state, not an error.
        return { success: false, loggedIn: false, user: null };
      }
      return res;
    } catch (error) {
      return rejectWithValue(error.message || "Something went wrong");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();
      return { success: true, message: "User logged out successfully" };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const signupUser = createAsyncThunk(
  "auth/signup",
  async (userData, { rejectWithValue }) => {
    try {
      return await signupApi(userData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const verifyOtpThunk = createAsyncThunk(
  "auth/verifyOtp",
  async ({ channel = "email", email, phoneNumber, otp }, { rejectWithValue }) => {
    try {
      if (channel === "phone" && !SMS_OTP_ENABLED) {
        return await verifyPhoneOtpApi({ phoneNumber, otp });
      }
      return await verifyOtpApi({ channel, email, phoneNumber, otp });
    } catch (err) {
      return rejectWithValue(err.message || "OTP verification failed");
    }
  }
);

export const resendOtpThunk = createAsyncThunk(
  "auth/resendOtp",
  async ({ channel = "email", email, phoneNumber }, { rejectWithValue }) => {
    try {
      if (channel === "phone" && !SMS_OTP_ENABLED) {
        return await resendPhoneOtpApi({ phoneNumber });
      }
      return await resendOtpApi({ channel, email, phoneNumber });
    } catch (err) {
      return rejectWithValue(err.message || "Failed to resend OTP");
    }
  }
);

export const completeMsg91SignupThunk = createAsyncThunk(
  "auth/completeMsg91Signup",
  async ({ reqId, otp, signup, accessToken }, { rejectWithValue }) => {
    try {
      let token = accessToken;
      if (!token) {
        const checked = await msg91VerifyOtp(reqId, otp);
        if (!checked.ok || !checked.accessToken) {
          return rejectWithValue(checked.message || "Wrong code entered");
        }
        token = checked.accessToken;
      }
      const result = await signupApi({ ...signup, accessToken: token });
      return { ...result, accessToken: token };
    } catch (error) {
      return rejectWithValue(error.message || "Could not verify this account");
    }
  }
);

export const forgetPasswordThunk = createAsyncThunk(
  "auth/forgetPassword",
  async (email, { rejectWithValue }) => {
    try {
      return await forgetPassword(email);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const resetPasswordThunk = createAsyncThunk(
  "auth/resetPassword",
  async ({ id, token, password, confirmPassword }, { rejectWithValue }) => {
    try {
      return await resetPasswordApi({ id, token, password, confirmPassword });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const googleLoginThunk = createAsyncThunk(
  "auth/googleLogin",
  async (code, { rejectWithValue }) => {
    try {
      return await googleLoginApi(code);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const completeGoogleSignupThunk = createAsyncThunk(
  "auth/completeGoogleSignup",
  async ({ userId, phoneNumber, password, confirmPassword }, { rejectWithValue }) => {
    try {
      return await completeGoogleSignupApi({ userId, phoneNumber, password, confirmPassword });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const requestPhoneUpdateOtpThunk = createAsyncThunk(
  "auth/requestPhoneUpdateOtp",
  async (phoneNumber, { rejectWithValue }) => {
    try {
      return await requestPhoneUpdateOtpApi(phoneNumber);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addEmailThunk = createAsyncThunk(
  "auth/addEmail",
  async (email, { rejectWithValue }) => {
    try {
      return await addEmailApi(email);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePhoneThunk = createAsyncThunk(
  "auth/updatePhone",
  async ({ phoneNumber, accessToken }, { rejectWithValue }) => {
    try {
      return await updatePhoneApi({ phoneNumber, accessToken });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
