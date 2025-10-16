import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Async thunks for product management
export const fetchProducts = createAsyncThunk(
  'adminProducts/fetchProducts',
  async ({ page = 1, limit = 10, search = '', category = '', status = '', seller = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (seller) params.append('seller', seller);

      const response = await axios.get(`${API_URL}/products?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'adminProducts/fetchProductById',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/products/${productId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const updateProductStatus = createAsyncThunk(
  'adminProducts/updateProductStatus',
  async ({ productId, status, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/products/${productId}/status`, {
        status,
        reason
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product status');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'adminProducts/deleteProduct',
  async ({ productId, reason }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/products/${productId}`, {
        data: { reason }
      });
      return productId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'adminProducts/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/products/categories/list`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const bulkUpdateProducts = createAsyncThunk(
  'adminProducts/bulkUpdateProducts',
  async ({ productIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/products/bulk`, {
        productIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update products');
    }
  }
);

export const exportProducts = createAsyncThunk(
  'adminProducts/exportProducts',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ format });
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API_URL}/admin/products/export?${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export products');
    }
  }
);

const initialState = {
  products: [],
  selectedProduct: null,
  categories: [],
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  filters: {
    search: '',
    category: '',
    status: '',
    seller: ''
  }
};

const productSlice = createSlice({
  name: 'adminProducts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        category: '',
        status: '',
        seller: ''
      };
    },
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          totalItems: action.payload.totalItems || 0,
          itemsPerPage: action.payload.itemsPerPage || 10
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch product by ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update product status
      .addCase(updateProductStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProductStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(p => p._id === updatedProduct._id);
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
        if (state.selectedProduct && state.selectedProduct._id === updatedProduct._id) {
          state.selectedProduct = updatedProduct;
        }
      })
      .addCase(updateProductStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(p => p._id !== action.payload);
        if (state.selectedProduct && state.selectedProduct._id === action.payload) {
          state.selectedProduct = null;
        }
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      
      // Bulk update products
      .addCase(bulkUpdateProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateProducts.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh products list after bulk update
        // This could be optimized to update specific products instead
      })
      .addCase(bulkUpdateProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export products
      .addCase(exportProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportProducts.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setSelectedProduct,
  clearSelectedProduct
} = productSlice.actions;

export default productSlice.reducer;