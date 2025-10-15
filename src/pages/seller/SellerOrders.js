import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { fetchSellerOrders, updateOrderStatus } from '../../store/slices/orderSlice';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

const SellerOrders = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { orders, loading, error } = useSelector((state) => state.orders);

  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('orderDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    orderId: null,
    newStatus: '',
    trackingNumber: '',
    notes: ''
  });

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Fetch seller orders on component mount
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSellerOrders({ sellerId: user.id, page: 1, limit: 50 }));
    }
  }, [dispatch, user?.id]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      if (error) {
        // Clear error when component unmounts
      }
    };
  }, [error]);

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
    { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: CheckIcon },
    { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: TruckIcon },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckIcon },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XMarkIcon }
  ];

  const paymentStatusOptions = [
    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
    { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-800' }
  ];

  // Filter and sort orders based on current filters
  useEffect(() => {
    if (!orders || !Array.isArray(orders)) {
      setFilteredOrders([]);
      return;
    }

    let filtered = orders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });

    // Sort orders
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'orderDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'total') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleUpdateStatus = (order) => {
    setStatusUpdate({
      orderId: order.id,
      newStatus: order.status,
      trackingNumber: order.trackingNumber || '',
      notes: ''
    });
    setShowStatusModal(true);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }

    setBulkAction(action);
    setShowBulkModal(true);
  };

  const handleSubmitBulkAction = () => {
    switch (bulkAction) {
      case 'mark_processing':
        selectedOrders.forEach(orderId => {
          dispatch(updateOrderStatus({ orderId, status: 'processing' }));
        });
        toast.success(`${selectedOrders.length} orders marked as processing`);
        break;
      case 'mark_shipped':
        selectedOrders.forEach(orderId => {
          dispatch(updateOrderStatus({ orderId, status: 'shipped' }));
        });
        toast.success(`${selectedOrders.length} orders marked as shipped`);
        break;
      case 'print_labels':
        toast.success(`Printing shipping labels for ${selectedOrders.length} orders`);
        break;
      case 'export':
        toast.success(`Exporting ${selectedOrders.length} orders`);
        break;
      default:
        break;
    }
    
    setSelectedOrders([]);
    setShowBulkModal(false);
    setBulkAction('');
  };

  const handleSubmitStatusUpdate = (e) => {
    e.preventDefault();
    
    dispatch(updateOrderStatus({
      orderId: statusUpdate.orderId,
      status: statusUpdate.newStatus,
      trackingNumber: statusUpdate.trackingNumber,
      notes: statusUpdate.notes
    }));

    toast.success('Order status updated successfully');
    setShowStatusModal(false);
    setStatusUpdate({
      orderId: null,
      newStatus: '',
      trackingNumber: '',
      notes: ''
    });
  };

  const handlePrintOrder = (order) => {
    // In a real app, this would generate a printable invoice
    toast.success('Printing order invoice...');
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const statusOption = paymentStatusOptions.find(s => s.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderStats = () => {
    if (!orders || !Array.isArray(orders)) {
      return {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0
      };
    }

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length
    };
    return stats;
  };

  const stats = getOrderStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-1">Manage your incoming orders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-2 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <CheckIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Shipped</p>
              <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <TruckIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Payments</option>
              {paymentStatusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="orderDate">Sort by Date</option>
              <option value="total">Sort by Total</option>
              <option value="status">Sort by Status</option>
              <option value="customer.name">Sort by Customer</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-gray-600">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('mark_processing')}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Mark Processing
                </button>
                <button
                  onClick={() => handleBulkAction('mark_shipped')}
                  className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                  Mark Shipped
                </button>
                <button
                  onClick={() => handleBulkAction('print_labels')}
                  className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                >
                  Print Labels
                </button>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Export
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedOrders([])}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading orders...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Error loading orders: {error}</p>
              <button
                onClick={() => dispatch(fetchSellerOrders({ sellerId: user?.id, page: 1, limit: 50 }))}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No orders found</p>
              <p className="text-sm text-gray-500">
                {orders?.length === 0 ? "You haven't received any orders yet." : "No orders match your current filters."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1">
                      Order ID
                      {sortBy === 'id' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customer.name')}
                  >
                    <div className="flex items-center gap-1">
                      Customer
                      {sortBy === 'customer.name' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center gap-1">
                      Total
                      {sortBy === 'total' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('orderDate')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortBy === 'orderDate' && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id || order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id || order._id)}
                        onChange={() => handleSelectOrder(order.id || order._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.id || order._id}</div>
                      {order.trackingNumber && (
                        <div className="text-sm text-gray-600">Track: {order.trackingNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{order.customer?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-600">{order.customer?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <img
                           src={order.items?.[0]?.image || 'https://via.placeholder.com/40x40?text=No+Image'}
                           alt={order.items?.[0]?.name || 'Product'}
                           className="w-10 h-10 object-cover rounded"
                         />
                         <div>
                           <div className="text-sm font-medium text-gray-900">
                             {order.items?.[0]?.name || 'Product'}
                             {order.items?.length > 1 && (
                               <span className="text-gray-600"> +{order.items.length - 1} more</span>
                             )}
                           </div>
                           <div className="text-sm text-gray-600">
                             {order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} item{order.items?.length !== 1 ? 's' : ''}
                           </div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <div className="font-medium text-gray-900">${(order.total || 0).toFixed(2)}</div>
                     </td>
                     <td className="px-6 py-4">
                       <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                         {statusOptions.find(s => s.value === order.status)?.label || order.status}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                         {paymentStatusOptions.find(s => s.value === order.paymentStatus)?.label || order.paymentStatus}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       <div className="text-sm text-gray-900">{formatDate(order.orderDate)}</div>
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex gap-2">
                         <button
                           onClick={() => handleViewOrder(order)}
                           className="text-blue-600 hover:text-blue-700"
                           title="View Order"
                         >
                           <EyeIcon className="h-5 w-5" />
                         </button>
                         <button
                           onClick={() => handleUpdateStatus(order)}
                           className="text-green-600 hover:text-green-700"
                           title="Update Status"
                         >
                           <CheckIcon className="h-5 w-5" />
                         </button>
                         <button
                           onClick={() => handlePrintOrder(order)}
                           className="text-gray-600 hover:text-gray-700"
                           title="Print Invoice"
                         >
                           <PrinterIcon className="h-5 w-5" />
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
        </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Order Details - {selectedOrder.id || selectedOrder._id}</h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Order Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-medium">{selectedOrder.id || selectedOrder._id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(selectedOrder.orderDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {statusOptions.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                        {paymentStatusOptions.find(s => s.value === selectedOrder.paymentStatus)?.label || selectedOrder.paymentStatus}
                      </span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tracking:</span>
                        <span className="font-medium">{selectedOrder.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedOrder.customer?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedOrder.customer?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedOrder.customer?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Shipping Address</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p>{selectedOrder.shippingAddress.street || 'N/A'}</p>
                    <p>{selectedOrder.shippingAddress.city || 'N/A'}, {selectedOrder.shippingAddress.state || 'N/A'} {selectedOrder.shippingAddress.zipCode || 'N/A'}</p>
                    <p>{selectedOrder.shippingAddress.country || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={item.id || item._id || index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.image || 'https://via.placeholder.com/64x64?text=No+Image'}
                        alt={item.name || 'Product'}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name || 'Product'}</h4>
                        <p className="text-sm text-gray-600">SKU: {item.sku || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">${(item.price || 0).toFixed(2)} each</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center py-4">No items found</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>${(selectedOrder.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Order Notes</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Update Order Status</h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitStatusUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Status
                </label>
                <select
                  value={statusUpdate.newStatus}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, newStatus: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              {(statusUpdate.newStatus === 'shipped' || statusUpdate.newStatus === 'delivered') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={statusUpdate.trackingNumber}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter tracking number"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this status update"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckIcon className="h-5 w-5" />
                  Update Status
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Bulk Action</h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitBulkAction} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  You have selected {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an action</option>
                  <option value="mark_processing">Mark as Processing</option>
                  <option value="mark_shipped">Mark as Shipped</option>
                  <option value="print_labels">Print Shipping Labels</option>
                  <option value="export">Export Selected Orders</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={!bulkAction}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckIcon className="h-5 w-5" />
                  Apply Action
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOrders;