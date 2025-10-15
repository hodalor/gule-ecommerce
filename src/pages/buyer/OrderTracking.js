import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { trackOrder } from '../../store/slices/orderSlice';

const OrderTracking = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const { trackingData, loading } = useSelector(state => state.orders);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (orderId) {
      // Dispatch trackOrder action to get real tracking data
      dispatch(trackOrder(orderId));
    }
  }, [orderId, dispatch]);

  useEffect(() => {
    // Use real tracking data from Redux, fallback to mock for demo
    const currentTrackingData = trackingData || {
      id: orderId || 'ORD-2024-001',
      status: 'processing',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      trackingNumber: 'Pending',
      carrier: 'To be assigned',
      items: [
        {
          id: 1,
          name: 'Sample Product',
          quantity: 1,
          price: 99.99,
          image: '/api/placeholder/100/100'
        }
      ],
      timeline: [
        {
          status: 'order_placed',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Order has been placed successfully'
        },
        {
          status: 'processing',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Order is being processed'
        }
      ],
      shippingAddress: {
        name: 'Loading...',
        address: 'Loading...',
        city: 'Loading...',
        state: 'Loading...',
        zipCode: 'Loading...',
        phone: 'Loading...'
      },
      total: 0
    };
    
    setSelectedOrder(currentTrackingData);
  }, [trackingData, orderId]);

  const formatDate = (dateString) => {
    if (!dateString) return null;
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

  const getStatusColor = (status, completed) => {
    if (completed) {
      return 'text-green-600';
    }
    switch (status) {
      case 'out_for_delivery':
        return 'text-blue-600';
      case 'delivered':
        return 'text-green-600';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status, completed) => {
    if (completed) {
      return <CheckCircleIconSolid className="h-6 w-6 text-green-600" />;
    }
    
    switch (status) {
      case 'out_for_delivery':
        return <TruckIcon className="h-6 w-6 text-blue-600" />;
      case 'delivered':
        return <CheckCircleIcon className="h-6 w-6 text-gray-400" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrder && !orderId) {
    return <OrderTrackingSearch />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/buyer/dashboard/orders"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Track Order #{selectedOrder?.id}
          </h1>
          <p className="text-gray-600">
            Real-time tracking information for your order
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tracking Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Order Status
                </h2>
                <p className="text-sm text-gray-600">
                  Tracking Number: {selectedOrder?.trackingNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated Delivery</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(selectedOrder?.estimatedDelivery).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Order Progress</span>
                <span>
                  {selectedOrder?.timeline.filter(item => item.completed).length} of {selectedOrder?.timeline.length} steps completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(selectedOrder?.timeline.filter(item => item.completed).length / selectedOrder?.timeline.length) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {selectedOrder?.timeline.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status, step.completed)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${getStatusColor(step.status, step.completed)}`}>
                        {step.title}
                      </h3>
                      {step.timestamp && (
                        <span className="text-sm text-gray-500">
                          {formatDate(step.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {step.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <MapPinIcon className="h-3 w-3" />
                      <span>{step.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carrier Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Carrier Information
            </h3>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <TruckIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {selectedOrder?.carrier}
                </h4>
                <p className="text-sm text-gray-600">
                  Tracking: {selectedOrder?.trackingNumber}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-gray-600">{selectedOrder?.carrierPhone}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{selectedOrder?.carrierEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Items
            </h3>
            
            <div className="space-y-4">
              {selectedOrder?.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-600">
                      Qty: {item.quantity} × {formatPrice(item.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {item.seller}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">
                  {formatPrice(selectedOrder?.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delivery Address
            </h3>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {selectedOrder?.shippingAddress.name}
              </p>
              <p className="text-gray-600">
                {selectedOrder?.shippingAddress.address}
              </p>
              <p className="text-gray-600">
                {selectedOrder?.shippingAddress.city}, {selectedOrder?.shippingAddress.state}
              </p>
              <p className="text-gray-600">
                {selectedOrder?.shippingAddress.zipCode}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  {selectedOrder?.shippingAddress.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need Help?
            </h3>
            
            <div className="space-y-3">
              <Link
                to={`/buyer/dashboard/disputes/new?order=${selectedOrder?.id}`}
                className="block w-full text-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Report an Issue
              </Link>
              
              <Link
                to="/contact"
                className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Contact Support
              </Link>
              
              <Link
                to="/buyer/dashboard/orders"
                className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for searching/selecting order to track
const OrderTrackingSearch = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const { orders } = useSelector(state => state.orders);

  const handleTrackByNumber = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      // In real app, this would search by tracking number
      console.log('Tracking by number:', trackingNumber);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
        <p className="text-gray-600">
          Enter your tracking number or select an order to track
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track by Number */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Track by Tracking Number
          </h2>
          
          <form onSubmit={handleTrackByNumber} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (e.g., TRK123456789)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Track Order
            </button>
          </form>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Your Recent Orders
          </h2>
          
          {orders && orders.length > 0 ? (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to={`/buyer/dashboard/tracking/${order.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No orders to track
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Start shopping to see your orders here.
              </p>
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Start Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;