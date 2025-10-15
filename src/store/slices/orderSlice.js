import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for order management
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async ({ page = 1, limit = 10, status, search }, { rejectWithValue }) => {
    try {
      // Mock data for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockOrders = [
        {
          id: 'ORD-001',
          orderNumber: 'ORD-001',
          customer: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1 234 567 8900'
          },
          items: [
            {
              id: 1,
              name: 'Wireless Bluetooth Headphones',
              price: 89.99,
              quantity: 2,
              sku: 'WBH-001'
            }
          ],
          total: 179.98,
          status: 'Pending',
          paymentStatus: 'Paid',
          orderDate: '2024-01-20T10:30:00Z',
          estimatedDelivery: '2024-01-25',
          reviewOfficer: null
        },
        {
          id: 'ORD-002',
          orderNumber: 'ORD-002',
          customer: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1 234 567 8901'
          },
          items: [
            {
              id: 2,
              name: 'Smart Fitness Watch',
              price: 199.99,
              quantity: 1,
              sku: 'SFW-002'
            }
          ],
          total: 199.99,
          status: 'Under Review',
          paymentStatus: 'Paid',
          orderDate: '2024-01-21T14:15:00Z',
          estimatedDelivery: '2024-01-26',
          reviewOfficer: 'John Smith'
        },
        {
          id: 'ORD-003',
          orderNumber: 'ORD-003',
          customer: {
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '+1 234 567 8902'
          },
          items: [
            {
              id: 3,
              name: 'Gaming Keyboard',
              price: 129.99,
              quantity: 1,
              sku: 'GK-003'
            }
          ],
          total: 129.99,
          status: 'Approved',
          paymentStatus: 'Paid',
          orderDate: '2024-01-22T09:45:00Z',
          estimatedDelivery: '2024-01-27',
          reviewOfficer: 'Sarah Johnson'
        }
      ];
      
      // Filter by status if provided
      let filteredOrders = mockOrders;
      if (status) {
        filteredOrders = mockOrders.filter(order => order.status === status);
      }
      
      // Filter by search if provided
      if (search) {
        filteredOrders = filteredOrders.filter(order => 
          order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          order.customer.email.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return {
        orders: filteredOrders,
        totalCount: filteredOrders.length,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredOrders.length / limit),
          totalCount: filteredOrders.length
        }
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch orders');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status, reviewOfficer }, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        orderId,
        status,
        reviewOfficer,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update order status');
    }
  }
);

export const assignReviewOfficer = createAsyncThunk(
  'orders/assignReviewOfficer',
  async ({ orderIds, reviewOfficerId }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/orders/assign-reviewer', {
        orderIds,
        reviewOfficerId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign review officer');
    }
  }
);

export const bulkUpdateOrders = createAsyncThunk(
  'orders/bulkUpdateOrders',
  async ({ orderIds, action, data }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/admin/orders/bulk-update', {
        orderIds,
        action,
        data,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update orders');
    }
  }
);

export const getOrderDetails = createAsyncThunk(
  'orders/getOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock order details
      const mockOrder = {
        id: orderId,
        orderNumber: orderId,
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1 234 567 8900',
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        },
        items: [
          {
            id: 1,
            name: 'Wireless Bluetooth Headphones',
            price: 89.99,
            quantity: 2,
            sku: 'WBH-001',
            image: '/images/headphones.jpg'
          }
        ],
        total: 179.98,
        subtotal: 179.98,
        tax: 0,
        shipping: 0,
        status: 'Pending',
        paymentStatus: 'Paid',
        paymentMethod: 'Credit Card',
        orderDate: '2024-01-20T10:30:00Z',
        estimatedDelivery: '2024-01-25',
        trackingNumber: null,
        reviewOfficer: null,
        notes: []
      };
      
      return mockOrder;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch order details');
    }
  }
);

const initialState = {
  orders: [],
  selectedOrders: [],
  orderDetails: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {
    status: '',
    search: '',
    dateRange: null,
  },
  bulkActionLoading: false,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedOrders: (state, action) => {
      state.selectedOrders = action.payload;
    },
    toggleOrderSelection: (state, action) => {
      const orderId = action.payload;
      const index = state.selectedOrders.indexOf(orderId);
      if (index > -1) {
        state.selectedOrders.splice(index, 1);
      } else {
        state.selectedOrders.push(orderId);
      }
    },
    clearSelectedOrders: (state) => {
      state.selectedOrders = [];
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
      state.filters = {
        status: '',
        search: '',
        dateRange: null,
      };
    },
    clearOrderDetails: (state) => {
      state.orderDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.length;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Assign review officer
      .addCase(assignReviewOfficer.pending, (state) => {
        state.bulkActionLoading = true;
        state.error = null;
      })
      .addCase(assignReviewOfficer.fulfilled, (state, action) => {
        state.bulkActionLoading = false;
        // Update orders with assigned review officer
        action.payload.forEach(updatedOrder => {
          const index = state.orders.findIndex(order => order.id === updatedOrder.id);
          if (index !== -1) {
            state.orders[index] = updatedOrder;
          }
        });
        state.selectedOrders = [];
      })
      .addCase(assignReviewOfficer.rejected, (state, action) => {
        state.bulkActionLoading = false;
        state.error = action.payload;
      })
      // Bulk update orders
      .addCase(bulkUpdateOrders.pending, (state) => {
        state.bulkActionLoading = true;
        state.error = null;
      })
      .addCase(bulkUpdateOrders.fulfilled, (state, action) => {
        state.bulkActionLoading = false;
        // Update orders based on bulk action
        action.payload.forEach(updatedOrder => {
          const index = state.orders.findIndex(order => order.id === updatedOrder.id);
          if (index !== -1) {
            state.orders[index] = updatedOrder;
          }
        });
        state.selectedOrders = [];
      })
      .addCase(bulkUpdateOrders.rejected, (state, action) => {
        state.bulkActionLoading = false;
        state.error = action.payload;
      })
      // Fetch order details
      .addCase(getOrderDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOrderDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.orderDetails = action.payload;
      })
      .addCase(getOrderDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedOrders,
  toggleOrderSelection,
  clearSelectedOrders,
  setCurrentPage,
  setPageSize,
  setFilters,
  clearFilters,
  clearOrderDetails,
} = orderSlice.actions;

export default orderSlice.reducer;