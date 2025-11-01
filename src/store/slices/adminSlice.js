import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Updated API base to match backend mount
const ADMIN_API = '/admin';

// Map UI role labels to backend GET filter values
const toApiRole = (uiRole) => {
  const map = {
    'Super Admin': 'super_admin',
    'Admin': 'admin',
    'Accountant': 'finance',
    'Review Officer': 'moderator',
    'Customer Support': 'support',
    'Marketing Manager': 'marketing'
  };
  return map[uiRole] || '';
};

// Build payload for creating an admin from modal form data
const buildCreatePayload = (data) => {
  const [firstNameRaw, ...rest] = (data.fullName || '').trim().split(' ');
  const firstName = firstNameRaw || 'Admin';
  const lastName = rest.join(' ') || 'User';
  // Creation should use model enums
  const roleMapCreate = {
    'Super Admin': 'super_admin',
    'Admin': 'admin',
    'Accountant': 'accountant',
    'Review Officer': 'review_officer',
    'Customer Support': 'customer_support',
    'Marketing Manager': 'marketing_manager'
  };
  const roleEnum = roleMapCreate[data.role] || 'admin';
  const department = roleEnum === 'accountant'
    ? 'finance'
    : roleEnum === 'review_officer'
      ? 'operations'
      : roleEnum === 'customer_support'
        ? 'customer_service'
        : roleEnum === 'marketing_manager'
          ? 'marketing'
          : 'administration';
  const jobTitle = data.role || 'Admin';

  return {
    firstName,
    lastName,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: roleEnum,
    department,
    jobTitle,
    // provide nested fields expected by backend schema
    address: {
      street: 'Unknown Street',
      city: 'Lusaka',
      state: 'Lusaka Province',
      zipCode: '00000',
      country: 'Zambia'
    },
    employment: {
      hireDate: new Date().toISOString()
    }
  };
};

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
      if (role) {
        const apiRole = toApiRole(role);
        if (apiRole) params.append('role', apiRole);
      }
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
      const payload = buildCreatePayload(adminData);
      const response = await api.post(ADMIN_API, payload);
      return response.data.admin; // return created admin object
    } catch (error) {
      const data = error.response?.data;
      return rejectWithValue(data || { message: 'Failed to create admin' });
    }
  }
);

export const updateAdmin = createAsyncThunk(
  'admin/updateAdmin',
  async ({ id, adminData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`${ADMIN_API}/${id}`, adminData);
      return response.data.admin || response.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update admin');
    }
  }
);

export const deleteAdmin = createAsyncThunk(
  'admin/deleteAdmin',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      await api.delete(`${ADMIN_API}/${id}`, { data: { reason } });
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
      const response = await api.get(`${ADMIN_API}/${adminId}/work-id-pdf`, { responseType: 'blob' });
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
  pagination: null,
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
      .addCase(fetchAdmins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = action.payload.admins || action.payload;
        state.totalCount = action.payload.pagination?.totalItems || action.payload.totalCount || (action.payload.admins ? action.payload.admins.length : action.payload.length);
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) state.admins.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdmin.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        const index = state.admins.findIndex(admin => (admin.id || admin._id) === (updated.id || updated._id));
        if (index !== -1) {
          state.admins[index] = updated;
        }
        if ((state.selectedAdmin?.id || state.selectedAdmin?._id) === (updated.id || updated._id)) {
          state.selectedAdmin = updated;
        }
      })
      .addCase(updateAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = state.admins.filter(admin => (admin.id || admin._id) !== action.payload);
        state.totalCount = Math.max(0, state.totalCount - 1);
        if ((state.selectedAdmin?.id || state.selectedAdmin?._id) === action.payload) {
          state.selectedAdmin = null;
        }
      })
      .addCase(deleteAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateWorkId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateWorkId.fulfilled, (state) => {
        state.loading = false;
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