import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { logoutAdmin } from '../../store/slices/authSlice';

const Topbar = ({ setSidebarOpen, currentPath }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAdmin()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getPageTitle = (path) => {
    const pathMap = {
      '/admin': 'Dashboard',
      '/admin/users': 'User Management',
      '/admin/admins': 'Admin Management',
      '/admin/orders': 'Order Management',
      '/admin/products': 'Product Management',
      '/admin/sellers': 'Seller Management',
      '/admin/reviews': 'Review Management',
      '/admin/categories': 'Category Management',
      '/admin/escrow': 'Escrow Management',
      '/admin/disputes': 'Dispute Management',
      '/admin/inventory': 'Inventory Management',
      '/admin/stores': 'Store Performance',
      '/admin/complaints': 'Complaints Management',
      '/admin/refunds': 'Refunds & Disputes',
      '/admin/privacy': 'Privacy Settings',
      '/admin/finance': 'Finance Panel',
      '/admin/audit': 'Audit Logs',
      '/admin/settings': 'Settings',
    };
    
    return pathMap[path] || 'Admin Panel';
  };

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: 'New order pending review',
      message: 'Order #12345 requires approval',
      time: '5 minutes ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Payment released',
      message: 'Payment for order #12344 has been released',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 3,
      title: 'New admin registered',
      message: 'John Doe has been added as Review Officer',
      time: '2 hours ago',
      unread: false,
    },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
      {/* Mobile menu button */}
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Page title */}
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            {getPageTitle(currentPath)}
          </h1>
        </div>

        {/* Right side items */}
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {notification.unread && (
                            <div className="ml-2 h-2 w-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200">
                    <button className="text-sm text-primary-600 hover:text-primary-500">
                      View all notifications
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <span className="sr-only">Open user menu</span>
              <img
                className="h-8 w-8 rounded-full"
                src={user?.photo || `https://ui-avatars.com/api/?name=${user?.fullName || 'Admin'}&background=3b82f6&color=fff`}
                alt=""
              />
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-gray-700">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500">{user?.role || 'Admin'}</p>
              </div>
              <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/admin/profile');
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Your Profile
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;