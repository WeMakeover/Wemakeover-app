import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthReducer from "../features/auth/authSlice";
import PartnerAuthReducer from "../features/partner/partnerAuthSlice";
import CartReducer from "../features/cart/cartSlice";
import AddressReducer from "../features/address/addressSlice";
import ContactReducer from "../features/contact/contactSlice";
import ServiceabilityReducer from "../features/serviceability/serviceabilitySlice";
import BookingReducer from "../features/booking/bookingSlice";
import PaymentReducer from "../features/payment/paymentSlice";
import ReviewsReducer from "../features/reviews/reviewsSlice";
import NotificationsReducer from "../features/notifications/notificationsSlice";

const rootReducer = combineReducers({
  auth: AuthReducer,
  partnerAuth: PartnerAuthReducer,
  cart: CartReducer,
  address: AddressReducer,
  contact: ContactReducer,
  serviceability: ServiceabilityReducer,
  booking: BookingReducer,
  payment: PaymentReducer,
  reviews: ReviewsReducer,
  notifications: NotificationsReducer,
});

// Mirrors the web store: only cart (and later booking) is persisted; auth relies
// on tokens in SecureStore + a /auth/status check on boot.
const persistConfig = {
  key: "root-v2",
  storage: AsyncStorage,
  whitelist: ["cart"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);
