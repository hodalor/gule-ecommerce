import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Async thunks for seller management
export const fetchSellers = createAsyncThunk(
  'adminSellers/fetchSellers',
  async ({ page = 1, limit = 10, search = '', status = '', verified = '', businessType = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Normalize verified filter: backend expects boolean string 'true'/'false'
      const normalizedVerified = (() => {
        if (typeof verified === 'boolean') return verified ? 'true' : 'false';
        if (typeof verified === 'string') {
          if (verified === 'verified') return 'true';
          if (['pending', 'under_review', 'rejected'].includes(verified)) return 'false';
          if (verified === 'true' || verified === 'false') return verified; // already normalized
        }
        return '';
      })();

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (normalizedVerified !== '') params.append('verified', normalizedVerified);
      if (businessType) params.append('businessType', businessType);

      const response = await api.get(`/admin/sellers?${params}`);
      // Backend returns { success, data: { sellers, pagination } }
      return response.data?.data || { sellers: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: limit } };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sellers');
    }
  }
);

export const fetchSellerById = createAsyncThunk(
  'adminSellers/fetchSellerById',
  async (sellerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}`);
      // Backend returns { success, data: { seller } }
      return response.data?.data?.seller || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller');
    }
  }
);

export const updateSellerStatus = createAsyncThunk(
  'adminSellers/updateSellerStatus',
  async ({ sellerId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/sellers/${sellerId}/status`, {
        status,
        reason
      });
      // Backend returns { success, message, data: { seller } }
      return response.data?.data?.seller || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update seller status');
    }
  }
);

export const verifySellerBusiness = createAsyncThunk(
  'adminSellers/verifySellerBusiness',
  async ({ sellerId, verified, reason }, { rejectWithValue }) => {
    try {
      // Backend route is /:id/verify
      const response = await api.patch(`/admin/sellers/${sellerId}/verify`, {
        verified,
        reason
      });
      // Backend returns { success, message, data: { seller } }
      return response.data?.data?.seller || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify seller business');
    }
  }
);

export const fetchSellerStatistics = createAsyncThunk(
  'adminSellers/fetchSellerStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/sellers/stats/summary`);
      // Backend returns { success, data }
      return response.data?.data || {};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller statistics');
    }
  }
);

export const deleteSeller = createAsyncThunk(
  'adminSellers/deleteSeller',
  async ({ sellerId, reason }, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/sellers/${sellerId}`, {
        data: { reason }
      });
      return sellerId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete seller');
    }
  }
);

export const bulkUpdateSellers = createAsyncThunk(
  'adminSellers/bulkUpdateSellers',
  async ({ sellerIds, action, reason }, { rejectWithValue }) => {
    try {
      // Backend route is /bulk/update and expects { sellerIds, action, reason }
      const response = await api.patch(`/admin/sellers/bulk/update`, {
        sellerIds,
        action,
        reason
      });
      return response.data?.data || { affectedCount: 0 };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update sellers');
    }
  }
);

export const exportSellers = createAsyncThunk(
  'adminSellers/exportSellers',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ format });
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/admin/sellers/export?${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sellers_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export sellers');
    }
  }
);

export const sendSellerNotification = createAsyncThunk(
  'adminSellers/sendSellerNotification',
  async ({ sellerId, title, message, type }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/sellers/${sellerId}/notify`, {
        title,
        message,
        type
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send notification');
    }
  }
);

const initialState = {
  sellers: [],
  selectedSeller: null,
  sellerStatistics: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  filters: {
    search: '',
    status: '',
    verified: '',
    businessType: ''
  }
};

const sellerSlice = createSlice({
  name: 'adminSellers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        status: '',
        verified: '',
        businessType: ''
      };
    },
    setSelectedSeller: (state, action) => {
      state.selectedSeller = action.payload;
    },
    clearSelectedSeller: (state) => {
      state.selectedSeller = null;
      state.sellerStatistics = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch sellers
      .addCase(fetchSellers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSellers.fulfilled, (state, action) => {
        state.loading = false;
        state.sellers = action.payload?.sellers || [];
        const p = action.payload?.pagination || {};
        state.pagination = {
          currentPage: p.currentPage || 1,
          totalPages: p.totalPages || 1,
          totalItems: p.totalItems || 0,
          itemsPerPage: p.itemsPerPage || state.pagination.itemsPerPage
        };
      })
      .addCase(fetchSellers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch seller by ID
      .addCase(fetchSellerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSellerById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSeller = action.payload;
      })
      .addCase(fetchSellerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update seller status
      .addCase(updateSellerStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSellerStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSeller = action.payload;
        const updatedId = String(updatedSeller?._id || updatedSeller?.id || '');
        const index = state.sellers.findIndex(s => String(s._id || s.id || '') === updatedId);
        if (index !== -1 && updatedSeller) {
          state.sellers[index] = { ...state.sellers[index], ...updatedSeller };
        }
        if (state.selectedSeller && String(state.selectedSeller._id || state.selectedSeller.id || '') === updatedId) {
          state.selectedSeller = { ...state.selectedSeller, ...updatedSeller };
        }
      })
      .addCase(updateSellerStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Verify seller business
      .addCase(verifySellerBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifySellerBusiness.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSeller = action.payload;
        const updatedId = String(updatedSeller?._id || updatedSeller?.id || '');
        const index = state.sellers.findIndex(s => String(s._id || s.id || '') === updatedId);
        if (index !== -1 && updatedSeller) {
          state.sellers[index] = { ...state.sellers[index], ...updatedSeller };
        }
        if (state.selectedSeller && String(state.selectedSeller._id || state.selectedSeller.id || '') === updatedId) {
          state.selectedSeller = { ...state.selectedSeller, ...updatedSeller };
        }
      })
      .addCase(verifySellerBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch seller statistics
      .addCase(fetchSellerStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSellerStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.sellerStatistics = action.payload;
      })
      .addCase(fetchSellerStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete seller
      .addCase(deleteSeller.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSeller.fulfilled, (state, action) => {
        state.loading = false;
        state.sellers = state.sellers.filter(s => (s._id || s.id) !== action.payload);
        if (state.selectedSeller && (state.selectedSeller._id || state.selectedSeller.id) === action.payload) {
          state.selectedSeller = null;
          state.sellerStatistics = null;
        }
      })
      .addCase(deleteSeller.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk update sellers
      .addCase(bulkUpdateSellers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateSellers.fulfilled, (state) => {
        state.loading = false;
        // Consider refetching list after bulk updates if needed
      })
      .addCase(bulkUpdateSellers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export sellers
      .addCase(exportSellers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportSellers.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportSellers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Send seller notification
      .addCase(sendSellerNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendSellerNotification.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendSellerNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setSelectedSeller,
  clearSelectedSeller
} = sellerSlice.actions;

export default sellerSlice.reducer;