import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for login
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Mock authentication for demo purposes
      const mockCredentials = {
        email: 'admin@gule.com',
        password: 'admin123'
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (email === mockCredentials.email && password === mockCredentials.password) {
        const mockResponse = {
           token: 'mock-admin-token-' + Date.now(),
           user: {
             id: 1,
             email: 'admin@gule.com',
             name: 'Admin User',
             fullName: 'Super Admin',
             role: 'Super Admin'
           }
         };
        
        // Store token in localStorage
        localStorage.setItem('adminToken', mockResponse.token);
        
        return mockResponse;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// Async thunk for logout
export const logoutAdmin = createAsyncThunk(
  'auth/logoutAdmin',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('adminToken');
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
      
      // Mock user data for demo purposes
      const mockUser = {
        id: 1,
        email: 'admin@gule.com',
        name: 'Admin User',
        fullName: 'Super Admin',
        role: 'Super Admin'
      };
      
      return mockUser;
    } catch (error) {
      localStorage.removeItem('adminToken');
      return rejectWithValue('Authentication failed');
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