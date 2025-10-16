import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Async thunks for review management
export const fetchReviews = createAsyncThunk(
  'adminReviews/fetchReviews',
  async ({ page = 1, limit = 10, search = '', status = '', rating = '', productId = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (rating) params.append('rating', rating);
      if (productId) params.append('productId', productId);

      const response = await axios.get(`${API_URL}/admin/reviews?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const fetchReviewById = createAsyncThunk(
  'adminReviews/fetchReviewById',
  async (reviewId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch review');
    }
  }
);

export const updateReviewStatus = createAsyncThunk(
  'adminReviews/updateReviewStatus',
  async ({ reviewId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/reviews/${reviewId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update review status');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'adminReviews/deleteReview',
  async ({ reviewId, reason }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/reviews/${reviewId}`, {
        data: { reason }
      });
      return reviewId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete review');
    }
  }
);

export const bulkUpdateReviews = createAsyncThunk(
  'adminReviews/bulkUpdateReviews',
  async ({ reviewIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/reviews/bulk`, {
        reviewIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update reviews');
    }
  }
);

export const fetchReviewReports = createAsyncThunk(
  'adminReviews/fetchReviewReports',
  async ({ page = 1, limit = 10, status = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status) params.append('status', status);

      const response = await axios.get(`${API_URL}/admin/reviews/reports?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch review reports');
    }
  }
);

export const handleReviewReport = createAsyncThunk(
  'adminReviews/handleReviewReport',
  async ({ reportId, action, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/reviews/reports/${reportId}`, {
        action,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to handle review report');
    }
  }
);

export const exportReviews = createAsyncThunk(
  'adminReviews/exportReviews',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ format });
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API_URL}/admin/reviews/export?${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reviews_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export reviews');
    }
  }
);

export const fetchReviewStatistics = createAsyncThunk(
  'adminReviews/fetchReviewStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/reviews/stats/summary`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch review statistics');
    }
  }
);

const initialState = {
  reviews: [],
  selectedReview: null,
  reviewReports: [],
  statistics: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  reportsPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  filters: {
    search: '',
    status: '',
    rating: '',
    productId: ''
  }
};

const reviewSlice = createSlice({
  name: 'adminReviews',
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
        rating: '',
        productId: ''
      };
    },
    setSelectedReview: (state, action) => {
      state.selectedReview = action.payload;
    },
    clearSelectedReview: (state) => {
      state.selectedReview = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch reviews
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
        };
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch review by ID
      .addCase(fetchReviewById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedReview = action.payload;
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update review status
      .addCase(updateReviewStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReviewStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedReview = action.payload;
        const index = state.reviews.findIndex(r => r._id === updatedReview._id);
        if (index !== -1) {
          state.reviews[index] = updatedReview;
        }
        if (state.selectedReview && state.selectedReview._id === updatedReview._id) {
          state.selectedReview = updatedReview;
        }
      })
      .addCase(updateReviewStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete review
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = state.reviews.filter(r => r._id !== action.payload);
        if (state.selectedReview && state.selectedReview._id === action.payload) {
          state.selectedReview = null;
        }
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk update reviews
      .addCase(bulkUpdateReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateReviews.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh reviews list after bulk update
      })
      .addCase(bulkUpdateReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch review reports
      .addCase(fetchReviewReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reviewReports = action.payload.reports || [];
        state.reportsPagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
        };
      })
      .addCase(fetchReviewReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle review report
      .addCase(handleReviewReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleReviewReport.fulfilled, (state, action) => {
        state.loading = false;
        const updatedReport = action.payload;
        const index = state.reviewReports.findIndex(r => r._id === updatedReport._id);
        if (index !== -1) {
          state.reviewReports[index] = updatedReport;
        }
      })
      .addCase(handleReviewReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export reviews
      .addCase(exportReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportReviews.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch review statistics
      .addCase(fetchReviewStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchReviewStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setSelectedReview,
  clearSelectedReview
} = reviewSlice.actions;

export default reviewSlice.reducer;