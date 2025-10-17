import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../../utils/api';

const ADMIN_ORDERS_API = '/admin/orders';

// Async thunks
export const fetchOrders = createAsyncThunk(
  'adminOrders/fetchOrders',
  async ({ 
    page = 1, 
    limit = 10, 
    search = '', 
    status = '', 
    startDate = '', 
    endDate = '', 
    minAmount = '', 
    maxAmount = '', 
    paymentStatus = '', 
    reviewOfficer = '' 
  }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (reviewOfficer) params.append('reviewOfficer', reviewOfficer);

      const response = await api.get(`${ADMIN_ORDERS_API}?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${ADMIN_ORDERS_API}/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${ADMIN_ORDERS_API}/${orderId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

export const assignReviewOfficer = createAsyncThunk(
  'orders/assignReviewOfficer',
  async ({ orderId, reviewOfficerId }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${ADMIN_ORDERS_API}/${orderId}/assign-reviewer`, {
        reviewOfficerId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign review officer');
    }
  }
);

export const bulkUpdateOrders = createAsyncThunk(
  'orders/bulkUpdateOrders',
  async ({ orderIds, updates }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${ADMIN_ORDERS_API}/bulk-update`, {
        orderIds,
        updates
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update orders');
    }
  }
);

export const exportOrders = createAsyncThunk(
  'orders/exportOrders',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      // Add filter parameters
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await axios.get(`${ADMIN_ORDERS_API}/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { message: 'Orders exported successfully' };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export orders');
    }
  }
);

export const getOrderDetails = createAsyncThunk(
  'orders/getOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${ADMIN_ORDERS_API}/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order details');
    }
  }
);

const initialState = {
  orders: [],
  selectedOrders: [],
  orderDetails: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    status: '',
    search: '',
    dateRange: null,
  },
  bulkActionLoading: false,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedOrders: (state, action) => {
      state.selectedOrders = action.payload;
    },
    toggleOrderSelection: (state, action) => {
      const orderId = action.payload;
      const index = state.selectedOrders.indexOf(orderId);
      if (index > -1) {
        state.selectedOrders.splice(index, 1);
      } else {
        state.selectedOrders.push(orderId);
      }
    },
    clearSelectedOrders: (state) => {
      state.selectedOrders = [];
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        status: '',
        search: '',
        dateRange: null,
      };
    },
    clearOrderDetails: (state) => {
      state.orderDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        // Handle nested response structure from backend
        const responseData = action.payload.data || action.payload;
        state.orders = Array.isArray(responseData.orders) ? responseData.orders : 
                      Array.isArray(responseData) ? responseData : [];
        state.totalCount = responseData.totalCount || responseData.total || 0;
        state.currentPage = responseData.currentPage || responseData.page || 1;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
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
        state.orderDetails = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.orderDetails && state.orderDetails.id === action.payload.id) {
          state.orderDetails = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Assign review officer
      .addCase(assignReviewOfficer.pending, (state) => {
        state.bulkActionLoading = true;
        state.error = null;
      })
      .addCase(assignReviewOfficer.fulfilled, (state, action) => {
        state.bulkActionLoading = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.orderDetails && state.orderDetails.id === action.payload.id) {
          state.orderDetails = action.payload;
        }
      })
      .addCase(assignReviewOfficer.rejected, (state, action) => {
        state.bulkActionLoading = false;
        state.error = action.payload;
      })
      // Bulk update orders
      .addCase(bulkUpdateOrders.pending, (state) => {
        state.bulkActionLoading = true;
        state.error = null;
      })
      .addCase(bulkUpdateOrders.fulfilled, (state, action) => {
        state.bulkActionLoading = false;
        if (action.payload.orders) {
          action.payload.orders.forEach(updatedOrder => {
            const index = state.orders.findIndex(order => order.id === updatedOrder.id);
            if (index !== -1) {
              state.orders[index] = updatedOrder;
            }
          });
        }
        state.selectedOrders = [];
      })
      .addCase(bulkUpdateOrders.rejected, (state, action) => {
        state.bulkActionLoading = false;
        state.error = action.payload;
      })
      // Export orders
      .addCase(exportOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportOrders.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch order details
      .addCase(getOrderDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOrderDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.orderDetails = action.payload;
      })
      .addCase(getOrderDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedOrders,
  toggleOrderSelection,
  clearSelectedOrders,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  clearOrderDetails,
} = orderSlice.actions;

export default orderSlice.reducer;