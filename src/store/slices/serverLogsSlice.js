import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for server logs management
export const fetchServerLogs = createAsyncThunk(
  'serverLogs/fetchLogs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/logs', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch server logs');
    }
  }
);

export const fetchLogById = createAsyncThunk(
  'serverLogs/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/logs/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch log entry');
    }
  }
);

export const clearLogs = createAsyncThunk(
  'serverLogs/clearLogs',
  async ({ level, dateRange }, { rejectWithValue }) => {
    try {
      const response = await axios.delete('/api/logs', {
        data: { level, dateRange }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear logs');
    }
  }
);

export const exportLogs = createAsyncThunk(
  'serverLogs/export',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/logs/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export logs');
    }
  }
);

export const fetchLogStats = createAsyncThunk(
  'serverLogs/fetchStats',
  async (dateRange, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/logs/stats', {
        params: dateRange
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch log statistics');
    }
  }
);

export const fetchErrorLogs = createAsyncThunk(
  'serverLogs/fetchErrorLogs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/logs/errors', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch error logs');
    }
  }
);

export const archiveLogs = createAsyncThunk(
  'serverLogs/archive',
  async ({ dateRange, level }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/logs/archive', {
        dateRange,
        level
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to archive logs');
    }
  }
);

const initialState = {
  logs: [],
  errorLogs: [],
  currentLog: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  stats: {
    totalLogs: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    debugCount: 0
  },
  filters: {
    level: '',
    source: '',
    dateRange: null,
    search: ''
  },
  exportLoading: false,
  archiveLoading: false,
  clearLoading: false
};

const serverLogsSlice = createSlice({
  name: 'serverLogs',
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
    clearCurrentLog: (state) => {
      state.currentLog = null;
    },
    clearErrorLogs: (state) => {
      state.errorLogs = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch server logs
      .addCase(fetchServerLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServerLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(fetchServerLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch log by ID
      .addCase(fetchLogById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLog = action.payload;
      })
      .addCase(fetchLogById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Clear logs
      .addCase(clearLogs.pending, (state) => {
        state.clearLoading = true;
      })
      .addCase(clearLogs.fulfilled, (state, action) => {
        state.clearLoading = false;
        // Refresh logs after clearing
        state.logs = [];
        state.totalCount = 0;
        state.currentPage = 1;
        state.totalPages = 1;
      })
      .addCase(clearLogs.rejected, (state, action) => {
        state.clearLoading = false;
        state.error = action.payload;
      })
      
      // Export logs
      .addCase(exportLogs.pending, (state) => {
        state.exportLoading = true;
      })
      .addCase(exportLogs.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportLogs.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      
      // Fetch log stats
      .addCase(fetchLogStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      
      // Fetch error logs
      .addCase(fetchErrorLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchErrorLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.errorLogs = action.payload.logs;
      })
      .addCase(fetchErrorLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Archive logs
      .addCase(archiveLogs.pending, (state) => {
        state.archiveLoading = true;
      })
      .addCase(archiveLogs.fulfilled, (state, action) => {
        state.archiveLoading = false;
        // Refresh logs after archiving
        state.logs = state.logs.filter(log => !action.payload.archivedIds.includes(log._id));
        state.totalCount = Math.max(0, state.totalCount - action.payload.archivedCount);
      })
      .addCase(archiveLogs.rejected, (state, action) => {
        state.archiveLoading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentPage,
  clearCurrentLog,
  clearErrorLogs
} = serverLogsSlice.actions;

export default serverLogsSlice.reducer;