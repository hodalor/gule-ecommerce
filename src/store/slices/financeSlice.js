import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for finance management
export const fetchTransactions = createAsyncThunk(
  'finance/fetchTransactions',
  async ({ page = 1, limit = 10, status, type, dateRange }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(type && { type }),
        ...(dateRange && { 
          startDate: dateRange.startDate,
          endDate: dateRange.endDate 
        }),
      });
      
      const response = await axios.get(`/api/admin/finance/transactions?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchEscrowFunds = createAsyncThunk(
  'finance/fetchEscrowFunds',
  async ({ page = 1, limit = 10, status }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });
      
      const response = await axios.get(`/api/admin/finance/escrow?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch escrow funds');
    }
  }
);

export const releaseFunds = createAsyncThunk(
  'finance/releaseFunds',
  async ({ transactionId, amount, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/finance/release`, {
        transactionId,
        amount,
        reason,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to release funds');
    }
  }
);

export const refundFunds = createAsyncThunk(
  'finance/refundFunds',
  async ({ transactionId, amount, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/finance/refund`, {
        transactionId,
        amount,
        reason,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to refund funds');
    }
  }
);

export const generateFinancialReport = createAsyncThunk(
  'finance/generateFinancialReport',
  async ({ type, dateRange, format }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/finance/reports', {
        type,
        dateRange,
        format,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate report');
    }
  }
);

export const fetchFinancialSummary = createAsyncThunk(
  'finance/fetchFinancialSummary',
  async ({ period = 'month' }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/admin/finance/summary?period=${period}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch financial summary');
    }
  }
);

const initialState = {
  transactions: [],
  escrowFunds: [],
  financialSummary: {
    totalRevenue: 0,
    totalEscrow: 0,
    pendingReleases: 0,
    totalRefunds: 0,
    monthlyGrowth: 0,
  },
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    status: '',
    type: '',
    dateRange: null,
  },
  reportLoading: false,
  reportData: null,
};

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
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
        type: '',
        dateRange: null,
      };
    },
    clearReportData: (state) => {
      state.reportData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch escrow funds
      .addCase(fetchEscrowFunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEscrowFunds.fulfilled, (state, action) => {
        state.loading = false;
        state.escrowFunds = action.payload.escrowFunds || action.payload;
      })
      .addCase(fetchEscrowFunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Release funds
      .addCase(releaseFunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(releaseFunds.fulfilled, (state, action) => {
        state.loading = false;
        // Update the transaction in the list
        const index = state.transactions.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.transactions[index] = action.payload;
        }
      })
      .addCase(releaseFunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Refund funds
      .addCase(refundFunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refundFunds.fulfilled, (state, action) => {
        state.loading = false;
        // Update the transaction in the list
        const index = state.transactions.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.transactions[index] = action.payload;
        }
      })
      .addCase(refundFunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Generate financial report
      .addCase(generateFinancialReport.pending, (state) => {
        state.reportLoading = true;
        state.error = null;
      })
      .addCase(generateFinancialReport.fulfilled, (state, action) => {
        state.reportLoading = false;
        state.reportData = action.payload;
      })
      .addCase(generateFinancialReport.rejected, (state, action) => {
        state.reportLoading = false;
        state.error = action.payload;
      })
      // Fetch financial summary
      .addCase(fetchFinancialSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinancialSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.financialSummary = action.payload;
      })
      .addCase(fetchFinancialSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  clearReportData,
} = financeSlice.actions;

export default financeSlice.reducer;