import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CalendarIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

const ReviewManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [filters, setFilters] = useState({
    rating: '',
    status: '',
    reported: false,
    dateRange: ''
  });

  // Mock data - replace with actual API calls
  const mockReviews = [
    {
      id: 1,
      productId: 'prod_001',
      productName: 'Wireless Headphones',
      userId: 'user_001',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      rating: 5,
      title: 'Excellent sound quality!',
      comment: 'These headphones exceeded my expectations. The sound quality is crystal clear and the battery life is amazing.',
      status: 'approved',
      reported: false,
      reportCount: 0,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      helpful: 12,
      notHelpful: 1
    },
    {
      id: 2,
      productId: 'prod_002',
      productName: 'Gaming Mouse',
      userId: 'user_002',
      userName: 'Jane Smith',
      userEmail: 'jane@example.com',
      rating: 2,
      title: 'Not as advertised',
      comment: 'The mouse feels cheap and the buttons are not responsive. Very disappointed with this purchase.',
      status: 'pending',
      reported: true,
      reportCount: 3,
      reportReasons: ['Inappropriate content', 'Fake review'],
      createdAt: '2024-01-14T15:45:00Z',
      updatedAt: '2024-01-14T15:45:00Z',
      helpful: 2,
      notHelpful: 8
    },
    {
      id: 3,
      productId: 'prod_003',
      productName: 'Smartphone Case',
      userId: 'user_003',
      userName: 'Mike Johnson',
      userEmail: 'mike@example.com',
      rating: 4,
      title: 'Good protection',
      comment: 'Solid case that provides good protection. The design is nice but could be better.',
      status: 'approved',
      reported: false,
      reportCount: 0,
      createdAt: '2024-01-13T09:20:00Z',
      updatedAt: '2024-01-13T09:20:00Z',
      helpful: 8,
      notHelpful: 2
    }
  ];

  useEffect(() => {
    fetchReviews();
  }, [selectedTab, filters]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setReviews(mockReviews);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setSelectedReviews([]);
  };

  const handleSelectReview = (reviewId) => {
    setSelectedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === filteredReviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviews.map(review => review.id));
    }
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} for reviews:`, selectedReviews);
    // Implement bulk actions
    setSelectedReviews([]);
  };

  const handleReviewAction = (action, reviewId) => {
    console.log(`${action} review:`, reviewId);
    // Implement individual review actions
  };

  const openModal = (type, review = null) => {
    setModalType(type);
    setSelectedReview(review);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedReview(null);
  };

  // Filter reviews based on search and filters
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.comment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || 
                      (selectedTab === 'pending' && review.status === 'pending') ||
                      (selectedTab === 'approved' && review.status === 'approved') ||
                      (selectedTab === 'rejected' && review.status === 'rejected') ||
                      (selectedTab === 'reported' && review.reported);
    
    const matchesRating = !filters.rating || review.rating.toString() === filters.rating;
    const matchesStatus = !filters.status || review.status === filters.status;
    const matchesReported = !filters.reported || review.reported;

    return matchesSearch && matchesTab && matchesRating && matchesStatus && matchesReported;
  });

  const tabs = [
    { id: 'all', name: 'All Reviews', count: reviews.length },
    { id: 'pending', name: 'Pending', count: reviews.filter(r => r.status === 'pending').length },
    { id: 'approved', name: 'Approved', count: reviews.filter(r => r.status === 'approved').length },
    { id: 'rejected', name: 'Rejected', count: reviews.filter(r => r.status === 'rejected').length },
    { id: 'reported', name: 'Reported', count: reviews.filter(r => r.reported).length }
  ];

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircleIcon }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and moderate product reviews, handle reports, and maintain review quality.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Reviews</dt>
                  <dd className="text-lg font-medium text-gray-900">{reviews.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Reviews</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reviews.filter(r => r.status === 'pending').length}
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
                <FlagIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Reported Reviews</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reviews.filter(r => r.reported).length}
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
                <StarIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Rating</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
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
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Rating Filter */}
            <select
              value={filters.rating}
              onChange={(e) => setFilters({...filters, rating: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Bulk Actions */}
            {selectedReviews.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Approve
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Reviews ({filteredReviews.length})
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedReviews.length === filteredReviews.length && filteredReviews.length > 0}
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
            <p className="mt-2 text-sm text-gray-500">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No reviews match the current filters.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredReviews.map((review) => (
              <li key={review.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedReviews.includes(review.id)}
                    onChange={() => handleSelectReview(review.id)}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{review.productName}</h4>
                        {getStatusBadge(review.status)}
                        {review.reported && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FlagIcon className="h-3 w-3 mr-1" />
                            Reported ({review.reportCount})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">({review.rating})</span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900">{review.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {review.userName}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        <span>Helpful: {review.helpful} | Not Helpful: {review.notHelpful}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal('view', review)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReviewAction('approve', review.id)}
                          className="text-green-400 hover:text-green-600"
                          title="Approve Review"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReviewAction('reject', review.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Reject Review"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleReviewAction('delete', review.id)}
                      className="text-red-400 hover:text-red-600"
                      title="Delete Review"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal for viewing review details */}
      {showModal && modalType === 'view' && selectedReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Review Details</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReview.productName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reviewer</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReview.userName} ({selectedReview.userEmail})</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rating</label>
                  <div className="mt-1 flex items-center space-x-2">
                    {renderStars(selectedReview.rating)}
                    <span className="text-sm text-gray-500">({selectedReview.rating}/5)</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReview.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Comment</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReview.comment}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedReview.status)}</div>
                </div>
                
                {selectedReview.reported && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reports</label>
                    <p className="mt-1 text-sm text-red-600">
                      {selectedReview.reportCount} reports: {selectedReview.reportReasons?.join(', ')}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReview.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Helpfulness</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedReview.helpful} helpful, {selectedReview.notHelpful} not helpful
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {selectedReview.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleReviewAction('approve', selectedReview.id);
                        closeModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleReviewAction('reject', selectedReview.id);
                        closeModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      Reject
                    </button>
                  </>
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

export default ReviewManagement;