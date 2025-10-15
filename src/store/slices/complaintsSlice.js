import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for complaints management
export const fetchComplaints = createAsyncThunk(
  'complaints/fetchComplaints',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/complaints', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch complaints');
    }
  }
);

export const updateComplaintStatus = createAsyncThunk(
  'complaints/updateStatus',
  async ({ id, status, resolution }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/admin/complaints/${id}/status`, {
        status,
        resolution
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update complaint status');
    }
  }
);

export const assignComplaint = createAsyncThunk(
  'complaints/assign',
  async ({ id, assignedTo }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/admin/complaints/${id}/assign`, {
        assignedTo
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign complaint');
    }
  }
);

export const addComplaintNote = createAsyncThunk(
  'complaints/addNote',
  async ({ id, note }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/complaints/${id}/notes`, {
        note
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add note');
    }
  }
);

export const resolveComplaint = createAsyncThunk(
  'complaints/resolve',
  async ({ id, resolution, compensationAmount }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/complaints/${id}/resolve`, {
        resolution,
        compensationAmount
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resolve complaint');
    }
  }
);

export const escalateComplaint = createAsyncThunk(
  'complaints/escalate',
  async ({ id, escalationReason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/complaints/${id}/escalate`, {
        escalationReason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to escalate complaint');
    }
  }
);

export const bulkUpdateComplaints = createAsyncThunk(
  'complaints/bulkUpdate',
  async ({ complaintIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/complaints/bulk', {
        complaintIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update complaints');
    }
  }
);

export const exportComplaints = createAsyncThunk(
  'complaints/export',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/complaints/export', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export complaints');
    }
  }
);

const initialState = {
  complaints: [],
  selectedComplaint: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
    dateRange: null
  },
  selectedComplaints: [],
  statistics: {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    escalated: 0
  }
};

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedComplaint: (state, action) => {
      state.selectedComplaint = action.payload;
    },
    clearSelectedComplaint: (state) => {
      state.selectedComplaint = null;
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
    setSelectedComplaints: (state, action) => {
      state.selectedComplaints = action.payload;
    },
    toggleComplaintSelection: (state, action) => {
      const complaintId = action.payload;
      const index = state.selectedComplaints.indexOf(complaintId);
      if (index > -1) {
        state.selectedComplaints.splice(index, 1);
      } else {
        state.selectedComplaints.push(complaintId);
      }
    },
    clearSelectedComplaints: (state) => {
      state.selectedComplaints = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch complaints
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints = action.payload.complaints || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
        state.statistics = action.payload.statistics || state.statistics;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update complaint status
      .addCase(updateComplaintStatus.fulfilled, (state, action) => {
        const index = state.complaints.findIndex(complaint => complaint.id === action.payload.id);
        if (index !== -1) {
          state.complaints[index] = action.payload;
        }
        if (state.selectedComplaint?.id === action.payload.id) {
          state.selectedComplaint = action.payload;
        }
      })
      // Assign complaint
      .addCase(assignComplaint.fulfilled, (state, action) => {
        const index = state.complaints.findIndex(complaint => complaint.id === action.payload.id);
        if (index !== -1) {
          state.complaints[index] = action.payload;
        }
        if (state.selectedComplaint?.id === action.payload.id) {
          state.selectedComplaint = action.payload;
        }
      })
      // Add complaint note
      .addCase(addComplaintNote.fulfilled, (state, action) => {
        if (state.selectedComplaint?.id === action.payload.complaintId) {
          state.selectedComplaint.notes = action.payload.notes;
        }
      })
      // Resolve complaint
      .addCase(resolveComplaint.fulfilled, (state, action) => {
        const index = state.complaints.findIndex(complaint => complaint.id === action.payload.id);
        if (index !== -1) {
          state.complaints[index] = action.payload;
        }
        if (state.selectedComplaint?.id === action.payload.id) {
          state.selectedComplaint = action.payload;
        }
      })
      // Escalate complaint
      .addCase(escalateComplaint.fulfilled, (state, action) => {
        const index = state.complaints.findIndex(complaint => complaint.id === action.payload.id);
        if (index !== -1) {
          state.complaints[index] = action.payload;
        }
        if (state.selectedComplaint?.id === action.payload.id) {
          state.selectedComplaint = action.payload;
        }
      })
      // Bulk update complaints
      .addCase(bulkUpdateComplaints.fulfilled, (state) => {
        state.selectedComplaints = [];
      })
      // Export complaints
      .addCase(exportComplaints.pending, (state) => {
        state.loading = true;
      })
      .addCase(exportComplaints.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedComplaint,
  clearSelectedComplaint,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  setSelectedComplaints,
  toggleComplaintSelection,
  clearSelectedComplaints,
} = complaintsSlice.actions;

export default complaintsSlice.reducer;