import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const EscrowManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    amountRange: '',
    dateRange: '',
    disputeStatus: ''
  });

  // Mock data - replace with actual API calls
  const mockTransactions = [
    {
      id: 'esc_001',
      orderId: 'ord_12345',
      buyerId: 'user_001',
      buyerName: 'John Doe',
      buyerEmail: 'john@example.com',
      sellerId: 'seller_001',
      sellerName: 'Tech Store',
      sellerEmail: 'tech@store.com',
      amount: 299.99,
      currency: 'USD',
      status: 'held',
      disputeStatus: null,
      productName: 'Wireless Headphones',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      releaseDate: '2024-01-22T10:30:00Z',
      autoReleaseEnabled: true,
      notes: 'Standard escrow for electronics purchase',
      paymentMethod: 'Credit Card',
      transactionFee: 8.99
    },
    {
      id: 'esc_002',
      orderId: 'ord_12346',
      buyerId: 'user_002',
      buyerName: 'Jane Smith',
      buyerEmail: 'jane@example.com',
      sellerId: 'seller_002',
      sellerName: 'Fashion Hub',
      sellerEmail: 'fashion@hub.com',
      amount: 149.50,
      currency: 'USD',
      status: 'disputed',
      disputeStatus: 'pending_review',
      disputeReason: 'Item not as described',
      disputeCreatedAt: '2024-01-14T16:20:00Z',
      productName: 'Designer Handbag',
      createdAt: '2024-01-10T14:20:00Z',
      updatedAt: '2024-01-14T16:20:00Z',
      releaseDate: '2024-01-17T14:20:00Z',
      autoReleaseEnabled: false,
      notes: 'Dispute raised by buyer regarding product quality',
      paymentMethod: 'PayPal',
      transactionFee: 4.49
    },
    {
      id: 'esc_003',
      orderId: 'ord_12347',
      buyerId: 'user_003',
      buyerName: 'Mike Johnson',
      buyerEmail: 'mike@example.com',
      sellerId: 'seller_003',
      sellerName: 'Home Essentials',
      sellerEmail: 'home@essentials.com',
      amount: 89.99,
      currency: 'USD',
      status: 'released',
      disputeStatus: null,
      productName: 'Kitchen Appliance Set',
      createdAt: '2024-01-08T09:15:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
      releaseDate: '2024-01-15T09:15:00Z',
      releasedAt: '2024-01-15T09:15:00Z',
      autoReleaseEnabled: true,
      notes: 'Successfully completed transaction',
      paymentMethod: 'Bank Transfer',
      transactionFee: 2.70
    },
    {
      id: 'esc_004',
      orderId: 'ord_12348',
      buyerId: 'user_004',
      buyerName: 'Sarah Wilson',
      buyerEmail: 'sarah@example.com',
      sellerId: 'seller_004',
      sellerName: 'Book Corner',
      sellerEmail: 'books@corner.com',
      amount: 45.00,
      currency: 'USD',
      status: 'refunded',
      disputeStatus: 'resolved_refund',
      disputeReason: 'Item damaged during shipping',
      disputeCreatedAt: '2024-01-12T11:30:00Z',
      disputeResolvedAt: '2024-01-14T15:45:00Z',
      productName: 'Educational Books Set',
      createdAt: '2024-01-05T11:30:00Z',
      updatedAt: '2024-01-14T15:45:00Z',
      releaseDate: '2024-01-12T11:30:00Z',
      refundedAt: '2024-01-14T15:45:00Z',
      autoReleaseEnabled: true,
      notes: 'Refunded due to shipping damage',
      paymentMethod: 'Credit Card',
      transactionFee: 1.35
    }
  ];

  useEffect(() => {
    fetchTransactions();
  }, [selectedTab, filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setTransactions(mockTransactions);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setSelectedTransactions([]);
  };

  const handleSelectTransaction = (transactionId) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(transaction => transaction.id));
    }
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} for transactions:`, selectedTransactions);
    // Implement bulk actions
    setSelectedTransactions([]);
  };

  const handleTransactionAction = (action, transactionId) => {
    console.log(`${action} transaction:`, transactionId);
    // Implement individual transaction actions
  };

  const openModal = (type, transaction = null) => {
    setModalType(type);
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedTransaction(null);
  };

  // Filter transactions based on search and filters
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.productName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || 
                      (selectedTab === 'held' && transaction.status === 'held') ||
                      (selectedTab === 'disputed' && transaction.status === 'disputed') ||
                      (selectedTab === 'released' && transaction.status === 'released') ||
                      (selectedTab === 'refunded' && transaction.status === 'refunded');
    
    const matchesStatus = !filters.status || transaction.status === filters.status;
    const matchesDispute = !filters.disputeStatus || transaction.disputeStatus === filters.disputeStatus;

    return matchesSearch && matchesTab && matchesStatus && matchesDispute;
  });

  const tabs = [
    { id: 'all', name: 'All Transactions', count: transactions.length },
    { id: 'held', name: 'Held', count: transactions.filter(t => t.status === 'held').length },
    { id: 'disputed', name: 'Disputed', count: transactions.filter(t => t.status === 'disputed').length },
    { id: 'released', name: 'Released', count: transactions.filter(t => t.status === 'released').length },
    { id: 'refunded', name: 'Refunded', count: transactions.filter(t => t.status === 'refunded').length }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      held: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      disputed: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
      released: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      refunded: { color: 'bg-blue-100 text-blue-800', icon: BanknotesIcon }
    };

    const config = statusConfig[status] || statusConfig.held;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDisputeStatusBadge = (disputeStatus) => {
    if (!disputeStatus) return null;

    const statusConfig = {
      pending_review: { color: 'bg-orange-100 text-orange-800', text: 'Pending Review' },
      under_investigation: { color: 'bg-purple-100 text-purple-800', text: 'Under Investigation' },
      resolved_refund: { color: 'bg-blue-100 text-blue-800', text: 'Resolved - Refund' },
      resolved_release: { color: 'bg-green-100 text-green-800', text: 'Resolved - Release' }
    };

    const config = statusConfig[disputeStatus] || { color: 'bg-gray-100 text-gray-800', text: disputeStatus };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateTotalHeld = () => {
    return transactions
      .filter(t => t.status === 'held')
      .reduce((total, t) => total + t.amount, 0);
  };

  const calculateTotalDisputed = () => {
    return transactions
      .filter(t => t.status === 'disputed')
      .reduce((total, t) => total + t.amount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escrow Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and manage escrow transactions, handle disputes, and process releases.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                  <dd className="text-lg font-medium text-gray-900">{transactions.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Funds Held</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(calculateTotalHeld())}
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
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Disputed Amount</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(calculateTotalDisputed())}
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
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Fees</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(transactions.reduce((total, t) => total + t.transactionFee, 0))}
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
              onClick={() => handleTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="held">Held</option>
              <option value="disputed">Disputed</option>
              <option value="released">Released</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Dispute Status Filter */}
            <select
              value={filters.disputeStatus}
              onChange={(e) => setFilters({...filters, disputeStatus: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Dispute Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="resolved_refund">Resolved - Refund</option>
              <option value="resolved_release">Resolved - Release</option>
            </select>

            {/* Bulk Actions */}
            {selectedTransactions.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('release')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Release
                </button>
                <button
                  onClick={() => handleBulkAction('investigate')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Investigate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Transactions ({filteredTransactions.length})
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Select All</label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No transactions match the current filters.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <li key={transaction.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Order #{transaction.orderId}
                        </h4>
                        {getStatusBadge(transaction.status)}
                        {getDisputeStatusBadge(transaction.disputeStatus)}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-900">{transaction.productName}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          Buyer: {transaction.buyerName}
                        </span>
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          Seller: {transaction.sellerName}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                          Fee: {formatCurrency(transaction.transactionFee)}
                        </span>
                      </div>
                    </div>
                    
                    {transaction.disputeReason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-md">
                        <p className="text-xs text-red-800">
                          <strong>Dispute:</strong> {transaction.disputeReason}
                        </p>
                      </div>
                    )}
                    
                    {transaction.notes && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">{transaction.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal('view', transaction)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    
                    {transaction.status === 'held' && (
                      <button
                        onClick={() => handleTransactionAction('release', transaction.id)}
                        className="text-green-400 hover:text-green-600"
                        title="Release Funds"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    
                    {transaction.status === 'disputed' && (
                      <button
                        onClick={() => openModal('resolve', transaction)}
                        className="text-purple-400 hover:text-purple-600"
                        title="Resolve Dispute"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal for viewing transaction details or resolving disputes */}
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {modalType === 'view' ? 'Transaction Details' : 'Resolve Dispute'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.orderId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Transaction Fee</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedTransaction.transactionFee)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransaction.productName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Buyer</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.buyerName} ({selectedTransaction.buyerEmail})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Seller</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.sellerName} ({selectedTransaction.sellerEmail})
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.paymentMethod}</p>
                  </div>
                </div>
                
                {selectedTransaction.disputeStatus && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dispute Status</label>
                    <div className="mt-1">{getDisputeStatusBadge(selectedTransaction.disputeStatus)}</div>
                  </div>
                )}
                
                {selectedTransaction.disputeReason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dispute Reason</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.disputeReason}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTransaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Auto Release</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.autoReleaseEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                
                {selectedTransaction.releaseDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scheduled Release Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTransaction.releaseDate).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {selectedTransaction.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {modalType === 'resolve' && selectedTransaction.status === 'disputed' && (
                  <>
                    <button
                      onClick={() => {
                        handleTransactionAction('resolve_release', selectedTransaction.id);
                        closeModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Release to Seller
                    </button>
                    <button
                      onClick={() => {
                        handleTransactionAction('resolve_refund', selectedTransaction.id);
                        closeModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <BanknotesIcon className="h-4 w-4 mr-2" />
                      Refund to Buyer
                    </button>
                  </>
                )}
                
                {modalType === 'view' && selectedTransaction.status === 'held' && (
                  <button
                    onClick={() => {
                      handleTransactionAction('release', selectedTransaction.id);
                      closeModal();
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Release Funds
                  </button>
                )}
                
                <button
                  onClick={closeModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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

export default EscrowManagement;