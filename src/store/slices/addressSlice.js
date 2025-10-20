import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Get auth token from cookies (consistent with authSlice)
const getAuthToken = () => {
  return Cookies.get('token');
};

// Create axios instance with auth
const createAuthAxios = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
};

// Async thunks
export const fetchAddresses = createAsyncThunk(
  'addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.get('/addresses');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch addresses');
    }
  }
);

export const createAddress = createAsyncThunk(
  'addresses/createAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.post('/addresses', addressData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create address');
    }
  }
);

export const updateAddress = createAsyncThunk(
  'addresses/updateAddress',
  async ({ addressId, addressData }, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.put(`/addresses/${addressId}`, addressData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update address');
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'addresses/deleteAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      await api.delete(`/addresses/${addressId}`);
      return addressId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete address');
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  'addresses/setDefaultAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.patch(`/addresses/${addressId}/default`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set default address');
    }
  }
);

export const validateAddress = createAsyncThunk(
  'addresses/validateAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.post(`/addresses/${addressId}/validate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to validate address');
    }
  }
);

export const getAddressStats = createAsyncThunk(
  'addresses/getAddressStats',
  async (_, { rejectWithValue }) => {
    try {
      const api = createAuthAxios();
      const response = await api.get('/addresses/stats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch address stats');
    }
  }
);

const initialState = {
  addresses: [],
  stats: {
    total: 0,
    verified: 0,
    defaultAddresses: 0
  },
  loading: false,
  error: null,
  actionLoading: {
    create: false,
    update: false,
    delete: false,
    setDefault: false,
    validate: false
  }
};

const addressSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAddresses: (state) => {
      state.addresses = [];
      state.stats = initialState.stats;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch addresses
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload.addresses || action.payload;
        if (action.payload.stats) {
          state.stats = action.payload.stats;
        }
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create address
      .addCase(createAddress.pending, (state) => {
        state.actionLoading.create = true;
        state.error = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.actionLoading.create = false;
        state.addresses.push(action.payload.address || action.payload);
        if (action.payload.stats) {
          state.stats = action.payload.stats;
        }
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.actionLoading.create = false;
        state.error = action.payload;
      })
      
      // Update address
      .addCase(updateAddress.pending, (state) => {
        state.actionLoading.update = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.actionLoading.update = false;
        const updatedAddress = action.payload.address || action.payload;
        const index = state.addresses.findIndex(addr => addr._id === updatedAddress._id);
        if (index !== -1) {
          state.addresses[index] = updatedAddress;
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.actionLoading.update = false;
        state.error = action.payload;
      })
      
      // Delete address
      .addCase(deleteAddress.pending, (state) => {
        state.actionLoading.delete = true;
        state.error = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.actionLoading.delete = false;
        state.addresses = state.addresses.filter(addr => addr._id !== action.payload);
        state.stats.total = Math.max(0, state.stats.total - 1);
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.actionLoading.delete = false;
        state.error = action.payload;
      })
      
      // Set default address
      .addCase(setDefaultAddress.pending, (state) => {
        state.actionLoading.setDefault = true;
        state.error = null;
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.actionLoading.setDefault = false;
        const updatedAddress = action.payload.address || action.payload;
        
        // Remove default from all addresses
        state.addresses.forEach(addr => {
          addr.isDefault = false;
        });
        
        // Set new default
        const index = state.addresses.findIndex(addr => addr._id === updatedAddress._id);
        if (index !== -1) {
          state.addresses[index] = { ...state.addresses[index], ...updatedAddress };
        }
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.actionLoading.setDefault = false;
        state.error = action.payload;
      })
      
      // Validate address
      .addCase(validateAddress.pending, (state) => {
        state.actionLoading.validate = true;
        state.error = null;
      })
      .addCase(validateAddress.fulfilled, (state, action) => {
        state.actionLoading.validate = false;
        const validatedAddress = action.payload.address || action.payload;
        const index = state.addresses.findIndex(addr => addr._id === validatedAddress._id);
        if (index !== -1) {
          state.addresses[index] = { ...state.addresses[index], ...validatedAddress };
        }
        if (validatedAddress.verification?.isVerified) {
          state.stats.verified += 1;
        }
      })
      .addCase(validateAddress.rejected, (state, action) => {
        state.actionLoading.validate = false;
        state.error = action.payload;
      })
      
      // Get address stats
      .addCase(getAddressStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  }
});

export const { clearError, clearAddresses } = addressSlice.actions;
export default addressSlice.reducer;