import { createAsyncThunk } from "@reduxjs/toolkit";
import { partnerLoginApi, partnerRegisterApi } from "./partnerAuthApi";
import {
  partnerAuthFailed,
  partnerAuthLoading,
  partnerLoginSucceeded,
  partnerRegisterSucceeded,
} from "./partnerAuthSlice";

export const partnerLogin = createAsyncThunk(
  "partnerAuth/login",
  async ({ contact, password }, { dispatch, rejectWithValue }) => {
    dispatch(partnerAuthLoading());
    try {
      const result = await partnerLoginApi({ contact, password });
      if (!result.ok) {
        dispatch(partnerAuthFailed(result.message));
        return rejectWithValue(result.message);
      }
      dispatch(partnerLoginSucceeded(result.partner));
      return result.partner;
    } catch (err) {
      const message = err?.message || "Partner login failed";
      dispatch(partnerAuthFailed(message));
      return rejectWithValue(message);
    }
  }
);

export const partnerRegister = createAsyncThunk(
  "partnerAuth/register",
  async (payload, { dispatch, rejectWithValue }) => {
    dispatch(partnerAuthLoading());
    try {
      const result = await partnerRegisterApi(payload);
      if (!result.ok) {
        dispatch(partnerAuthFailed(result.message));
        return rejectWithValue(result.message);
      }
      dispatch(partnerRegisterSucceeded(result.partner));
      return result.partner;
    } catch (err) {
      const message = err?.message || "Partner registration failed";
      dispatch(partnerAuthFailed(message));
      return rejectWithValue(message);
    }
  }
);
