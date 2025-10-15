import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for refunds management
export const fetchRefunds = createAsyncThunk(
  'refunds/fetchRefunds',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/refunds', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch refunds');
    }
  }
);

export const processRefund = createAsyncThunk(
  'refunds/process',
  async ({ id, action, reason, amount }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/refunds/${id}/process`, {
        action,
        reason,
        amount
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process refund');
    }
  }
);

export const approveRefund = createAsyncThunk(
  'refunds/approve',
  async ({ id, amount, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/refunds/${id}/approve`, {
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve refund');
    }
  }
);

export const rejectRefund = createAsyncThunk(
  'refunds/reject',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/refunds/${id}/reject`, {
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject refund');
    }
  }
);

export const escalateRefund = createAsyncThunk(
  'refunds/escalate',
  async ({ id, escalationReason, priority }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/refunds/${id}/escalate`, {
        escalationReason,
        priority
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to escalate refund');
    }
  }
);

export const addRefundNote = createAsyncThunk(
  'refunds/addNote',
  async ({ id, note }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/refunds/${id}/notes`, {
        note
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add note');
    }
  }
);

export const bulkUpdateRefunds = createAsyncThunk(
  'refunds/bulkUpdate',
  async ({ refundIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/refunds/bulk', {
        refundIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update refunds');
    }
  }
);

export const exportRefunds = createAsyncThunk(
  'refunds/export',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/refunds/export', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export refunds');
    }
  }
);

export const fetchRefundAnalytics = createAsyncThunk(
  'refunds/fetchAnalytics',
  async (dateRange, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/refunds/analytics', {
        params: dateRange
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch refund analytics');
    }
  }
);

const initialState = {
  refunds: [],
  selectedRefund: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    status: '',
    type: '',
    priority: '',
    dateRange: null,
    amountRange: null
  },
  selectedRefunds: [],
  statistics: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    processing: 0,
    completed: 0,
    totalAmount: 0,
    averageAmount: 0
  },
  analytics: {
    refundTrends: [],
    reasonBreakdown: [],
    processingTimes: []
  }
};

const refundsSlice = createSlice({
  name: 'refunds',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedRefund: (state, action) => {
      state.selectedRefund = action.payload;
    },
    clearSelectedRefund: (state) => {
      state.selectedRefund = null;
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
    setSelectedRefunds: (state, action) => {
      state.selectedRefunds = action.payload;
    },
    toggleRefundSelection: (state, action) => {
      const refundId = action.payload;
      const index = state.selectedRefunds.indexOf(refundId);
      if (index > -1) {
        state.selectedRefunds.splice(index, 1);
      } else {
        state.selectedRefunds.push(refundId);
      }
    },
    clearSelectedRefunds: (state) => {
      state.selectedRefunds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch refunds
      .addCase(fetchRefunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.loading = false;
        state.refunds = action.payload.refunds || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
        state.statistics = action.payload.statistics || state.statistics;
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Process refund
      .addCase(processRefund.fulfilled, (state, action) => {
        const index = state.refunds.findIndex(refund => refund.id === action.payload.id);
        if (index !== -1) {
          state.refunds[index] = action.payload;
        }
        if (state.selectedRefund?.id === action.payload.id) {
          state.selectedRefund = action.payload;
        }
      })
      // Approve refund
      .addCase(approveRefund.fulfilled, (state, action) => {
        const index = state.refunds.findIndex(refund => refund.id === action.payload.id);
        if (index !== -1) {
          state.refunds[index] = action.payload;
        }
        if (state.selectedRefund?.id === action.payload.id) {
          state.selectedRefund = action.payload;
        }
      })
      // Reject refund
      .addCase(rejectRefund.fulfilled, (state, action) => {
        const index = state.refunds.findIndex(refund => refund.id === action.payload.id);
        if (index !== -1) {
          state.refunds[index] = action.payload;
        }
        if (state.selectedRefund?.id === action.payload.id) {
          state.selectedRefund = action.payload;
        }
      })
      // Escalate refund
      .addCase(escalateRefund.fulfilled, (state, action) => {
        const index = state.refunds.findIndex(refund => refund.id === action.payload.id);
        if (index !== -1) {
          state.refunds[index] = action.payload;
        }
        if (state.selectedRefund?.id === action.payload.id) {
          state.selectedRefund = action.payload;
        }
      })
      // Add refund note
      .addCase(addRefundNote.fulfilled, (state, action) => {
        if (state.selectedRefund?.id === action.payload.refundId) {
          state.selectedRefund.notes = action.payload.notes;
        }
      })
      // Bulk update refunds
      .addCase(bulkUpdateRefunds.fulfilled, (state) => {
        state.selectedRefunds = [];
      })
      // Export refunds
      .addCase(exportRefunds.pending, (state) => {
        state.loading = true;
      })
      .addCase(exportRefunds.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportRefunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch refund analytics
      .addCase(fetchRefundAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedRefund,
  clearSelectedRefund,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  setSelectedRefunds,
  toggleRefundSelection,
  clearSelectedRefunds,
} = refundsSlice.actions;

export default refundsSlice.reducer;