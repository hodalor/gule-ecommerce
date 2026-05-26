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
  TagIcon,
  StarIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/admin', icon: HomeIcon, current: location.pathname === '/admin' }
      ]
    },
    {
      title: 'Commerce',
      items: [
        {
          name: 'Order Management',
          href: '/admin/orders',
          icon: ShoppingBagIcon,
          current: location.pathname.startsWith('/admin/orders'),
          roles: ['Super Admin', 'Admin', 'Review Officer']
        },
        {
          name: 'Product Management',
          href: '/admin/products',
          icon: ShoppingCartIcon,
          current: location.pathname.startsWith('/admin/products'),
          roles: ['Super Admin', 'Admin', 'Inventory Manager']
        },
        {
          name: 'Featured Requests',
          href: '/admin/products/featured-requests',
          icon: StarIcon,
          current: location.pathname.startsWith('/admin/products/featured-requests'),
          roles: ['Super Admin', 'Admin', 'Inventory Manager']
        },
        {
          name: 'Seller Management',
          href: '/admin/sellers',
          icon: BuildingStorefrontIcon,
          current: location.pathname.startsWith('/admin/sellers'),
          roles: ['Super Admin', 'Admin']
        },
        {
          name: 'Review Management',
          href: '/admin/reviews',
          icon: StarIcon,
          current: location.pathname.startsWith('/admin/reviews'),
          roles: ['Super Admin', 'Admin', 'Review Officer']
        },
        {
          name: 'Category Management',
          href: '/admin/categories',
          icon: TagIcon,
          current: location.pathname.startsWith('/admin/categories'),
          roles: ['Super Admin', 'Admin', 'Inventory Manager']
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
        }
      ]
    },
    {
      title: 'Operations',
      items: [
        {
          name: 'Escrow Management',
          href: '/admin/escrow',
          icon: BanknotesIcon,
          current: location.pathname.startsWith('/admin/escrow'),
          roles: ['Super Admin', 'Admin', 'Finance Officer']
        },
        {
          name: 'Dispute Management',
          href: '/admin/disputes',
          icon: ExclamationTriangleIcon,
          current: location.pathname.startsWith('/admin/disputes'),
          roles: ['Super Admin', 'Admin', 'Support Agent']
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
          name: 'Finance Panel',
          href: '/admin/finance',
          icon: CurrencyDollarIcon,
          current: location.pathname.startsWith('/admin/finance'),
          roles: ['Super Admin', 'Admin', 'Accountant']
        }
      ]
    },
    {
      title: 'Administration',
      items: [
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
          name: 'Privacy Settings',
          href: '/admin/privacy',
          icon: ShieldCheckIcon,
          current: location.pathname.startsWith('/admin/privacy'),
          roles: ['Super Admin', 'Admin']
        },
        {
          name: 'Audit Logs',
          href: '/admin/audit',
          icon: DocumentTextIcon,
          current: location.pathname.startsWith('/admin/audit'),
          roles: ['Super Admin', 'Admin']
        },
        {
          name: 'Server Logs',
          href: '/admin/server-logs',
          icon: ServerIcon,
          current: location.pathname.startsWith('/admin/server-logs'),
          roles: ['Super Admin', 'Admin']
        },
        {
          name: 'Settings',
          href: '/admin/settings',
          icon: CogIcon,
          current: location.pathname.startsWith('/admin/settings'),
          roles: ['Super Admin']
        }
      ]
    }
  ];

  const hasAccess = (item) => {
    if (!item.roles || item.roles.length === 0) return true;
    
    // Super admin has access to everything
    if (user?.role === 'super_admin') return true;
    
    return item.roles.includes(user?.role);
  };

  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(hasAccess)
    }))
    .filter((section) => section.items.length > 0);

  const renderNavigation = () => (
    <div className="space-y-6">
      {filteredSections.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {section.title}
          </p>
          <div className="mt-3 space-y-1.5">
            {section.items.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  item.current
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 ${
                    item.current ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 leading-5">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderUserCard = () => (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <img
          className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white"
          src={user?.photo || `https://ui-avatars.com/api/?name=${user?.fullName || 'Admin'}&background=0f172a&color=fff`}
          alt=""
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user?.fullName || 'Admin User'}
          </p>
          <p className="mt-1 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {String(user?.role || 'Admin').replace(/_/g, ' ')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="sticky top-0 flex h-screen w-72 flex-col overflow-hidden border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-5">
            {/* Logo */}
            <div className="flex flex-shrink-0 items-center rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-sm">
                G
              </div>
              <div className="ml-3 min-w-0">
                <h1 className="truncate text-lg font-bold text-slate-900">Gule Admin</h1>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Control Center
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-6 flex-1 overflow-y-auto px-1">
              {renderNavigation()}
            </nav>

            {/* User info */}
            <div className="mt-6 flex-shrink-0 px-1">
              {renderUserCard()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-50' : 'hidden'}`}>
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col border-r border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-base font-bold text-white">
                G
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold text-slate-900">Gule Admin</h1>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Control Center</p>
              </div>
            </div>
            <button
              type="button"
              className="ml-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-2">
            {renderNavigation()}
          </nav>

          {/* User info */}
          <div className="border-t border-slate-200 p-4">
            {renderUserCard()}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
