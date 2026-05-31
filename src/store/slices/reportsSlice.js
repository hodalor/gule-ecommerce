import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

const parseRangeToDays = (value = '30days') => {
  const normalized = String(value).toLowerCase();
  if (normalized.includes('7')) return 7;
  if (normalized.includes('90')) return 90;
  if (normalized.includes('1y') || normalized.includes('1year') || normalized.includes('year')) return 365;
  return 30;
};

const toDateValue = (value) => {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const percentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const safeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeOrderTotal = (order = {}) => safeNumber(order.total || order.totalAmount || order.subtotal);

const normalizeOrderItems = (order = {}) => Array.isArray(order.items) ? order.items : [];

const normalizeProductId = (product) => {
  if (!product) return '';
  if (typeof product === 'string') return product;
  return product._id || product.id || '';
};

const normalizeCategoryName = (product = {}) => {
  const category = product.category;
  if (typeof category === 'string' && category.trim()) return category.trim();
  if (category?.name) return category.name;
  if (product.productType) return product.productType;
  return 'Uncategorized';
};

const deriveSellerAnalytics = (orders = [], products = [], dateRange = '30days') => {
  const days = parseRangeToDays(dateRange);
  const now = Date.now();
  const currentStart = now - (days * 24 * 60 * 60 * 1000);
  const previousStart = now - (days * 2 * 24 * 60 * 60 * 1000);

  const currentOrders = orders.filter((order) => {
    const orderDate = toDateValue(order.orderDate || order.createdAt);
    return orderDate && orderDate.getTime() >= currentStart;
  });

  const previousOrders = orders.filter((order) => {
    const orderDate = toDateValue(order.orderDate || order.createdAt);
    if (!orderDate) return false;
    const timestamp = orderDate.getTime();
    return timestamp >= previousStart && timestamp < currentStart;
  });

  const currentRevenue = currentOrders.reduce((sum, order) => sum + normalizeOrderTotal(order), 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + normalizeOrderTotal(order), 0);

  const currentCustomers = new Set(
    currentOrders.map((order) => (
      order?.buyer?._id ||
      order?.customer?._id ||
      order?.buyer?.email ||
      order?.customer?.email ||
      order?.customer?.name ||
      order?.id
    ))
  );

  const previousCustomers = new Set(
    previousOrders.map((order) => (
      order?.buyer?._id ||
      order?.customer?._id ||
      order?.buyer?.email ||
      order?.customer?.email ||
      order?.customer?.name ||
      order?.id
    ))
  );

  const allCurrentItems = currentOrders.flatMap((order) => normalizeOrderItems(order));
  const productLookup = new Map(
    products.map((product) => [String(product._id || product.id), product])
  );

  const salesByDate = new Map();
  const revenueByMonth = new Map();
  const productStatsMap = new Map();
  const categoryStatsMap = new Map();
  const customerOrderMap = new Map();

  currentOrders.forEach((order) => {
    const orderDate = toDateValue(order.orderDate || order.createdAt);
    if (!orderDate) return;

    const dateKey = orderDate.toISOString().slice(0, 10);
    const monthKey = orderDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const orderRevenue = normalizeOrderTotal(order);
    const customerKey = (
      order?.buyer?._id ||
      order?.customer?._id ||
      order?.buyer?.email ||
      order?.customer?.email ||
      order?.customer?.name ||
      `order-${order.id || order._id || dateKey}`
    );

    if (!salesByDate.has(dateKey)) {
      salesByDate.set(dateKey, {
        date: dateKey,
        revenue: 0,
        sales: 0,
        orders: 0,
        customers: new Set()
      });
    }

    const dateEntry = salesByDate.get(dateKey);
    dateEntry.revenue += orderRevenue;
    dateEntry.sales += orderRevenue;
    dateEntry.orders += 1;
    dateEntry.customers.add(customerKey);

    if (!revenueByMonth.has(monthKey)) {
      revenueByMonth.set(monthKey, { month: monthKey, revenue: 0, orders: 0 });
    }
    const monthEntry = revenueByMonth.get(monthKey);
    monthEntry.revenue += orderRevenue;
    monthEntry.orders += 1;

    const currentCustomerOrders = customerOrderMap.get(customerKey) || [];
    currentCustomerOrders.push(orderRevenue);
    customerOrderMap.set(customerKey, currentCustomerOrders);

    normalizeOrderItems(order).forEach((item) => {
      const productId = String(normalizeProductId(item.product) || item.productId || item.id || item.name);
      const linkedProduct = productLookup.get(productId) || productLookup.get(String(item?.product?._id || item?.product?.id || '')) || {};
      const itemRevenue = safeNumber(item.totalPrice || (safeNumber(item.price) * safeNumber(item.quantity)));
      const itemOrders = safeNumber(item.quantity || 1);
      const productName = item.name || linkedProduct.name || 'Product';
      const categoryName = normalizeCategoryName(linkedProduct);

      const existingProduct = productStatsMap.get(productId) || {
        id: productId,
        name: productName,
        revenue: 0,
        sales: 0,
        orders: 0,
        views: safeNumber(linkedProduct.views || linkedProduct.viewCount),
        rating: safeNumber(linkedProduct.averageRating || linkedProduct.rating),
        stock: safeNumber(linkedProduct.availableStock || linkedProduct.stock),
        category: categoryName
      };

      existingProduct.revenue += itemRevenue;
      existingProduct.sales += itemOrders;
      existingProduct.orders += 1;
      productStatsMap.set(productId, existingProduct);

      const existingCategory = categoryStatsMap.get(categoryName) || {
        category: categoryName,
        revenue: 0,
        orders: 0
      };
      existingCategory.revenue += itemRevenue;
      existingCategory.orders += itemOrders;
      categoryStatsMap.set(categoryName, existingCategory);
    });
  });

  const salesData = Array.from(salesByDate.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((entry) => ({
      date: entry.date,
      revenue: entry.revenue,
      sales: entry.sales,
      orders: entry.orders,
      customers: entry.customers.size
    }));

  const monthlyTrends = Array.from(revenueByMonth.values())
    .sort((a, b) => new Date(a.month) - new Date(b.month));

  const productPerformance = Array.from(productStatsMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((product) => ({
      ...product,
      percentage: currentRevenue > 0 ? (product.revenue / currentRevenue) * 100 : 0
    }));

  const categoryData = Array.from(categoryStatsMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((entry, index) => ({
      ...entry,
      value: entry.revenue,
      percentage: currentRevenue > 0 ? (entry.revenue / currentRevenue) * 100 : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));

  const returningCustomers = Array.from(customerOrderMap.values()).filter((ordersList) => ordersList.length > 1).length;
  const newCustomers = currentCustomers.size - returningCustomers;
  const highValueCustomers = Array.from(customerOrderMap.values())
    .filter((ordersList) => ordersList.reduce((sum, value) => sum + value, 0) >= 1000)
    .length;

  const inventoryStats = {
    totalProducts: products.length,
    lowStockItems: products.filter((product) => safeNumber(product.availableStock || product.stock) > 0 && safeNumber(product.availableStock || product.stock) <= 5).length,
    outOfStockItems: products.filter((product) => safeNumber(product.availableStock || product.stock) <= 0).length,
    fastMovingItems: productPerformance.filter((product) => product.sales >= 5).length,
    slowMovingItems: productPerformance.filter((product) => product.sales > 0 && product.sales < 2).length
  };

  const averageRating = products.length > 0
    ? products.reduce((sum, product) => sum + safeNumber(product.averageRating || product.rating), 0) / products.length
    : 0;

  const stats = {
    totalRevenue: currentRevenue,
    totalOrders: currentOrders.length,
    totalCustomers: currentCustomers.size,
    avgOrderValue: currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0,
    revenueChange: percentChange(currentRevenue, previousRevenue),
    ordersChange: percentChange(currentOrders.length, previousOrders.length),
    customersChange: percentChange(currentCustomers.size, previousCustomers.size),
    avgOrderValueChange: percentChange(
      currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0,
      previousOrders.length > 0 ? previousRevenue / previousOrders.length : 0
    ),
    totalProducts: products.length,
    itemsSold: allCurrentItems.reduce((sum, item) => sum + safeNumber(item.quantity), 0),
    avgProductRating: averageRating,
    lowStockItems: inventoryStats.lowStockItems
  };

  const customerInsights = {
    newCustomers,
    returningCustomers,
    averageLifetimeValue: currentCustomers.size > 0 ? currentRevenue / currentCustomers.size : 0,
    topCustomerSegments: [
      { segment: 'Returning Customers', count: returningCustomers, avgOrder: returningCustomers > 0 ? currentRevenue / returningCustomers : 0 },
      { segment: 'One-Time Buyers', count: Math.max(newCustomers, 0), avgOrder: newCustomers > 0 ? currentRevenue / newCustomers : 0 },
      { segment: 'High Value Buyers', count: highValueCustomers, avgOrder: highValueCustomers > 0 ? currentRevenue / highValueCustomers : 0 }
    ]
  };

  return {
    stats,
    salesData,
    productPerformance,
    categoryData,
    monthlyTrends,
    inventoryStats,
    customerInsights
  };
};

const fetchSellerAnalyticsSource = async (sellerId, dateRange) => {
  const rangeDays = parseRangeToDays(dateRange);
  const orderLimit = Math.min(Math.max(rangeDays * 4, 25), 100);
  const productLimit = 100;

  const [ordersResponse, productsResponse] = await Promise.all([
    api.get(`/orders/seller-orders?page=1&limit=${orderLimit}&sort=-createdAt`),
    api.get(`/products/seller/${sellerId}?page=1&limit=${productLimit}&sort=-createdAt`)
  ]);

  const orders = ordersResponse.data?.data?.orders || [];
  const products = productsResponse.data?.data?.products || [];
  return deriveSellerAnalytics(orders, products, dateRange);
};

// Async thunks for API calls
export const fetchSellerReports = createAsyncThunk(
  'reports/fetchSellerReports',
  async ({ sellerId, dateRange = '30days' }, { rejectWithValue }) => {
    try {
      return await fetchSellerAnalyticsSource(sellerId, dateRange);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch seller reports');
    }
  }
);

export const fetchSalesData = createAsyncThunk(
  'reports/fetchSalesData',
  async ({ sellerId, dateRange = '30days' }, { rejectWithValue }) => {
    try {
      const derived = await fetchSellerAnalyticsSource(sellerId, dateRange);
      return derived.salesData;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch sales data');
    }
  }
);

export const fetchProductPerformance = createAsyncThunk(
  'reports/fetchProductPerformance',
  async ({ sellerId, dateRange = '30days' }, { rejectWithValue }) => {
    try {
      const derived = await fetchSellerAnalyticsSource(sellerId, dateRange);
      return derived.productPerformance;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch product performance');
    }
  }
);

export const fetchCategoryData = createAsyncThunk(
  'reports/fetchCategoryData',
  async ({ sellerId, dateRange = '30days' }, { rejectWithValue }) => {
    try {
      const derived = await fetchSellerAnalyticsSource(sellerId, dateRange);
      return derived.categoryData;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch category data');
    }
  }
);

export const exportReport = createAsyncThunk(
  'reports/exportReport',
  async ({ sellerId, dateRange, format }, { getState, rejectWithValue }) => {
    try {
      const reportsState = getState().reports;
      const lines = [
        ['Metric', 'Value'],
        ['Total Revenue', reportsState.stats.totalRevenue],
        ['Total Orders', reportsState.stats.totalOrders],
        ['Total Customers', reportsState.stats.totalCustomers],
        ['Average Order Value', reportsState.stats.avgOrderValue]
      ];

      const salesRows = (reportsState.salesData || []).map((entry) => [
        entry.date,
        entry.orders,
        entry.customers,
        entry.revenue
      ]);

      const csvContent = [
        lines.map((row) => row.join(',')).join('\n'),
        '',
        'Date,Orders,Customers,Revenue',
        salesRows.map((row) => row.join(',')).join('\n')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return { blob, format };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to export report');
    }
  }
);

const initialState = {
  // Overview stats
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0,
    customersChange: 0,
    avgOrderValueChange: 0,
  },
  
  // Chart data
  salesData: [],
  productPerformance: [],
  categoryData: [],
  monthlyTrends: [],
  inventoryStats: {
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    fastMovingItems: 0,
    slowMovingItems: 0
  },
  customerInsights: {
    newCustomers: 0,
    returningCustomers: 0,
    averageLifetimeValue: 0,
    topCustomerSegments: []
  },
  
  // Loading states
  loading: {
    overview: false,
    sales: false,
    products: false,
    categories: false,
    export: false,
  },
  
  // Error states
  error: {
    overview: null,
    sales: null,
    products: null,
    categories: null,
    export: null,
  },
  
  // Export data
  exportData: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = {
        overview: null,
        sales: null,
        products: null,
        categories: null,
        export: null,
      };
    },
    clearExportData: (state) => {
      state.exportData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch seller reports
      .addCase(fetchSellerReports.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = null;
      })
      .addCase(fetchSellerReports.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.stats = action.payload.stats;
        state.salesData = action.payload.salesData;
        state.productPerformance = action.payload.productPerformance;
        state.categoryData = action.payload.categoryData;
        state.monthlyTrends = action.payload.monthlyTrends;
        state.inventoryStats = action.payload.inventoryStats;
        state.customerInsights = action.payload.customerInsights;
      })
      .addCase(fetchSellerReports.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview = action.payload;
      })
      
      // Fetch sales data
      .addCase(fetchSalesData.pending, (state) => {
        state.loading.sales = true;
        state.error.sales = null;
      })
      .addCase(fetchSalesData.fulfilled, (state, action) => {
        state.loading.sales = false;
        state.salesData = action.payload;
      })
      .addCase(fetchSalesData.rejected, (state, action) => {
        state.loading.sales = false;
        state.error.sales = action.payload;
      })
      
      // Fetch product performance
      .addCase(fetchProductPerformance.pending, (state) => {
        state.loading.products = true;
        state.error.products = null;
      })
      .addCase(fetchProductPerformance.fulfilled, (state, action) => {
        state.loading.products = false;
        state.productPerformance = action.payload;
      })
      .addCase(fetchProductPerformance.rejected, (state, action) => {
        state.loading.products = false;
        state.error.products = action.payload;
      })
      
      // Fetch category data
      .addCase(fetchCategoryData.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(fetchCategoryData.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categoryData = action.payload;
      })
      .addCase(fetchCategoryData.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories = action.payload;
      })
      
      // Export report
      .addCase(exportReport.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
      })
      .addCase(exportReport.fulfilled, (state, action) => {
        state.loading.export = false;
        state.exportData = action.payload;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload;
      });
  },
});

export const { clearErrors, clearExportData } = reportsSlice.actions;
export default reportsSlice.reducer;
