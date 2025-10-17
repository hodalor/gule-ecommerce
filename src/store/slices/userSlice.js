import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const ADMIN_USERS_API = '/admin/users';

// Async thunks for user management
export const fetchUsers = createAsyncThunk(
  'adminUsers/fetchUsers',
  async ({ page = 1, limit = 10, search = '', role = '', status = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);

      const response = await api.get(`${ADMIN_USERS_API}?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const createUser = createAsyncThunk(
  'adminUsers/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post(ADMIN_USERS_API, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'adminUsers/updateUser',
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`${ADMIN_USERS_API}/${userId}`, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update user');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'adminUsers/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`${ADMIN_USERS_API}/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete user');
    }
  }
);

export const suspendUser = createAsyncThunk(
  'adminUsers/suspendUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`${ADMIN_USERS_API}/${userId}/suspend`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to suspend user');
    }
  }
);

export const activateUser = createAsyncThunk(
  'adminUsers/activateUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`${ADMIN_USERS_API}/${userId}/activate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to activate user');
    }
  }
);

export const bulkUpdateUsers = createAsyncThunk(
  'adminUsers/bulkUpdateUsers',
  async ({ userIds, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`${ADMIN_USERS_API}/bulk-update`, {
        userIds,
        updateData
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update users');
    }
  }
);

export const exportUsers = createAsyncThunk(
  'adminUsers/exportUsers',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get(`${ADMIN_USERS_API}/export`, {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export users');
    }
  }
);

const initialState = {
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    role: '',
    status: '',
    dateRange: null
  },
  selectedUsers: [],
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
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
    setSelectedUsers: (state, action) => {
      state.selectedUsers = action.payload;
    },
    toggleUserSelection: (state, action) => {
      const userId = action.payload;
      const index = state.selectedUsers.indexOf(userId);
      if (index > -1) {
        state.selectedUsers.splice(index, 1);
      } else {
        state.selectedUsers.push(userId);
      }
    },
    clearSelectedUsers: (state) => {
      state.selectedUsers = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create user
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users.push(action.payload);
        state.totalCount += 1;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(user => user.id !== action.payload);
        state.totalCount -= 1;
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Suspend user
      .addCase(suspendUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      // Activate user
      .addCase(activateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      // Bulk update users
      .addCase(bulkUpdateUsers.fulfilled, (state, action) => {
        // Refresh users after bulk update
        state.selectedUsers = [];
      })
      // Export users
      .addCase(exportUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(exportUsers.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedUser,
  clearSelectedUser,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  setSelectedUsers,
  toggleUserSelection,
  clearSelectedUsers,
} = userSlice.actions;

export default userSlice.reducer;