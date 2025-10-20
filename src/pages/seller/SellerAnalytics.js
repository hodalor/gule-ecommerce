import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSellerReports, fetchSalesData, fetchProductPerformance } from '../../store/slices/reportsSlice';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  EyeIcon,
  CalendarIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  ChartPieIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';

const SellerAnalytics = () => {
  const dispatch = useDispatch();
  const { reports, salesData, productPerformance, loading, error } = useSelector((state) => state.reports);
  const { user } = useSelector((state) => state.auth);

  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch analytics data on component mount and when filters change
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSellerReports({ sellerId: user.id, period: dateRange }));
      dispatch(fetchSalesData({ sellerId: user.id, period: dateRange }));
      dispatch(fetchProductPerformance({ sellerId: user.id, period: dateRange }));
    }
  }, [dispatch, user?.id, dateRange]);

  // Mock data for enhanced analytics (in real app, this would come from API)
  const mockAnalyticsData = {
    overview: {
      totalRevenue: 45678.90,
      totalOrders: 234,
      averageOrderValue: 195.25,
      conversionRate: 3.2,
      totalCustomers: 189,
      repeatCustomerRate: 28.5,
      totalViews: 12450,
      clickThroughRate: 4.1,
      revenueGrowth: 12.5,
      orderGrowth: 8.3,
      customerGrowth: 15.2,
      viewsGrowth: -2.1
    },
    salesTrend: [
      { date: '2024-01-01', revenue: 1200, orders: 8, customers: 6 },
      { date: '2024-01-02', revenue: 1450, orders: 12, customers: 9 },
      { date: '2024-01-03', revenue: 980, orders: 6, customers: 5 },
      { date: '2024-01-04', revenue: 1680, orders: 14, customers: 11 },
      { date: '2024-01-05', revenue: 2100, orders: 18, customers: 14 },
      { date: '2024-01-06', revenue: 1890, orders: 15, customers: 12 },
      { date: '2024-01-07', revenue: 2250, orders: 20, customers: 16 }
    ],
    topProducts: [
      { id: 1, name: 'Premium Wireless Headphones', revenue: 8950, orders: 45, views: 1250, rating: 4.8 },
      { id: 2, name: 'Smart Fitness Tracker', revenue: 6780, orders: 38, views: 980, rating: 4.6 },
      { id: 3, name: 'Bluetooth Speaker', revenue: 5420, orders: 32, views: 850, rating: 4.7 },
      { id: 4, name: 'Wireless Charging Pad', revenue: 3890, orders: 28, views: 720, rating: 4.5 },
      { id: 5, name: 'USB-C Hub', revenue: 2340, orders: 18, views: 560, rating: 4.4 }
    ],
    categoryPerformance: [
      { category: 'Electronics', revenue: 18500, orders: 95, percentage: 40.5 },
      { category: 'Accessories', revenue: 12300, orders: 68, percentage: 27.0 },
      { category: 'Home & Garden', revenue: 8900, orders: 42, percentage: 19.5 },
      { category: 'Sports', revenue: 5978, orders: 29, percentage: 13.0 }
    ],
    customerInsights: {
      newCustomers: 45,
      returningCustomers: 54,
      averageLifetimeValue: 285.50,
      topCustomerSegments: [
        { segment: 'Premium Buyers', count: 23, avgOrder: 350 },
        { segment: 'Regular Customers', count: 89, avgOrder: 180 },
        { segment: 'Bargain Hunters', count: 77, avgOrder: 95 }
      ]
    },
    inventory: {
      totalProducts: 156,
      lowStockItems: 12,
      outOfStockItems: 3,
      fastMovingItems: 28,
      slowMovingItems: 15
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (value) => {
    return value >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const MetricCard = ({ title, value, growth, icon: Icon, format = 'number' }) => {
    const GrowthIcon = getGrowthIcon(growth);
    const formattedValue = format === 'currency' ? formatCurrency(value) : 
                          format === 'percentage' ? `${value}%` : 
                          value.toLocaleString();

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
            <div className="flex items-center mt-2">
              <GrowthIcon className={`h-4 w-4 ${getGrowthColor(growth)} mr-1`} />
              <span className={`text-sm font-medium ${getGrowthColor(growth)}`}>
                {formatPercentage(growth)}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    );
  };

  const SimpleChart = ({ data, type = 'line', height = 200 }) => {
    // Simple SVG chart implementation
    const maxValue = Math.max(...data.map(d => d.revenue));
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 300;
      const y = height - (d.revenue / maxValue) * (height - 40);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full" style={{ height }}>
        <svg width="100%" height={height} className="overflow-visible">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="0"
              y1={i * (height / 4)}
              x2="300"
              y2={i * (height / 4)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}
          
          {/* Chart line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 300;
            const y = height - (d.revenue / maxValue) * (height - 40);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#3b82f6"
                className="hover:r-6 transition-all cursor-pointer"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  const ProductPerformanceTable = ({ products }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Revenue
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Orders
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Views
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rating
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Conversion
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product, index) => {
            const conversionRate = ((product.orders / product.views) * 100).toFixed(1);
            return (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(product.revenue)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.orders}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.views.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-gray-900">{product.rating}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    conversionRate >= 5 ? 'bg-green-100 text-green-800' :
                    conversionRate >= 2 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {conversionRate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <>
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive insights into your business performance</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              
              <select
                value={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="previous">vs Previous Period</option>
                <option value="year">vs Same Period Last Year</option>
              </select>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                <DocumentArrowDownIcon className="h-5 w-5" />
                Export Report
              </button>
              
              <button 
                onClick={() => {
                  dispatch(fetchSellerReports({ sellerId: user.id, period: dateRange }));
                  dispatch(fetchSalesData({ sellerId: user.id, period: dateRange }));
                  dispatch(fetchProductPerformance({ sellerId: user.id, period: dateRange }));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Refresh
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: ChartBarIcon },
                { id: 'sales', name: 'Sales Analytics', icon: CurrencyDollarIcon },
                { id: 'products', name: 'Product Performance', icon: TrophyIcon },
                { id: 'customers', name: 'Customer Insights', icon: UserGroupIcon },
                { id: 'inventory', name: 'Inventory Analytics', icon: ChartPieIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Revenue"
                  value={mockAnalyticsData.overview.totalRevenue}
                  growth={mockAnalyticsData.overview.revenueGrowth}
                  icon={CurrencyDollarIcon}
                  format="currency"
                />
                <MetricCard
                  title="Total Orders"
                  value={mockAnalyticsData.overview.totalOrders}
                  growth={mockAnalyticsData.overview.orderGrowth}
                  icon={ShoppingCartIcon}
                />
                <MetricCard
                  title="Total Customers"
                  value={mockAnalyticsData.overview.totalCustomers}
                  growth={mockAnalyticsData.overview.customerGrowth}
                  icon={UserGroupIcon}
                />
                <MetricCard
                  title="Conversion Rate"
                  value={mockAnalyticsData.overview.conversionRate}
                  growth={1.2}
                  icon={ChartBarIcon}
                  format="percentage"
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Avg Order Value"
                  value={mockAnalyticsData.overview.averageOrderValue}
                  growth={5.8}
                  icon={CurrencyDollarIcon}
                  format="currency"
                />
                <MetricCard
                  title="Repeat Customer Rate"
                  value={mockAnalyticsData.overview.repeatCustomerRate}
                  growth={3.2}
                  icon={UserGroupIcon}
                  format="percentage"
                />
                <MetricCard
                  title="Total Views"
                  value={mockAnalyticsData.overview.totalViews}
                  growth={mockAnalyticsData.overview.viewsGrowth}
                  icon={EyeIcon}
                />
                <MetricCard
                  title="Click-Through Rate"
                  value={mockAnalyticsData.overview.clickThroughRate}
                  growth={0.8}
                  icon={ChartBarIcon}
                  format="percentage"
                />
              </div>

              {/* Sales Trend Chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="orders">Orders</option>
                      <option value="customers">Customers</option>
                    </select>
                  </div>
                </div>
                <SimpleChart data={mockAnalyticsData.salesTrend} />
              </div>

              {/* Quick Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Performance */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
                  <div className="space-y-4">
                    {mockAnalyticsData.categoryPerformance.map((category) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{category.category}</span>
                            <span className="text-sm text-gray-500">{formatCurrency(category.revenue)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${category.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
                  <div className="space-y-3">
                    {mockAnalyticsData.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.orders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                          <div className="flex items-center gap-1">
                            <StarIcon className="h-3 w-3 text-yellow-400" />
                            <span className="text-xs text-gray-500">{product.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Analytics Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Sales Analytics</h3>
                <SimpleChart data={mockAnalyticsData.salesTrend} height={300} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Time of Day</h3>
                  <p className="text-gray-500">Peak sales hours: 2PM - 6PM</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Day of Week</h3>
                  <p className="text-gray-500">Best performing day: Saturday</p>
                </div>
              </div>
            </div>
          )}

          {/* Product Performance Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Product Performance Analysis</h3>
                </div>
                <ProductPerformanceTable products={mockAnalyticsData.topProducts} />
              </div>
            </div>
          )}

          {/* Customer Insights Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="New Customers"
                  value={mockAnalyticsData.customerInsights.newCustomers}
                  growth={15.2}
                  icon={UserGroupIcon}
                />
                <MetricCard
                  title="Returning Customers"
                  value={mockAnalyticsData.customerInsights.returningCustomers}
                  growth={8.7}
                  icon={UserGroupIcon}
                />
                <MetricCard
                  title="Avg Lifetime Value"
                  value={mockAnalyticsData.customerInsights.averageLifetimeValue}
                  growth={12.3}
                  icon={CurrencyDollarIcon}
                  format="currency"
                />
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
                <div className="space-y-4">
                  {mockAnalyticsData.customerInsights.topCustomerSegments.map((segment) => (
                    <div key={segment.segment} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{segment.segment}</p>
                        <p className="text-sm text-gray-500">{segment.count} customers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(segment.avgOrder)}</p>
                        <p className="text-sm text-gray-500">avg order</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Inventory Analytics Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <MetricCard
                  title="Total Products"
                  value={mockAnalyticsData.inventory.totalProducts}
                  growth={5.2}
                  icon={ChartPieIcon}
                />
                <MetricCard
                  title="Low Stock Items"
                  value={mockAnalyticsData.inventory.lowStockItems}
                  growth={-15.3}
                  icon={ExclamationTriangleIcon}
                />
                <MetricCard
                  title="Out of Stock"
                  value={mockAnalyticsData.inventory.outOfStockItems}
                  growth={-25.0}
                  icon={ExclamationTriangleIcon}
                />
                <MetricCard
                  title="Fast Moving"
                  value={mockAnalyticsData.inventory.fastMovingItems}
                  growth={18.7}
                  icon={ArrowTrendingUpIcon}
                />
                <MetricCard
                  title="Slow Moving"
                  value={mockAnalyticsData.inventory.slowMovingItems}
                  growth={-8.2}
                  icon={ArrowTrendingDownIcon}
                />
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Health Overview</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Stock Status Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">In Stock</span>
                        <span className="text-sm font-medium text-green-600">141 items (90.4%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Low Stock</span>
                        <span className="text-sm font-medium text-yellow-600">12 items (7.7%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Out of Stock</span>
                        <span className="text-sm font-medium text-red-600">3 items (1.9%)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Movement Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Fast Moving</span>
                        <span className="text-sm font-medium text-green-600">28 items (17.9%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Normal Moving</span>
                        <span className="text-sm font-medium text-blue-600">113 items (72.4%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Slow Moving</span>
                        <span className="text-sm font-medium text-red-600">15 items (9.6%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellerAnalytics;