import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import productSlice from './slices/productSlice';
import orderSlice from './slices/orderSlice';
import cartSlice from './slices/cartSlice';
import settingsSlice from './slices/settingsSlice';
import notificationSlice from './slices/notificationSlice';
import reportsSlice from './slices/reportsSlice';
import sellerSlice from './slices/sellerSlice';
import reviewsSlice from './slices/reviewsSlice';
import disputeSlice from './slices/disputeSlice';
import addressSlice from './slices/addressSlice';
import transactionSlice from './slices/transactionSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    products: productSlice,
    orders: orderSlice,
    cart: cartSlice,
    settings: settingsSlice,
    notifications: notificationSlice,
    reports: reportsSlice,
    sellers: sellerSlice,
    reviews: reviewsSlice,
    disputes: disputeSlice,
    addresses: addressSlice,
    transactions: transactionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;