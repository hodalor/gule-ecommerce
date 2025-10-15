import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRefunds,
  processRefund,
  approveRefund,
  rejectRefund,
  escalateRefund,
  addRefundNote,
  bulkUpdateRefunds,
  exportRefunds
} from '../../store/slices/refundsSlice';
import {
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  BanknotesIcon,
  CreditCardIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

const RefundsManagement = () => {
  const dispatch = useDispatch();
  const { 
    refunds, 
    loading, 
    error, 
    pagination,
    totalAmount,
    stats 
  } = useSelector((state) => state.refunds);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedRefunds, setSelectedRefunds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const tabs = [
    { id: 'all', name: 'All Refunds', icon: CurrencyDollarIcon, count: refunds?.length || 0 },
    { id: 'pending', name: 'Pending', icon: ClockIcon, count: refunds?.filter(r => r.status === 'pending')?.length || 0 },
    { id: 'approved', name: 'Approved', icon: CheckCircleIcon, count: refunds?.filter(r => r.status === 'approved')?.length || 0 },
    { id: 'processing', name: 'Processing', icon: ArrowPathIcon, count: refunds?.filter(r => r.status === 'processing')?.length || 0 },
    { id: 'completed', name: 'Completed', icon: BanknotesIcon, count: refunds?.filter(r => r.status === 'completed')?.length || 0 },
    { id: 'rejected', name: 'Rejected', icon: XCircleIcon, count: refunds?.filter(r => r.status === 'rejected')?.length || 0 }
  ];

  const refundStatuses = ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'];
  const refundTypes = ['order_cancellation', 'product_return', 'defective_product', 'wrong_item', 'damaged_shipping', 'seller_issue', 'payment_error', 'other'];
  const refundMethods = ['original_payment', 'store_credit', 'bank_transfer', 'check'];

  useEffect(() => {
    dispatch(fetchRefunds({ page: 1, limit: 20 }));
  }, [dispatch]);

  const handleViewRefund = (refund) => {
    setModalMode('view');
    setSelectedRefund(refund);
    setRefundReason(refund.reason || '');
    setAdminNotes(refund.adminNotes || '');
    setShowModal(true);
  };

  const handleApproveRefund = async (refundId) => {
    if (window.confirm('Are you sure you want to approve this refund?')) {
      dispatch(approveRefund({ 
        id: refundId, 
        adminNotes,
        approvedBy: currentUser.id 
      }));
    }
  };

  const handleRejectRefund = async (refundId) => {
    if (!refundReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (window.confirm('Are you sure you want to reject this refund?')) {
      dispatch(rejectRefund({ 
        id: refundId, 
        reason: refundReason,
        adminNotes,
        rejectedBy: currentUser.id 
      }));
    }
  };

  const handleProcessRefund = async (refundId) => {
    if (window.confirm('Are you sure you want to process this refund?')) {
      dispatch(processRefund({ 
        id: refundId,
        processedBy: currentUser.id 
      }));
    }
  };

  const handleEscalateRefund = async (refundId) => {
    if (window.confirm('Are you sure you want to escalate this refund?')) {
      dispatch(escalateRefund({ 
        id: refundId,
        escalatedBy: currentUser.id 
      }));
    }
  };

  const handleBulkAction = async () => {
    if (selectedRefunds.length === 0) {
      alert('Please select refunds to process');
      return;
    }
    if (!bulkAction) {
      alert('Please select an action');
      return;
    }
    if (window.confirm(`Are you sure you want to ${bulkAction} ${selectedRefunds.length} refunds?`)) {
      dispatch(bulkUpdateRefunds({ 
        refundIds: selectedRefunds, 
        action: bulkAction,
        data: { processedBy: currentUser.id }
      }));
      setSelectedRefunds([]);
      setBulkAction('');
    }
  };

  const handleExportRefunds = () => {
    dispatch(exportRefunds({ 
      status: statusFilter,
      type: typeFilter,
      amountRange,
      dateRange 
    }));
  };

  const handleSelectRefund = (refundId) => {
    setSelectedRefunds(prev => 
      prev.includes(refundId) 
        ? prev.filter(id => id !== refundId)
        : [...prev, refundId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRefunds.length === filteredRefunds.length) {
      setSelectedRefunds([]);
    } else {
      setSelectedRefunds(filteredRefunds.map(r => r.id));
    }
  };

  const filteredRefunds = refunds?.filter(refund => {
    const matchesSearch = refund.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         refund.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         refund.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || refund.status === statusFilter;
    const matchesType = typeFilter === '' || refund.type === typeFilter;
    const matchesAmount = (amountRange.min === '' || refund.amount >= parseFloat(amountRange.min)) &&
                         (amountRange.max === '' || refund.amount <= parseFloat(amountRange.max));
    const matchesTab = activeTab === 'all' || refund.status === activeTab;
    
    return matchesSearch && matchesStatus && matchesType && matchesAmount && matchesTab;
  }) || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'order_cancellation': return XCircleIcon;
      case 'product_return': return ArrowPathIcon;
      case 'defective_product': return ExclamationTriangleIcon;
      case 'payment_error': return CreditCardIcon;
      default: return ShoppingBagIcon;
    }
  };

  const canManageRefunds = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || currentUser?.role === 'Finance Manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refunds & Disputes Management</h1>
          <p className="text-gray-600">Process refunds and handle payment disputes efficiently</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportRefunds}
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
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Refund Amount
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${stats?.totalAmount?.toLocaleString() || '0'}
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
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Refunds
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {refunds?.filter(r => r.status === 'pending')?.length || 0}
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
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {refunds?.filter(r => r.status === 'completed' && 
                      new Date(r.completedAt).toDateString() === new Date().toDateString())?.length || 0}
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
                <BanknotesIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Processing
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {refunds?.filter(r => r.status === 'processing')?.length || 0}
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
              Search Refunds
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order, customer, ID..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {refundStatuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {refundTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Range
            </label>
            <div className="flex space-x-1">
              <input
                type="number"
                placeholder="Min"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={amountRange.min}
                onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={amountRange.max}
                onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
              />
            </div>
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
              Bulk Actions
            </label>
            <div className="flex space-x-1">
              <select
                className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <option value="">Select Action</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="process">Process</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={selectedRefunds.length === 0 || !bulkAction}
                className="px-2 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 text-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedRefunds.length === filteredRefunds.length && filteredRefunds.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refund ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order & Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
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
                    Loading refunds...
                  </td>
                </tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No refunds found
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((refund) => {
                  const TypeIcon = getTypeIcon(refund.type);
                  return (
                    <tr key={refund.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRefunds.includes(refund.id)}
                          onChange={() => handleSelectRefund(refund.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{refund.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Order #{refund.orderNumber}</div>
                          <div className="text-sm text-gray-500">{refund.customerName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TypeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {refund.type?.replace('_', ' ').charAt(0).toUpperCase() + 
                             refund.type?.replace('_', ' ').slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${refund.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(refund.status)}`}>
                          {refund.status?.replace('_', ' ').charAt(0).toUpperCase() + 
                           refund.status?.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(refund.requestedAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewRefund(refund)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canManageRefunds && (
                            <>
                              {refund.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveRefund(refund.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Approve"
                                  >
                                    <CheckCircleIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectRefund(refund.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Reject"
                                  >
                                    <XCircleIcon className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {refund.status === 'approved' && (
                                <button
                                  onClick={() => handleProcessRefund(refund.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Process Refund"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </button>
                              )}
                              {refund.status !== 'completed' && refund.status !== 'rejected' && (
                                <button
                                  onClick={() => handleEscalateRefund(refund.id)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Escalate"
                                >
                                  <ExclamationTriangleIcon className="h-4 w-4" />
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
      {showModal && selectedRefund && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Refund #{selectedRefund.id}
                  </h3>
                  <p className="text-sm text-gray-600">Order #{selectedRefund.orderNumber}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRefund.status)}`}>
                    {selectedRefund.status?.replace('_', ' ').charAt(0).toUpperCase() + 
                     selectedRefund.status?.replace('_', ' ').slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Refund Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Refund Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="text-sm font-medium text-gray-900">${selectedRefund.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className="text-sm text-gray-900">
                          {selectedRefund.type?.replace('_', ' ').charAt(0).toUpperCase() + 
                           selectedRefund.type?.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Method:</span>
                        <span className="text-sm text-gray-900">
                          {selectedRefund.refundMethod?.replace('_', ' ').charAt(0).toUpperCase() + 
                           selectedRefund.refundMethod?.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer:</span>
                        <span className="text-sm text-gray-900">{selectedRefund.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Requested:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedRefund.requestedAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Reason</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedRefund.customerReason || 'No reason provided'}</p>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {canManageRefunds && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Admin Actions</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Admin Notes
                          </label>
                          <textarea
                            rows="3"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Add notes about this refund..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                          />
                        </div>
                        {selectedRefund.status === 'pending' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rejection Reason (if rejecting)
                            </label>
                            <textarea
                              rows="2"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Reason for rejection..."
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Information & Actions */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Order Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Total:</span>
                        <span className="text-sm font-medium text-gray-900">${selectedRefund.orderTotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Date:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedRefund.orderDate || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Seller:</span>
                        <span className="text-sm text-gray-900">{selectedRefund.sellerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment Method:</span>
                        <span className="text-sm text-gray-900">{selectedRefund.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Processing History */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Processing History</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                      {selectedRefund.history?.length > 0 ? (
                        selectedRefund.history.map((entry, index) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-medium text-gray-600">{entry.action}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1">{entry.notes}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No processing history yet</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {canManageRefunds && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRefund.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveRefund(selectedRefund.id)}
                              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectRefund(selectedRefund.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {selectedRefund.status === 'approved' && (
                          <button
                            onClick={() => handleProcessRefund(selectedRefund.id)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            Process Refund
                          </button>
                        )}
                        {selectedRefund.status !== 'completed' && selectedRefund.status !== 'rejected' && (
                          <button
                            onClick={() => handleEscalateRefund(selectedRefund.id)}
                            className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                          >
                            Escalate
                          </button>
                        )}
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

export default RefundsManagement;