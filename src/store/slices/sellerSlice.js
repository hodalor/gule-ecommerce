import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Async thunks for seller operations
export const fetchSellers = createAsyncThunk(
  'sellers/fetchSellers',
  async ({ search, category, sortBy } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'all') params.append('category', category);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`${API_BASE_URL}/sellers/public?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sellers');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSellerById = createAsyncThunk(
  'sellers/fetchSellerById',
  async (sellerId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sellers/public/${sellerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSellerCategories = createAsyncThunk(
  'sellers/fetchSellerCategories',
  async (_, { rejectWithValue }) => {
    try {
      // Use the new public categories endpoint that returns all active categories
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller categories');
      }

      const data = await response.json();
      const categories = Array.isArray(data?.data?.categories)
        ? data.data.categories.map((c) => c.name).filter(Boolean)
        : [];
      return categories;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  sellers: [],
  currentSeller: null,
  categories: ['all', 'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Beauty', 'Automotive', 'Toys'],
  loading: {
    sellers: false,
    currentSeller: false,
    categories: false
  },
  error: {
    sellers: null,
    currentSeller: null,
    categories: null
  },
  stats: {
    totalSellers: 0,
    verifiedSellers: 0,
    averageRating: 0,
    totalProducts: 0
  }
};

const sellerSlice = createSlice({
  name: 'sellers',
  initialState,
  reducers: {
    clearError: (state, action) => {
      const { type } = action.payload;
      if (type && state.error[type]) {
        state.error[type] = null;
      } else {
        state.error = {
          sellers: null,
          currentSeller: null,
          categories: null
        };
      }
    },
    clearCurrentSeller: (state) => {
      state.currentSeller = null;
      state.error.currentSeller = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch sellers
    builder
      .addCase(fetchSellers.pending, (state) => {
        state.loading.sellers = true;
        state.error.sellers = null;
      })
      .addCase(fetchSellers.fulfilled, (state, action) => {
        state.loading.sellers = false;
        
        // Map backend response to frontend expected format
        const rawSellers = action.payload.sellers || action.payload;
        state.sellers = rawSellers.map(seller => ({
          id: seller._id || seller.id,
          name: seller.fullName || `${seller.firstName} ${seller.lastName}`,
          firstName: seller.firstName,
          lastName: seller.lastName,
          description: seller.businessDetails?.businessDescription || 'Professional seller',
          avatar: seller.profileImage || 'https://picsum.photos/64/64?random=14',
          verified: (seller.isVerified === true) || (seller.verificationStatus === 'verified') || false,
          rating: seller.rating || seller.averageRating || 0,
          reviewCount: seller.totalReviews || 0,
          productCount: seller.totalProducts || 0,
          totalSales: seller.totalSales || 0,
          category: seller.businessDetails?.businessCategory || 'General',
          location: seller.businessDetails?.businessAddress || 'Location not specified',
          joinedDate: seller.registrationDate || seller.createdAt,
          businessName: seller.businessDetails?.businessName,
          topProducts: seller.topProducts || []
        }));
        
        // Calculate stats
        const sellers = state.sellers;
        state.stats.totalSellers = sellers.length;
        state.stats.verifiedSellers = sellers.filter(s => s.verified).length;
        state.stats.averageRating = sellers.length > 0 
          ? (sellers.reduce((sum, s) => sum + (s.rating || 0), 0) / sellers.length).toFixed(1)
          : 0;
        state.stats.totalProducts = sellers.reduce((sum, s) => sum + (s.productCount || 0), 0);
      })
      .addCase(fetchSellers.rejected, (state, action) => {
        state.loading.sellers = false;
        state.error.sellers = action.payload;
      });

    // Fetch seller by ID
    builder
      .addCase(fetchSellerById.pending, (state) => {
        state.loading.currentSeller = true;
        state.error.currentSeller = null;
      })
      .addCase(fetchSellerById.fulfilled, (state, action) => {
        state.loading.currentSeller = false;
        // Support both { seller: {...} } and direct seller object responses
        state.currentSeller = action.payload?.seller || action.payload;
      })
      .addCase(fetchSellerById.rejected, (state, action) => {
        state.loading.currentSeller = false;
        state.error.currentSeller = action.payload;
      });

    // Fetch seller categories
    builder
      .addCase(fetchSellerCategories.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(fetchSellerCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = ['all', ...action.payload];
      })
      .addCase(fetchSellerCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories = action.payload;
      });
  }
});

export const { clearError, clearCurrentSeller } = sellerSlice.actions;
export default sellerSlice.reducer;