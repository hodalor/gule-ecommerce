import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for settings management
export const fetchPrivacySettings = createAsyncThunk(
  'settings/fetchPrivacySettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/settings/privacy');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch privacy settings');
    }
  }
);

export const updatePrivacySetting = createAsyncThunk(
  'settings/updatePrivacySetting',
  async ({ setting, value }, { rejectWithValue }) => {
    try {
      const response = await axios.patch('/api/settings/privacy', {
        [setting]: value,
      });
      return { setting, value };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update privacy setting');
    }
  }
);

export const resetSettings = createAsyncThunk(
  'settings/resetSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/settings/reset');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reset settings');
    }
  }
);

export const updateSystemSetting = createAsyncThunk(
  'settings/updateSystemSetting',
  async ({ setting, value }, { rejectWithValue }) => {
    try {
      const response = await axios.patch('/api/settings/system', {
        [setting]: value,
      });
      return { setting, value };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update system setting');
    }
  }
);

export const resetSettings = createAsyncThunk(
  'settings/resetSettings',
  async (settingsType, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/settings/${settingsType}/reset`);
      return { settingsType, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reset settings');
    }
  }
);

export const backupSystem = createAsyncThunk(
  'settings/backupSystem',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/settings/backup');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to backup system');
    }
  }
);

export const restoreSystem = createAsyncThunk(
  'settings/restoreSystem',
  async (backupFile, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('backup', backupFile);
      
      const response = await axios.post('/api/settings/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to restore system');
    }
  }
);

const initialState = {
  privacySettings: {
    shareBuyerName: false,
    shareBuyerContact: false,
    shareBuyerAddress: false,
  },
  systemSettings: {
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxOrdersPerDay: 100,
    commissionRate: 5,
  },
  loading: false,
  error: null,
  previewMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    togglePreviewMode: (state) => {
      state.previewMode = !state.previewMode;
    },
    setPreviewMode: (state, action) => {
      state.previewMode = action.payload;
    },
    // Local state updates for immediate UI feedback
    updatePrivacySettingLocal: (state, action) => {
      const { setting, value } = action.payload;
      state.privacySettings[setting] = value;
    },
    updateSystemSettingLocal: (state, action) => {
      const { setting, value } = action.payload;
      state.systemSettings[setting] = value;
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
        state.privacySettings = { ...state.privacySettings, ...action.payload };
      })
      .addCase(fetchPrivacySettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update privacy setting
      .addCase(updatePrivacySetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePrivacySetting.fulfilled, (state, action) => {
        state.loading = false;
        const { setting, value } = action.payload;
        state.privacySettings[setting] = value;
      })
      .addCase(updatePrivacySetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch system settings
      .addCase(fetchSystemSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.systemSettings = { ...state.systemSettings, ...action.payload };
      })
      .addCase(fetchSystemSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update system setting
      .addCase(updateSystemSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSystemSetting.fulfilled, (state, action) => {
        state.loading = false;
        const { setting, value } = action.payload;
        state.systemSettings[setting] = value;
      })
      .addCase(updateSystemSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Reset settings
      .addCase(resetSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetSettings.fulfilled, (state, action) => {
        state.loading = false;
        const { settingsType, data } = action.payload;
        if (settingsType === 'privacy') {
          state.privacySettings = { ...state.privacySettings, ...data };
        } else if (settingsType === 'system') {
          state.systemSettings = { ...state.systemSettings, ...data };
        }
      })
      .addCase(resetSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Backup system
      .addCase(backupSystem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(backupSystem.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(backupSystem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Restore system
      .addCase(restoreSystem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreSystem.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(restoreSystem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  togglePreviewMode,
  setPreviewMode,
  updatePrivacySettingLocal,
  updateSystemSettingLocal,
} = settingsSlice.actions;

export default settingsSlice.reducer;