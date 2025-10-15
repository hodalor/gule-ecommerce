import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for store performance management
export const fetchStorePerformance = createAsyncThunk(
  'storePerformance/fetchStorePerformance',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/stores/performance', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch store performance');
    }
  }
);

export const fetchStoreDetails = createAsyncThunk(
  'storePerformance/fetchStoreDetails',
  async (storeId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/admin/stores/${storeId}/details`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch store details');
    }
  }
);

export const fetchStoreAnalytics = createAsyncThunk(
  'storePerformance/fetchStoreAnalytics',
  async ({ storeId, dateRange }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/admin/stores/${storeId}/analytics`, {
        params: dateRange
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch store analytics');
    }
  }
);

export const updateStoreStatus = createAsyncThunk(
  'storePerformance/updateStoreStatus',
  async ({ storeId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/stores/${storeId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update store status');
    }
  }
);

export const flagStore = createAsyncThunk(
  'storePerformance/flagStore',
  async ({ storeId, flagType, reason, severity }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/stores/${storeId}/flag`, {
        flagType,
        reason,
        severity
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to flag store');
    }
  }
);

export const unflagStore = createAsyncThunk(
  'storePerformance/unflagStore',
  async ({ storeId, flagId, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/stores/${storeId}/unflag`, {
        flagId,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unflag store');
    }
  }
);

export const fetchTopPerformingStores = createAsyncThunk(
  'storePerformance/fetchTopPerformingStores',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/stores/top-performing', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch top performing stores');
    }
  }
);

export const fetchUnderperformingStores = createAsyncThunk(
  'storePerformance/fetchUnderperformingStores',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/stores/underperforming', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch underperforming stores');
    }
  }
);

export const generatePerformanceReport = createAsyncThunk(
  'storePerformance/generatePerformanceReport',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/stores/performance/report', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate performance report');
    }
  }
);

export const fetchStoreComparison = createAsyncThunk(
  'storePerformance/fetchStoreComparison',
  async ({ storeIds, metrics, dateRange }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/stores/compare', {
        storeIds,
        metrics,
        dateRange
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch store comparison');
    }
  }
);

export const setPerformanceThresholds = createAsyncThunk(
  'storePerformance/setPerformanceThresholds',
  async ({ storeId, thresholds }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/stores/${storeId}/thresholds`, {
        thresholds
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set performance thresholds');
    }
  }
);

const initialState = {
  stores: [],
  selectedStore: null,
  storeDetails: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    status: '',
    category: '',
    performanceLevel: '',
    dateRange: null,
    sortBy: 'revenue',
    sortOrder: 'desc'
  },
  selectedStores: [],
  topPerformingStores: [],
  underperformingStores: [],
  storeAnalytics: {
    revenue: [],
    orders: [],
    customers: [],
    products: [],
    ratings: [],
    conversionRate: [],
    averageOrderValue: []
  },
  comparisonData: null,
  performanceMetrics: {
    totalRevenue: 0,
    totalOrders: 0,
    averageRating: 0,
    totalStores: 0,
    activeStores: 0,
    flaggedStores: 0,
    topCategories: [],
    revenueGrowth: 0,
    orderGrowth: 0
  },
  performanceTrends: {
    daily: [],
    weekly: [],
    monthly: []
  }
};

const storePerformanceSlice = createSlice({
  name: 'storePerformance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedStore: (state, action) => {
      state.selectedStore = action.payload;
    },
    clearSelectedStore: (state) => {
      state.selectedStore = null;
      state.storeDetails = null;
      state.storeAnalytics = initialState.storeAnalytics;
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
      state.filters = initialState.filters;
    },
    setSelectedStores: (state, action) => {
      state.selectedStores = action.payload;
    },
    toggleStoreSelection: (state, action) => {
      const storeId = action.payload;
      const index = state.selectedStores.indexOf(storeId);
      if (index > -1) {
        state.selectedStores.splice(index, 1);
      } else {
        state.selectedStores.push(storeId);
      }
    },
    clearSelectedStores: (state) => {
      state.selectedStores = [];
    },
    clearComparisonData: (state) => {
      state.comparisonData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch store performance
      .addCase(fetchStorePerformance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStorePerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.stores = action.payload.stores || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
        state.performanceMetrics = action.payload.metrics || state.performanceMetrics;
        state.performanceTrends = action.payload.trends || state.performanceTrends;
      })
      .addCase(fetchStorePerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch store details
      .addCase(fetchStoreDetails.fulfilled, (state, action) => {
        state.storeDetails = action.payload;
      })
      // Fetch store analytics
      .addCase(fetchStoreAnalytics.fulfilled, (state, action) => {
        state.storeAnalytics = action.payload;
      })
      // Update store status
      .addCase(updateStoreStatus.fulfilled, (state, action) => {
        const index = state.stores.findIndex(store => store.id === action.payload.id);
        if (index !== -1) {
          state.stores[index] = { ...state.stores[index], ...action.payload };
        }
        if (state.storeDetails?.id === action.payload.id) {
          state.storeDetails = { ...state.storeDetails, ...action.payload };
        }
      })
      // Flag store
      .addCase(flagStore.fulfilled, (state, action) => {
        const index = state.stores.findIndex(store => store.id === action.payload.storeId);
        if (index !== -1) {
          state.stores[index].flags = action.payload.flags;
          state.stores[index].flagged = true;
        }
        if (state.storeDetails?.id === action.payload.storeId) {
          state.storeDetails.flags = action.payload.flags;
          state.storeDetails.flagged = true;
        }
      })
      // Unflag store
      .addCase(unflagStore.fulfilled, (state, action) => {
        const index = state.stores.findIndex(store => store.id === action.payload.storeId);
        if (index !== -1) {
          state.stores[index].flags = action.payload.flags;
          state.stores[index].flagged = action.payload.flags.length > 0;
        }
        if (state.storeDetails?.id === action.payload.storeId) {
          state.storeDetails.flags = action.payload.flags;
          state.storeDetails.flagged = action.payload.flags.length > 0;
        }
      })
      // Fetch top performing stores
      .addCase(fetchTopPerformingStores.fulfilled, (state, action) => {
        state.topPerformingStores = action.payload;
      })
      // Fetch underperforming stores
      .addCase(fetchUnderperformingStores.fulfilled, (state, action) => {
        state.underperformingStores = action.payload;
      })
      // Generate performance report
      .addCase(generatePerformanceReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(generatePerformanceReport.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generatePerformanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch store comparison
      .addCase(fetchStoreComparison.fulfilled, (state, action) => {
        state.comparisonData = action.payload;
      })
      // Set performance thresholds
      .addCase(setPerformanceThresholds.fulfilled, (state, action) => {
        if (state.storeDetails?.id === action.payload.storeId) {
          state.storeDetails.performanceThresholds = action.payload.thresholds;
        }
      });
  },
});

export const {
  clearError,
  setSelectedStore,
  clearSelectedStore,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  setSelectedStores,
  toggleStoreSelection,
  clearSelectedStores,
  clearComparisonData,
} = storePerformanceSlice.actions;

export default storePerformanceSlice.reducer;