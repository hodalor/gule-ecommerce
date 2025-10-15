import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for inventory management
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/inventory', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }
);

export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async ({ productId, quantity, reason, type }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${productId}/stock`, {
        quantity,
        reason,
        type
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update stock');
    }
  }
);

export const setLowStockAlert = createAsyncThunk(
  'inventory/setLowStockAlert',
  async ({ productId, threshold }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${productId}/alert`, {
        threshold
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set low stock alert');
    }
  }
);

export const bulkUpdateStock = createAsyncThunk(
  'inventory/bulkUpdateStock',
  async ({ updates, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/inventory/bulk-update', {
        updates,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update stock');
    }
  }
);

export const fetchStockHistory = createAsyncThunk(
  'inventory/fetchStockHistory',
  async ({ productId, dateRange }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/admin/inventory/${productId}/history`, {
        params: dateRange
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stock history');
    }
  }
);

export const generateStockReport = createAsyncThunk(
  'inventory/generateStockReport',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/inventory/report', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate stock report');
    }
  }
);

export const fetchLowStockItems = createAsyncThunk(
  'inventory/fetchLowStockItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/inventory/low-stock');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch low stock items');
    }
  }
);

export const fetchInventoryAnalytics = createAsyncThunk(
  'inventory/fetchAnalytics',
  async (dateRange, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/inventory/analytics', {
        params: dateRange
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory analytics');
    }
  }
);

export const adjustStock = createAsyncThunk(
  'inventory/adjustStock',
  async ({ productId, adjustment, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${productId}/adjust`, {
        adjustment,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to adjust stock');
    }
  }
);

export const reserveStock = createAsyncThunk(
  'inventory/reserveStock',
  async ({ productId, quantity, orderId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${productId}/reserve`, {
        quantity,
        orderId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reserve stock');
    }
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateInventoryItem',
  async ({ id, updates, updatedBy }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/admin/inventory/${id}`, {
        ...updates,
        updatedBy
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update inventory item');
    }
  }
);

export const flagLowStock = createAsyncThunk(
  'inventory/flagLowStock',
  async ({ itemId, flaggedBy }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${itemId}/flag-low-stock`, {
        flaggedBy
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to flag low stock');
    }
  }
);

export const requestRestock = createAsyncThunk(
  'inventory/requestRestock',
  async ({ itemId, quantity, requestedBy }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${itemId}/request-restock`, {
        quantity,
        requestedBy
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to request restock');
    }
  }
);

export const approveRestock = createAsyncThunk(
  'inventory/approveRestock',
  async ({ itemId, approvedBy }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/admin/inventory/${itemId}/approve-restock`, {
        approvedBy
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve restock');
    }
  }
);

export const exportInventory = createAsyncThunk(
  'inventory/exportInventory',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/inventory/export', filters, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Inventory exported successfully' };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export inventory');
    }
  }
);

const initialState = {
  items: [],
  selectedItem: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    search: '',
    category: '',
    status: '',
    stockLevel: '',
    store: '',
    sortBy: 'name',
    sortOrder: 'asc'
  },
  selectedItems: [],
  lowStockItems: [],
  stockHistory: [],
  statistics: {
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    averageStockLevel: 0,
    topSellingProducts: [],
    slowMovingProducts: []
  },
  analytics: {
    stockTrends: [],
    categoryBreakdown: [],
    turnoverRates: [],
    stockMovements: []
  }
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedItem: (state, action) => {
      state.selectedItem = action.payload;
    },
    clearSelectedItem: (state) => {
      state.selectedItem = null;
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
    setSelectedItems: (state, action) => {
      state.selectedItems = action.payload;
    },
    toggleItemSelection: (state, action) => {
      const itemId = action.payload;
      const index = state.selectedItems.indexOf(itemId);
      if (index > -1) {
        state.selectedItems.splice(index, 1);
      } else {
        state.selectedItems.push(itemId);
      }
    },
    clearSelectedItems: (state) => {
      state.selectedItems = [];
    },
    updateItemStock: (state, action) => {
      const { productId, newStock } = action.payload;
      const item = state.items.find(item => item.id === productId);
      if (item) {
        item.stock = newStock;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
        state.statistics = action.payload.statistics || state.statistics;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update stock
      .addCase(updateStock.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.productId);
        if (index !== -1) {
          state.items[index].stock = action.payload.newStock;
          state.items[index].lastUpdated = action.payload.timestamp;
        }
      })
      // Set low stock alert
      .addCase(setLowStockAlert.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.productId);
        if (index !== -1) {
          state.items[index].lowStockThreshold = action.payload.threshold;
        }
      })
      // Bulk update stock
      .addCase(bulkUpdateStock.fulfilled, (state, action) => {
        action.payload.updates.forEach(update => {
          const index = state.items.findIndex(item => item.id === update.productId);
          if (index !== -1) {
            state.items[index].stock = update.newStock;
            state.items[index].lastUpdated = update.timestamp;
          }
        });
        state.selectedItems = [];
      })
      // Fetch stock history
      .addCase(fetchStockHistory.fulfilled, (state, action) => {
        state.stockHistory = action.payload;
      })
      // Generate stock report
      .addCase(generateStockReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateStockReport.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generateStockReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch low stock items
      .addCase(fetchLowStockItems.fulfilled, (state, action) => {
        state.lowStockItems = action.payload;
      })
      // Fetch inventory analytics
      .addCase(fetchInventoryAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      })
      // Adjust stock
      .addCase(adjustStock.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.productId);
        if (index !== -1) {
          state.items[index].stock = action.payload.newStock;
          state.items[index].lastUpdated = action.payload.timestamp;
        }
      })
      // Reserve stock
      .addCase(reserveStock.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.productId);
        if (index !== -1) {
          state.items[index].reservedStock = action.payload.reservedQuantity;
          state.items[index].availableStock = action.payload.availableStock;
        }
      });
  },
});

export const {
  clearError,
  setSelectedItem,
  clearSelectedItem,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  setSelectedItems,
  toggleItemSelection,
  clearSelectedItems,
  updateItemStock,
} = inventorySlice.actions;

export default inventorySlice.reducer;