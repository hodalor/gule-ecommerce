import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  fetchSellerReports,
  fetchSalesData,
  fetchProductPerformance,
  fetchCategoryData,
  exportReport,
  clearErrors
} from '../../store/slices/reportsSlice';

const SellerReports = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    stats,
    salesData,
    productPerformance,
    categoryData,
    monthlyTrends,
    loading,
    error
  } = useSelector((state) => state.reports);

  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSellerReports({ sellerId: user.id, dateRange }));
      dispatch(fetchSalesData({ sellerId: user.id, dateRange }));
      dispatch(fetchProductPerformance({ sellerId: user.id, dateRange }));
      dispatch(fetchCategoryData({ sellerId: user.id, dateRange }));
    }
  }, [dispatch, user?.id, dateRange]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleExportReport = async (format) => {
    if (user?.id) {
      try {
        const result = await dispatch(exportReport({ 
          sellerId: user.id, 
          dateRange, 
          format 
        })).unwrap();
        
        // Create download link
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `seller-report-${dateRange}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  };

  // Format stats for display
  const formattedStats = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue?.toLocaleString() || '0'}`,
      change: `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange?.toFixed(1) || '0'}%`,
      changeType: stats.revenueChange >= 0 ? 'increase' : 'decrease',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders?.toLocaleString() || '0',
      change: `${stats.ordersChange > 0 ? '+' : ''}${stats.ordersChange?.toFixed(1) || '0'}%`,
      changeType: stats.ordersChange >= 0 ? 'increase' : 'decrease',
      icon: ShoppingBagIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers?.toLocaleString() || '0',
      change: `${stats.customersChange > 0 ? '+' : ''}${stats.customersChange?.toFixed(1) || '0'}%`,
      changeType: stats.customersChange >= 0 ? 'increase' : 'decrease',
      icon: UsersIcon,
      color: 'bg-purple-500'
    },
    {
      title: 'Avg Order Value',
      value: `$${stats.avgOrderValue?.toFixed(2) || '0.00'}`,
      change: `${stats.avgOrderValueChange > 0 ? '+' : ''}${stats.avgOrderValueChange?.toFixed(1) || '0'}%`,
      changeType: stats.avgOrderValueChange >= 0 ? 'increase' : 'decrease',
      icon: ChartBarIcon,
      color: 'bg-orange-500'
    }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Sales') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Show loading state
  if (loading.overview || loading.sales || loading.products || loading.categories) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (error.overview || error.sales || error.products || error.categories) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Reports</h2>
          <p className="text-gray-600 mb-4">
            {error.overview || error.sales || error.products || error.categories}
          </p>
          <button
            onClick={() => dispatch(clearErrors())}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Track your business performance and insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
          <button 
            onClick={() => handleExportReport('pdf')}
            disabled={loading.export}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            {loading.export ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {formattedStats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.changeType === 'increase' ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ml-1 ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg">Revenue</button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Orders</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.1}
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {(categoryData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Products</h3>
          <div className="space-y-4">
            {(productPerformance || []).map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                    <span className="text-sm text-gray-600">{product.sales} sales</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${product.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">{product.percentage}% of total</span>
                    <span className="text-xs font-medium text-gray-900">{formatCurrency(product.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Sales Report</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FunnelIcon className="h-4 w-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <CalendarIcon className="h-4 w-4" />
                Date Range
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(salesData || []).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    All Products
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.sales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.sales / item.orders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {((item.orders / item.customers) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => handleExportReport('pdf')}
            disabled={loading.export}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              {loading.export ? 'Exporting...' : 'Export as PDF'}
            </span>
          </button>
          <button 
            onClick={() => handleExportReport('excel')}
            disabled={loading.export}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              {loading.export ? 'Exporting...' : 'Export as Excel'}
            </span>
          </button>
          <button 
            onClick={() => handleExportReport('csv')}
            disabled={loading.export}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              {loading.export ? 'Exporting...' : 'Export as CSV'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerReports;