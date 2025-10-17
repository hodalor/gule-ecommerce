import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunk for login
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        userType: 'admin'
      });

      const { user, accessToken } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('adminToken', accessToken);
      
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        permissions: user.permissions || []
      };
      
      // Store user data for auth persistence
      localStorage.setItem('adminUser', JSON.stringify(userData));
      
      return {
        token: accessToken,
        user: userData
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for logout
export const logoutAdmin = createAsyncThunk(
  'auth/logoutAdmin',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      return true;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

// Async thunk for checking auth status
export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      // Get stored user data
      const storedUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      if (!storedUser.id) {
        throw new Error('No user data found');
      }
      
      // Ensure permissions array exists
      if (!storedUser.permissions) {
        storedUser.permissions = [];
      }
      
      return storedUser;
    } catch (error) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      const message = error.response?.data?.message || 'Authentication failed';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem('adminToken'),
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Logout cases
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Check auth status cases
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;