import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  EyeIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { fetchUserOrders, confirmDelivery, rateOrder } from '../../store/slices/orderSlice';
import toast from 'react-hot-toast';

const BuyerOrders = () => {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector(state => state.orders);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  useEffect(() => {
    dispatch(fetchUserOrders({ page: 1, limit: 20 }));
  }, [dispatch]);

  const orderTabs = [
    { id: 'all', name: 'All Orders', count: orders?.length || 0 },
    { id: 'pending', name: 'Pending', count: orders?.filter(o => o.status === 'pending')?.length || 0 },
    { id: 'processing', name: 'Processing', count: orders?.filter(o => o.status === 'processing')?.length || 0 },
    { id: 'shipped', name: 'Shipped', count: orders?.filter(o => o.status === 'shipped')?.length || 0 },
    { id: 'delivered', name: 'Delivered', count: orders?.filter(o => o.status === 'delivered')?.length || 0 },
    { id: 'completed', name: 'Completed', count: orders?.filter(o => o.status === 'completed')?.length || 0 },
    { id: 'cancelled', name: 'Cancelled', count: orders?.filter(o => o.status === 'cancelled')?.length || 0 }
  ];

  const filteredOrders = orders?.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesSearch = searchTerm === '' || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  }) || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <TruckIcon className="h-5 w-5 text-blue-600" />;
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      await dispatch(confirmDelivery(orderId)).unwrap();
      toast.success('Delivery confirmed successfully!');
    } catch (error) {
      toast.error('Failed to confirm delivery');
    }
  };

  const handleRateOrder = async () => {
    try {
      await dispatch(rateOrder({
        orderId: selectedOrder.id,
        rating,
        review
      })).unwrap();
      toast.success('Rating submitted successfully!');
      setShowRatingModal(false);
      setSelectedOrder(null);
      setRating(5);
      setReview('');
    } catch (error) {
      toast.error('Failed to submit rating');
    }
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {orderTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Orders List */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    </div>
                    <div className="w-24 h-8 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{order.id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <Link
                        to={`/buyer/dashboard/orders/${order.id}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4">
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {item.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} × {formatPrice(item.price)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Seller: {item.sellerName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Total */}
                    <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          Total: {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
                      <Link
                        to={`/buyer/dashboard/tracking/${order.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <TruckIcon className="h-4 w-4" />
                        Track Order
                      </Link>

                      {order.status === 'delivered' && !order.deliveryConfirmed && (
                        <button
                          onClick={() => handleConfirmDelivery(order.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Confirm Delivery
                        </button>
                      )}

                      {order.status === 'completed' && !order.rated && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowRatingModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          <StarIcon className="h-4 w-4" />
                          Rate Order
                        </button>
                      )}

                      {(order.status === 'delivered' || order.status === 'completed') && (
                        <Link
                          to={`/buyer/dashboard/disputes/new?order=${order.id}`}
                          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          Report Issue
                        </Link>
                      )}

                      <Link
                        to={`/buyer/dashboard/orders/${order.id}`}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'all' ? 'No orders found' : `No ${activeTab} orders`}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'Try adjusting your search terms.' : 'Start shopping to see your orders here.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Start Shopping
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rate Your Order
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Order #{selectedOrder.id}</p>
              <p className="text-sm font-medium text-gray-900">
                How was your experience with this order?
              </p>
            </div>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`h-8 w-8 ${
                        star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review (Optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Share your experience with this order..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRateOrder}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Submit Rating
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedOrder(null);
                  setRating(5);
                  setReview('');
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;