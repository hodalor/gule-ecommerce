import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Async thunks for API calls
export const fetchSellerReports = createAsyncThunk(
  'reports/fetchSellerReports',
  async ({ sellerId, dateRange = '30days' }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_URL}/reports/seller/${sellerId}?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller reports');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSalesData = createAsyncThunk(
  'reports/fetchSalesData',
  async ({ sellerId, dateRange = '30days' }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_URL}/reports/seller/${sellerId}/sales?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProductPerformance = createAsyncThunk(
  'reports/fetchProductPerformance',
  async ({ sellerId, dateRange = '30days' }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_URL}/reports/seller/${sellerId}/products?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product performance');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCategoryData = createAsyncThunk(
  'reports/fetchCategoryData',
  async ({ sellerId, dateRange = '30days' }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_URL}/reports/seller/${sellerId}/categories?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch category data');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const exportReport = createAsyncThunk(
  'reports/exportReport',
  async ({ sellerId, dateRange, format }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_URL}/reports/seller/${sellerId}/export?range=${dateRange}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      return { blob, format };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Overview stats
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0,
    customersChange: 0,
    avgOrderValueChange: 0,
  },
  
  // Chart data
  salesData: [],
  productPerformance: [],
  categoryData: [],
  monthlyTrends: [],
  
  // Loading states
  loading: {
    overview: false,
    sales: false,
    products: false,
    categories: false,
    export: false,
  },
  
  // Error states
  error: {
    overview: null,
    sales: null,
    products: null,
    categories: null,
    export: null,
  },
  
  // Export data
  exportData: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = {
        overview: null,
        sales: null,
        products: null,
        categories: null,
        export: null,
      };
    },
    clearExportData: (state) => {
      state.exportData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch seller reports
      .addCase(fetchSellerReports.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = null;
      })
      .addCase(fetchSellerReports.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.stats = action.payload.stats;
        state.monthlyTrends = action.payload.monthlyTrends;
      })
      .addCase(fetchSellerReports.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview = action.payload;
      })
      
      // Fetch sales data
      .addCase(fetchSalesData.pending, (state) => {
        state.loading.sales = true;
        state.error.sales = null;
      })
      .addCase(fetchSalesData.fulfilled, (state, action) => {
        state.loading.sales = false;
        state.salesData = action.payload;
      })
      .addCase(fetchSalesData.rejected, (state, action) => {
        state.loading.sales = false;
        state.error.sales = action.payload;
      })
      
      // Fetch product performance
      .addCase(fetchProductPerformance.pending, (state) => {
        state.loading.products = true;
        state.error.products = null;
      })
      .addCase(fetchProductPerformance.fulfilled, (state, action) => {
        state.loading.products = false;
        state.productPerformance = action.payload;
      })
      .addCase(fetchProductPerformance.rejected, (state, action) => {
        state.loading.products = false;
        state.error.products = action.payload;
      })
      
      // Fetch category data
      .addCase(fetchCategoryData.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(fetchCategoryData.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categoryData = action.payload;
      })
      .addCase(fetchCategoryData.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories = action.payload;
      })
      
      // Export report
      .addCase(exportReport.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
      })
      .addCase(exportReport.fulfilled, (state, action) => {
        state.loading.export = false;
        state.exportData = action.payload;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload;
      });
  },
});

export const { clearErrors, clearExportData } = reportsSlice.actions;
export default reportsSlice.reducer;