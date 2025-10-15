import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  CogIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CubeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon, current: location.pathname === '/admin' },
    { 
      name: 'User Management', 
      href: '/admin/users', 
      icon: UserGroupIcon, 
      current: location.pathname.startsWith('/admin/users'),
      roles: ['Super Admin', 'Admin']
    },
    { 
      name: 'Admin Management', 
      href: '/admin/admins', 
      icon: UsersIcon, 
      current: location.pathname.startsWith('/admin/admins'),
      roles: ['Super Admin', 'Admin']
    },
    { 
      name: 'Order Management', 
      href: '/admin/orders', 
      icon: ShoppingBagIcon, 
      current: location.pathname.startsWith('/admin/orders'),
      roles: ['Super Admin', 'Admin', 'Review Officer']
    },
    { 
      name: 'Inventory Management', 
      href: '/admin/inventory', 
      icon: CubeIcon, 
      current: location.pathname.startsWith('/admin/inventory'),
      roles: ['Super Admin', 'Admin', 'Inventory Manager']
    },
    { 
      name: 'Store Performance', 
      href: '/admin/stores', 
      icon: ChartBarIcon, 
      current: location.pathname.startsWith('/admin/stores'),
      roles: ['Super Admin', 'Admin']
    },
    { 
      name: 'Complaints Management', 
      href: '/admin/complaints', 
      icon: ExclamationTriangleIcon, 
      current: location.pathname.startsWith('/admin/complaints'),
      roles: ['Super Admin', 'Admin', 'Support Agent']
    },
    { 
      name: 'Refunds & Disputes', 
      href: '/admin/refunds', 
      icon: ArrowPathIcon, 
      current: location.pathname.startsWith('/admin/refunds'),
      roles: ['Super Admin', 'Admin', 'Finance Officer']
    },
    { 
      name: 'Privacy Settings', 
      href: '/admin/privacy', 
      icon: ShieldCheckIcon, 
      current: location.pathname.startsWith('/admin/privacy'),
      roles: ['Super Admin', 'Admin']
    },
    { 
      name: 'Finance Panel', 
      href: '/admin/finance', 
      icon: CurrencyDollarIcon, 
      current: location.pathname.startsWith('/admin/finance'),
      roles: ['Super Admin', 'Admin', 'Accountant']
    },
    { 
      name: 'Audit Logs', 
      href: '/admin/audit', 
      icon: DocumentTextIcon, 
      current: location.pathname.startsWith('/admin/audit'),
      roles: ['Super Admin', 'Admin']
    },
    { 
      name: 'Settings', 
      href: '/admin/settings', 
      icon: CogIcon, 
      current: location.pathname.startsWith('/admin/settings'),
      roles: ['Super Admin']
    },
  ];

  const hasAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const filteredNavigation = navigation.filter(hasAccess);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">Gule Admin</h1>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    item.current
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200`}
                >
                  <item.icon
                    className={`${
                      item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* User info */}
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <img
                    className="inline-block h-9 w-9 rounded-full"
                    src={user?.photo || `https://ui-avatars.com/api/?name=${user?.fullName || 'Admin'}&background=3b82f6&color=fff`}
                    alt=""
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.fullName || 'Admin User'}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    {user?.role || 'Admin'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-50' : 'hidden'}`}>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Gule Admin</h1>
              </div>
            </div>
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
            </button>
          </div>

          <nav className="mt-5 flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`${
                  item.current
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200`}
              >
                <item.icon
                  className={`${
                    item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 flex-shrink-0 h-6 w-6`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <img
                  className="inline-block h-9 w-9 rounded-full"
                  src={user?.photo || `https://ui-avatars.com/api/?name=${user?.fullName || 'Admin'}&background=3b82f6&color=fff`}
                  alt=""
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                  {user?.role || 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;