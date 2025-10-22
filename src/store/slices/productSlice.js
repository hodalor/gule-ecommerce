import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (args = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 12, category, search, sellerId, seller } = args;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      // Prefer sellerId; fall back to seller for backward compatibility
      const sellerFilter = sellerId || seller;
      if (sellerFilter) params.append('sellerId', sellerFilter);

      const response = await api.get(`/products?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeaturedProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/products/featured`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch featured products');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      // Correct backend route is /products/categories
      const response = await api.get(`/products/categories`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

// Seller actions
export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (payload, { rejectWithValue }) => {
    try {
      // Support both raw productData and FormData-based uploads
      let body = payload;
      let config = {};

      if (payload instanceof FormData) {
        body = payload;
        config.headers = { 'Content-Type': 'multipart/form-data' };
      } else if (payload?.formData) {
        body = payload.formData;
        config.headers = { 'Content-Type': 'multipart/form-data' };
      } else if (payload?.productData) {
        body = payload.productData;
      }

      const response = await api.post(`/products`, body, config);
      return response.data;
    } catch (error) {
      const data = error?.response?.data;
      if (data?.errors && Array.isArray(data.errors) && data.errors.length) {
        return rejectWithValue({ message: data.message || 'Validation failed', errors: data.errors });
      }
      return rejectWithValue(data?.message || 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ productId, payload }, { rejectWithValue }) => {
    try {
      let body = payload;
      let config = {};

      if (payload instanceof FormData) {
        body = payload;
        config.headers = { 'Content-Type': 'multipart/form-data' };
      } else if (payload?.formData) {
        body = payload.formData;
        config.headers = { 'Content-Type': 'multipart/form-data' };
      } else if (payload?.productData) {
        body = payload.productData;
      }

      const response = await api.put(`/products/${productId}`, body, config);
      return response.data;
    } catch (error) {
      const data = error?.response?.data;
      if (data?.errors && Array.isArray(data.errors) && data.errors.length) {
        return rejectWithValue({ message: data.message || 'Validation failed', errors: data.errors });
      }
      return rejectWithValue(data?.message || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      await api.delete(`/products/${productId}`);
      return productId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    featuredProducts: [],
    currentProduct: null,
    categories: [],
    filters: {
      category: '',
      search: '',
      seller: '',
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalProducts: 0,
      hasNext: false,
      hasPrev: false
    },
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        category: '',
        search: '',
        seller: '',
      };
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
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
        state.products = action.payload.data.products;
        state.pagination = action.payload.data.pagination;
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
        state.currentProduct = action.payload.data.product;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch featured products
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload.products;
      })
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload.data.categories;
      })
      // Create product
      .addCase(createProduct.fulfilled, (state, action) => {
        const created = action.payload.data?.product || action.payload.product;
        if (created) {
          state.products.unshift(created);
        }
      })
      // Update product
      .addCase(updateProduct.fulfilled, (state, action) => {
        const updated = action.payload.data?.product || action.payload.product;
        if (!updated) return;
        const index = state.products.findIndex(p => (p._id || p.id) === (updated._id || updated.id));
        if (index !== -1) {
          state.products[index] = updated;
        }
        if ((state.currentProduct?._id || state.currentProduct?.id) === (updated._id || updated.id)) {
          state.currentProduct = updated;
        }
      })
      // Delete product
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(p => (p._id || p.id) !== action.payload);
        if ((state.currentProduct?._id || state.currentProduct?.id) === action.payload) {
          state.currentProduct = null;
        }
      });
  },
});

export const { clearError, setFilters, clearFilters, clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;