import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks for audit management
export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchAuditLogs',
  async ({ page = 1, limit = 10, user, action, dateRange, search }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(user && { user }),
        ...(action && { action }),
        ...(search && { search }),
        ...(dateRange && { 
          startDate: dateRange.startDate,
          endDate: dateRange.endDate 
        }),
      });
      
      const response = await api.get(`/admin/audit-logs?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch audit logs');
    }
  }
);

export const fetchAuditLogDetails = createAsyncThunk(
  'audit/fetchAuditLogDetails',
  async (logId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/audit-logs/${logId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch audit log details');
    }
  }
);

export const exportAuditLogs = createAsyncThunk(
  'audit/exportAuditLogs',
  async ({ format, filters }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/audit-logs/export', {
        format,
        filters,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export audit logs');
    }
  }
);

export const fetchAuditStats = createAsyncThunk(
  'audit/fetchAuditStats',
  async ({ period = 'week' }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/audit-logs/statistics?period=${period}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch audit statistics');
    }
  }
);

const initialState = {
  logs: [],
  selectedLog: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    user: '',
    action: '',
    search: '',
    dateRange: null,
  },
  stats: {
    totalActions: 0,
    uniqueUsers: 0,
    topActions: [],
    activityTrend: [],
  },
  exportLoading: false,
  exportData: null,
};

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedLog: (state, action) => {
      state.selectedLog = action.payload;
    },
    clearSelectedLog: (state) => {
      state.selectedLog = null;
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
        user: '',
        action: '',
        search: '',
        dateRange: null,
      };
    },
    clearExportData: (state) => {
      state.exportData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch audit logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.data?.logs || action.payload.logs || action.payload;
        state.totalCount = action.payload.data?.pagination?.totalCount || action.payload.totalCount || action.payload.length;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch audit log details
      .addCase(fetchAuditLogDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedLog = action.payload.data || action.payload;
      })
      .addCase(fetchAuditLogDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Export audit logs
      .addCase(exportAuditLogs.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportAuditLogs.fulfilled, (state, action) => {
        state.exportLoading = false;
        state.exportData = action.payload.data || action.payload;
      })
      .addCase(exportAuditLogs.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      // Fetch audit stats
      .addCase(fetchAuditStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.data || action.payload;
      })
      .addCase(fetchAuditStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedLog,
  clearSelectedLog,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  clearExportData,
} = auditSlice.actions;

export default auditSlice.reducer;