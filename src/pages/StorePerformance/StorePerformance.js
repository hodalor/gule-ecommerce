import React from 'react';
import { useSelector } from 'react-redux';
import {
  BuildingStorefrontIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const StorePerformance = () => {
  const { user: currentUser } = useSelector((state) => state.auth);

  const canManageStores = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  if (!canManageStores) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <BuildingStorefrontIcon />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You do not have permission to access store performance tools.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Performance</h1>
          <p className="text-gray-600">This screen now avoids dummy analytics until real admin store analytics endpoints are available.</p>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 text-yellow-600" />
          <div>
            <h2 className="text-lg font-semibold text-yellow-900">Analytics Endpoints Not Enabled</h2>
            <p className="mt-2 text-sm text-yellow-800">
              The previous version of this page showed derived mock rankings and charts. Those placeholders were removed because the corresponding admin store analytics routes are not available in the backend yet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">What Changed</h3>
          <p className="mt-2 text-sm text-gray-600">
            Dummy revenue scores, fake issue lists, and synthetic rankings were removed so this screen no longer misrepresents live platform performance.
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <BuildingStorefrontIcon className="h-8 w-8 text-green-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Use Instead</h3>
          <p className="mt-2 text-sm text-gray-600">
            Use seller management, finance, products, and order management for current operational decisions until real analytics aggregation is implemented.
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <ArrowPathIcon className="h-8 w-8 text-purple-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">MVP Status</h3>
          <p className="mt-2 text-sm text-gray-600">
            This page is intentionally in a safe MVP state and no longer triggers missing analytics calls on load.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StorePerformance;
