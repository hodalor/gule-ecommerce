import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for disputes management
export const fetchDisputes = createAsyncThunk(
  'disputes/fetchDisputes',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/disputes', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

export const fetchDisputeById = createAsyncThunk(
  'disputes/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/disputes/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dispute');
    }
  }
);

export const updateDisputeStatus = createAsyncThunk(
  'disputes/updateStatus',
  async ({ id, status, resolution }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/disputes/${id}/status`, {
        status,
        resolution
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update dispute status');
    }
  }
);

export const assignDispute = createAsyncThunk(
  'disputes/assign',
  async ({ id, assignedTo }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/disputes/${id}/assign`, {
        assignedTo
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign dispute');
    }
  }
);

export const addDisputeResponse = createAsyncThunk(
  'disputes/addResponse',
  async ({ id, message, attachments }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/disputes/${id}/responses`, {
        message,
        attachments
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add response');
    }
  }
);

export const resolveDispute = createAsyncThunk(
  'disputes/resolve',
  async ({ id, resolution, refundAmount }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/disputes/${id}/resolve`, {
        resolution,
        refundAmount
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resolve dispute');
    }
  }
);

export const escalateDispute = createAsyncThunk(
  'disputes/escalate',
  async ({ id, escalationReason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/disputes/${id}/escalate`, {
        escalationReason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to escalate dispute');
    }
  }
);

export const bulkUpdateDisputes = createAsyncThunk(
  'disputes/bulkUpdate',
  async ({ disputeIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch('/api/disputes/bulk', {
        disputeIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update disputes');
    }
  }
);

export const exportDisputes = createAsyncThunk(
  'disputes/export',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/disputes/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export disputes');
    }
  }
);

const initialState = {
  disputes: [],
  currentDispute: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  filters: {
    status: '',
    priority: '',
    type: '',
    dateRange: null,
    search: ''
  },
  bulkLoading: false,
  exportLoading: false
};

const disputesSlice = createSlice({
  name: 'disputes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    clearCurrentDispute: (state) => {
      state.currentDispute = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch disputes
      .addCase(fetchDisputes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload.disputes;
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(fetchDisputes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch dispute by ID
      .addCase(fetchDisputeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDisputeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispute = action.payload;
      })
      .addCase(fetchDisputeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update dispute status
      .addCase(updateDisputeStatus.fulfilled, (state, action) => {
        const index = state.disputes.findIndex(dispute => dispute._id === action.payload._id);
        if (index !== -1) {
          state.disputes[index] = action.payload;
        }
        if (state.currentDispute && state.currentDispute._id === action.payload._id) {
          state.currentDispute = action.payload;
        }
      })
      
      // Assign dispute
      .addCase(assignDispute.fulfilled, (state, action) => {
        const index = state.disputes.findIndex(dispute => dispute._id === action.payload._id);
        if (index !== -1) {
          state.disputes[index] = action.payload;
        }
        if (state.currentDispute && state.currentDispute._id === action.payload._id) {
          state.currentDispute = action.payload;
        }
      })
      
      // Add dispute response
      .addCase(addDisputeResponse.fulfilled, (state, action) => {
        if (state.currentDispute && state.currentDispute._id === action.payload.disputeId) {
          state.currentDispute.responses.push(action.payload);
        }
      })
      
      // Resolve dispute
      .addCase(resolveDispute.fulfilled, (state, action) => {
        const index = state.disputes.findIndex(dispute => dispute._id === action.payload._id);
        if (index !== -1) {
          state.disputes[index] = action.payload;
        }
        if (state.currentDispute && state.currentDispute._id === action.payload._id) {
          state.currentDispute = action.payload;
        }
      })
      
      // Escalate dispute
      .addCase(escalateDispute.fulfilled, (state, action) => {
        const index = state.disputes.findIndex(dispute => dispute._id === action.payload._id);
        if (index !== -1) {
          state.disputes[index] = action.payload;
        }
        if (state.currentDispute && state.currentDispute._id === action.payload._id) {
          state.currentDispute = action.payload;
        }
      })
      
      // Bulk update disputes
      .addCase(bulkUpdateDisputes.pending, (state) => {
        state.bulkLoading = true;
      })
      .addCase(bulkUpdateDisputes.fulfilled, (state, action) => {
        state.bulkLoading = false;
        // Update disputes in the list
        action.payload.forEach(updatedDispute => {
          const index = state.disputes.findIndex(dispute => dispute._id === updatedDispute._id);
          if (index !== -1) {
            state.disputes[index] = updatedDispute;
          }
        });
      })
      .addCase(bulkUpdateDisputes.rejected, (state, action) => {
        state.bulkLoading = false;
        state.error = action.payload;
      })
      
      // Export disputes
      .addCase(exportDisputes.pending, (state) => {
        state.exportLoading = true;
      })
      .addCase(exportDisputes.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportDisputes.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentPage,
  clearCurrentDispute
} = disputesSlice.actions;

export default disputesSlice.reducer;