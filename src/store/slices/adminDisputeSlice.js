import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks for API calls
export const fetchDisputes = createAsyncThunk(
  'adminDisputes/fetchDisputes',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/disputes?${queryParams}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

export const fetchDisputeById = createAsyncThunk(
  'adminDisputes/fetchDisputeById',
  async (disputeId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dispute details');
    }
  }
);

export const updateDisputeStatus = createAsyncThunk(
  'adminDisputes/updateDisputeStatus',
  async ({ disputeId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/disputes/${disputeId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update dispute status');
    }
  }
);

export const assignDispute = createAsyncThunk(
  'adminDisputes/assignDispute',
  async ({ disputeId, adminId }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/disputes/${disputeId}/assign`, {
        adminId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign dispute');
    }
  }
);

export const resolveDispute = createAsyncThunk(
  'adminDisputes/resolveDispute',
  async ({ disputeId, resolution, refundToBuyer, releaseToSeller, adminNotes }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/disputes/${disputeId}/resolve`, {
        resolution,
        refundToBuyer,
        releaseToSeller,
        adminNotes
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resolve dispute');
    }
  }
);

export const addDisputeMessage = createAsyncThunk(
  'adminDisputes/addDisputeMessage',
  async ({ disputeId, message, attachments }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('message', message);
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachments`, file);
        });
      }
      
      const response = await api.post(`/admin/disputes/${disputeId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const fetchDisputeMessages = createAsyncThunk(
  'adminDisputes/fetchDisputeMessages',
  async (disputeId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/disputes/${disputeId}/messages`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

export const updateDisputePriority = createAsyncThunk(
  'adminDisputes/updateDisputePriority',
  async ({ disputeId, priority }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/disputes/${disputeId}/priority`, {
        priority
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update dispute priority');
    }
  }
);

export const escalateDispute = createAsyncThunk(
  'adminDisputes/escalateDispute',
  async ({ disputeId, reason, escalationLevel }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/disputes/${disputeId}/escalate`, {
        reason,
        escalationLevel
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to escalate dispute');
    }
  }
);

export const fetchDisputeStatistics = createAsyncThunk(
  'adminDisputes/fetchDisputeStatistics',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.dateRange) queryParams.append('dateRange', params.dateRange);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      
      const response = await api.get(`/admin/disputes/statistics?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dispute statistics');
    }
  }
);

export const exportDisputeReport = createAsyncThunk(
  'adminDisputes/exportDisputeReport',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.status) queryParams.append('status', params.status);
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.type) queryParams.append('type', params.type);
      if (params.dateRange) queryParams.append('dateRange', params.dateRange);
      if (params.format) queryParams.append('format', params.format);
      
      const response = await api.get(`/admin/disputes/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `disputes-report-${new Date().toISOString().split('T')[0]}.${params.format || 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export dispute report');
    }
  }
);

// Initial state
const initialState = {
  disputes: [],
  selectedDispute: null,
  disputeMessages: [],
  statistics: {
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    rejected: 0,
    escalated: 0,
    highPriority: 0,
    averageResolutionTime: 0,
    resolutionRate: 0
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  filters: {
    status: 'all',
    priority: 'all',
    type: 'all',
    search: '',
    dateFilter: 'all'
  },
  loading: {
    disputes: false,
    disputeDetails: false,
    messages: false,
    statistics: false,
    updating: false,
    resolving: false,
    exporting: false
  },
  error: null,
  success: null
};

// Create slice
const adminDisputeSlice = createSlice({
  name: 'adminDisputes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setSelectedDispute: (state, action) => {
      state.selectedDispute = action.payload;
    },
    clearSelectedDispute: (state) => {
      state.selectedDispute = null;
      state.disputeMessages = [];
    },
    updateDisputeInList: (state, action) => {
      const { disputeId, updates } = action.payload;
      const index = state.disputes.findIndex(dispute => dispute.id === disputeId);
      if (index !== -1) {
        state.disputes[index] = { ...state.disputes[index], ...updates };
      }
    },
    addMessageToDispute: (state, action) => {
      const { disputeId, message } = action.payload;
      
      // Add to messages array if viewing this dispute
      if (state.selectedDispute && state.selectedDispute.id === disputeId) {
        state.disputeMessages.push(message);
      }
      
      // Update last message in disputes list
      const disputeIndex = state.disputes.findIndex(dispute => dispute.id === disputeId);
      if (disputeIndex !== -1) {
        state.disputes[disputeIndex].lastMessage = message;
        state.disputes[disputeIndex].updatedAt = message.timestamp;
      }
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch disputes
      .addCase(fetchDisputes.pending, (state) => {
        state.loading.disputes = true;
        state.error = null;
      })
      .addCase(fetchDisputes.fulfilled, (state, action) => {
        state.loading.disputes = false;
        state.disputes = action.payload.disputes || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
        };
      })
      .addCase(fetchDisputes.rejected, (state, action) => {
        state.loading.disputes = false;
        state.error = action.payload;
      })
      
      // Fetch dispute by ID
      .addCase(fetchDisputeById.pending, (state) => {
        state.loading.disputeDetails = true;
        state.error = null;
      })
      .addCase(fetchDisputeById.fulfilled, (state, action) => {
        state.loading.disputeDetails = false;
        state.selectedDispute = action.payload;
      })
      .addCase(fetchDisputeById.rejected, (state, action) => {
        state.loading.disputeDetails = false;
        state.error = action.payload;
      })
      
      // Update dispute status
      .addCase(updateDisputeStatus.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(updateDisputeStatus.fulfilled, (state, action) => {
        state.loading.updating = false;
        state.success = 'Dispute status updated successfully';
        
        // Update in disputes list
        const index = state.disputes.findIndex(dispute => dispute.id === action.payload.id);
        if (index !== -1) {
          state.disputes[index] = { ...state.disputes[index], ...action.payload };
        }
        
        // Update selected dispute
        if (state.selectedDispute && state.selectedDispute.id === action.payload.id) {
          state.selectedDispute = { ...state.selectedDispute, ...action.payload };
        }
      })
      .addCase(updateDisputeStatus.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload;
      })
      
      // Assign dispute
      .addCase(assignDispute.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(assignDispute.fulfilled, (state, action) => {
        state.loading.updating = false;
        state.success = 'Dispute assigned successfully';
        
        // Update in disputes list
        const index = state.disputes.findIndex(dispute => dispute.id === action.payload.id);
        if (index !== -1) {
          state.disputes[index] = { ...state.disputes[index], ...action.payload };
        }
        
        // Update selected dispute
        if (state.selectedDispute && state.selectedDispute.id === action.payload.id) {
          state.selectedDispute = { ...state.selectedDispute, ...action.payload };
        }
      })
      .addCase(assignDispute.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload;
      })
      
      // Resolve dispute
      .addCase(resolveDispute.pending, (state) => {
        state.loading.resolving = true;
        state.error = null;
      })
      .addCase(resolveDispute.fulfilled, (state, action) => {
        state.loading.resolving = false;
        state.success = 'Dispute resolved successfully';
        
        // Update in disputes list
        const index = state.disputes.findIndex(dispute => dispute.id === action.payload.id);
        if (index !== -1) {
          state.disputes[index] = { ...state.disputes[index], ...action.payload };
        }
        
        // Update selected dispute
        if (state.selectedDispute && state.selectedDispute.id === action.payload.id) {
          state.selectedDispute = { ...state.selectedDispute, ...action.payload };
        }
      })
      .addCase(resolveDispute.rejected, (state, action) => {
        state.loading.resolving = false;
        state.error = action.payload;
      })
      
      // Add dispute message
      .addCase(addDisputeMessage.pending, (state) => {
        state.loading.messages = true;
        state.error = null;
      })
      .addCase(addDisputeMessage.fulfilled, (state, action) => {
        state.loading.messages = false;
        state.success = 'Message sent successfully';
        state.disputeMessages.push(action.payload);
        
        // Update last message in disputes list
        const disputeIndex = state.disputes.findIndex(dispute => dispute.id === action.payload.disputeId);
        if (disputeIndex !== -1) {
          state.disputes[disputeIndex].lastMessage = action.payload;
          state.disputes[disputeIndex].updatedAt = action.payload.timestamp;
        }
      })
      .addCase(addDisputeMessage.rejected, (state, action) => {
        state.loading.messages = false;
        state.error = action.payload;
      })
      
      // Fetch dispute messages
      .addCase(fetchDisputeMessages.pending, (state) => {
        state.loading.messages = true;
        state.error = null;
      })
      .addCase(fetchDisputeMessages.fulfilled, (state, action) => {
        state.loading.messages = false;
        state.disputeMessages = action.payload;
      })
      .addCase(fetchDisputeMessages.rejected, (state, action) => {
        state.loading.messages = false;
        state.error = action.payload;
      })
      
      // Update dispute priority
      .addCase(updateDisputePriority.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(updateDisputePriority.fulfilled, (state, action) => {
        state.loading.updating = false;
        state.success = 'Dispute priority updated successfully';
        
        // Update in disputes list
        const index = state.disputes.findIndex(dispute => dispute.id === action.payload.id);
        if (index !== -1) {
          state.disputes[index] = { ...state.disputes[index], ...action.payload };
        }
        
        // Update selected dispute
        if (state.selectedDispute && state.selectedDispute.id === action.payload.id) {
          state.selectedDispute = { ...state.selectedDispute, ...action.payload };
        }
      })
      .addCase(updateDisputePriority.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload;
      })
      
      // Escalate dispute
      .addCase(escalateDispute.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(escalateDispute.fulfilled, (state, action) => {
        state.loading.updating = false;
        state.success = 'Dispute escalated successfully';
        
        // Update in disputes list
        const index = state.disputes.findIndex(dispute => dispute.id === action.payload.id);
        if (index !== -1) {
          state.disputes[index] = { ...state.disputes[index], ...action.payload };
        }
        
        // Update selected dispute
        if (state.selectedDispute && state.selectedDispute.id === action.payload.id) {
          state.selectedDispute = { ...state.selectedDispute, ...action.payload };
        }
      })
      .addCase(escalateDispute.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload;
      })
      
      // Fetch dispute statistics
      .addCase(fetchDisputeStatistics.pending, (state) => {
        state.loading.statistics = true;
        state.error = null;
      })
      .addCase(fetchDisputeStatistics.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.statistics = action.payload;
      })
      .addCase(fetchDisputeStatistics.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error = action.payload;
      })
      
      // Export dispute report
      .addCase(exportDisputeReport.pending, (state) => {
        state.loading.exporting = true;
        state.error = null;
      })
      .addCase(exportDisputeReport.fulfilled, (state) => {
        state.loading.exporting = false;
        state.success = 'Report exported successfully';
      })
      .addCase(exportDisputeReport.rejected, (state, action) => {
        state.loading.exporting = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  clearError,
  clearSuccess,
  setFilters,
  clearFilters,
  setSelectedDispute,
  clearSelectedDispute,
  updateDisputeInList,
  addMessageToDispute,
  setPagination
} = adminDisputeSlice.actions;

// Selectors
export const selectDisputes = (state) => state.adminDisputes.disputes;
export const selectSelectedDispute = (state) => state.adminDisputes.selectedDispute;
export const selectDisputeMessages = (state) => state.adminDisputes.disputeMessages;
export const selectDisputeStatistics = (state) => state.adminDisputes.statistics;
export const selectDisputePagination = (state) => state.adminDisputes.pagination;
export const selectDisputeFilters = (state) => state.adminDisputes.filters;
export const selectDisputeLoading = (state) => state.adminDisputes.loading;
export const selectDisputeError = (state) => state.adminDisputes.error;
export const selectDisputeSuccess = (state) => state.adminDisputes.success;

// Export reducer
export default adminDisputeSlice.reducer;