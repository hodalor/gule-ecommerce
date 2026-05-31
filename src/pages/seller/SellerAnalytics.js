import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSellerReports } from '../../store/slices/reportsSlice';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  StarIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import { formatCurrency as formatCurrencyUtil } from '../../utils/currency';

const SellerAnalytics = () => {
  const dispatch = useDispatch();
  const {
    loading,
    error,
    stats,
    salesData,
    productPerformance,
    categoryData,
    inventoryStats,
    customerInsights
  } = useSelector((state) => state.reports);
  const { user } = useSelector((state) => state.auth);

  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');
  const [activeTab, setActiveTab] = useState('overview');

  // Derive booleans from loading/error objects
  const hasLoading = typeof loading === 'object'
    ? Object.values(loading).some(Boolean)
    : !!loading;

  const errorMessages = typeof error === 'object' && error !== null
    ? Object.values(error).filter(Boolean)
    : (error ? [error] : []);

  // Fetch analytics data on component mount and when filters change
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSellerReports({ sellerId: user.id, dateRange }));
    }
  }, [dispatch, user?.id, dateRange]);

  const formatCurrency = (amount, options) => formatCurrencyUtil(amount, undefined, undefined, options);

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
                          Number(value || 0).toLocaleString();

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
            const conversionRate = product.views > 0
              ? ((product.orders / product.views) * 100).toFixed(1)
              : '0.0';
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
      {hasLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      )}

      {/* Error State */}
      {errorMessages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{errorMessages.join(' • ')}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!hasLoading && (
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
                  dispatch(fetchSellerReports({ sellerId: user.id, dateRange }));
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
                  value={stats.totalRevenue}
                  growth={stats.revenueChange}
                  icon={CurrencyDollarIcon}
                  format="currency"
                />
                <MetricCard
                  title="Total Orders"
                  value={stats.totalOrders}
                  growth={stats.ordersChange}
                  icon={ShoppingCartIcon}
                />
                <MetricCard
                  title="Total Customers"
                  value={stats.totalCustomers}
                  growth={stats.customersChange}
                  icon={UserGroupIcon}
                />
                <MetricCard
                  title="Avg Order Value"
                  value={stats.avgOrderValue}
                  growth={stats.avgOrderValueChange}
                  icon={ChartBarIcon}
                  format="currency"
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Active Products"
                  value={stats.totalProducts}
                  growth={0}
                  icon={TrophyIcon}
                />
                <MetricCard
                  title="Repeat Customer Rate"
                  value={stats.totalCustomers > 0 ? (customerInsights.returningCustomers / stats.totalCustomers) * 100 : 0}
                  growth={0}
                  icon={UserGroupIcon}
                  format="percentage"
                />
                <MetricCard
                  title="Items Sold"
                  value={stats.itemsSold}
                  growth={0}
                  icon={EyeIcon}
                />
                <MetricCard
                  title="Low Stock Items"
                  value={stats.lowStockItems}
                  growth={0}
                  icon={ExclamationTriangleIcon}
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
                <SimpleChart data={salesData.length > 0 ? salesData : [{ date: new Date().toISOString().slice(0, 10), revenue: 0 }]} />
              </div>

              {/* Quick Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Performance */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
                  <div className="space-y-4">
                    {categoryData.map((category) => (
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
                    {productPerformance.slice(0, 5).map((product, index) => (
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
                <SimpleChart data={salesData.length > 0 ? salesData : [{ date: new Date().toISOString().slice(0, 10), revenue: 0 }]} height={300} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Time of Day</h3>
                  <p className="text-gray-500">Live hourly analytics are not available yet. Revenue and order totals now reflect your real seller account data.</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Day of Week</h3>
                  <p className="text-gray-500">
                    Best performing day:{' '}
                    {salesData.length > 0
                      ? new Date([...salesData].sort((a, b) => b.revenue - a.revenue)[0].date).toLocaleDateString(undefined, { weekday: 'long' })
                      : 'Not enough data'}
                  </p>
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
                <ProductPerformanceTable products={productPerformance} />
              </div>
            </div>
          )}

          {/* Customer Insights Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="New Customers"
                  value={customerInsights.newCustomers}
                  growth={0}
                  icon={UserGroupIcon}
                />
                <MetricCard
                  title="Returning Customers"
                  value={customerInsights.returningCustomers}
                  growth={0}
                  icon={UserGroupIcon}
                />
                <MetricCard
                  title="Avg Lifetime Value"
                  value={customerInsights.averageLifetimeValue}
                  growth={0}
                  icon={CurrencyDollarIcon}
                  format="currency"
                />
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
                <div className="space-y-4">
                  {customerInsights.topCustomerSegments.map((segment) => (
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
                  value={inventoryStats.totalProducts}
                  growth={0}
                  icon={ChartPieIcon}
                />
                <MetricCard
                  title="Low Stock Items"
                  value={inventoryStats.lowStockItems}
                  growth={0}
                  icon={ExclamationTriangleIcon}
                />
                <MetricCard
                  title="Out of Stock"
                  value={inventoryStats.outOfStockItems}
                  growth={0}
                  icon={ExclamationTriangleIcon}
                />
                <MetricCard
                  title="Fast Moving"
                  value={inventoryStats.fastMovingItems}
                  growth={0}
                  icon={ArrowTrendingUpIcon}
                />
                <MetricCard
                  title="Slow Moving"
                  value={inventoryStats.slowMovingItems}
                  growth={0}
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
                        <span className="text-sm font-medium text-green-600">
                          {Math.max(inventoryStats.totalProducts - inventoryStats.lowStockItems - inventoryStats.outOfStockItems, 0)} items
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Low Stock</span>
                        <span className="text-sm font-medium text-yellow-600">{inventoryStats.lowStockItems} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Out of Stock</span>
                        <span className="text-sm font-medium text-red-600">{inventoryStats.outOfStockItems} items</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Movement Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Fast Moving</span>
                        <span className="text-sm font-medium text-green-600">{inventoryStats.fastMovingItems} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Normal Moving</span>
                        <span className="text-sm font-medium text-blue-600">
                          {Math.max(inventoryStats.totalProducts - inventoryStats.fastMovingItems - inventoryStats.slowMovingItems, 0)} items
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Slow Moving</span>
                        <span className="text-sm font-medium text-red-600">{inventoryStats.slowMovingItems} items</span>
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
