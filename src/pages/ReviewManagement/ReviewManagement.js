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
import {
  fetchReviews,
  fetchReviewById,
  updateReviewStatus,
  deleteReview,
  bulkUpdateReviews,
  fetchReviewReports
} from '../../store/slices/reviewSlice';

const ReviewManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { 
    reviews, 
    loading, 
    error, 
    pagination, 
    selectedReview,
    reviewReports 
  } = useSelector((state) => state.reviews);

  // Local state management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedReviewLocal, setSelectedReview] = useState(null);
  const [filters, setFilters] = useState({
    rating: '',
    status: '',
    reported: false,
  });

  useEffect(() => {
    const params = {
      page: pagination?.currentPage || 1,
      limit: 10,
      search: searchTerm,
      status: selectedTab !== 'all' ? selectedTab : '',
      rating: filters.rating,
    };

    dispatch(fetchReviews(params));
  }, [dispatch, selectedTab, filters, searchTerm, pagination?.currentPage]);

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
    const reviewIds = reviews?.map(review => review._id || review.id) || [];
    if (selectedReviews.length === reviewIds.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviewIds);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedReviews.length === 0) return;

    try {
      await dispatch(bulkUpdateReviews({
        reviewIds: selectedReviews,
        action,
        data: { status: action === 'approve' ? 'approved' : 'rejected' }
      })).unwrap();
      
      setSelectedReviews([]);
      
      // Refresh reviews
      const params = {
        page: pagination?.currentPage || 1,
        limit: 10,
        search: searchTerm,
        status: selectedTab !== 'all' ? selectedTab : '',
        rating: filters.rating,
      };
      dispatch(fetchReviews(params));
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
    }
  };

  const handleReviewAction = async (action, reviewId) => {
    try {
      if (action === 'delete') {
        await dispatch(deleteReview({ reviewId, reason: 'Admin action' })).unwrap();
      } else {
        await dispatch(updateReviewStatus({
          reviewId,
          status: action === 'approve' ? 'approved' : 'rejected',
          reason: 'Admin action'
        })).unwrap();
      }
      
      // Refresh reviews
      const params = {
        page: pagination?.currentPage || 1,
        limit: 10,
        search: searchTerm,
        status: selectedTab !== 'all' ? selectedTab : '',
        rating: filters.rating,
      };
      dispatch(fetchReviews(params));
    } catch (error) {
      console.error(`Error performing ${action} on review:`, error);
    }
  };

  const openModal = async (type, review = null) => {
    setModalType(type);
    if (review && type === 'view') {
      try {
        await dispatch(fetchReviewById(review._id || review.id));
      } catch (error) {
        console.error('Error fetching review details:', error);
      }
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedReview(null);
  };

  // Filter reviews based on search and filters
  const filteredReviews = (reviews || []).filter(review => {
    const productName = review.product?.name || review.productName || '';
    const userName = review.user?.name || review.userName || '';
    const comment = review.comment || '';
    
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || 
                      (selectedTab === 'pending' && review.status === 'pending') ||
                      (selectedTab === 'approved' && review.status === 'approved') ||
                      (selectedTab === 'rejected' && review.status === 'rejected') ||
                      (selectedTab === 'reported' && review.reported);
    
    const matchesRating = !filters.rating || review.rating?.toString() === filters.rating;
    const matchesStatus = !filters.status || review.status === filters.status;
    const matchesReported = !filters.reported || review.reported;

    return matchesSearch && matchesTab && matchesRating && matchesStatus && matchesReported;
  });

  const tabs = [
    { id: 'all', name: 'All Reviews', count: reviews?.length || 0 },
    { id: 'pending', name: 'Pending', count: reviews?.filter(r => r.status === 'pending').length || 0 },
    { id: 'approved', name: 'Approved', count: reviews?.filter(r => r.status === 'approved').length || 0 },
    { id: 'rejected', name: 'Rejected', count: reviews?.filter(r => r.status === 'rejected').length || 0 },
    { id: 'reported', name: 'Reported', count: reviews?.filter(r => r.reported).length || 0 }
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
                    {reviews.length > 0 ? 
                      (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1) : 
                      '0.0'
                    }
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
              <li key={review._id || review.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedReviews.includes(review._id || review.id)}
                    onChange={() => handleSelectReview(review._id || review.id)}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {review.product?.name || review.productName || 'Unknown Product'}
                        </h4>
                        {getStatusBadge(review.status)}
                        {review.reported && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FlagIcon className="h-3 w-3 mr-1" />
                            Reported ({review.reportCount || 0})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating || 0)}
                        <span className="text-sm text-gray-500">({review.rating || 0})</span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900">{review.title || 'No Title'}</p>
                      <p className="text-sm text-gray-600 mt-1">{review.comment || 'No comment'}</p>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {review.user?.name || review.userName || 'Unknown User'}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        <span>Helpful: {review.helpful || 0} | Not Helpful: {review.notHelpful || 0}</span>
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
                          onClick={() => handleReviewAction('approve', review._id || review.id)}
                          className="text-green-400 hover:text-green-600"
                          title="Approve Review"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReviewAction('reject', review._id || review.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Reject Review"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleReviewAction('delete', review._id || review.id)}
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