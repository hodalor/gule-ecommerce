import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Async thunks for seller management
export const fetchSellers = createAsyncThunk(
  'adminSellers/fetchSellers',
  async ({ page = 1, limit = 10, search = '', status = '', verified = '', businessType = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (verified) params.append('verified', verified);
      if (businessType) params.append('businessType', businessType);

      const response = await axios.get(`${API_URL}/sellers?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sellers');
    }
  }
);

export const fetchSellerById = createAsyncThunk(
  'adminSellers/fetchSellerById',
  async (sellerId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/sellers/${sellerId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller');
    }
  }
);

export const updateSellerStatus = createAsyncThunk(
  'adminSellers/updateSellerStatus',
  async ({ sellerId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/sellers/${sellerId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update seller status');
    }
  }
);

export const verifySellerBusiness = createAsyncThunk(
  'adminSellers/verifySellerBusiness',
  async ({ sellerId, verified, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/sellers/${sellerId}/verify-business`, {
        verified,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify seller business');
    }
  }
);

export const fetchSellerStatistics = createAsyncThunk(
  'adminSellers/fetchSellerStatistics',
  async (sellerId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/sellers/${sellerId}/statistics`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller statistics');
    }
  }
);

export const deleteSeller = createAsyncThunk(
  'adminSellers/deleteSeller',
  async ({ sellerId, reason }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/sellers/${sellerId}`, {
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
  async ({ sellerIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/sellers/bulk`, {
        sellerIds,
        action,
        data
      });
      return response.data;
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

      const response = await axios.get(`${API_URL}/admin/sellers/export?${params}`, {
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
      const response = await axios.post(`${API_URL}/admin/sellers/${sellerId}/notify`, {
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
        state.sellers = action.payload.sellers || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
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
        const index = state.sellers.findIndex(s => s._id === updatedSeller._id);
        if (index !== -1) {
          state.sellers[index] = updatedSeller;
        }
        if (state.selectedSeller && state.selectedSeller._id === updatedSeller._id) {
          state.selectedSeller = updatedSeller;
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
        const index = state.sellers.findIndex(s => s._id === updatedSeller._id);
        if (index !== -1) {
          state.sellers[index] = updatedSeller;
        }
        if (state.selectedSeller && state.selectedSeller._id === updatedSeller._id) {
          state.selectedSeller = updatedSeller;
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
        state.sellers = state.sellers.filter(s => s._id !== action.payload);
        if (state.selectedSeller && state.selectedSeller._id === action.payload) {
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
      .addCase(bulkUpdateSellers.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh sellers list after bulk update
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