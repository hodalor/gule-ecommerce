import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { 
  selectNotifications,
  selectUnreadCount, 
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} from '../../store/slices/notificationSlice';
import NotificationItem from './NotificationItem';
import NotificationSettings from './NotificationSettings';

const NotificationCenter = () => {
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const unreadCount = useSelector(selectUnreadCount);
  const allNotifications = useSelector(selectNotifications);
  const { loading, error } = useSelector((state) => state.notifications);
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  
  // Filter notifications based on active filter
  const filteredNotifications = React.useMemo(() => {
    if (activeFilter === 'all') return allNotifications;
    if (activeFilter === 'unread') return allNotifications.filter(n => !n.read);
    return allNotifications.filter(n => n.type === activeFilter);
  }, [allNotifications, activeFilter]);
  
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications on component mount
  useEffect(() => {
    if (user?._id) {
      dispatch(fetchNotifications(user._id));
    }
  }, [dispatch, user?._id]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (user?._id) {
      const interval = setInterval(() => {
        dispatch(fetchNotifications(user._id));
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [dispatch, user?._id]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    setShowSettings(false);
  };

  const handleMarkAllAsRead = async () => {
    if (user?._id) {
      await dispatch(markAllAsRead(user._id));
    }
  };

  const handleClearAll = async () => {
    if (user?._id) {
      await dispatch(clearAllNotifications(user._id));
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await dispatch(markAsRead(notification.id));
    }
    // Handle navigation or action based on notification type
    // This could be implemented based on your routing needs
  };

  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    await dispatch(deleteNotification(notificationId));
  };

  const filterOptions = [
    { value: 'all', label: 'All Notifications', count: allNotifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'orders', label: 'Orders', count: allNotifications.filter(n => n.type === 'order').length },
    { value: 'messages', label: 'Messages', count: allNotifications.filter(n => n.type === 'message').length },
    { value: 'inventory', label: 'Inventory', count: allNotifications.filter(n => n.type === 'inventory').length },
    { value: 'payments', label: 'Payments', count: allNotifications.filter(n => n.type === 'payment').length },
    { value: 'reviews', label: 'Reviews', count: allNotifications.filter(n => n.type === 'review').length }
  ];

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Settings"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeFilter === option.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                  {option.count > 0 && (
                    <span className="ml-1 text-xs opacity-75">({option.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Quick Actions</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckIcon className="h-3 w-3" />
                  Mark All Read
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={filteredNotifications.length === 0}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-3 w-3" />
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">Error loading notifications</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onDelete={handleDeleteNotification}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/notifications';
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <NotificationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default NotificationCenter;