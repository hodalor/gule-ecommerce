import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Get auth token from cookies (consistent with authSlice)
const getAuthToken = () => {
  return Cookies.get('token');
};

// Create axios instance with auth
const createAuthAxios = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
};

// Async thunks for transaction operations
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async ({ page = 1, limit = 10, status = '', type = '', startDate = '', endDate = '' } = {}, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/transactions?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchTransactionById = createAsyncThunk(
  'transactions/fetchTransactionById',
  async (transactionId, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.get(`/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transaction');
    }
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/createTransaction',
  async (transactionData, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.post('/transactions', transactionData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create transaction');
    }
  }
);

export const updateTransactionStatus = createAsyncThunk(
  'transactions/updateTransactionStatus',
  async ({ transactionId, status, notes }, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.patch(`/transactions/${transactionId}/status`, {
        status,
        notes
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update transaction status');
    }
  }
);

export const processRefund = createAsyncThunk(
  'transactions/processRefund',
  async ({ transactionId, amount, reason }, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.post(`/transactions/${transactionId}/refund`, {
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process refund');
    }
  }
);

export const cancelTransaction = createAsyncThunk(
  'transactions/cancelTransaction',
  async ({ transactionId, reason }, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.patch(`/transactions/${transactionId}/cancel`, {
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel transaction');
    }
  }
);

export const getTransactionStats = createAsyncThunk(
  'transactions/getTransactionStats',
  async ({ period = '30d' } = {}, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.get(`/transactions/stats?period=${period}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transaction stats');
    }
  }
);

export const exportTransactions = createAsyncThunk(
  'transactions/exportTransactions',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const params = new URLSearchParams({ format });
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/transactions/export?${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Transactions exported successfully' };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export transactions');
    }
  }
);

// Export transaction report
export const exportTransactionReport = createAsyncThunk(
  'transactions/exportTransactionReport',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const authAxios = createAuthAxios();
      const response = await authAxios.get('/transactions/export/report', {
        params: filters,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transaction-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export transaction report');
    }
  }
);

// Add transaction note
export const addTransactionNote = createAsyncThunk(
  'transactions/addTransactionNote',
  async ({ transactionId, note }, { rejectWithValue }) => {
    try {
      const authAxios = createAuthAxios();
      const response = await authAxios.post(`/transactions/${transactionId}/notes`, { note });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add transaction note');
    }
  }
);

// Fetch transaction stats (alias for getTransactionStats)
export const fetchTransactionStats = getTransactionStats;

