import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for sessions management
export const fetchSessions = createAsyncThunk(
  'sessions/fetchSessions',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/sessions', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sessions');
    }
  }
);

export const fetchSessionById = createAsyncThunk(
  'sessions/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/sessions/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch session');
    }
  }
);

export const terminateSession = createAsyncThunk(
  'sessions/terminate',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`/api/sessions/${id}`);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to terminate session');
    }
  }
);

export const bulkTerminateSessions = createAsyncThunk(
  'sessions/bulkTerminate',
  async (sessionIds, { rejectWithValue }) => {
    try {
      const response = await axios.delete('/api/sessions/bulk', {
        data: { sessionIds }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk terminate sessions');
    }
  }
);

export const fetchActiveSessionsCount = createAsyncThunk(
  'sessions/fetchActiveCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/sessions/active/count');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch active sessions count');
    }
  }
);

export const fetchSessionsByUser = createAsyncThunk(
  'sessions/fetchByUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/sessions/user/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user sessions');
    }
  }
);

export const exportSessions = createAsyncThunk(
  'sessions/export',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/sessions/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export sessions');
    }
  }
);

const initialState = {
  sessions: [],
  currentSession: null,
  userSessions: [],
  loading: false,
  error: null,
  totalCount: 0,
  activeCount: 0,
  currentPage: 1,
  totalPages: 1,
  filters: {
    status: '',
    userType: '',
    dateRange: null,
    search: ''
  },
  bulkLoading: false,
  exportLoading: false
};

const sessionsSlice = createSlice({
  name: 'sessions',
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
    clearCurrentSession: (state) => {
      state.currentSession = null;
    },
    clearUserSessions: (state) => {
      state.userSessions = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch sessions
      .addCase(fetchSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload.sessions;
        state.totalCount = action.payload.totalCount;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch session by ID
      .addCase(fetchSessionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
      })
      .addCase(fetchSessionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Terminate session
      .addCase(terminateSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter(session => session._id !== action.payload.id);
        state.userSessions = state.userSessions.filter(session => session._id !== action.payload.id);
        state.totalCount = Math.max(0, state.totalCount - 1);
      })
      
      // Bulk terminate sessions
      .addCase(bulkTerminateSessions.pending, (state) => {
        state.bulkLoading = true;
      })
      .addCase(bulkTerminateSessions.fulfilled, (state, action) => {
        state.bulkLoading = false;
        const terminatedIds = action.payload.terminatedIds;
        state.sessions = state.sessions.filter(session => !terminatedIds.includes(session._id));
        state.userSessions = state.userSessions.filter(session => !terminatedIds.includes(session._id));
        state.totalCount = Math.max(0, state.totalCount - terminatedIds.length);
      })
      .addCase(bulkTerminateSessions.rejected, (state, action) => {
        state.bulkLoading = false;
        state.error = action.payload;
      })
      
      // Fetch active sessions count
      .addCase(fetchActiveSessionsCount.fulfilled, (state, action) => {
        state.activeCount = action.payload.count;
      })
      
      // Fetch sessions by user
      .addCase(fetchSessionsByUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessionsByUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userSessions = action.payload.sessions;
      })
      .addCase(fetchSessionsByUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export sessions
      .addCase(exportSessions.pending, (state) => {
        state.exportLoading = true;
      })
      .addCase(exportSessions.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportSessions.rejected, (state, action) => {
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
  clearCurrentSession,
  clearUserSessions
} = sessionsSlice.actions;

export default sessionsSlice.reducer;