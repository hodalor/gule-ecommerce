import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const ADMIN_ORDERS_API = '/admin/orders';

const statusLabelMap = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
};

const toApiStatus = (status) => {
  if (!status) return status;
  const normalized = String(status).toLowerCase().trim();
  const reverse = Object.entries(statusLabelMap).reduce((acc, [apiValue, label]) => {
    acc[label.toLowerCase()] = apiValue;
    return acc;
  }, {});
  return reverse[normalized] || normalized;
};

const buildDisplayName = (value) => {
  if (!value) return '';
  const first = value.firstName || '';
  const last = value.lastName || '';
  return `${first} ${last}`.trim();
};

const normalizeOrderItem = (item = {}) => {
  const product = item.product || item.productSnapshot || {};
  const images = Array.isArray(product.images) ? product.images : [];
  const imageUrl = images.length ? (images[0]?.url || images[0]) : null;
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || item.price || product.price || 0);
  const total = Number(item.totalPrice || (quantity * unitPrice) || 0);

  return {
    ...item,
    id: item._id || item.id,
    product,
    name: product.name || item.name || 'Product',
    sku: product.sku || item.sku || '',
    imageUrl,
    quantity,
    unitPrice,
    total
  };
};

const normalizeOrder = (order = {}) => {
  const normalizedItems = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [];
  const totalQuantity = normalizedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const firstItem = normalizedItems[0];
  const productTitle = normalizedItems.length === 1
    ? (firstItem?.name || 'Product')
    : normalizedItems.length > 1
      ? `${normalizedItems.length} items`
      : '';

  const buyer = order.buyer || {};
  const reviewOfficer = order.reviewOfficer || {};
  const firstSeller = firstItem?.seller || {};

  return {
    ...order,
    id: order.orderNumber || order._id || order.id,
    rawId: order._id || order.id,
    status: statusLabelMap[String(order.status || '').toLowerCase()] || order.status,
    rawStatus: String(order.status || '').toLowerCase(),
    amount: Number(order.totalAmount || order.amount || 0),
    createdAt: order.createdAt || order.orderDate,
    buyerName: buildDisplayName(buyer) || buyer.displayName || 'Customer',
    buyerEmail: buyer.email || '',
    buyerPhone: buyer.phone || '',
    sellerName: firstSeller.businessName || firstSeller.name || '',
    sellerEmail: firstSeller.email || '',
    businessName: firstSeller.businessName || '',
    reviewOfficer: buildDisplayName(reviewOfficer) || '',
    trackingNumber: order.trackingNumber || '',
    shippingAddress: order.shippingAddress || null,
    items: normalizedItems,
    productTitle,
    quantity: totalQuantity,
    unitPrice: normalizedItems.length === 1 ? (firstItem?.unitPrice || 0) : 0
  };
};

const patchOrderStatusFields = (existingOrder, statusValue) => {
  if (!statusValue) return existingOrder;
  const apiStatus = toApiStatus(statusValue);
  return {
    ...existingOrder,
    rawStatus: apiStatus,
    status: statusLabelMap[apiStatus] || statusValue
  };
};

const patchOrderInState = (state, predicate, patch) => {
  const index = state.orders.findIndex(predicate);
  if (index === -1) return;

  let next = { ...state.orders[index], ...patch };
  next = patchOrderStatusFields(next, patch?.status);
  state.orders[index] = next;
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'adminOrders/fetchOrders',
  async ({ 
    page = 1, 
    limit = 10, 
    search = '', 
    status = '', 
    dateFrom = '', 
    dateTo = '', 
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
      if (status) params.append('status', toApiStatus(status));
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
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

export const fetchReviewOfficers = createAsyncThunk(
  'orders/fetchReviewOfficers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`${ADMIN_ORDERS_API}/review-officers`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch review officers');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`${ADMIN_ORDERS_API}/${orderId}`);
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
      const response = await api.patch(`${ADMIN_ORDERS_API}/${orderId}/status`, {
        status: toApiStatus(status),
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
  async ({ orderIds, reviewOfficerId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${ADMIN_ORDERS_API}/assign-reviewer`, {
        orderIds,
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
      const payload = { ...updates };
      if (payload.status) {
        payload.status = toApiStatus(payload.status);
      }
      const response = await api.patch(`${ADMIN_ORDERS_API}/bulk-update`, {
        orderIds,
        updates: payload
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

      const response = await api.get(`${ADMIN_ORDERS_API}/export?${queryParams.toString()}`, {
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
      const response = await api.get(`${ADMIN_ORDERS_API}/${orderId}`);
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
  reviewOfficers: [],
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  },
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
        const responseData = action.payload.data || action.payload;
        const rawOrders = Array.isArray(responseData.orders) ? responseData.orders : [];
        state.orders = rawOrders.map(normalizeOrder);
        state.pagination = responseData.pagination || state.pagination;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchReviewOfficers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewOfficers.fulfilled, (state, action) => {
        state.loading = false;
        const officers = action.payload?.officers || action.payload?.data?.officers || [];
        state.reviewOfficers = Array.isArray(officers) ? officers : [];
      })
      .addCase(fetchReviewOfficers.rejected, (state, action) => {
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
        const responseData = action.payload?.data || action.payload;
        const rawOrder = responseData?.order || responseData;
        state.orderDetails = normalizeOrder(rawOrder);
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
        const updated = action.payload?.order || action.payload?.data?.order || null;
        if (!updated) return;

        patchOrderInState(
          state,
          (order) => order.rawId === String(updated.id) || order.rawId === String(action.meta.arg.orderId),
          { trackingNumber: updated.trackingNumber, updatedAt: updated.updatedAt, status: updated.status }
        );

        if (state.orderDetails && state.orderDetails.rawId === String(updated.id)) {
          let next = { ...state.orderDetails, trackingNumber: updated.trackingNumber, updatedAt: updated.updatedAt };
          next = patchOrderStatusFields(next, updated.status);
          state.orderDetails = next;
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
        const officerName = action.payload?.reviewOfficer?.name || '';
        const orderIds = Array.isArray(action.meta?.arg?.orderIds) ? action.meta.arg.orderIds : [];

        orderIds.forEach((id) => {
          patchOrderInState(state, (order) => order.rawId === String(id), { reviewOfficer: officerName });
        });

        if (state.orderDetails && orderIds.includes(state.orderDetails.rawId)) {
          state.orderDetails = { ...state.orderDetails, reviewOfficer: officerName };
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
        const orderIds = Array.isArray(action.meta?.arg?.orderIds) ? action.meta.arg.orderIds : [];
        const updates = action.meta?.arg?.updates || {};

        orderIds.forEach((id) => {
          patchOrderInState(state, (order) => order.rawId === String(id), updates);
        });

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
        const responseData = action.payload?.data || action.payload;
        const rawOrder = responseData?.order || responseData;
        state.orderDetails = rawOrder ? normalizeOrder(rawOrder) : null;
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
