import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post(`/orders`, orderData);
      // Backend wraps payload under data: { order }
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create order');
    }
  }
);

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async ({ page = 1, status }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (status) params.append('status', status);
      
      // Backend route is /orders/my-orders and wraps payload under data
      const response = await api.get(`/orders/my-orders?${params}`);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchSellerOrders = createAsyncThunk(
  'orders/fetchSellerOrders',
  async ({ page = 1, limit = 10, status }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (status) params.append('status', status);
      
      const response = await api.get(`/orders/seller-orders?${params}`);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status, trackingNumber, notes }, { rejectWithValue }) => {
    try {
      // Backend expects PATCH /:id/status
      const response = await api.patch(`/orders/${orderId}/status`, {
        status,
        trackingNumber,
        notes,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

export const confirmDelivery = createAsyncThunk(
  'orders/confirmDelivery',
  async (orderId, { rejectWithValue }) => {
    try {
      // Align with backend: change status to delivered via PATCH
      const response = await api.patch(`/orders/${orderId}/status`, { status: 'delivered' });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm delivery');
    }
  }
);

export const rateOrder = createAsyncThunk(
  'orders/rateOrder',
  async ({ orderId, rating, review }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/orders/${orderId}/rate`, {
        rating,
        review,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to rate order');
    }
  }
);

export const requestRefund = createAsyncThunk(
  'orders/requestRefund',
  async ({ orderId, reason }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/orders/${orderId}/refund`, {
        reason,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to request refund');
    }
  }
);

export const trackOrder = createAsyncThunk(
  'orders/trackOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      // No dedicated track endpoint; derive tracking from order details
      const response = await api.get(`/orders/${orderId}`);
      const data = response.data?.data;
      const order = data?.order;
      if (!order) return { tracking: null };

      const steps = [];
      // Order placed
      steps.push({
        status: 'order_placed',
        title: 'Order Placed',
        description: 'Order has been placed successfully',
        timestamp: order.createdAt,
        completed: true
      });
      // Processing/Confirmed
      if (order.status === 'confirmed' || order.status === 'processing') {
        steps.push({
          status: 'processing',
          title: 'Processing',
          description: 'Order is being prepared',
          completed: order.status !== 'confirmed',
          timestamp: order.updatedAt
        });
      }
      // Shipped
      if (order.shippedAt || order.status === 'shipped') {
        steps.push({
          status: 'out_for_delivery',
          title: 'Shipped',
          description: 'Order has left the warehouse',
          timestamp: order.shippedAt,
          completed: true
        });
      }
      // Delivered
      if (order.deliveredAt || order.status === 'delivered' || order.status === 'completed') {
        steps.push({
          status: 'delivered',
          title: 'Delivered',
          description: 'Order delivered to the destination',
          timestamp: order.deliveredAt || order.completedAt,
          completed: order.status === 'delivered' || order.status === 'completed'
        });
      }

      const tracking = {
        id: order.orderNumber || order._id,
        status: order.status,
        trackingNumber: order.trackingNumber || 'Pending',
        carrier: order.carrier || 'To be assigned',
        estimatedDelivery: order.deliveredAt || null,
        shippingAddress: order.shippingAddress || {},
        items: (order.items || []).map(item => ({
          id: item._id,
          name: (item?.productSnapshot?.name) || (item?.product?.name) || 'Item',
          quantity: item?.quantity || 0,
          price: item?.unitPrice || item?.pricing?.basePrice || 0,
          image: (item?.productSnapshot?.image) || (item?.product?.images?.[0]?.url) || null
        })),
        total: order.totalAmount || order.total || 0,
        timeline: steps
      };

      return { tracking };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to track order');
    }
  }
);

const initialState = {
  orders: [],
  currentOrder: null,
  trackingInfo: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearTrackingInfo: (state) => {
      state.trackingInfo = null;
    },
    updateOrderInList: (state, action) => {
      const index = state.orders.findIndex(order => order._id === action.payload._id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.order) {
          state.orders.unshift(action.payload.order);
          state.currentOrder = action.payload.order;
        }
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch user orders
      .addCase(fetchUserOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload?.orders || [];
        state.pagination = action.payload?.pagination || state.pagination;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch seller orders
      .addCase(fetchSellerOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSellerOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload?.orders || [];
        state.pagination = action.payload?.pagination || state.pagination;
      })
      .addCase(fetchSellerOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload?.order || null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update order status
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const updated = action.payload?.order;
        const index = state.orders.findIndex(order => order._id === updated?._id);
        if (index !== -1) {
          state.orders[index] = updated;
        }
        if (state.currentOrder?._id === updated?._id) {
          state.currentOrder = updated;
        }
      })
      // Confirm delivery
      .addCase(confirmDelivery.fulfilled, (state, action) => {
        const updated = action.payload?.order;
        const index = state.orders.findIndex(order => order._id === updated?._id);
        if (index !== -1) {
          state.orders[index] = updated;
        }
        if (state.currentOrder?._id === updated?._id) {
          state.currentOrder = updated;
        }
      })
      // Rate order
      .addCase(rateOrder.fulfilled, (state, action) => {
        const updated = action.payload?.order;
        const index = state.orders.findIndex(order => order._id === updated?._id);
        if (index !== -1) {
          state.orders[index] = updated;
        }
        if (state.currentOrder?._id === updated?._id) {
          state.currentOrder = updated;
        }
      })
      // Request refund
      .addCase(requestRefund.fulfilled, (state, action) => {
        const index = state.orders.findIndex(order => order._id === action.payload.order._id);
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
        if (state.currentOrder?._id === action.payload.order._id) {
          state.currentOrder = action.payload.order;
        }
      })
      // Track order
      .addCase(trackOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(trackOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.trackingInfo = action.payload?.tracking || null;
      })
      .addCase(trackOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentOrder, clearTrackingInfo, updateOrderInList } = orderSlice.actions;
export default orderSlice.reducer;
