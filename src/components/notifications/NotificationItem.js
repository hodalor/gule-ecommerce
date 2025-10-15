import React from 'react';
import {
  ShoppingBagIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  StarIcon,
  CogIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  ShoppingBagIcon as ShoppingBagSolid,
  ChatBubbleLeftIcon as ChatBubbleLeftSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  CreditCardIcon as CreditCardSolid,
  StarIcon as StarSolid,
  CogIcon as CogSolid
} from '@heroicons/react/24/solid';

const NotificationItem = ({ notification, onClick, onDelete }) => {
  const getNotificationIcon = (type, priority) => {
    const iconClass = "h-5 w-5";
    const isHighPriority = priority === 'high';
    
    switch (type) {
      case 'order':
        return isHighPriority ? (
          <ShoppingBagSolid className={`${iconClass} text-green-600`} />
        ) : (
          <ShoppingBagIcon className={`${iconClass} text-green-500`} />
        );
      case 'message':
        return isHighPriority ? (
          <ChatBubbleLeftSolid className={`${iconClass} text-blue-600`} />
        ) : (
          <ChatBubbleLeftIcon className={`${iconClass} text-blue-500`} />
        );
      case 'inventory':
        return isHighPriority ? (
          <ExclamationTriangleSolid className={`${iconClass} text-orange-600`} />
        ) : (
          <ExclamationTriangleIcon className={`${iconClass} text-orange-500`} />
        );
      case 'payment':
        return isHighPriority ? (
          <CreditCardSolid className={`${iconClass} text-purple-600`} />
        ) : (
          <CreditCardIcon className={`${iconClass} text-purple-500`} />
        );
      case 'review':
        return isHighPriority ? (
          <StarSolid className={`${iconClass} text-yellow-600`} />
        ) : (
          <StarIcon className={`${iconClass} text-yellow-500`} />
        );
      case 'system':
        return isHighPriority ? (
          <CogSolid className={`${iconClass} text-gray-600`} />
        ) : (
          <CogIcon className={`${iconClass} text-gray-500`} />
        );
      default:
        return <CogIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'order':
        return 'Order';
      case 'message':
        return 'Message';
      case 'inventory':
        return 'Inventory';
      case 'payment':
        return 'Payment';
      case 'review':
        return 'Review';
      case 'system':
        return 'System';
      default:
        return 'Notification';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type, notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title and Type Badge */}
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`text-sm font-medium truncate ${
                  !notification.read ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {notification.title}
                </h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  notification.type === 'order' ? 'bg-green-100 text-green-800' :
                  notification.type === 'message' ? 'bg-blue-100 text-blue-800' :
                  notification.type === 'inventory' ? 'bg-orange-100 text-orange-800' :
                  notification.type === 'payment' ? 'bg-purple-100 text-purple-800' :
                  notification.type === 'review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getTypeLabel(notification.type)}
                </span>
              </div>

              {/* Message */}
              <p className={`text-sm line-clamp-2 ${
                !notification.read ? 'text-gray-800' : 'text-gray-600'
              }`}>
                {notification.message}
              </p>

              {/* Metadata */}
              {notification.metadata && (
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  {notification.metadata.orderId && (
                    <span>Order: {notification.metadata.orderId}</span>
                  )}
                  {notification.metadata.amount && (
                    <span>Amount: ${notification.metadata.amount}</span>
                  )}
                  {notification.metadata.customerName && (
                    <span>From: {notification.metadata.customerName}</span>
                  )}
                  {notification.metadata.stockLevel !== undefined && (
                    <span>Stock: {notification.metadata.stockLevel}</span>
                  )}
                  {notification.metadata.rating && (
                    <span>Rating: {notification.metadata.rating}★</span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon className="h-3 w-3" />
                <span>{formatTimestamp(notification.timestamp)}</span>
                {!notification.read && (
                  <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 ml-2">
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                title="Delete notification"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Indicator */}
      {notification.priority === 'high' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <ExclamationTriangleIcon className="h-3 w-3" />
          <span className="font-medium">High Priority</span>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;