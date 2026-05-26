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
  const pageTitle = getPageTitle(currentPath);

  return (
    <div className="sticky top-0 z-30 flex h-20 flex-shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
      {/* Mobile menu button */}
      <button
        type="button"
        className="border-r border-slate-200 px-4 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Page title */}
      <div className="flex flex-1 items-center justify-between px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Admin workspace
          </p>
          <h1 className="truncate text-2xl font-bold text-slate-900">
            {pageTitle}
          </h1>
        </div>

        {/* Right side items */}
        <div className="ml-4 flex items-center gap-3 md:ml-6">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="py-1">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 transition hover:bg-slate-50 ${
                          notification.unread ? 'bg-primary-50/70' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {notification.message}
                            </p>
                          </div>
                          {notification.unread && (
                            <div className="ml-2 mt-1 h-2.5 w-2.5 rounded-full bg-primary-500"></div>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 px-4 py-3">
                    <button className="text-sm font-medium text-primary-600 transition hover:text-primary-500">
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
              className="flex max-w-xs items-center rounded-2xl border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <span className="sr-only">Open user menu</span>
              <img
                className="h-10 w-10 rounded-2xl object-cover"
                src={user?.photo || `https://ui-avatars.com/api/?name=${user?.fullName || 'Admin'}&background=3b82f6&color=fff`}
                alt=""
              />
              <div className="ml-3 text-left">
                <p className="text-sm font-semibold text-slate-800">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs text-slate-500">{String(user?.role || 'Admin').replace(/_/g, ' ')}</p>
              </div>
              <ChevronDownIcon className="ml-2 h-4 w-4 text-slate-400" />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="py-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/admin/profile');
                    }}
                    className="flex w-full items-center px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <UserCircleIcon className="mr-3 h-5 w-5 text-slate-400" />
                    Your Profile
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="flex w-full items-center px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Cog6ToothIcon className="mr-3 h-5 w-5 text-slate-400" />
                    Settings
                  </button>
                  <div className="mx-4 border-t border-slate-100"></div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-400" />
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
