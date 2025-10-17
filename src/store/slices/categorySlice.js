import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const ADMIN_CATEGORIES_API = '/admin/categories';
const PRODUCTS_CATEGORIES_API = '/products/categories';

// Async thunks for category management
export const fetchCategories = createAsyncThunk(
  'adminCategories/fetchCategories',
  async ({ page = 1, limit = 10, search = '', status = '', parentId = '' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (parentId) params.append('parentId', parentId);

      const response = await api.get(`${PRODUCTS_CATEGORIES_API}?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  'adminCategories/fetchCategoryById',
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/products/categories/${categoryId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch category');
    }
  }
);

export const createCategory = createAsyncThunk(
  'adminCategories/createCategory',
  async (categoryData, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(categoryData).forEach(key => {
        if (categoryData[key] !== null && categoryData[key] !== undefined) {
          if (key === 'image' && categoryData[key] instanceof File) {
            formData.append(key, categoryData[key]);
          } else if (typeof categoryData[key] === 'object') {
            formData.append(key, JSON.stringify(categoryData[key]));
          } else {
            formData.append(key, categoryData[key]);
          }
        }
      });

      const response = await api.post(ADMIN_CATEGORIES_API, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'adminCategories/updateCategory',
  async ({ categoryId, categoryData }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(categoryData).forEach(key => {
        if (categoryData[key] !== null && categoryData[key] !== undefined) {
          if (key === 'image' && categoryData[key] instanceof File) {
            formData.append(key, categoryData[key]);
          } else if (typeof categoryData[key] === 'object') {
            formData.append(key, JSON.stringify(categoryData[key]));
          } else {
            formData.append(key, categoryData[key]);
          }
        }
      });

      const response = await axios.put(`${API_URL}/admin/categories/${categoryId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'adminCategories/deleteCategory',
  async (categoryId, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/admin/categories/${categoryId}`);
      return categoryId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete category');
    }
  }
);

export const updateCategoryStatus = createAsyncThunk(
  'adminCategories/updateCategoryStatus',
  async ({ categoryId, status }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/categories/${categoryId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update category status');
    }
  }
);

export const bulkUpdateCategories = createAsyncThunk(
  'adminCategories/bulkUpdateCategories',
  async ({ categoryIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/categories/bulk`, {
        categoryIds,
        action,
        data
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update categories');
    }
  }
);

export const reorderCategories = createAsyncThunk(
  'adminCategories/reorderCategories',
  async ({ categoryIds, newOrder }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/admin/categories/reorder`, {
        categoryIds,
        newOrder
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reorder categories');
    }
  }
);

export const fetchCategoryStatistics = createAsyncThunk(
  'adminCategories/fetchCategoryStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/admin/categories/statistics`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch category statistics');
    }
  }
);

export const exportCategories = createAsyncThunk(
  'adminCategories/exportCategories',
  async ({ format = 'csv', filters = {} }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ format });
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API_URL}/admin/categories/export?${params}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `categories_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export categories');
    }
  }
);

export const fetchCategoryTree = createAsyncThunk(
  'adminCategories/fetchCategoryTree',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/products/categories/tree`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch category tree');
    }
  }
);

const initialState = {
  categories: [],
  categoryTree: [],
  selectedCategory: null,
  statistics: null,
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
    status: '',
    parentId: ''
  }
};

const categorySlice = createSlice({
  name: 'adminCategories',
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
        status: '',
        parentId: ''
      };
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    clearSelectedCategory: (state) => {
      state.selectedCategory = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        // Handle nested response structure from backend
        const responseData = action.payload.data || action.payload;
        state.categories = Array.isArray(responseData.categories) ? responseData.categories : 
                          Array.isArray(responseData) ? responseData : [];
        state.pagination = responseData.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10
        };
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch category by ID
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCategory = action.payload;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create category
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.unshift(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update category
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCategory = action.payload;
        const index = state.categories.findIndex(c => c._id === updatedCategory._id);
        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
        if (state.selectedCategory && state.selectedCategory._id === updatedCategory._id) {
          state.selectedCategory = updatedCategory;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete category
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter(c => c._id !== action.payload);
        if (state.selectedCategory && state.selectedCategory._id === action.payload) {
          state.selectedCategory = null;
        }
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update category status
      .addCase(updateCategoryStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategoryStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCategory = action.payload;
        const index = state.categories.findIndex(c => c._id === updatedCategory._id);
        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
        if (state.selectedCategory && state.selectedCategory._id === updatedCategory._id) {
          state.selectedCategory = updatedCategory;
        }
      })
      .addCase(updateCategoryStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk update categories
      .addCase(bulkUpdateCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateCategories.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh categories list after bulk update
      })
      .addCase(bulkUpdateCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reorder categories
      .addCase(reorderCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reorderCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.categories || state.categories;
      })
      .addCase(reorderCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch category statistics
      .addCase(fetchCategoryStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchCategoryStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export categories
      .addCase(exportCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportCategories.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch category tree
      .addCase(fetchCategoryTree.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryTree.fulfilled, (state, action) => {
        state.loading = false;
        state.categoryTree = action.payload;
      })
      .addCase(fetchCategoryTree.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setSelectedCategory,
  clearSelectedCategory
} = categorySlice.actions;

export default categorySlice.reducer;