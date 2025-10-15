import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchInventory,
  updateStock,
  setLowStockAlert,
  bulkUpdateStock,
  fetchStockHistory,
  generateStockReport
} from '../../store/slices/inventorySlice';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PencilIcon,
  BuildingStorefrontIcon,
  TagIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const InventoryManagement = () => {
  const dispatch = useDispatch();
  const { 
    inventory, 
    loading, 
    error, 
    pagination,
    stats 
  } = useSelector((state) => state.inventory);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [editData, setEditData] = useState({});

  const tabs = [
    { id: 'all', name: 'All Products', icon: CubeIcon, count: inventory?.length || 0 },
    { id: 'low_stock', name: 'Low Stock', icon: ExclamationTriangleIcon, count: inventory?.filter(i => i.stock <= i.lowStockThreshold)?.length || 0 },
    { id: 'out_of_stock', name: 'Out of Stock', icon: ArrowTrendingDownIcon, count: inventory?.filter(i => i.stock === 0)?.length || 0 },
    { id: 'overstocked', name: 'Overstocked', icon: ArrowTrendingUpIcon, count: inventory?.filter(i => i.stock > i.maxStockThreshold)?.length || 0 },
    { id: 'pending_restock', name: 'Pending Restock', icon: ClockIcon, count: inventory?.filter(i => i.restockStatus === 'pending')?.length || 0 }
  ];

  const stockStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'overstocked'];
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Beauty', 'Toys', 'Automotive', 'Other'];

  useEffect(() => {
    dispatch(fetchInventory({ page: 1, limit: 50 }));
  }, [dispatch]);

  const handleViewItem = (item) => {
    setModalMode('view');
    setSelectedItem(item);
    setEditData({
      stock: item.stock,
      price: item.price,
      lowStockThreshold: item.lowStockThreshold,
      maxStockThreshold: item.maxStockThreshold
    });
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setEditData({
      stock: item.stock,
      price: item.price,
      lowStockThreshold: item.lowStockThreshold,
      maxStockThreshold: item.maxStockThreshold
    });
    setShowModal(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;
    
    dispatch(updateInventoryItem({
      id: selectedItem.id,
      updates: editData,
      updatedBy: currentUser.id
    }));
    setShowModal(false);
  };

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to update');
      return;
    }
    if (!bulkAction) {
      alert('Please select an action');
      return;
    }
    
    if (window.confirm(`Are you sure you want to ${bulkAction} ${selectedItems.length} items?`)) {
      dispatch(bulkUpdateStock({ 
        updates: selectedItems.map(itemId => ({ productId: itemId, action: bulkAction })),
        reason: `Bulk ${bulkAction} by ${currentUser.name}`
      }));
      setSelectedItems([]);
      setBulkAction('');
    }
  };

  const handleFlagLowStock = (itemId) => {
    dispatch(flagLowStock({ itemId, flaggedBy: currentUser.id }));
  };

  const handleRequestRestock = (itemId, quantity) => {
    dispatch(requestRestock({ 
      itemId, 
      quantity, 
      requestedBy: currentUser.id 
    }));
  };

  const handleApproveRestock = (itemId) => {
    dispatch(approveRestock({ 
      itemId, 
      approvedBy: currentUser.id 
    }));
  };

  const handleExportInventory = () => {
    dispatch(exportInventory({ 
      category: categoryFilter,
      store: storeFilter,
      stockStatus: stockFilter,
      priceRange 
    }));
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map(i => i.id));
    }
  };

  const filteredInventory = inventory?.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.storeName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    const matchesStore = storeFilter === '' || item.storeId === storeFilter;
    const matchesStock = stockFilter === '' || getStockStatus(item) === stockFilter;
    const matchesPrice = (priceRange.min === '' || item.price >= parseFloat(priceRange.min)) &&
                        (priceRange.max === '' || item.price <= parseFloat(priceRange.max));
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'low_stock' && item.stock <= item.lowStockThreshold) ||
                      (activeTab === 'out_of_stock' && item.stock === 0) ||
                      (activeTab === 'overstocked' && item.stock > item.maxStockThreshold) ||
                      (activeTab === 'pending_restock' && item.restockStatus === 'pending');
    
    return matchesSearch && matchesCategory && matchesStore && matchesStock && matchesPrice && matchesTab;
  }) || [];

  const getStockStatus = (item) => {
    if (item.stock === 0) return 'out_of_stock';
    if (item.stock <= item.lowStockThreshold) return 'low_stock';
    if (item.stock > item.maxStockThreshold) return 'overstocked';
    return 'in_stock';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      case 'overstocked': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageInventory = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || currentUser?.role === 'Inventory Manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Monitor and manage inventory across all stores</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportInventory}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalProducts?.toLocaleString() || inventory?.length || 0}
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
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Low Stock Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {inventory?.filter(i => i.stock <= i.lowStockThreshold)?.length || 0}
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
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Out of Stock
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {inventory?.filter(i => i.stock === 0)?.length || 0}
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
                <ChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${stats?.totalValue?.toLocaleString() || '0'}
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
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, store..."
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
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="">All Stores</option>
              <option value="store1">Store 1</option>
              <option value="store2">Store 2</option>
              <option value="store3">Store 3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="">All Status</option>
              {stockStatuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Range
            </label>
            <div className="flex space-x-1">
              <input
                type="number"
                placeholder="Min"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={priceRange.min}
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={priceRange.max}
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bulk Actions
            </label>
            <div className="flex space-x-1">
              <select
                className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <option value="">Select Action</option>
                <option value="flag_low_stock">Flag Low Stock</option>
                <option value="request_restock">Request Restock</option>
                <option value="update_thresholds">Update Thresholds</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={selectedItems.length === 0 || !bulkAction}
                className="px-2 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 text-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredInventory.length && filteredInventory.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img 
                              className="h-10 w-10 rounded-lg object-cover" 
                              src={item.image || '/placeholder-product.png'} 
                              alt={item.name}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BuildingStorefrontIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{item.storeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.stock}</div>
                        <div className="text-xs text-gray-500">
                          Low: {item.lowStockThreshold} | Max: {item.maxStockThreshold}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${item.price?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(stockStatus)}`}>
                          {stockStatus.replace('_', ' ').charAt(0).toUpperCase() + 
                           stockStatus.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewItem(item)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canManageInventory && (
                            <>
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {stockStatus === 'low_stock' && (
                                <button
                                  onClick={() => handleFlagLowStock(item.id)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Flag Low Stock"
                                >
                                  <ExclamationTriangleIcon className="h-4 w-4" />
                                </button>
                              )}
                              {stockStatus === 'out_of_stock' && (
                                <button
                                  onClick={() => handleRequestRestock(item.id, item.lowStockThreshold * 2)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Request Restock"
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

      {/* Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {modalMode === 'edit' ? 'Edit' : 'View'} Product: {selectedItem.name}
                  </h3>
                  <p className="text-sm text-gray-600">SKU: {selectedItem.sku}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(getStockStatus(selectedItem))}`}>
                    {getStockStatus(selectedItem).replace('_', ' ').charAt(0).toUpperCase() + 
                     getStockStatus(selectedItem).replace('_', ' ').slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Product Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-center space-x-4">
                        <img 
                          className="h-16 w-16 rounded-lg object-cover" 
                          src={selectedItem.image || '/placeholder-product.png'} 
                          alt={selectedItem.name}
                        />
                        <div>
                          <h5 className="font-medium text-gray-900">{selectedItem.name}</h5>
                          <p className="text-sm text-gray-600">{selectedItem.category}</p>
                          <p className="text-sm text-gray-600">Store: {selectedItem.storeName}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                          {modalMode === 'edit' ? (
                            <input
                              type="number"
                              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              value={editData.stock}
                              onChange={(e) => setEditData({...editData, stock: parseInt(e.target.value)})}
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{selectedItem.stock}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Price</label>
                          {modalMode === 'edit' ? (
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              value={editData.price}
                              onChange={(e) => setEditData({...editData, price: parseFloat(e.target.value)})}
                            />
                          ) : (
                            <p className="text-sm text-gray-900">${selectedItem.price?.toFixed(2)}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
                          {modalMode === 'edit' ? (
                            <input
                              type="number"
                              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              value={editData.lowStockThreshold}
                              onChange={(e) => setEditData({...editData, lowStockThreshold: parseInt(e.target.value)})}
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{selectedItem.lowStockThreshold}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Max Stock Threshold</label>
                          {modalMode === 'edit' ? (
                            <input
                              type="number"
                              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              value={editData.maxStockThreshold}
                              onChange={(e) => setEditData({...editData, maxStockThreshold: parseInt(e.target.value)})}
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{selectedItem.maxStockThreshold}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock History & Analytics */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Stock Analytics</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Value:</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${(selectedItem.stock * selectedItem.price).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Days of Stock:</span>
                        <span className="text-sm text-gray-900">
                          {selectedItem.averageDailySales ? 
                            Math.floor(selectedItem.stock / selectedItem.averageDailySales) : 'N/A'} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Restock Status:</span>
                        <span className="text-sm text-gray-900">
                          {selectedItem.restockStatus || 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Restocked:</span>
                        <span className="text-sm text-gray-900">
                          {selectedItem.lastRestocked ? 
                            new Date(selectedItem.lastRestocked).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Stock Changes</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                      {selectedItem.stockHistory?.length > 0 ? (
                        selectedItem.stockHistory.map((entry, index) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-gray-600">{entry.action}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1">
                              {entry.previousStock} → {entry.newStock} ({entry.change > 0 ? '+' : ''}{entry.change})
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No stock history available</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {canManageInventory && modalMode === 'view' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setModalMode('edit')}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Edit Item
                        </button>
                        {getStockStatus(selectedItem) === 'low_stock' && (
                          <button
                            onClick={() => handleFlagLowStock(selectedItem.id)}
                            className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                          >
                            Flag Low Stock
                          </button>
                        )}
                        {getStockStatus(selectedItem) === 'out_of_stock' && (
                          <button
                            onClick={() => handleRequestRestock(selectedItem.id, selectedItem.lowStockThreshold * 2)}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Request Restock
                          </button>
                        )}
                        {selectedItem.restockStatus === 'pending' && (
                          <button
                            onClick={() => handleApproveRestock(selectedItem.id)}
                            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                          >
                            Approve Restock
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                {modalMode === 'edit' && (
                  <>
                    <button
                      onClick={() => setModalMode('view')}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateItem}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                    >
                      Save Changes
                    </button>
                  </>
                )}
                {modalMode === 'view' && (
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;