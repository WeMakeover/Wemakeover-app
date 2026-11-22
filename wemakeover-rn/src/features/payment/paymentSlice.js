import { createSlice } from "@reduxjs/toolkit";
import {
  createPaymentOrderThunk,
  verifyPaymentThunk,
  createCODOrderThunk,
} from "./paymentThunks";

const idlePayment = () => ({
  orderId: null,
  amount: 0,
  currency: "INR",
  status: "idle",
  method: null,
  error: null,
});

const initialState = {
  paymentOrder: null,
  paymentOrderLoading: false,
  paymentOrderError: null,

  paymentVerification: null,
  verificationLoading: false,
  verificationError: null,

  codOrder: null,
  codOrderLoading: false,
  codOrderError: null,

  currentPayment: idlePayment(),
  currentOrder: null,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    clearPaymentErrors: (state) => {
      state.paymentOrderError = null;
      state.verificationError = null;
      state.codOrderError = null;
    },
    clearPaymentData: (state) => {
      state.paymentOrder = null;
      state.paymentVerification = null;
      state.codOrder = null;
      state.currentPayment = idlePayment();
      state.currentOrder = null;
    },
    resetCurrentPayment: (state) => {
      state.currentPayment = idlePayment();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createPaymentOrderThunk.pending, (state) => {
        state.paymentOrderLoading = true;
        state.paymentOrderError = null;
        state.currentPayment.status = "loading";
      })
      .addCase(createPaymentOrderThunk.fulfilled, (state, action) => {
        state.paymentOrderLoading = false;
        const data = action.payload?.data;
        if (data) {
          state.paymentOrder = data;
          state.currentPayment = {
            ...state.currentPayment,
            orderId: data.orderId,
            amount: data.amount,
            currency: data.currency,
            status: "created",
            method: "online",
          };
        }
      })
      .addCase(createPaymentOrderThunk.rejected, (state, action) => {
        state.paymentOrderLoading = false;
        state.paymentOrderError = action.payload;
        state.currentPayment.status = "failed";
      })

      .addCase(verifyPaymentThunk.pending, (state) => {
        state.verificationLoading = true;
        state.verificationError = null;
        state.currentPayment.status = "loading";
      })
      .addCase(verifyPaymentThunk.fulfilled, (state, action) => {
        state.verificationLoading = false;
        state.paymentVerification = action.payload?.data;
        state.currentPayment.status = "success";
        state.currentOrder = action.payload?.data;
      })
      .addCase(verifyPaymentThunk.rejected, (state, action) => {
        state.verificationLoading = false;
        state.verificationError = action.payload;
        state.currentPayment.status = "failed";
      })

      .addCase(createCODOrderThunk.pending, (state) => {
        state.codOrderLoading = true;
        state.codOrderError = null;
        state.currentPayment.status = "loading";
      })
      .addCase(createCODOrderThunk.fulfilled, (state, action) => {
        state.codOrderLoading = false;
        state.codOrder = action.payload?.data;
        state.currentPayment.status = "success";
        state.currentPayment.method = "cod";
        state.currentOrder = action.payload?.data;
      })
      .addCase(createCODOrderThunk.rejected, (state, action) => {
        state.codOrderLoading = false;
        state.codOrderError = action.payload;
        state.currentPayment.status = "failed";
      });
  },
});

export const { clearPaymentErrors, clearPaymentData, resetCurrentPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
