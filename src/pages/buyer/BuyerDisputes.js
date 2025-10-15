import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PlusIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { 
  fetchUserDisputes, 
  createDispute, 
  addDisputeMessage, 
  getDisputeDetails,
  clearError 
} from '../../store/slices/disputeSlice';
import { fetchUserOrders } from '../../store/slices/orderSlice';

const BuyerDisputes = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { disputes, loading, error, pagination } = useSelector((state) => state.disputes);
  const { orders } = useSelector((state) => state.orders);
  
  // State for UI management
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showNewDisputeModal, setShowNewDisputeModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newDisputeForm, setNewDisputeForm] = useState({
    orderId: '',
    type: 'refund',
    reason: '',
    description: '',
    attachments: []
  });

  const disputeTypes = [
    { value: 'refund', label: 'Refund Request' },
    { value: 'return', label: 'Return Request' },
    { value: 'exchange', label: 'Exchange Request' },
    { value: 'complaint', label: 'Complaint' }
  ];

  const disputeReasons = [
    { value: 'defective', label: 'Defective Product' },
    { value: 'not_as_described', label: 'Not as Described' },
    { value: 'damaged_shipping', label: 'Damaged in Shipping' },
    { value: 'wrong_item', label: 'Wrong Item Received' },
    { value: 'late_delivery', label: 'Late Delivery' },
    { value: 'poor_quality', label: 'Poor Quality' },
    { value: 'other', label: 'Other' }
  ];

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  // Filter disputes based on search and filters
  useEffect(() => {
    if (!disputes) return;
    
    let filtered = [...disputes];

    if (searchTerm) {
      filtered = filtered.filter(dispute =>
        dispute.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(dispute => dispute.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(dispute => dispute.type === typeFilter);
    }

    setFilteredDisputes(filtered);
  }, [disputes, searchTerm, statusFilter, typeFilter]);

  const handleViewDispute = (dispute) => {
    dispatch(getDisputeDetails(dispute._id || dispute.id));
    setSelectedDispute(dispute);
    setShowDisputeModal(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await dispatch(addDisputeMessage({
        disputeId: selectedDispute._id || selectedDispute.id,
        message: newMessage,
        attachments: []
      })).unwrap();

      setNewMessage('');
      toast.success('Message sent successfully');
    } catch (error) {
      toast.error(error || 'Failed to send message');
    }
  };

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    
    if (!newDisputeForm.orderId || !newDisputeForm.reason || !newDisputeForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await dispatch(createDispute(newDisputeForm)).unwrap();
      
      setShowNewDisputeModal(false);
      setNewDisputeForm({
        orderId: '',
        type: 'refund',
        reason: '',
        description: '',
        attachments: []
      });
      toast.success('Dispute created successfully');
    } catch (error) {
      toast.error(error || 'Failed to create dispute');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <ClockIcon className="h-5 w-5" />;
      case 'resolved':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes & Refunds</h1>
          <p className="text-gray-600 mt-1">Manage your order disputes and refund requests</p>
        </div>
        <button
          onClick={() => setShowNewDisputeModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Dispute
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search disputes..."
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
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {disputeTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-gray-600">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {filteredDisputes.length} dispute{filteredDisputes.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Disputes List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading disputes...</p>
            </div>
          ) : filteredDisputes && filteredDisputes.length > 0 ? (
            filteredDisputes.map((dispute) => (
              <div key={dispute._id || dispute.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <img
                      src={dispute.productImage || '/api/placeholder/64/64'}
                      alt={dispute.productName || 'Product'}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{dispute.productName || 'Product details not available'}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[dispute.status] || statusColors.open}`}>
                          {dispute.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[dispute.priority] || priorityColors.medium}`}>
                          {dispute.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Order: {dispute.orderId}</p>
                      <p className="text-sm text-gray-600 mb-2">
                        {disputeTypes.find(t => t.value === dispute.type)?.label || 'Refund Request'} - 
                        {disputeReasons.find(r => r.value === dispute.reason)?.label || 'Not specified'}
                      </p>
                      <p className="text-gray-700 mb-3">{dispute.description || 'No description provided'}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Created: {dispute.createdAt ? formatDate(dispute.createdAt) : 'Unknown'}</span>
                        <span>Updated: {dispute.updatedAt ? formatDate(dispute.updatedAt) : 'Unknown'}</span>
                        {dispute.expectedResolution && (
                          <span>Expected Resolution: {formatDate(dispute.expectedResolution)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      ${dispute.amount || '0.00'}
                    </span>
                    <button
                      onClick={() => handleViewDispute(dispute)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>

                {/* Resolution (if resolved) */}
                {dispute.resolution && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Resolution</span>
                    </div>
                    <p className="text-green-700">{dispute.resolution}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'You haven\'t created any disputes yet.'}
              </p>
            </div>
          )}
        </div>

      {/* Empty State */}
      {filteredDisputes.length === 0 && (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
              ? 'No disputes found' 
              : 'No disputes yet'
            }
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'All your order disputes and refund requests will appear here'
            }
          </p>
        </div>
      )}

      {/* Dispute Details Modal */}
      {showDisputeModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Dispute Details</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedDispute.status]}`}>
                      {selectedDispute.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">#{selectedDispute.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex h-[calc(90vh-120px)]">
              {/* Left Panel - Dispute Info */}
              <div className="w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-4">
                  {/* Product Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Product</h3>
                    <div className="flex gap-3">
                      <img
                        src={selectedDispute.productImage}
                        alt={selectedDispute.productName}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-sm">{selectedDispute.productName}</p>
                        <p className="text-sm text-gray-600">Order: {selectedDispute.orderId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dispute Details */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2">{disputeTypes.find(t => t.value === selectedDispute.type)?.label}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Reason:</span>
                        <span className="ml-2">{disputeReasons.find(r => r.value === selectedDispute.reason)?.label}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <span className="ml-2 font-medium">${selectedDispute.amount}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Priority:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${priorityColors[selectedDispute.priority]}`}>
                          {selectedDispute.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700">{selectedDispute.description}</p>
                  </div>

                  {/* Attachments */}
                  {selectedDispute.attachments.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Attachments</h3>
                      <div className="space-y-2">
                        {selectedDispute.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <PaperClipIcon className="h-4 w-4 text-gray-400" />
                            <a href={attachment.url} className="text-blue-600 hover:underline">
                              {attachment.name}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Messages */}
              <div className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    {selectedDispute?.messages && selectedDispute.messages.length > 0 ? (
                      selectedDispute.messages.map((message) => (
                        <div
                          key={message._id || message.id || message.timestamp}
                          className={`flex ${message.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender === 'buyer'
                                ? 'bg-blue-600 text-white'
                                : message.sender === 'seller'
                                ? 'bg-gray-200 text-gray-900'
                                : 'bg-yellow-100 text-yellow-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium capitalize">
                                {message.sender}
                              </span>
                              <span className="text-xs opacity-75">
                                {message.timestamp ? formatDateTime(message.timestamp) : 'Unknown time'}
                              </span>
                            </div>
                            <p className="text-sm">{message.message || message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2">
                                {message.attachments.map((attachment, index) => (
                                  <a
                                    key={index}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline block"
                                  >
                                    {attachment.name || `Attachment ${index + 1}`}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Dispute Modal */}
      {showNewDisputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Create New Dispute</h2>
              <button
                onClick={() => setShowNewDisputeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateDispute} className="space-y-4">
              {/* Order ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order ID *
                </label>
                <input
                  type="text"
                  value={newDisputeForm.orderId}
                  onChange={(e) => setNewDisputeForm(prev => ({ ...prev, orderId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter order ID"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispute Type *
                </label>
                <select
                  value={newDisputeForm.type}
                  onChange={(e) => setNewDisputeForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {disputeTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <select
                  value={newDisputeForm.reason}
                  onChange={(e) => setNewDisputeForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a reason</option>
                  {disputeReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newDisputeForm.description}
                  onChange={(e) => setNewDisputeForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the issue in detail..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Dispute
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDisputeModal(false)}
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

export default BuyerDisputes;