import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks for dashboard data
export const fetchDashboardStatistics = createAsyncThunk(
  'dashboard/fetchStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/system/statistics');
      return response.data.statistics;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard statistics');
    }
  }
);

export const fetchRecentActivities = createAsyncThunk(
  'dashboard/fetchRecentActivities',
  async ({ limit = 10 } = {}, { rejectWithValue }) => {
    try {
      // For now, return empty array since audit logs endpoint doesn't exist
      // TODO: Implement audit logs endpoint in backend
      return [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recent activities');
    }
  }
);

const initialState = {
  statistics: {
    users: {
      buyers: { total: 0, active: 0, recent: 0 },
      sellers: { total: 0, active: 0, verified: 0, recent: 0 }
    },
    products: { total: 0, active: 0, pending: 0 },
    orders: {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0
    },
    reviews: { totalReviews: 0, averageRating: 0 },
    recentActivity: { newBuyers: 0, newSellers: 0, newOrders: 0 }
  },
  recentActivities: [],
  loading: false,
  error: null
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard statistics
      .addCase(fetchDashboardStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchDashboardStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch recent activities
      .addCase(fetchRecentActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.recentActivities = action.payload;
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;