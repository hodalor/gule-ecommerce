import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOrders,
  updateOrderStatus,
  bulkUpdateOrders,
  assignReviewOfficer
} from '../../store/slices/orderSlice';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MagnifyingGlassIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const OrderManagement = () => {
  const dispatch = useDispatch();
  const { 
    orders, 
    loading, 
    pagination 
  } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const orderStatuses = [
    'Pending',
    'Under Review',
    'Approved',
    'Rejected',
    'In Progress',
    'Delivered',
    'Completed',
    'Refunded'
  ];

  const reviewOfficers = [
    { id: 1, name: 'John Smith', email: 'john@gule.com' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@gule.com' },
    { id: 3, name: 'Mike Wilson', email: 'mike@gule.com' }
  ];

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchOrders({ 
        page: pagination?.currentPage || 1, 
        limit: 20,
        search: searchTerm,
        status: statusFilter,
        startDate: dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : '',
        endDate: dateFilter ? new Date(dateFilter).toISOString().split('T')[0] : ''
      }));
    };

    fetchData();
  }, [dispatch, pagination?.currentPage, searchTerm, statusFilter, dateFilter]);

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

  const handleStatusUpdate = async (orderId, newStatus) => {
    dispatch(updateOrderStatus({ orderId, status: newStatus }));
  };

  const handleBulkStatusUpdate = async (status) => {
    dispatch(bulkUpdateOrders({ orderIds: selectedOrders, status }));
    setSelectedOrders([]);
    setShowBulkActions(false);
  };

  const handleAssignReviewOfficer = async (officerId) => {
    dispatch(assignReviewOfficer({ orderIds: selectedOrders, officerId }));
    setSelectedOrders([]);
    setShowAssignModal(false);
  };

  const handleViewOrderDetails = (order) => {
    setSelectedOrderDetails(order);
    setShowOrderDetailsModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-800';
      case 'Delivered':
        return 'bg-purple-100 text-purple-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toString().includes(searchTerm) ||
                         order.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.productTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    const matchesDate = dateFilter === '' || order.createdAt.startsWith(dateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const canManageOrders = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'review_officer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Manage orders, approvals, and assignments</p>
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Bulk Actions ({selectedOrders.length})
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Assign Officer
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Dropdown */}
      {showBulkActions && (
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Bulk Actions</h3>
          <div className="flex flex-wrap gap-2">
            {orderStatuses.map(status => (
              <button
                key={status}
                onClick={() => handleBulkStatusUpdate(status)}
                className="px-3 py-1 text-xs font-medium rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Mark as {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {orderStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDateFilter('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Orders ({filteredOrders.length})
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Select All</label>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Review Officer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <button
                        onClick={() => handleViewOrderDetails(order)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.productTitle}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.buyerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.sellerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${order.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.reviewOfficer || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewOrderDetails(order)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {canManageOrders && (
                          <>
                            {order.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(order.id, 'Approved')}
                                  className="text-green-600 hover:text-green-900"
                                  title="Approve"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(order.id, 'Rejected')}
                                  className="text-red-600 hover:text-red-900"
                                  title="Reject"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {order.status === 'In Progress' && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'Delivered')}
                                className="text-blue-600 hover:text-blue-900"
                                title="Mark as Delivered"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                            {order.status === 'Delivered' && (
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'Completed')}
                                className="text-green-600 hover:text-green-900"
                                title="Mark as Completed"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrderDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Order Details - #{selectedOrderDetails.id}
                </h3>
                <button
                  onClick={() => setShowOrderDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Order Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-mono">#{selectedOrderDetails.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrderDetails.status)}`}>
                        {selectedOrderDetails.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">${selectedOrderDetails.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedOrderDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Review Officer:</span>
                      <span>{selectedOrderDetails.reviewOfficer || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Product Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product:</span>
                      <span className="font-medium">{selectedOrderDetails.productTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{selectedOrderDetails.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span>{selectedOrderDetails.quantity || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit Price:</span>
                      <span>${selectedOrderDetails.unitPrice || selectedOrderDetails.amount}</span>
                    </div>
                  </div>
                </div>

                {/* Buyer Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Buyer Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{selectedOrderDetails.buyerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedOrderDetails.buyerEmail || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span>{selectedOrderDetails.buyerPhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Seller Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Seller Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{selectedOrderDetails.sellerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedOrderDetails.sellerEmail || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Business:</span>
                      <span>{selectedOrderDetails.businessName || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              {selectedOrderDetails.shippingAddress && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Shipping Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Address:</span>
                      <div className="mt-1">
                        {selectedOrderDetails.shippingAddress.street && (
                          <p>{selectedOrderDetails.shippingAddress.street}</p>
                        )}
                        <p>
                          {selectedOrderDetails.shippingAddress.city}
                          {selectedOrderDetails.shippingAddress.state && `, ${selectedOrderDetails.shippingAddress.state}`}
                          {selectedOrderDetails.shippingAddress.zipCode && ` ${selectedOrderDetails.shippingAddress.zipCode}`}
                        </p>
                        {selectedOrderDetails.shippingAddress.country && (
                          <p>{selectedOrderDetails.shippingAddress.country}</p>
                        )}
                      </div>
                    </div>
                    {selectedOrderDetails.trackingNumber && (
                      <div>
                        <span className="text-gray-600">Tracking Number:</span>
                        <p className="mt-1 font-mono">{selectedOrderDetails.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Notes */}
              {selectedOrderDetails.notes && (
                <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Order Notes</h4>
                  <p className="text-gray-700">{selectedOrderDetails.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowOrderDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {canManageOrders && selectedOrderDetails.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedOrderDetails.id, 'Approved');
                        setShowOrderDetailsModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Approve Order
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedOrderDetails.id, 'Rejected');
                        setShowOrderDetailsModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      Reject Order
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Review Officer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Review Officer
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a review officer for {selectedOrders.length} selected order(s).
              </p>
              
              <div className="space-y-3">
                {reviewOfficers.map((officer) => (
                  <button
                    key={officer.id}
                    onClick={() => handleAssignReviewOfficer(officer.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <div className="font-medium text-gray-900">{officer.name}</div>
                    <div className="text-sm text-gray-500">{officer.email}</div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;