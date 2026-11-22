import { createAsyncThunk } from "@reduxjs/toolkit";
import { BACKEND_URL as backendurl } from "../../config/env";

const parseError = async (response) => {
  const errorData = await response.json().catch(() => ({}));
  return errorData.message || "Something went wrong!";
};

export const requestContactOtp = createAsyncThunk(
  "contact/requestContactOtp",
  async ({ name, email }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${backendurl}/contactUs/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client": "mobile" },
        body: JSON.stringify({ name, email }),
      });
      if (!response.ok) return rejectWithValue(await parseError(response));
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const sendContactData = createAsyncThunk(
  "contact/sendContactData",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${backendurl}/contactUs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client": "mobile" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) return rejectWithValue(await parseError(response));
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);
