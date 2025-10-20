import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts } from '../../store/slices/productSlice';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BellIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  EyeIcon,
  ClockIcon,
  TruckIcon,
  CubeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const SellerInventory = () => {
  const dispatch = useDispatch();
  const { products, loading, error } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({ quantity: '', reason: '', type: 'add' });
  const [showAlerts, setShowAlerts] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // table or cards

  // Fetch products on component mount
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchProducts({ seller: user.id }));
    }
  }, [dispatch, user?.id]);

  // Transform products data for inventory view
  const inventoryData = products.map(product => {
    const stockStatus = product.stock === 0 ? 'out_of_stock' : 
                       product.stock <= (product.lowStockThreshold || 5) ? 'low_stock' : 'in_stock';
    
    // Calculate stock velocity (mock data for demo)
    const stockVelocity = Math.floor(Math.random() * 10) + 1; // Units sold per day
    const daysUntilStockout = product.stock > 0 ? Math.floor(product.stock / stockVelocity) : 0;
    
    return {
      id: product._id,
      name: product.name,
      sku: product.sku || `SKU-${product._id.slice(-6)}`,
      category: product.category,
      currentStock: product.stock || 0,
      minStock: product.lowStockThreshold || 5,
      maxStock: 100, // Default max stock
      price: product.price,
      cost: product.price * 0.6, // Estimated cost (60% of price)
      status: stockStatus,
      lastUpdated: new Date(product.updatedAt).toISOString().split('T')[0],
      supplier: 'N/A', // Not available in current schema
      stockVelocity,
      daysUntilStockout,
      reorderPoint: product.lowStockThreshold || 5,
      image: product.images?.[0] || 'https://via.placeholder.com/64x64/E5E7EB/9CA3AF?text=No+Image',
      totalValue: (product.stock || 0) * product.price,
      lastSale: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  });

  // Get unique categories for filter
  const categories = [...new Set(inventoryData.map(item => item.category))];

  // Stock alerts
  const stockAlerts = inventoryData.filter(item => 
    item.status === 'low_stock' || item.status === 'out_of_stock' || item.daysUntilStockout <= 3
  );

  const getStatusColor = (status) => {
    const colors = {
      in_stock: 'bg-green-100 text-green-800',
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      in_stock: CheckCircleIcon,
      low_stock: ExclamationTriangleIcon,
      out_of_stock: XCircleIcon
    };
    return icons[status] || CheckCircleIcon;
  };

  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatusFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesCategoryFilter = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesStatusFilter && matchesCategoryFilter;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === sortedInventory.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(sortedInventory.map(item => item.id));
    }
  };

  const handleStockUpdate = (product) => {
    setSelectedProduct(product);
    setStockUpdate({ quantity: '', reason: '', type: 'add' });
    setShowStockModal(true);
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} for products:`, selectedProducts);
    setShowBulkModal(false);
    setSelectedProducts([]);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? 
      <ArrowUpIcon className="h-4 w-4" /> : 
      <ArrowDownIcon className="h-4 w-4" />;
  };

  const InventoryCard = ({ item }) => {
    const StatusIcon = getStatusIcon(item.status);
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedProducts.includes(item.id)}
              onChange={() => handleSelectProduct(item.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-medium text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.sku}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            <StatusIcon className="h-3 w-3" />
            {item.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Current Stock</p>
            <p className="text-lg font-semibold text-gray-900">{item.currentStock}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Stock Value</p>
            <p className="text-lg font-semibold text-gray-900">${item.totalValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Days Until Stockout</p>
            <p className={`text-sm font-medium ${item.daysUntilStockout <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
              {item.daysUntilStockout} days
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Velocity</p>
            <p className="text-sm text-gray-900">{item.stockVelocity}/day</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStockUpdate(item)}
              className="text-blue-600 hover:text-blue-900"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button className="text-gray-600 hover:text-gray-900">
              <EyeIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">Updated {item.lastUpdated}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading inventory...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={() => dispatch(fetchProducts({ seller: user?.id }))}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600">Track and manage your product inventory with advanced analytics</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`p-2 rounded-lg border ${showAlerts ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                <BellIcon className="h-5 w-5" />
              </button>
              <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
                <DocumentArrowDownIcon className="h-5 w-5" />
                Export
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                Add Stock
              </button>
            </div>
          </div>

          {/* Stock Alerts */}
          {showAlerts && stockAlerts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-medium text-yellow-800">Stock Alerts ({stockAlerts.length})</h3>
                </div>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {stockAlerts.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white rounded p-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.status === 'out_of_stock' ? 'Out of stock' : 
                         item.status === 'low_stock' ? `Only ${item.currentStock} left` :
                         `${item.daysUntilStockout} days until stockout`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStockUpdate(item)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                    >
                      Restock
                    </button>
                  </div>
                ))}
                {stockAlerts.length > 3 && (
                  <p className="text-sm text-yellow-700">
                    +{stockAlerts.length - 3} more alerts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{inventoryData.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${inventoryData.reduce((sum, item) => sum + item.totalValue, 0).toFixed(0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    {inventoryData.filter(item => item.status === 'in_stock').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {inventoryData.filter(item => item.status === 'low_stock').length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {inventoryData.filter(item => item.status === 'out_of_stock').length}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Velocity</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(inventoryData.reduce((sum, item) => sum + item.stockVelocity, 0) / inventoryData.length || 0).toFixed(1)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Filters and Search */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products, SKU, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-2 text-sm ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cards
                  </button>
                </div>
                
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FunnelIcon className="h-5 w-5" />
                  More Filters
                </button>
              </div>
            </div>
          </div>

          {/* Inventory Display */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedInventory.map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === sortedInventory.length && sortedInventory.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Product
                          <SortIcon field="name" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('sku')}
                      >
                        <div className="flex items-center gap-1">
                          SKU
                          <SortIcon field="sku" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('currentStock')}
                      >
                        <div className="flex items-center gap-1">
                          Current Stock
                          <SortIcon field="currentStock" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Velocity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Until Stockout
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
                    {sortedInventory.map((item) => {
                      const StatusIcon = getStatusIcon(item.status);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(item.id)}
                              onChange={() => handleSelectProduct(item.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500">{item.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.currentStock}</div>
                            <div className="text-xs text-gray-500">Min: {item.minStock}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">${item.totalValue.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">${item.price}/unit</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.stockVelocity}/day
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${item.daysUntilStockout <= 3 ? 'text-red-600' : item.daysUntilStockout <= 7 ? 'text-yellow-600' : 'text-gray-900'}`}>
                              {item.daysUntilStockout} days
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              <StatusIcon className="h-3 w-3" />
                              {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStockUpdate(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Update Stock"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900" title="View Details">
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900" title="Settings">
                                <Cog6ToothIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enhanced Bulk Actions */}
          {selectedProducts.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-4 z-50">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedProducts.length} item(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Bulk Update
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Reorder
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                    Export
                  </button>
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stock Update Modal */}
          {showStockModal && selectedProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Update Stock: {selectedProduct.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type
                    </label>
                    <select
                      value={stockUpdate.type}
                      onChange={(e) => setStockUpdate(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="add">Add Stock</option>
                      <option value="remove">Remove Stock</option>
                      <option value="set">Set Stock Level</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={stockUpdate.quantity}
                      onChange={(e) => setStockUpdate(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter quantity"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <select
                      value={stockUpdate.reason}
                      onChange={(e) => setStockUpdate(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select reason</option>
                      <option value="restock">Restock</option>
                      <option value="sale">Sale</option>
                      <option value="damage">Damage</option>
                      <option value="return">Return</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      console.log('Stock update:', stockUpdate, selectedProduct);
                      setShowStockModal(false);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Update Stock
                  </button>
                  <button
                    onClick={() => {
                      setShowStockModal(false);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions Modal */}
          {showBulkModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Bulk Actions ({selectedProducts.length} items)
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleBulkAction('update_stock')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <PencilIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Update Stock Levels</p>
                        <p className="text-sm text-gray-500">Modify stock quantities for selected items</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('set_reorder_points')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-gray-900">Set Reorder Points</p>
                        <p className="text-sm text-gray-500">Update minimum stock thresholds</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('export')}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <DocumentArrowDownIcon className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Export Data</p>
                        <p className="text-sm text-gray-500">Download inventory data as CSV</p>
                      </div>
                    </div>
                  </button>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellerInventory;