import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Async thunks
export const fetchPrivacySettings = createAsyncThunk(
  'settings/fetchPrivacySettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/settings/privacy`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch privacy settings');
    }
  }
);

export const fetchAppSettings = createAsyncThunk(
  'settings/fetchAppSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/settings/app`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch app settings');
    }
  }
);

const initialState = {
  privacy: {
    share_buyer_info: true,
    show_seller_contact: true,
    allow_reviews: true,
  },
  app: {
    site_name: 'Gule Marketplace',
    currency: 'USD',
    tax_rate: 0.1,
    shipping_fee: 5.99,
    free_shipping_threshold: 50,
  },
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updatePrivacySetting: (state, action) => {
      const { key, value } = action.payload;
      state.privacy[key] = value;
    },
    updateAppSetting: (state, action) => {
      const { key, value } = action.payload;
      state.app[key] = value;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch privacy settings
      .addCase(fetchPrivacySettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrivacySettings.fulfilled, (state, action) => {
        state.loading = false;
        state.privacy = { ...state.privacy, ...action.payload.settings };
      })
      .addCase(fetchPrivacySettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch app settings
      .addCase(fetchAppSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.app = { ...state.app, ...action.payload.settings };
      })
      .addCase(fetchAppSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, updatePrivacySetting, updateAppSetting } = settingsSlice.actions;
export default settingsSlice.reducer;