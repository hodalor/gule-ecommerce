import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchUserDisputes = createAsyncThunk(
  'disputes/fetchUserDisputes',
  async ({ page = 1, status, type }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      
      const response = await axios.get(`${API_URL}/disputes/user?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch disputes');
    }
  }
);

export const createDispute = createAsyncThunk(
  'disputes/createDispute',
  async (disputeData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/disputes`, disputeData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create dispute');
    }
  }
);

export const updateDispute = createAsyncThunk(
  'disputes/updateDispute',
  async ({ disputeId, updateData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/disputes/${disputeId}`, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update dispute');
    }
  }
);

export const addDisputeMessage = createAsyncThunk(
  'disputes/addMessage',
  async ({ disputeId, message, attachments }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('message', message);
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachments`, file);
        });
      }

      const response = await axios.post(`${API_URL}/disputes/${disputeId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const getDisputeDetails = createAsyncThunk(
  'disputes/getDetails',
  async (disputeId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dispute details');
    }
  }
);

const initialState = {
  disputes: [],
  currentDispute: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalDisputes: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const disputeSlice = createSlice({
  name: 'disputes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDispute: (state) => {
      state.currentDispute = null;
    },
    updateDisputeInList: (state, action) => {
      const index = state.disputes.findIndex(dispute => dispute._id === action.payload._id);
      if (index !== -1) {
        state.disputes[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user disputes
      .addCase(fetchUserDisputes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload.disputes;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUserDisputes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create dispute
      .addCase(createDispute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDispute.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes.unshift(action.payload.dispute);
        state.currentDispute = action.payload.dispute;
      })
      .addCase(createDispute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update dispute
      .addCase(updateDispute.fulfilled, (state, action) => {
        const index = state.disputes.findIndex(dispute => dispute._id === action.payload.dispute._id);
        if (index !== -1) {
          state.disputes[index] = action.payload.dispute;
        }
        if (state.currentDispute?._id === action.payload.dispute._id) {
          state.currentDispute = action.payload.dispute;
        }
      })
      // Add dispute message
      .addCase(addDisputeMessage.fulfilled, (state, action) => {
        if (state.currentDispute?._id === action.payload.disputeId) {
          state.currentDispute.messages = action.payload.messages;
        }
        // Update dispute in list
        const index = state.disputes.findIndex(dispute => dispute._id === action.payload.disputeId);
        if (index !== -1) {
          state.disputes[index].messages = action.payload.messages;
          state.disputes[index].updatedAt = new Date().toISOString();
        }
      })
      // Get dispute details
      .addCase(getDisputeDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDisputeDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispute = action.payload.dispute;
      })
      .addCase(getDisputeDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentDispute, updateDisputeInList } = disputeSlice.actions;
export default disputeSlice.reducer;