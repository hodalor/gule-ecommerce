import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

const DisputeManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // State management
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'resolve'
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Resolution form
  const [resolutionForm, setResolutionForm] = useState({
    resolution: '',
    refundToBuyer: false,
    releaseToSeller: false,
    adminNotes: '',
    newStatus: 'resolved'
  });
  
  // New message form
  const [newMessage, setNewMessage] = useState('');
  const [messageAttachments, setMessageAttachments] = useState([]);

  // Mock data - replace with actual API calls
  const mockDisputes = [
    {
      id: 'DSP001',
      orderId: 'ORD001',
      orderNumber: '#12345',
      type: 'refund',
      status: 'pending_review',
      priority: 'high',
      title: 'Product not as described',
      description: 'The product I received is completely different from what was shown in the images.',
      amount: 299.99,
      currency: 'USD',
      buyer: {
        id: 'buyer1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '/api/placeholder/32/32'
      },
      seller: {
        id: 'seller1',
        name: 'Tech Store',
        email: 'tech@store.com',
        avatar: '/api/placeholder/32/32'
      },
      product: {
        id: 'prod1',
        name: 'Wireless Headphones',
        image: '/api/placeholder/64/64',
        sku: 'WH001'
      },
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T14:20:00Z',
      dueDate: '2024-01-20T23:59:59Z',
      assignedTo: null,
      messages: [
        {
          id: 'msg1',
          sender: 'buyer',
          senderName: 'John Doe',
          message: 'I ordered wireless headphones but received a completely different product.',
          timestamp: '2024-01-15T10:30:00Z',
          attachments: [
            { name: 'received_product.jpg', url: '/api/placeholder/200/150' }
          ]
        }
      ],
      evidence: [
        { type: 'image', url: '/api/placeholder/200/150', description: 'Product received' },
        { type: 'image', url: '/api/placeholder/200/150', description: 'Original listing' }
      ],
      resolution: null,
      escrowId: 'ESC001'
    },
    {
      id: 'DSP002',
      orderId: 'ORD002',
      orderNumber: '#12346',
      type: 'return',
      status: 'under_investigation',
      priority: 'medium',
      title: 'Damaged product',
      description: 'Product arrived damaged during shipping.',
      amount: 149.99,
      currency: 'USD',
      buyer: {
        id: 'buyer2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        avatar: '/api/placeholder/32/32'
      },
      seller: {
        id: 'seller2',
        name: 'Electronics Hub',
        email: 'hub@electronics.com',
        avatar: '/api/placeholder/32/32'
      },
      product: {
        id: 'prod2',
        name: 'Smartphone Case',
        image: '/api/placeholder/64/64',
        sku: 'SC002'
      },
      createdAt: '2024-01-14T09:15:00Z',
      updatedAt: '2024-01-15T11:45:00Z',
      dueDate: '2024-01-19T23:59:59Z',
      assignedTo: user?.id,
      messages: [
        {
          id: 'msg2',
          sender: 'buyer',
          senderName: 'Jane Smith',
          message: 'The case arrived with a crack on the back.',
          timestamp: '2024-01-14T09:15:00Z',
          attachments: []
        },
        {
          id: 'msg3',
          sender: 'admin',
          senderName: 'Admin Support',
          message: 'We are investigating this issue. Please provide more details about the packaging condition.',
          timestamp: '2024-01-15T11:45:00Z',
          attachments: []
        }
      ],
      evidence: [
        { type: 'image', url: '/api/placeholder/200/150', description: 'Damaged case' }
      ],
      resolution: null,
      escrowId: 'ESC002'
    }
  ];

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      // Replace with actual API call
      setTimeout(() => {
        setDisputes(mockDisputes);
        setLoading(false);
      }, 1000);
    } catch (error) {
      toast.error('Failed to fetch disputes');
      setLoading(false);
    }
  };

  const handleViewDispute = (dispute) => {
    setSelectedDispute(dispute);
    setModalType('view');
    setShowModal(true);
  };

  const handleResolveDispute = (dispute) => {
    setSelectedDispute(dispute);
    setModalType('resolve');
    setResolutionForm({
      resolution: '',
      refundToBuyer: false,
      releaseToSeller: false,
      adminNotes: '',
      newStatus: 'resolved'
    });
    setShowModal(true);
  };

  const handleAssignDispute = async (disputeId, adminId) => {
    try {
      // API call to assign dispute
      toast.success('Dispute assigned successfully');
      fetchDisputes();
    } catch (error) {
      toast.error('Failed to assign dispute');
    }
  };

  const handleUpdateStatus = async (disputeId, newStatus) => {
    try {
      // API call to update status
      toast.success('Status updated successfully');
      fetchDisputes();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    
    if (!resolutionForm.resolution) {
      toast.error('Please provide a resolution description');
      return;
    }

    if (!resolutionForm.refundToBuyer && !resolutionForm.releaseToSeller) {
      toast.error('Please select either refund to buyer or release to seller');
      return;
    }

    try {
      // API call to resolve dispute
      const resolutionData = {
        disputeId: selectedDispute.id,
        ...resolutionForm
      };
      
      toast.success('Dispute resolved successfully');
      setShowModal(false);
      fetchDisputes();
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // API call to send message
      toast.success('Message sent successfully');
      setNewMessage('');
      setMessageAttachments([]);
      // Refresh dispute details
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_review: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review' },
      under_investigation: { color: 'bg-blue-100 text-blue-800', text: 'Under Investigation' },
      resolved: { color: 'bg-green-100 text-green-800', text: 'Resolved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      escalated: { color: 'bg-purple-100 text-purple-800', text: 'Escalated' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800', text: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: 'Medium' },
      high: { color: 'bg-red-100 text-red-800', text: 'High' },
      urgent: { color: 'bg-red-200 text-red-900', text: 'Urgent' }
    };

    const config = priorityConfig[priority] || { color: 'bg-gray-100 text-gray-800', text: priority };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.seller.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || dispute.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || dispute.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const getStatistics = () => {
    const total = disputes.length;
    const pending = disputes.filter(d => d.status === 'pending_review').length;
    const investigating = disputes.filter(d => d.status === 'under_investigation').length;
    const resolved = disputes.filter(d => d.status === 'resolved').length;
    const highPriority = disputes.filter(d => d.priority === 'high' || d.priority === 'urgent').length;
    
    return { total, pending, investigating, resolved, highPriority };
  };

  const stats = getStatistics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review, investigate, and resolve customer disputes and refund requests.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {/* Export functionality */}}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Disputes</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Investigating</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.investigating}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.resolved}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High Priority</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.highPriority}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="refund">Refund</option>
              <option value="return">Return</option>
              <option value="exchange">Exchange</option>
              <option value="complaint">Complaint</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispute
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredDisputes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No disputes found
                  </td>
                </tr>
              ) : (
                filteredDisputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={dispute.product.image}
                          alt={dispute.product.name}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {dispute.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {dispute.orderNumber} • {dispute.product.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-gray-900">{dispute.buyer.name}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <BuildingStorefrontIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-gray-500">{dispute.seller.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {dispute.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(dispute.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(dispute.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {new Date(dispute.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDispute(dispute)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {dispute.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolveDispute(dispute)}
                            className="text-green-600 hover:text-green-900"
                            title="Resolve Dispute"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDispute(dispute)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Send Message"
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedDispute && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[80vh] overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {modalType === 'resolve' ? 'Resolve Dispute' : 'Dispute Details'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedDispute.orderNumber} • {selectedDispute.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {modalType === 'view' ? (
                <div className="flex-1 overflow-hidden">
                  <div className="flex h-full">
                    {/* Left Panel - Dispute Info */}
                    <div className="w-1/3 p-4 border-r overflow-y-auto">
                      <div className="space-y-4">
                        {/* Status and Priority */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Status & Priority</h4>
                          <div className="space-y-2">
                            {getStatusBadge(selectedDispute.status)}
                            {getPriorityBadge(selectedDispute.priority)}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Product</h4>
                          <div className="flex items-center space-x-3">
                            <img
                              src={selectedDispute.product.image}
                              alt={selectedDispute.product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-sm">{selectedDispute.product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {selectedDispute.product.sku}</p>
                            </div>
                          </div>
                        </div>

                        {/* Parties */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Parties Involved</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                <strong>Buyer:</strong> {selectedDispute.buyer.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <BuildingStorefrontIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                <strong>Seller:</strong> {selectedDispute.seller.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Dispute Amount</h4>
                          <div className="flex items-center space-x-2">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-lg font-semibold">${selectedDispute.amount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Important Dates</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Created:</strong> {new Date(selectedDispute.createdAt).toLocaleString()}</p>
                            <p><strong>Updated:</strong> {new Date(selectedDispute.updatedAt).toLocaleString()}</p>
                            <p><strong>Due:</strong> {new Date(selectedDispute.dueDate).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Evidence */}
                        {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Evidence</h4>
                            <div className="space-y-2">
                              {selectedDispute.evidence.map((item, index) => (
                                <div key={index} className="border rounded-lg p-2">
                                  <img
                                    src={item.url}
                                    alt={item.description}
                                    className="w-full h-20 object-cover rounded mb-1"
                                  />
                                  <p className="text-xs text-gray-600">{item.description}</p>
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
                      <div className="flex-1 p-4 overflow-y-auto">
                        <h4 className="font-medium text-gray-900 mb-4">Communication</h4>
                        <div className="space-y-4">
                          {selectedDispute.messages.map((message) => (
                            <div key={message.id} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{message.senderName}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(message.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{message.message}</p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="space-y-1">
                                  {message.attachments.map((attachment, index) => (
                                    <div key={index} className="flex items-center space-x-2 text-xs">
                                      <PaperClipIcon className="h-3 w-3 text-gray-400" />
                                      <a href={attachment.url} className="text-blue-600 hover:underline">
                                        {attachment.name}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Message Input */}
                      <div className="border-t p-4">
                        <form onSubmit={handleSendMessage}>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                              Send
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Resolution Form */
                <div className="flex-1 p-4 overflow-y-auto">
                  <form onSubmit={handleSubmitResolution} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Description
                      </label>
                      <textarea
                        value={resolutionForm.resolution}
                        onChange={(e) => setResolutionForm({...resolutionForm, resolution: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Describe how this dispute is being resolved..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Action
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={resolutionForm.refundToBuyer}
                            onChange={(e) => setResolutionForm({
                              ...resolutionForm, 
                              refundToBuyer: e.target.checked,
                              releaseToSeller: e.target.checked ? false : resolutionForm.releaseToSeller
                            })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm">Refund to Buyer</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={resolutionForm.releaseToSeller}
                            onChange={(e) => setResolutionForm({
                              ...resolutionForm, 
                              releaseToSeller: e.target.checked,
                              refundToBuyer: e.target.checked ? false : resolutionForm.refundToBuyer
                            })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm">Release to Seller</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes (Internal)
                      </label>
                      <textarea
                        value={resolutionForm.adminNotes}
                        onChange={(e) => setResolutionForm({...resolutionForm, adminNotes: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Internal notes about this resolution..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Resolve Dispute
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeManagement;