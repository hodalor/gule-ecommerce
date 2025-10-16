import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Async thunks for escrow management
export const fetchEscrowTransactions = createAsyncThunk(
  'adminEscrow/fetchEscrowTransactions',
  async ({ page = 1, limit = 10, search = '', status = '', dateRange = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (dateRange) params.append('dateRange', dateRange);

      const response = await axios.get(`${API_URL}/admin/escrow?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch escrow transactions');
    }
  }
);

export const fetchEscrowById = createAsyncThunk(
  'adminEscrow/fetchEscrowById',
  async (escrowId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/escrow/${escrowId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch escrow transaction');
    }
  }
);

export const updateEscrowStatus = createAsyncThunk(
  'adminEscrow/updateEscrowStatus',
  async ({ escrowId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/escrow/${escrowId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update escrow status');
    }
  }
);

export const releaseEscrowFunds = createAsyncThunk(
  'adminEscrow/releaseEscrowFunds',
  async ({ escrowId, releaseType, amount, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/admin/escrow/${escrowId}/release`, {
        releaseType,
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to release escrow funds');
    }
  }
);

export const refundEscrowFunds = createAsyncThunk(
  'adminEscrow/refundEscrowFunds',
  async ({ escrowId, refundType, amount, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/admin/escrow/${escrowId}/refund`, {
        refundType,
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to refund escrow funds');
    }
  }
);

export const fetchEscrowDisputes = createAsyncThunk(
  'adminEscrow/fetchEscrowDisputes',
  async ({ page = 1, limit = 10, status = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status) params.append('status', status);

      const response = await axios.get(`${API_URL}/admin/escrow/disputes?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch escrow disputes');
    }
  }
);

export const resolveEscrowDispute = createAsyncThunk(
  'adminEscrow/resolveEscrowDispute',
  async ({ disputeId, resolution, amount, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/escrow/disputes/${disputeId}/resolve`, {
        resolution,
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resolve escrow dispute');
    }
  }
);

export const fetchEscrowStatistics = createAsyncThunk(
  'adminEscrow/fetchEscrowStatistics',
  async ({ period = 'month' }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/admin/escrow/statistics?period=${period}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch escrow statistics');
    }
  }
);

export const exportEscrowTransactions = createAsyncThunk(
  'adminEscrow/exportEscrowTransactions',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ format });
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API_URL}/admin/escrow/export?${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `escrow_transactions_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export escrow transactions');
    }
  }
);

export const bulkUpdateEscrow = createAsyncThunk(
  'adminEscrow/bulkUpdateEscrow',
  async ({ escrowIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/escrow/bulk`, {
        escrowIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update escrow transactions');
    }
  }
);

export const fetchEscrowSettings = createAsyncThunk(
  'adminEscrow/fetchEscrowSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/admin/settings/escrow`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch escrow settings');
    }
  }
);

export const updateEscrowSettings = createAsyncThunk(
  'adminEscrow/updateEscrowSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/admin/settings/escrow`, settingsData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update escrow settings');
    }
  }
);

const initialState = {
  transactions: [],
  disputes: [],
  selectedTransaction: null,
  selectedDispute: null,
  statistics: null,
  settings: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  disputesPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  filters: {
    search: '',
    status: '',
    dateRange: ''
  }
};

const escrowSlice = createSlice({
  name: 'adminEscrow',
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
        dateRange: ''
      };
    },
    setSelectedTransaction: (state, action) => {
      state.selectedTransaction = action.payload;
    },
    clearSelectedTransaction: (state) => {
      state.selectedTransaction = null;
    },
    setSelectedDispute: (state, action) => {
      state.selectedDispute = action.payload;
    },
    clearSelectedDispute: (state) => {
      state.selectedDispute = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch escrow transactions
      .addCase(fetchEscrowTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEscrowTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
        };
      })
      .addCase(fetchEscrowTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch escrow by ID
      .addCase(fetchEscrowById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEscrowById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTransaction = action.payload;
      })
      .addCase(fetchEscrowById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update escrow status
      .addCase(updateEscrowStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEscrowStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTransaction = action.payload;
        const index = state.transactions.findIndex(t => t._id === updatedTransaction._id);
        if (index !== -1) {
          state.transactions[index] = updatedTransaction;
        }
        if (state.selectedTransaction && state.selectedTransaction._id === updatedTransaction._id) {
          state.selectedTransaction = updatedTransaction;
        }
      })
      .addCase(updateEscrowStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Release escrow funds
      .addCase(releaseEscrowFunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(releaseEscrowFunds.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTransaction = action.payload;
        const index = state.transactions.findIndex(t => t._id === updatedTransaction._id);
        if (index !== -1) {
          state.transactions[index] = updatedTransaction;
        }
        if (state.selectedTransaction && state.selectedTransaction._id === updatedTransaction._id) {
          state.selectedTransaction = updatedTransaction;
        }
      })
      .addCase(releaseEscrowFunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Refund escrow funds
      .addCase(refundEscrowFunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refundEscrowFunds.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTransaction = action.payload;
        const index = state.transactions.findIndex(t => t._id === updatedTransaction._id);
        if (index !== -1) {
          state.transactions[index] = updatedTransaction;
        }
        if (state.selectedTransaction && state.selectedTransaction._id === updatedTransaction._id) {
          state.selectedTransaction = updatedTransaction;
        }
      })
      .addCase(refundEscrowFunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch escrow disputes
      .addCase(fetchEscrowDisputes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEscrowDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload.disputes || [];
        state.disputesPagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
        };
      })
      .addCase(fetchEscrowDisputes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Resolve escrow dispute
      .addCase(resolveEscrowDispute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resolveEscrowDispute.fulfilled, (state, action) => {
        state.loading = false;
        const resolvedDispute = action.payload;
        const index = state.disputes.findIndex(d => d._id === resolvedDispute._id);
        if (index !== -1) {
          state.disputes[index] = resolvedDispute;
        }
        if (state.selectedDispute && state.selectedDispute._id === resolvedDispute._id) {
          state.selectedDispute = resolvedDispute;
        }
      })
      .addCase(resolveEscrowDispute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch escrow statistics
      .addCase(fetchEscrowStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEscrowStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchEscrowStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export escrow transactions
      .addCase(exportEscrowTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportEscrowTransactions.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportEscrowTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk update escrow
      .addCase(bulkUpdateEscrow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateEscrow.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh transactions list after bulk update
      })
      .addCase(bulkUpdateEscrow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch escrow settings
      .addCase(fetchEscrowSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEscrowSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchEscrowSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update escrow settings
      .addCase(updateEscrowSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEscrowSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(updateEscrowSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setSelectedTransaction,
  clearSelectedTransaction,
  setSelectedDispute,
  clearSelectedDispute
} = escrowSlice.actions;

export default escrowSlice.reducer;