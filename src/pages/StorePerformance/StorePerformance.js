import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStorePerformance,
  fetchStoreDetails,
  fetchStoreAnalytics,
  updateStoreStatus,
  generatePerformanceReport,
  fetchTopPerformingStores,
  flagStore
} from '../../store/slices/storePerformanceSlice';
import {
  BuildingStorefrontIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  StarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StorePerformance = () => {
  const dispatch = useDispatch();
  const { 
    stores, 
    analytics, 
    loading, 
    error,
    performanceMetrics 
  } = useSelector((state) => state.storePerformance);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStore, setSelectedStore] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'revenue', name: 'Revenue', icon: CurrencyDollarIcon },
    { id: 'orders', name: 'Orders', icon: ShoppingBagIcon },
    { id: 'customers', name: 'Customers', icon: UsersIcon },
    { id: 'ratings', name: 'Ratings', icon: StarIcon },
    { id: 'issues', name: 'Issues', icon: ExclamationTriangleIcon }
  ];

  const performanceCategories = ['excellent', 'good', 'average', 'poor', 'critical'];
  const storeCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Beauty', 'Toys', 'Automotive', 'Other'];

  useEffect(() => {
    dispatch(fetchStorePerformance({ 
      dateRange: dateRange.start && dateRange.end ? dateRange : null 
    }));
    dispatch(fetchStoreAnalytics());
  }, [dispatch, dateRange]);

  const handleViewStore = (store) => {
    setModalMode('view');
    setSelectedStore(store);
    setShowModal(true);
  };

  const handleUpdateStoreStatus = async (storeId, status) => {
    if (window.confirm(`Are you sure you want to ${status} this store?`)) {
      dispatch(updateStoreStatus({ 
        storeId, 
        status, 
        updatedBy: currentUser.id 
      }));
    }
  };

  const handleFlagIssue = (storeId, issueType, description) => {
    dispatch(flagStore({ 
      storeId, 
      issueType, 
      description,
      flaggedBy: currentUser.id 
    }));
  };

  const handleExportReport = () => {
    dispatch(generatePerformanceReport({ 
      stores: filteredStores.map(s => s.id),
      dateRange,
      metrics: ['revenue', 'orders', 'customers', 'ratings']
    }));
  };

  const filteredStores = stores?.filter(store => {
    const matchesSearch = store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || store.category === categoryFilter;
    const matchesPerformance = performanceFilter === '' || getPerformanceCategory(store) === performanceFilter;
    
    return matchesSearch && matchesCategory && matchesPerformance;
  })?.sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  }) || [];

  const getPerformanceCategory = (store) => {
    const score = calculatePerformanceScore(store);
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    if (score >= 40) return 'poor';
    return 'critical';
  };

  const calculatePerformanceScore = (store) => {
    const revenueScore = Math.min((store.monthlyRevenue / 10000) * 30, 30);
    const orderScore = Math.min((store.monthlyOrders / 100) * 25, 25);
    const ratingScore = (store.averageRating / 5) * 25;
    const responseScore = Math.max(25 - (store.averageResponseTime / 24) * 5, 0);
    
    return Math.round(revenueScore + orderScore + ratingScore + responseScore);
  };

  const getPerformanceColor = (category) => {
    switch (category) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'average': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const canManageStores = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || currentUser?.role === 'Store Manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Performance</h1>
          <p className="text-gray-600">Monitor and analyze store performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingStorefrontIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Stores
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stores?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${performanceMetrics?.totalRevenue?.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performanceMetrics?.totalOrders?.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <StarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Rating
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performanceMetrics?.averageRating?.toFixed(1) || '0.0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Analytics Charts */}
      {activeTab === 'overview' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Orders Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.ordersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Store Performance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.performanceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.performanceDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Stores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topStores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Stores
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, owner..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {storeCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Performance
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="">All Performance</option>
              {performanceCategories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex space-x-1">
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="revenue">Revenue</option>
              <option value="orders">Orders</option>
              <option value="customers">Customers</option>
              <option value="rating">Rating</option>
              <option value="name">Name</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    Loading stores...
                  </td>
                </tr>
              ) : filteredStores.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No stores found
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => {
                  const performanceCategory = getPerformanceCategory(store);
                  const performanceScore = calculatePerformanceScore(store);
                  return (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img 
                              className="h-10 w-10 rounded-lg object-cover" 
                              src={store.logo || '/placeholder-store.png'} 
                              alt={store.name}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{store.name}</div>
                            <div className="text-sm text-gray-500">{store.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{store.ownerName}</div>
                        <div className="text-sm text-gray-500">{store.ownerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(performanceCategory)}`}>
                            {performanceCategory.charAt(0).toUpperCase() + performanceCategory.slice(1)}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">({performanceScore}%)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${store.monthlyRevenue?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {store.revenueGrowth > 0 ? (
                            <span className="text-green-600 flex items-center">
                              <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                              +{store.revenueGrowth}%
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center">
                              <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                              {store.revenueGrowth}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {store.monthlyOrders?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Avg: ${store.averageOrderValue?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {store.averageRating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            ({store.totalReviews || 0})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(store.status)}`}>
                          {store.status?.charAt(0).toUpperCase() + store.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewStore(store)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canManageStores && (
                            <>
                              {store.status === 'active' && (
                                <button
                                  onClick={() => handleUpdateStoreStatus(store.id, 'suspend')}
                                  className="text-red-600 hover:text-red-900"
                                  title="Suspend Store"
                                >
                                  <ExclamationTriangleIcon className="h-4 w-4" />
                                </button>
                              )}
                              {store.status === 'suspended' && (
                                <button
                                  onClick={() => handleUpdateStoreStatus(store.id, 'activate')}
                                  className="text-green-600 hover:text-green-900"
                                  title="Activate Store"
                                >
                                  <ArrowTrendingUpIcon className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store Details Modal */}
      {showModal && selectedStore && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <img 
                    className="h-16 w-16 rounded-lg object-cover mr-4" 
                    src={selectedStore.logo || '/placeholder-store.png'} 
                    alt={selectedStore.name}
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedStore.name}</h3>
                    <p className="text-sm text-gray-600">{selectedStore.category}</p>
                    <p className="text-sm text-gray-600">Owner: {selectedStore.ownerName}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(getPerformanceCategory(selectedStore))}`}>
                    {getPerformanceCategory(selectedStore).charAt(0).toUpperCase() + getPerformanceCategory(selectedStore).slice(1)}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedStore.status)}`}>
                    {selectedStore.status?.charAt(0).toUpperCase() + selectedStore.status?.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Performance Metrics</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Performance Score</label>
                          <p className="text-lg font-semibold text-gray-900">{calculatePerformanceScore(selectedStore)}%</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Monthly Revenue</label>
                          <p className="text-lg font-semibold text-gray-900">${selectedStore.monthlyRevenue?.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Monthly Orders</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedStore.monthlyOrders?.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Average Rating</label>
                          <div className="flex items-center">
                            <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                            <span className="text-lg font-semibold text-gray-900">{selectedStore.averageRating?.toFixed(1)}</span>
                            <span className="text-sm text-gray-500 ml-1">({selectedStore.totalReviews})</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Response Time</label>
                          <p className="text-sm text-gray-900">{selectedStore.averageResponseTime} hours</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Customer Satisfaction</label>
                          <p className="text-sm text-gray-900">{selectedStore.customerSatisfaction}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Store Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Store ID:</span>
                        <span className="text-sm text-gray-900">{selectedStore.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedStore.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Products:</span>
                        <span className="text-sm text-gray-900">{selectedStore.totalProducts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Customers:</span>
                        <span className="text-sm text-gray-900">{selectedStore.totalCustomers || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts and Analytics */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Revenue Trend (Last 30 Days)</h4>
                    <div className="bg-gray-50 p-4 rounded-lg" style={{ height: '200px' }}>
                      {selectedStore.revenueData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedStore.revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                            <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No revenue data available
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Issues</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                      {selectedStore.recentIssues?.length > 0 ? (
                        selectedStore.recentIssues.map((issue, index) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-gray-600">{issue.type}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(issue.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1">{issue.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent issues</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {canManageStores && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedStore.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateStoreStatus(selectedStore.id, 'suspend')}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Suspend Store
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStoreStatus(selectedStore.id, 'activate')}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Activate Store
                          </button>
                        )}
                        <button
                          onClick={() => handleFlagIssue(selectedStore.id, 'performance', 'Manual performance review required')}
                          className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                        >
                          Flag Issue
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePerformance;