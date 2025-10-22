import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSellers,
  fetchSellerById,
  updateSellerStatus,
  verifySellerBusiness,
  bulkUpdateSellers,
  fetchSellerStatistics,
  exportSellers,
  setSelectedSeller
} from '../../store/slices/sellerSlice';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const SellerManagement = () => {
  const dispatch = useDispatch();
  const { 
    sellers, 
    loading, 
    error, 
    pagination, 
    selectedSeller,
    sellerStatistics 
  } = useSelector((state) => state.sellers);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedSellers, setSelectedSellers] = useState([]);
  
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // New local state for edit modal controls
  const [statusSelection, setStatusSelection] = useState('pending');
  const [statusReason, setStatusReason] = useState('');
  const [verificationSelection, setVerificationSelection] = useState('pending');
  const [verificationReason, setVerificationReason] = useState('');
  const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' });

  // Derived pagination values for rendering controls
  const currentPage = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;
  const perPage = pagination?.itemsPerPage || 10;
  const totalItems = (pagination?.totalItems ?? sellers.length) || 0;
  const startItem = totalItems ? (currentPage - 1) * perPage + 1 : 0;
  const endItem = Math.min(currentPage * perPage, totalItems);

  // Load sellers and statistics on component mount
  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchSellers({
        page: pagination?.currentPage || 1,
        limit: perPage,
        search: searchTerm,
        status: statusFilter,
        verified: verificationFilter
      }));
    };

    fetchData();
    dispatch(fetchSellerStatistics());
  }, [dispatch, searchTerm, statusFilter, verificationFilter, pagination?.currentPage]);

  const handleStatusChange = async (sellerId, newStatus, reason = '') => {
    try {
      await dispatch(updateSellerStatus({ 
        sellerId, 
        status: newStatus, 
        reason: reason || `Status changed to ${newStatus}` 
      }));
      // Refresh sellers list
      dispatch(fetchSellers({ 
        page: pagination?.currentPage || 1, 
        limit: perPage,
        search: searchTerm,
        status: statusFilter,
        verified: verificationFilter,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      }));
    } catch (err) {
      console.error('Failed to update seller status:', err);
    }
  };

  const handleVerificationChange = async (sellerId, value, reason = '') => {
    // Map dropdown value to boolean expected by backend
    const verified = value === 'verified';
    try {
      const action = await dispatch(verifySellerBusiness({ 
        sellerId, 
        verified, 
        reason: reason || (verified ? 'Verification approved' : 'Verification set to pending') 
      }));
      const updated = action?.payload;
      if (updated) {
        // Optimistically sync selectedSeller in modal view
        dispatch(setSelectedSeller({ ...(selectedSeller || {}), ...updated }));
      }
      // Refresh sellers list
      dispatch(fetchSellers({ 
        page: pagination?.currentPage || 1, 
        limit: perPage,
        search: searchTerm,
        status: statusFilter,
        verified: verificationFilter,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined
      }));
    } catch (err) {
      console.error('Failed to update verification status:', err);
    }
  };

  // New handlers for modal save buttons
  const saveStatus = async () => {
    try {
      if (!selectedSeller) return;
      await handleStatusChange(
        selectedSeller._id || selectedSeller.id,
        statusSelection,
        statusReason.trim()
      );
      setUpdateMessage({ type: 'success', text: `Status updated to ${statusSelection}` });
    } catch (err) {
      console.error('Save status failed:', err);
      setUpdateMessage({ type: 'error', text: 'Failed to update status' });
    }
  };

  const saveVerification = async () => {
    try {
      if (!selectedSeller) return;
      // Require reason when rejecting or setting under review
      if ((verificationSelection === 'rejected' || verificationSelection === 'under_review') && !verificationReason.trim()) {
        setUpdateMessage({ type: 'error', text: 'Reason is required when rejecting or under review.' });
        return;
      }
      await handleVerificationChange(
        selectedSeller._id || selectedSeller.id,
        verificationSelection,
        verificationReason.trim()
      );
      setUpdateMessage({ type: 'success', text: `Verification updated to ${verificationSelection}` });
    } catch (err) {
      console.error('Save verification failed:', err);
      setUpdateMessage({ type: 'error', text: 'Failed to update verification' });
    }
  };

  // Prefill selections when opening edit modal
  useEffect(() => {
    if (selectedSeller && modalMode === 'edit') {
      setStatusSelection(selectedSeller.accountStatus || selectedSeller.status || 'pending');
      setVerificationSelection((selectedSeller.isBusinessVerified ?? selectedSeller.isVerified) ? 'verified' : ((selectedSeller.businessVerificationStatus ?? selectedSeller.verificationStatus) || 'pending'));
      setStatusReason('');
      setVerificationReason('');
      setUpdateMessage({ type: '', text: '' });
    }
  }, [selectedSeller, modalMode]);

  const handleBulkAction = async (action) => {
    if (selectedSellers.length === 0) return;
    
    if (window.confirm(`Are you sure you want to ${action} ${selectedSellers.length} sellers?`)) {
      try {
        await dispatch(bulkUpdateSellers({
          sellerIds: selectedSellers,
          action,
          data: { reason: `Bulk ${action} by admin` }
        }));
        setSelectedSellers([]);
        // Refresh sellers list
        dispatch(fetchSellers({ 
          page: pagination?.currentPage || 1, 
          limit: perPage,
          search: searchTerm,
          status: statusFilter,
          verified: verificationFilter,
          dateRange: dateRange.start && dateRange.end ? dateRange : undefined
        }));
      } catch (err) {
        console.error(`Failed to ${action} sellers:`, err);
      }
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      await dispatch(exportSellers({
        format,
        filters: {
          search: searchTerm,
          status: statusFilter,
          verified: verificationFilter
        }
      }));
    } catch (err) {
      console.error('Failed to export sellers:', err);
    }
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    const safePage = Math.max(1, Math.min(page, totalPages));
    dispatch(
      fetchSellers({
        page: safePage,
        limit: perPage,
        search: searchTerm,
        status: statusFilter,
        verified: verificationFilter,
      })
    );
  };

  const handleItemsPerPageChange = (e) => {
    const newLimit = parseInt(e.target.value, 10) || 10;
    dispatch(
      fetchSellers({
        page: 1,
        limit: newLimit,
        search: searchTerm,
        status: statusFilter,
        verified: verificationFilter,
      })
    );
  };

  const openModal = (mode, seller = null) => {
    setModalMode(mode);
    if (seller) {
      dispatch(fetchSellerById(seller._id || seller.id));
    }
    setShowModal(true);
  };

  const handleDelete = async (sellerId) => {
    if (window.confirm('Are you sure you want to delete this seller? This action cannot be undone.')) {
      try {
        await dispatch(bulkUpdateSellers({
          sellerIds: [sellerId],
          action: 'delete',
          data: { reason: 'Deleted by admin' }
        }));
        // Refresh sellers list
        dispatch(fetchSellers({ 
          page: pagination?.currentPage || 1, 
          limit: pagination?.itemsPerPage || 20,
          search: searchTerm,
          status: statusFilter,
          verificationStatus: verificationFilter,
          dateRange: dateRange.start && dateRange.end ? dateRange : undefined
        }));
      } catch (err) {
        console.error('Failed to delete seller:', err);
      }
    }
  };

  const openDocumentModal = (seller) => {
    setSelectedDocuments(seller.documents || []);
    setShowDocumentModal(true);
  };

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = seller.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seller.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seller.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || (seller.accountStatus || seller.status) === statusFilter;
    const isVerifiedFlag = (seller.isBusinessVerified !== undefined) ? seller.isBusinessVerified : seller.isVerified;
    const statusFlag = (seller.businessVerificationStatus !== undefined) ? seller.businessVerificationStatus : seller.verificationStatus;
    const derivedVerification = isVerifiedFlag ? 'verified' : (statusFlag || 'pending');
    const matchesVerification = !verificationFilter || (
      derivedVerification === verificationFilter
    );
    
    return matchesSearch && matchesStatus && matchesVerification;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      suspended: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getVerificationBadge = (status) => {
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: ExclamationTriangleIcon }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Seller Management</h1>
        <p className="mt-2 text-gray-600">Manage seller accounts, verification, and business operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingStorefrontIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Sellers</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {sellerStatistics?.totalSellers || sellers.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Verified Sellers</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {sellerStatistics?.verifiedSellers || sellers.filter(s => (s.isBusinessVerified ?? s.isVerified)).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Verification</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {sellerStatistics?.pendingVerification || sellers.filter(s => !(s.isBusinessVerified ?? s.isVerified) && ((s.businessVerificationStatus ?? s.verificationStatus) || 'pending') === 'pending').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                <dd className="text-lg font-medium text-gray-900">
                  ${Number(sellerStatistics?.totalRevenue ?? sellers.reduce((sum, s) => sum + (s.totalRevenue || 0), 0)).toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('csv')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSellers.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedSellers.length} seller(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sellers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSellers(filteredSellers.map(s => s._id || s.id));
                      } else {
                        setSelectedSellers([]);
                      }
                    }}
                    checked={selectedSellers.length === filteredSellers.length && filteredSellers.length > 0}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No sellers found
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr key={seller._id || seller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSellers.includes(seller._id || seller.id)}
                        onChange={(e) => {
                          const sellerId = seller._id || seller.id;
                          if (e.target.checked) {
                            setSelectedSellers([...selectedSellers, sellerId]);
                          } else {
                            setSelectedSellers(selectedSellers.filter(id => id !== sellerId));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{seller.businessName}</div>
                          <div className="text-sm text-gray-500">{seller.businessType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{seller.ownerName}</div>
                      <div className="text-sm text-gray-500">{seller.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(seller.accountStatus || seller.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getVerificationBadge(((seller.isBusinessVerified ?? seller.isVerified)) ? 'verified' : (((seller.businessVerificationStatus ?? seller.verificationStatus) || 'pending')))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seller.totalProducts || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(seller.totalRevenue || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal('view', seller)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDocumentModal(seller)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Documents"
                        >
                          <DocumentTextIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openModal('edit', seller)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(seller._id || seller.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
            <div className="text-sm text-gray-600">
              {totalItems > 0 ? (
                <>Showing {startItem}-{endItem} of {totalItems}</>
              ) : (
                <>No results</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page:</label>
              <select
                value={perPage}
                onChange={handleItemsPerPageChange}
                className="px-2 py-1 border rounded bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50 bg-white text-gray-700"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1 border rounded ${
                      p === currentPage
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50 bg-white text-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Details Modal */}
      {showModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Seller Details - {selectedSeller.businessName}
              </h3>
              {updateMessage.type === 'error' && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{updateMessage.text}</div>
              )}
              {updateMessage.type === 'success' && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{updateMessage.text}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.businessName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.ownerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.phone}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.businessType}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.taxId}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.address}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      {modalMode === 'edit' ? (
                        <select
                          value={statusSelection}
                          onChange={(e) => setStatusSelection(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      ) : (
                        getStatusBadge((selectedSeller.accountStatus || selectedSeller.status))
                      )}
                    </div>
                    {modalMode === 'edit' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={saveStatus}
                          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Save Status
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                    <div className="mt-1">
                      {modalMode === 'edit' ? (
                        <select
                          value={verificationSelection}
                          onChange={(e) => setVerificationSelection(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="verified">Verified</option>
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        getVerificationBadge(((selectedSeller.isBusinessVerified ?? selectedSeller.isVerified)) ? 'verified' : (((selectedSeller.businessVerificationStatus ?? selectedSeller.verificationStatus) || 'pending')))
                      )}
                    </div>
                    {modalMode === 'edit' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={verificationReason}
                          onChange={(e) => setVerificationReason(e.target.value)}
                          placeholder="Reason (optional; required when rejecting)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={saveVerification}
                          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          Save Verification
                        </button>
                        <p className="mt-1 text-xs text-gray-500">
                          Note: backend supports Verified or Pending; Rejected/Under Review will be recorded as Pending with a reason.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Products</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSeller.totalProducts}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Orders</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSeller.totalOrders}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Revenue</label>
                    <p className="mt-1 text-sm text-gray-900">${Number(selectedSeller?.totalRevenue ?? 0).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rating</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSeller.rating}/5.0</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                {modalMode === 'view' && (
                  <button
                    onClick={() => setModalMode('edit')}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Business Documents - {selectedSeller.businessName}
              </h3>
              
              <div className="space-y-4">
                {selectedDocuments.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{doc.type}</h4>
                        <p className="text-sm text-gray-500">Uploaded: {doc.uploadedAt}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(doc.status)}
                        <button className="text-blue-600 hover:text-blue-900 text-sm">
                          View
                        </button>
                      </div>
                    </div>
                    
                    {doc.status === 'pending' && (
                      <div className="mt-3 flex space-x-2">
                        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                          Approve
                        </button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
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

export default SellerManagement;