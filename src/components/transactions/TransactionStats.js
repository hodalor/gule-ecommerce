import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import {
  fetchTransactionStats,
  exportTransactionReport
} from '../../store/slices/transactionSlice';

const TransactionStats = () => {
  const dispatch = useDispatch();
  const {
    stats,
    loading,
    error
  } = useSelector((state) => state.transactions);

  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    dispatch(fetchTransactionStats({ period: dateRange }));
  }, [dispatch, dateRange]);

  const handleExportReport = async (format = 'pdf') => {
    try {
      await dispatch(exportTransactionReport({
        format,
        period: dateRange,
        metrics: [selectedMetric]
      })).unwrap();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change) => {
    if (change > 0) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      change: stats?.revenueChange || 0,
      icon: CurrencyDollarIcon,
      format: 'currency'
    },
    {
      title: 'Total Transactions',
      value: stats?.totalTransactions || 0,
      change: stats?.transactionChange || 0,
      icon: ChartBarIcon,
      format: 'number'
    },
    {
      title: 'Success Rate',
      value: stats?.successRate || 0,
      change: stats?.successRateChange || 0,
      icon: CheckCircleIcon,
      format: 'percentage'
    },
    {
      title: 'Average Transaction',
      value: stats?.averageTransaction || 0,
      change: stats?.averageTransactionChange || 0,
      icon: ArrowTrendingUpIcon,
      format: 'currency'
    }
  ];

  const statusBreakdown = [
    {
      status: 'Completed',
      count: stats?.statusBreakdown?.completed || 0,
      percentage: stats?.statusBreakdown?.completedPercentage || 0,
      color: 'bg-green-500',
      icon: CheckCircleIcon
    },
    {
      status: 'Pending',
      count: stats?.statusBreakdown?.pending || 0,
      percentage: stats?.statusBreakdown?.pendingPercentage || 0,
      color: 'bg-yellow-500',
      icon: ClockIcon
    },
    {
      status: 'Failed',
      count: stats?.statusBreakdown?.failed || 0,
      percentage: stats?.statusBreakdown?.failedPercentage || 0,
      color: 'bg-red-500',
      icon: ExclamationTriangleIcon
    },
    {
      status: 'Refunded',
      count: stats?.statusBreakdown?.refunded || 0,
      percentage: stats?.statusBreakdown?.refundedPercentage || 0,
      color: 'bg-blue-500',
      icon: ArrowPathIcon
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor transaction performance and trends
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            onClick={() => handleExportReport('pdf')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.format === 'currency' && formatCurrency(stat.value)}
                        {stat.format === 'number' && stat.value.toLocaleString()}
                        {stat.format === 'percentage' && `${stat.value.toFixed(1)}%`}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor(stat.change)}`}>
                        {getChangeIcon(stat.change)}
                        <span className="ml-1">{formatPercentage(stat.change)}</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="revenue">Revenue</option>
              <option value="transactions">Transactions</option>
              <option value="average">Average Value</option>
            </select>
          </div>
          
          {/* Simple Chart Placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Chart visualization would go here</p>
              <p className="text-xs text-gray-400">
                Integration with Chart.js or similar library recommended
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Status Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Transaction Status</h3>
          <div className="space-y-4">
            {statusBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <item.icon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{item.status}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">{item.count.toLocaleString()}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Bars */}
          <div className="mt-6 space-y-3">
            {statusBreakdown.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{item.status}</span>
                  <span>{item.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Payment Methods */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Top Payment Methods</h3>
          <div className="space-y-4">
            {stats?.paymentMethods?.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{method.name}</p>
                    <p className="text-xs text-gray-500">{method.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(method.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{method.percentage}%</p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500">No payment method data available</p>
            )}
          </div>
        </div>

        {/* Transaction Volume by Hour */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Peak Hours</h3>
          <div className="space-y-3">
            {stats?.hourlyVolume?.map((hour, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{hour.hour}:00</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${(hour.count / Math.max(...(stats?.hourlyVolume?.map(h => h.count) || [1]))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {hour.count}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500">No hourly data available</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {stats?.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <activity.icon className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <div className="flex-shrink-0 text-sm font-medium text-gray-900">
                  {activity.amount && formatCurrency(activity.amount)}
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {stats?.averageProcessingTime || 0}s
            </div>
            <div className="text-sm text-gray-500">Avg Processing Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats?.refundRate || 0}%
            </div>
            <div className="text-sm text-gray-500">Refund Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.repeatCustomers || 0}%
            </div>
            <div className="text-sm text-gray-500">Repeat Customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats?.averageOrderValue || 0)}
            </div>
            <div className="text-sm text-gray-500">Avg Order Value</div>
          </div>
        </div>
      </div>

      {/* Alerts and Recommendations */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Alerts & Recommendations</h3>
          <div className="space-y-4">
            {stats.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-md ${
                  alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  alert.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {alert.type === 'warning' && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    )}
                    {alert.type === 'error' && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    )}
                    {alert.type === 'info' && (
                      <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${
                      alert.type === 'warning' ? 'text-yellow-800' :
                      alert.type === 'error' ? 'text-red-800' :
                      'text-blue-800'
                    }`}>
                      {alert.title}
                    </h4>
                    <p className={`mt-1 text-sm ${
                      alert.type === 'warning' ? 'text-yellow-700' :
                      alert.type === 'error' ? 'text-red-700' :
                      'text-blue-700'
                    }`}>
                      {alert.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionStats;