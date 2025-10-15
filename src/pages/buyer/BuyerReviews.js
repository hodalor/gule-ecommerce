import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  StarIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { 
  fetchUserReviews, 
  updateReview, 
  deleteReview, 
  clearError,
  setSearchTerm,
  setRatingFilter,
  setSortBy
} from '../../store/slices/reviewsSlice';

const BuyerReviews = () => {
  const dispatch = useDispatch();
  const { 
    reviews, 
    loading, 
    error, 
    searchTerm,
    ratingFilter,
    sortBy
  } = useSelector((state) => state.reviews);
  
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    images: []
  });

  // Fetch user reviews on component mount
  useEffect(() => {
    dispatch(fetchUserReviews());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Filter and sort reviews
  useEffect(() => {
    let filtered = [...reviews];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(review =>
        review.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(ratingFilter));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        case 'helpful':
          return (b.helpful || 0) - (a.helpful || 0);
        default:
          return 0;
      }
    });

    setFilteredReviews(filtered);
  }, [reviews, searchTerm, ratingFilter, sortBy]);

  const handleEditReview = (review) => {
    setEditingReview(review);
    setEditFormData({
      rating: review.rating,
      title: review.title || '',
      comment: review.comment,
      images: review.images || []
    });
    setShowEditModal(true);
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    try {
      await dispatch(updateReview({
        reviewId: editingReview._id,
        reviewData: editFormData
      })).unwrap();
      
      toast.success('Review updated successfully');
      setShowEditModal(false);
      setEditingReview(null);
    } catch (error) {
      toast.error(error || 'Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await dispatch(deleteReview(reviewId)).unwrap();
        toast.success('Review deleted successfully');
      } catch (error) {
        toast.error(error || 'Failed to delete review');
      }
    }
  };

  const handleRetry = () => {
    dispatch(fetchUserReviews());
  };

  const renderStars = (rating, size = 'w-5 h-5') => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={`${size} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading && reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600 mt-1">Manage your product reviews and ratings</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600 mt-1">Manage your product reviews and ratings</p>
        </div>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XMarkIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load reviews</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-600 mt-1">Manage your product reviews and ratings</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Rating Filter */}
          <div>
            <select
              value={ratingFilter}
              onChange={(e) => dispatch(setRatingFilter(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => dispatch(setSortBy(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-gray-600">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredReviews.map((review) => (
          <div key={review._id} className="bg-white rounded-lg shadow-md p-6">
            {/* Review Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <img
                  src={review.product?.images?.[0] || 'https://via.placeholder.com/64'}
                  alt={review.product?.name || 'Product'}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <Link
                    to={`/product/${review.product?._id}`}
                    className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {review.product?.name || 'Product Name'}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-600">
                      {formatDate(review.createdAt)}
                    </span>
                    {review.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditReview(review)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit Review"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteReview(review._id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete Review"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Review Content */}
            <div className="space-y-3">
              {review.title && <h3 className="font-medium text-gray-900">{review.title}</h3>}
              <p className="text-gray-700">{review.comment}</p>
              
              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Review ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Review Stats */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{review.helpful || 0} people found this helpful</span>
                {review.updatedAt !== review.createdAt && (
                  <span>Updated {formatDate(review.updatedAt)}</span>
                )}
              </div>
            </div>

            {/* Seller Response */}
            {review.sellerResponse && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">Seller Response</span>
                  <span className="text-xs text-gray-600">
                    {formatDate(review.sellerResponse.createdAt || review.sellerResponse.date)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{review.sellerResponse.message}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && filteredReviews.length === 0 && (
        <div className="text-center py-12">
          <StarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || ratingFilter !== 'all' ? 'No reviews found' : 'No reviews yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || ratingFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start shopping and leave reviews for products you purchase'
            }
          </p>
          {!searchTerm && ratingFilter === 'all' && (
            <Link
              to="/products"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </Link>
          )}
        </div>
      )}

      {/* Edit Review Modal */}
      {showEditModal && editingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Edit Review</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateReview} className="space-y-4">
              {/* Product Info */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <img
                  src={editingReview.product?.images?.[0] || 'https://via.placeholder.com/64'}
                  alt={editingReview.product?.name || 'Product'}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-medium text-gray-900">{editingReview.product?.name || 'Product Name'}</h3>
                  <p className="text-sm text-gray-600">Purchased on {formatDate(editingReview.createdAt)}</p>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating *
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, rating: star }))}
                      className="focus:outline-none"
                    >
                      <StarIconSolid
                        className={`w-8 h-8 ${
                          star <= editFormData.rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Summarize your experience"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Comment *
                </label>
                <textarea
                  value={editFormData.comment}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, comment: e.target.value }))}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Share your detailed experience with this product"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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

export default BuyerReviews;