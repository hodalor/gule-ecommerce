import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import adminSlice from './slices/adminSlice';
import orderSlice from './slices/orderSlice';
import settingsSlice from './slices/settingsSlice';
import financeSlice from './slices/financeSlice';
import auditSlice from './slices/auditSlice';
import userSlice from './slices/userSlice';
import complaintsSlice from './slices/complaintsSlice';
import refundsSlice from './slices/refundsSlice';
import inventorySlice from './slices/inventorySlice';
import storePerformanceSlice from './slices/storePerformanceSlice';
import productSlice from './slices/productSlice';
import sellerSlice from './slices/sellerSlice';
import reviewSlice from './slices/reviewSlice';
import categorySlice from './slices/categorySlice';
import escrowSlice from './slices/escrowSlice';
import adminDisputeSlice from './slices/adminDisputeSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    admin: adminSlice,
    orders: orderSlice,
    settings: settingsSlice,
    finance: financeSlice,
    audit: auditSlice,
    users: userSlice,
    complaints: complaintsSlice,
    refunds: refundsSlice,
    inventory: inventorySlice,
    storePerformance: storePerformanceSlice,
    products: productSlice,
    sellers: sellerSlice,
    reviews: reviewSlice,
    categories: categorySlice,
    escrow: escrowSlice,
    adminDisputes: adminDisputeSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;