const initialState = {
  transactions: [],
  currentTransaction: null,
  stats: {
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
    totalAmount: 0,
    totalRefunded: 0
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  },
  filters: {
    status: '',
    type: '',
    startDate: '',
    endDate: ''
  },
  loading: false,
  error: null,
  actionLoading: {
    create: false,
    update: false,
    refund: false,
    cancel: false,
    export: false,
    addNote: false,
    exportReport: false
  }
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    setPageLimit: (state, action) => {
      state.pagination.limit = action.payload;
    }
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
        const responseData = action.payload.data || action.payload;
        state.transactions = responseData.transactions || responseData;
        state.pagination = {
          currentPage: responseData.currentPage || 1,
          totalPages: responseData.totalPages || 1,
          totalCount: responseData.totalCount || 0,
          limit: responseData.limit || 10
        };
        if (responseData.stats) {
          state.stats = responseData.stats;
        }
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch transaction by ID
      .addCase(fetchTransactionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTransaction = action.payload.transaction || action.payload;
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create transaction
      .addCase(createTransaction.pending, (state) => {
        state.actionLoading.create = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.actionLoading.create = false;
        const newTransaction = action.payload.transaction || action.payload;
        state.transactions.unshift(newTransaction);
        state.stats.total += 1;
        state.stats.pending += 1;
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.actionLoading.create = false;
        state.error = action.payload;
      })
      
      // Update transaction status
      .addCase(updateTransactionStatus.pending, (state) => {
        state.actionLoading.update = true;
        state.error = null;
      })
      .addCase(updateTransactionStatus.fulfilled, (state, action) => {
        state.actionLoading.update = false;
        const updatedTransaction = action.payload.transaction || action.payload;
        const index = state.transactions.findIndex(t => t._id === updatedTransaction._id);
        if (index !== -1) {
          const oldStatus = state.transactions[index].status;
          state.transactions[index] = updatedTransaction;
          
          // Update stats based on status change
          if (oldStatus !== updatedTransaction.status) {
            state.stats[oldStatus] = Math.max(0, state.stats[oldStatus] - 1);
            state.stats[updatedTransaction.status] += 1;
          }
        }
        if (state.currentTransaction && state.currentTransaction._id === updatedTransaction._id) {
          state.currentTransaction = updatedTransaction;
        }
      })
      .addCase(updateTransactionStatus.rejected, (state, action) => {
        state.actionLoading.update = false;
        state.error = action.payload;
      })
      
      // Process refund
      .addCase(processRefund.pending, (state) => {
        state.actionLoading.refund = true;
        state.error = null;
      })
      .addCase(processRefund.fulfilled, (state, action) => {
        state.actionLoading.refund = false;
        const refundedTransaction = action.payload.transaction || action.payload;
        const index = state.transactions.findIndex(t => t._id === refundedTransaction._id);
        if (index !== -1) {
          state.transactions[index] = refundedTransaction;
          state.stats.refunded += 1;
          state.stats.totalRefunded += refundedTransaction.refundAmount || 0;
        }
        if (state.currentTransaction && state.currentTransaction._id === refundedTransaction._id) {
          state.currentTransaction = refundedTransaction;
        }
      })
      .addCase(processRefund.rejected, (state, action) => {
        state.actionLoading.refund = false;
        state.error = action.payload;
      })
      
      // Cancel transaction
      .addCase(cancelTransaction.pending, (state) => {
        state.actionLoading.cancel = true;
        state.error = null;
      })
      .addCase(cancelTransaction.fulfilled, (state, action) => {
        state.actionLoading.cancel = false;
        const cancelledTransaction = action.payload.transaction || action.payload;
        const index = state.transactions.findIndex(t => t._id === cancelledTransaction._id);
        if (index !== -1) {
          const oldStatus = state.transactions[index].status;
          state.transactions[index] = cancelledTransaction;
          
          // Update stats
          if (oldStatus !== 'cancelled') {
            state.stats[oldStatus] = Math.max(0, state.stats[oldStatus] - 1);
            state.stats.cancelled = (state.stats.cancelled || 0) + 1;
          }
        }
        if (state.currentTransaction && state.currentTransaction._id === cancelledTransaction._id) {
          state.currentTransaction = cancelledTransaction;
        }
      })
      .addCase(cancelTransaction.rejected, (state, action) => {
        state.actionLoading.cancel = false;
        state.error = action.payload;
      })
      
      // Get transaction stats
      .addCase(getTransactionStats.fulfilled, (state, action) => {
        state.stats = { ...state.stats, ...action.payload };
      })
      .addCase(getTransactionStats.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Export transactions
      .addCase(exportTransactions.pending, (state) => {
        state.actionLoading.export = true;
        state.error = null;
      })
      .addCase(exportTransactions.fulfilled, (state) => {
        state.actionLoading.export = false;
      })
      .addCase(exportTransactions.rejected, (state, action) => {
        state.actionLoading.export = false;
        state.error = action.payload;
      })
      
      // Add transaction note
      .addCase(addTransactionNote.pending, (state) => {
        state.actionLoading.addNote = true;
        state.error = null;
      })
      .addCase(addTransactionNote.fulfilled, (state, action) => {
        state.actionLoading.addNote = false;
        const updatedTransaction = action.payload.transaction || action.payload;
        if (state.currentTransaction && state.currentTransaction._id === updatedTransaction._id) {
          state.currentTransaction = updatedTransaction;
        }
      })
      .addCase(addTransactionNote.rejected, (state, action) => {
        state.actionLoading.addNote = false;
        state.error = action.payload;
      })
      
      // Export transaction report
      .addCase(exportTransactionReport.pending, (state) => {
        state.actionLoading.exportReport = true;
        state.error = null;
      })
      .addCase(exportTransactionReport.fulfilled, (state) => {
        state.actionLoading.exportReport = false;
      })
      .addCase(exportTransactionReport.rejected, (state, action) => {
        state.actionLoading.exportReport = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  clearCurrentTransaction,
  setFilters,
  clearFilters,
  setCurrentPage,
  setPageLimit
} = transactionSlice.actions;

export default transactionSlice.reducer;