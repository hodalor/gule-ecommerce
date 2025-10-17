import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const ADMIN_API = '/admin/admins';

// Async thunks for admin management
export const fetchAdmins = createAsyncThunk(
  'adminManagement/fetchAdmins',
  async ({ page = 1, limit = 10, search = '', role = '', status = '', department = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      if (department) params.append('department', department);

      const response = await api.get(`${ADMIN_API}?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch admins');
    }
  }
);

export const createAdmin = createAsyncThunk(
  'admin/createAdmin',
  async (adminData, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/admins', adminData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create admin');
    }
  }
);

export const updateAdmin = createAsyncThunk(
  'admin/updateAdmin',
  async ({ id, adminData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/admins/${id}`, adminData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update admin');
    }
  }
);

export const deleteAdmin = createAsyncThunk(
  'admin/deleteAdmin',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/admins/${id}`, { data: { reason } });
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete admin');
    }
  }
);

export const generateWorkId = createAsyncThunk(
  'admin/generateWorkId',
  async (adminId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/admins/${adminId}/work-id`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate work ID');
    }
  }
);

const initialState = {
  admins: [],
  selectedAdmin: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedAdmin: (state, action) => {
      state.selectedAdmin = action.payload;
    },
    clearSelectedAdmin: (state) => {
      state.selectedAdmin = null;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch admins
      .addCase(fetchAdmins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = action.payload.admins || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create admin
      .addCase(createAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admins.push(action.payload);
        state.totalCount += 1;
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update admin
      .addCase(updateAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdmin.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.admins.findIndex(admin => admin.id === action.payload.id);
        if (index !== -1) {
          state.admins[index] = action.payload;
        }
        if (state.selectedAdmin?.id === action.payload.id) {
          state.selectedAdmin = action.payload;
        }
      })
      .addCase(updateAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete admin
      .addCase(deleteAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = state.admins.filter(admin => admin.id !== action.payload);
        state.totalCount -= 1;
        if (state.selectedAdmin?.id === action.payload) {
          state.selectedAdmin = null;
        }
      })
      .addCase(deleteAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Generate work ID
      .addCase(generateWorkId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateWorkId.fulfilled, (state, action) => {
        state.loading = false;
        // Handle work ID generation success
      })
      .addCase(generateWorkId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedAdmin,
  clearSelectedAdmin,
  setCurrentPage,
  setPageSize,
} = adminSlice.actions;

export default adminSlice.reducer;